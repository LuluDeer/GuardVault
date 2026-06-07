// 统一错误处理：捕获 zod / Prisma / 限流 / 自定义业务错误
// controller 内已用 fail() 返回的不会被这个捕获
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { fail, ErrorCode } from './response.js';

export class BizError extends Error {
  constructor(code, message, httpStatus = 200) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function errorHandler(err, request, reply) {
  // zod 校验
  if (err instanceof ZodError) {
    return reply.code(400).send({
      code: ErrorCode.PARAM_ERROR,
      message: err.errors?.[0]?.message || '参数校验失败',
      data: null,
    });
  }
  // 限流（@fastify/rate-limit 抛出 FST_ERR_TOO_MANY_REQUESTS）
  if (err.statusCode === 429 || err.code === 'FST_ERR_TOO_MANY_REQUESTS') {
    return reply.code(429).send({
      code: 4291,
      message: err.message || '请求过于频繁',
      data: null,
    });
  }
  // Prisma 唯一约束冲突
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || '字段';
      return reply.code(409).send({
        code: ErrorCode.USERNAME_EXISTS,
        message: `${field}已存在`,
        data: null,
      });
    }
    if (err.code === 'P2025') {
      return reply.code(404).send({
        code: ErrorCode.USER_NOT_FOUND,
        message: '记录不存在',
        data: null,
      });
    }
  }
  // 自定义业务错误
  if (err instanceof BizError) {
    return reply.code(err.httpStatus).send({
      code: err.code,
      message: err.message,
      data: null,
    });
  }
  // 其它未知错误
  request.log.error({ err, url: request.url }, 'Unhandled error');
  return reply.code(500).send({
    code: ErrorCode.SERVER_ERROR,
    message: '服务器内部错误',
    data: null,
  });
}
