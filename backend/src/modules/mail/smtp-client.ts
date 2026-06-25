import { randomBytes } from 'node:crypto';
import { Socket, connect as netConnect } from 'node:net';
import { TLSSocket, connect as tlsConnect } from 'node:tls';

type SmtpOptions = {
  host: string;
  port: number;
  secure: boolean;
  username?: string | null;
  password?: string | null;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SocketLike = Socket | TLSSocket;

export async function sendSmtpMail(options: SmtpOptions) {
  const client = new SmtpConnection(options);
  await client.send();
}

class SmtpConnection {
  private socket?: SocketLike;
  private buffer = '';

  constructor(private readonly options: SmtpOptions) {}

  async send() {
    try {
      this.socket = await this.openSocket();
      await this.expect([220]);
      await this.command(`EHLO ${this.hostname()}`, [250]);

      if (!this.options.secure) {
        const startTls = await this.command('STARTTLS', [220], true);
        if (startTls) {
          this.socket = await this.upgradeToTls(this.socket);
          await this.command(`EHLO ${this.hostname()}`, [250]);
        }
      }

      if (this.options.username && this.options.password) {
        await this.command('AUTH LOGIN', [334]);
        await this.command(
          Buffer.from(this.options.username).toString('base64'),
          [334],
        );
        await this.command(
          Buffer.from(this.options.password).toString('base64'),
          [235],
        );
      }

      await this.command(
        `MAIL FROM:<${this.address(this.options.from)}>`,
        [250],
      );
      await this.command(
        `RCPT TO:<${this.address(this.options.to)}>`,
        [250, 251],
      );
      await this.command('DATA', [354]);
      await this.command(this.message(), [250]);
      await this.command('QUIT', [221]).catch(() => undefined);
    } finally {
      this.socket?.end();
      this.socket?.destroy();
    }
  }

  private openSocket() {
    return new Promise<SocketLike>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      const socket = this.options.secure
        ? tlsConnect({
            host: this.options.host,
            port: this.options.port,
            servername: this.options.host,
          })
        : netConnect({
            host: this.options.host,
            port: this.options.port,
          });

      socket.setTimeout(15000, () => {
        reject(new Error('SMTP connection timed out'));
        socket.destroy();
      });
      socket.once('error', onError);
      const readyEvent = this.options.secure ? 'secureConnect' : 'connect';
      socket.once(readyEvent, () => {
        socket.off('error', onError);
        resolve(socket);
      });
    });
  }

  private upgradeToTls(socket: SocketLike) {
    return new Promise<TLSSocket>((resolve, reject) => {
      const tlsSocket = tlsConnect({
        socket,
        servername: this.options.host,
      });

      tlsSocket.once('error', reject);
      tlsSocket.once('secureConnect', () => resolve(tlsSocket));
    });
  }

  private command(command: string, codes: number[], optional = false) {
    return new Promise<boolean>((resolve, reject) => {
      const socket = this.requireSocket();
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`SMTP command timed out: ${command.slice(0, 20)}`));
      }, 15000);
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString('utf8');
        const response = this.nextResponse();
        if (!response) return;

        cleanup();
        const code = Number(response.slice(0, 3));
        if (codes.includes(code)) {
          resolve(true);
          return;
        }

        if (optional) {
          resolve(false);
          return;
        }

        reject(new Error(`SMTP ${code}: ${response.trim()}`));
      };
      const cleanup = () => {
        clearTimeout(timer);
        socket.off('data', onData);
        socket.off('error', onError);
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.write(`${command}\r\n`);
    });
  }

  private expect(codes: number[]) {
    return new Promise<void>((resolve, reject) => {
      const socket = this.requireSocket();
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('SMTP greeting timed out'));
      }, 15000);
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString('utf8');
        const response = this.nextResponse();
        if (!response) return;

        cleanup();
        const code = Number(response.slice(0, 3));
        if (codes.includes(code)) {
          resolve();
          return;
        }

        reject(new Error(`SMTP ${code}: ${response.trim()}`));
      };
      const cleanup = () => {
        clearTimeout(timer);
        socket.off('data', onData);
        socket.off('error', onError);
      };

      socket.on('data', onData);
      socket.once('error', onError);
    });
  }

  private nextResponse() {
    const lines = this.buffer.split(/\r?\n/);
    if (!this.buffer.endsWith('\n')) return null;

    for (let index = lines.length - 2; index >= 0; index -= 1) {
      if (/^\d{3} /.test(lines[index])) {
        const response = lines.slice(0, index + 1).join('\n');
        this.buffer = lines.slice(index + 1).join('\n');
        return response;
      }
    }

    return null;
  }

  private message() {
    const boundary = `picvault-${randomBytes(12).toString('hex')}`;
    const headers = [
      `From: ${this.formatAddress(this.options.from)}`,
      `To: ${this.formatAddress(this.options.to)}`,
      `Subject: ${this.encodeHeader(this.options.subject)}`,
      'MIME-Version: 1.0',
      `Message-ID: <${randomBytes(12).toString('hex')}@${this.hostname()}>`,
      'Date: ' + new Date().toUTCString(),
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];

    return [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      this.normalizeBody(this.options.text),
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      this.normalizeBody(this.options.html),
      `--${boundary}--`,
      '.',
    ].join('\r\n');
  }

  private formatAddress(value: string) {
    const address = this.address(value);
    const name = value.replace(/<[^>]+>/, '').trim();
    if (!name || name === address) return `<${address}>`;
    return `${this.encodeHeader(name)} <${address}>`;
  }

  private address(value: string) {
    const match = value.match(/<([^>]+)>/);
    return (match?.[1] ?? value).trim();
  }

  private encodeHeader(value: string) {
    if (/^[\x00-\x7F]*$/.test(value)) return value;
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  }

  private normalizeBody(value: string) {
    return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
  }

  private hostname() {
    return this.options.host || 'localhost';
  }

  private requireSocket() {
    if (!this.socket) {
      throw new Error('SMTP socket is not connected');
    }

    return this.socket;
  }
}
