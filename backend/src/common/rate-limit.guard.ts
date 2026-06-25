import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { clientIp } from './request-meta';

type HitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, HitBucket>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const windowMs = Number(
      this.config.get<string>('RATE_LIMIT_WINDOW_MS') ?? 60000,
    );
    const max = Number(this.config.get<string>('RATE_LIMIT_MAX') ?? 240);
    const key = `${clientIp(request)}:${request.method}:${request.route?.path ?? request.url}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      throw new HttpException('Too many requests', 429);
    }

    if (this.buckets.size > 10000) {
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
