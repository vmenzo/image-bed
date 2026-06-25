import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { clientIp } from '../../common/request-meta';

type LoginBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, LoginBucket>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const windowMs = Number(
      this.config.get<string>('LOGIN_RATE_LIMIT_WINDOW_MS') ?? 300000,
    );
    const max = Number(this.config.get<string>('LOGIN_RATE_LIMIT_MAX') ?? 8);
    const email = String(request.body?.email ?? '')
      .toLowerCase()
      .trim();
    const ip = clientIp(request);
    const key = `${ip}:${email}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      throw new HttpException('Too many login attempts', 429);
    }

    if (this.buckets.size > 5000) {
      this.cleanup(now);
    }

    return true;
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  clear(request: {
    body?: { email?: string };
    ip?: string;
    ips?: string[];
    socket?: { remoteAddress?: string };
  }) {
    const email = String(request.body?.email ?? '')
      .toLowerCase()
      .trim();
    this.buckets.delete(`${clientIp(request)}:${email}`);
  }
}
