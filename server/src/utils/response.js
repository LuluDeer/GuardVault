/**
 * 统一成功响应
 * @param {object} reply - Fastify reply对象
 * @param {any} data - 业务数据
 * @param {string} message - 提示信息
 */
export function success(reply, data = null, message = 'ok') {
  return reply.code(200).send({ code: 0, message, data });
}

/**
 * 统一失败响应
 * @param {object} reply - Fastify reply对象
 * @param {number} code - 业务错误码
 * @param {string} message - 错误描述
 * @param {number} httpStatus - HTTP状态码
 */
export function fail(reply, code, message, httpStatus = 200) {
  return reply.code(httpStatus).send({ code, message, data: null });
}

// 错误码常量
export const ErrorCode = {
  SUCCESS: 0,
  PARAM_ERROR: 1001,
  WRONG_CREDENTIALS: 1002,
  ACCOUNT_DISABLED: 1003,
  ACCOUNT_LOCKED: 1004,
  TOKEN_INVALID: 1005,
  FORBIDDEN: 1006,
  USER_NOT_FOUND: 1007,
  TOTP_NOT_ENABLED: 1008,
  USERNAME_EXISTS: 1009,
  WRONG_OLD_PASSWORD: 1010,
  SERVER_ERROR: 5000,
};
