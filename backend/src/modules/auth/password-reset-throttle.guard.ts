import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { clientIp } from '../../common/request-meta';

type PasswordResetBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class PasswordResetThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, PasswordResetBucket>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const windowMs = Number(
      this.config.get<string>('PASSWORD_RESET_RATE_LIMIT_WINDOW_MS') ?? 900000,
    );
    const max = Number(
      this.config.get<string>('PASSWORD_RESET_RATE_LIMIT_MAX') ?? 5,
    );
    const email = String(request.body?.email ?? '')
      .toLowerCase()
      .trim();
    const key = `${clientIp(request)}:${email}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      throw new HttpException('Too many password reset attempts', 429);
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
}
