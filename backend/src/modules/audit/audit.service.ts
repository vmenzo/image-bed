import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export type AuditContext = {
  actorId?: string | null;
  request?: Request;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    context: AuditContext,
    input: {
      action: string;
      target?: string;
      targetId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: context.actorId ?? null,
        action: input.action,
        target: input.target,
        targetId: input.targetId,
        metadata: input.metadata,
        ip: this.ip(context.request),
        userAgent: context.request?.headers['user-agent'],
      },
    });
  }

  async list(query: {
    page?: number;
    pageSize?: number;
    action?: string;
    actorId?: string;
    target?: string;
  }) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 30, 1), 100);
    const where: Prisma.AuditLogWhereInput = {
      action: query.action || undefined,
      actorId: query.actorId || undefined,
      target: query.target || undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  private ip(request?: Request) {
    if (!request) return undefined;
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }

    return request.ip;
  }
}
