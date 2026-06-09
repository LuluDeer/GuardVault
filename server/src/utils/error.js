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

function formatZodErrorMessage(message) {
  if (!message) return '参数校验失败';
  
  // 处理密码长度错误
  if (message.includes('password') && message.includes('fewer than')) {
    const minLength = message.match(/(\d+)/)?.[1];
    return `密码长度不能少于${minLength || 6}个字符`;
  }
  
  // 处理必填字段错误
  if (message.includes('Required')) {
    const field = message.replace(/["'\[\]]/g, '').split('.').pop();
    const fieldMap = {
      username: '用户名',
      password: '密码',
      role: '角色',
      name: '名称',
      category: '分类',
      deptId: '部门',
      identifier: '账号',
      url: '地址',
      secret: '密钥',
    };
    const fieldName = fieldMap[field] || field;
    return `${fieldName}不能为空`;
  }
  
  // 处理最小长度错误
  if (message.includes('must NOT have fewer than')) {
    const [, field, minLength] = message.match(/["']([^"']+)["'].*?(\d+)/) || [];
    const fieldMap = {
      username: '用户名',
      password: '密码',
    };
    const fieldName = fieldMap[field] || field;
    return `${fieldName}长度不能少于${minLength}个字符`;
  }
  
  // 处理最大长度错误
  if (message.includes('must NOT have more than')) {
    const [, field, maxLength] = message.match(/["']([^"']+)["'].*?(\d+)/) || [];
    const fieldMap = {
      username: '用户名',
      password: '密码',
    };
    const fieldName = fieldMap[field] || field;
    return `${fieldName}长度不能超过${maxLength}个字符`;
  }
  
  // 处理格式错误
  if (message.includes('must be a valid')) {
    const field = message.split('.').pop().replace(/["'\s]/g, '');
    const fieldMap = {
      email: '邮箱',
      url: 'URL',
    };
    const fieldName = fieldMap[field] || field;
    return `${fieldName}格式不正确`;
  }
  
  // 默认处理：移除路径信息，只保留字段名和错误描述
  const cleanMessage = message.replace(/(body|params|query)\./g, '');
  return cleanMessage;
}

export function errorHandler(err, request, reply) {
  // zod 校验
  if (err instanceof ZodError) {
    const originalMessage = err.errors?.[0]?.message || '参数校验失败';
    const friendlyMessage = formatZodErrorMessage(originalMessage);
    return reply.code(400).send({
      code: ErrorCode.PARAM_ERROR,
      message: friendlyMessage,
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
      const fieldMap = {
        username: '用户名',
        name: '名称',
        code: '编码',
      };
      const fieldName = fieldMap[field] || field;
      return reply.code(409).send({
        code: ErrorCode.USERNAME_EXISTS,
        message: `${fieldName}已存在`,
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
  if (err.message === 'TOKEN_REVOKED') {
    return reply.code(401).send({
      code: ErrorCode.TOKEN_REVOKED,
      message: 'Token已被吊销，请重新登录',
      data: null,
    });
  }
  request.log.error({ err, url: request.url }, 'Unhandled error');
  return reply.code(500).send({
    code: ErrorCode.SERVER_ERROR,
    message: '服务器内部错误',
    data: null,
  });
}
