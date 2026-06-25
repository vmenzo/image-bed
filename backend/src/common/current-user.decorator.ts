import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserPayload = {
  id: string;
  publicId?: number;
  email: string;
  role: string;
  authType?: 'session' | 'api-key';
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserPayload => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
