/**
 * OpenAPI 复用 Schema 集合
 * 在 app.js 的 swagger 配置中通过 refName 引用，路由 schema 中用 $ref 引用
 *
 * 同时导出一个 fastify 插件，在 app.js 中注册后会把所有 schema 通过 addSchema
 * 注册为 fastify 全局可复用 schema（$id 形如 "Name#"），
 * 路由的 $ref: 'Name#' 可在运行时校验和 OpenAPI 文档里解析。
 */

export const openApiSchemas = {
  // ===== 基础响应 =====
  ApiResponse: {
    type: 'object',
    properties: {
      code: { type: 'integer', description: '业务状态码，0=成功' },
      message: { type: 'string' },
      data: { description: '业务数据，任意类型' },
    },
    required: ['code', 'message'],
  },
  Error: {
    type: 'object',
    properties: {
      code: { type: 'integer', description: '业务错误码' },
      message: { type: 'string', description: '错误描述' },
      data: { type: 'null' },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
      total: { type: 'integer' },
    },
  },

  // ===== 认证 =====
  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string' },
      password: { type: 'string', format: 'password' },
      totp: { type: 'string', description: '6 位 TOTP 码（管理员开启 2FA 后必填）' },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'JWT token' },
      user: { $ref: 'User#' },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['oldPassword', 'newPassword'],
    properties: {
      oldPassword: { type: 'string', format: 'password' },
      newPassword: { type: 'string', format: 'password', minLength: 8, maxLength: 64 },
    },
  },

  // ===== 用户 =====
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      username: { type: 'string' },
      displayName: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['super_admin', 'dept_admin', 'user'] },
      departmentId: { type: 'integer', nullable: true },
      departmentName: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      totpEnabled: { type: 'boolean' },
      status: { type: 'integer', description: '1=正常 0=禁用' },
      failCount: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateUserRequest: {
    type: 'object',
    required: ['username', 'password', 'role'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 32 },
      password: { type: 'string', minLength: 8, maxLength: 64 },
      displayName: { type: 'string' },
      role: { type: 'string', enum: ['super_admin', 'dept_admin', 'user'] },
      departmentId: { type: 'integer' },
      email: { type: 'string', format: 'email' },
    },
  },
  InitSystemRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 4, maxLength: 32 },
      password: { type: 'string', minLength: 6, maxLength: 128 },
    },
  },
  UpdateUserRequest: {
    type: 'object',
    properties: {
      displayName: { type: 'string' },
      role: { type: 'string', enum: ['super_admin', 'dept_admin', 'user'] },
      departmentId: { type: 'integer' },
      email: { type: 'string', format: 'email' },
      status: { type: 'integer' },
      password: { type: 'string', minLength: 6, maxLength: 64, description: '可选：管理员重置密码' },
    },
  },

  // ===== TOTP =====
  EnableTotpResponse: {
    type: 'object',
    properties: {
      otpauth: { type: 'string', description: 'otpauth URI，用于二维码' },
      secret: { type: 'string', description: '明文 secret（仅显示一次）' },
    },
  },
  TotpCodeResponse: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      remaining: { type: 'integer', description: '剩余有效秒数' },
      period: { type: 'integer' },
    },
  },
  BatchResetTotpRequest: {
    type: 'object',
    required: ['userIds'],
    properties: {
      userIds: { type: 'array', items: { type: 'integer' } },
    },
  },

  // ===== 部门 =====
  Department: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string', nullable: true },
      parentId: { type: 'integer', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateDepartmentRequest: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      name: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string' },
      parentId: { type: 'integer' },
    },
  },
  UpdateDepartmentRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string' },
      parentId: { type: 'integer' },
    },
  },

  // ===== 服务 =====
  Service: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      category: { type: 'string' },
      description: { type: 'string', nullable: true },
      icon: { type: 'string', nullable: true },
      url: { type: 'string', nullable: true },
      username: { type: 'string', nullable: true },
      departmentId: { type: 'integer', nullable: true },
      departmentName: { type: 'string', nullable: true },
      hasSecret: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateServiceRequest: {
    type: 'object',
    required: ['name', 'secret'],
    properties: {
      name: { type: 'string' },
      category: { type: 'string', default: 'other' },
      description: { type: 'string' },
      icon: { type: 'string' },
      url: { type: 'string' },
      username: { type: 'string' },
      secret: { type: 'string', description: 'TOTP secret（Base32 字符串）' },
      issuer: { type: 'string' },
      departmentId: { type: 'integer' },
    },
  },
  UpdateServiceRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      category: { type: 'string' },
      description: { type: 'string' },
      icon: { type: 'string' },
      url: { type: 'string' },
      username: { type: 'string' },
      issuer: { type: 'string' },
      departmentId: { type: 'integer' },
    },
  },
  ResetSecretRequest: {
    type: 'object',
    required: ['secret'],
    properties: {
      secret: { type: 'string' },
    },
  },
  BatchImportServiceItem: {
    type: 'object',
    required: ['name', 'secret'],
    properties: {
      name: { type: 'string' },
      category: { type: 'string' },
      secret: { type: 'string' },
      url: { type: 'string' },
      username: { type: 'string' },
      issuer: { type: 'string' },
      icon: { type: 'string' },
      description: { type: 'string' },
    },
  },
  BatchImportRequest: {
    type: 'object',
    required: ['services'],
    properties: {
      services: { type: 'array', items: { $ref: 'BatchImportServiceItem#' } },
    },
  },
  ScanOtpauthRequest: {
    type: 'object',
    required: ['otpauth'],
    properties: {
      otpauth: { type: 'string', description: 'otpauth://totp/... URI' },
      category: { type: 'string' },
      departmentId: { type: 'integer' },
    },
  },

  // ===== 授权 =====
  Grant: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      serviceId: { type: 'integer' },
      grantedBy: { type: 'integer', nullable: true },
      grantedAt: { type: 'string', format: 'date-time' },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  GrantRequest: {
    type: 'object',
    required: ['userId', 'accountId'],
    properties: {
      userId: { type: 'integer' },
      accountId: { type: 'integer' },
      expiresAt: { type: 'string', format: 'date-time', nullable: true, description: '授权过期时间，不传则为永久' },
    },
  },
  RevokeRequest: {
    type: 'object',
    required: ['userId', 'accountId'],
    properties: {
      userId: { type: 'integer' },
      accountId: { type: 'integer' },
    },
  },
  BatchGrantRequest: {
    type: 'object',
    required: ['userIds', 'accountId'],
    properties: {
      userIds: { type: 'array', items: { type: 'integer' } },
      accountId: { type: 'integer' },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  BatchRevokeRequest: {
    type: 'object',
    required: ['userIds', 'accountId'],
    properties: {
      userIds: { type: 'array', items: { type: 'integer' } },
      accountId: { type: 'integer' },
    },
  },

  // ===== 日志 =====
  SystemLog: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer', nullable: true },
      username: { type: 'string', nullable: true },
      action: { type: 'string' },
      resource: { type: 'string', nullable: true },
      resourceId: { type: 'string', nullable: true },
      ip: { type: 'string', nullable: true },
      userAgent: { type: 'string', nullable: true },
      detail: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  LogQuery: {
    type: 'object',
    properties: {
      page: { type: 'integer', default: 1 },
      pageSize: { type: 'integer', default: 20, maximum: 200 },
      userId: { type: 'integer' },
      action: { type: 'string' },
      resource: { type: 'string' },
      startTime: { type: 'string' },
      endTime: { type: 'string' },
    },
  },

  // ===== 配置 =====
  SystemConfig: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      configKey: { type: 'string' },
      configValue: { type: 'string' },
      description: { type: 'string', nullable: true },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  SetConfigRequest: {
    type: 'object',
    required: ['key', 'value'],
    properties: {
      key: { type: 'string' },
      value: { type: 'string' },
      description: { type: 'string' },
    },
  },

  // ===== 收藏 =====
  Favorite: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      serviceId: { type: 'integer' },
      sortOrder: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  AddFavoriteRequest: {
    type: 'object',
    required: ['serviceId'],
    properties: {
      serviceId: { type: 'integer' },
    },
  },
  RemoveFavoriteRequest: {
    type: 'object',
    required: ['serviceId'],
    properties: {
      serviceId: { type: 'integer' },
    },
  },
  ReorderFavoriteRequest: {
    type: 'object',
    required: ['serviceIds'],
    properties: {
      serviceIds: { type: 'array', items: { type: 'integer' } },
    },
  },

  // ===== 复制上报 =====
  CopyReportRequest: {
    type: 'object',
    required: ['serviceId'],
    properties: {
      serviceId: { type: 'integer' },
    },
  },

  // ===== 通用 =====
  IdParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer' },
    },
  },
};

/**
 * Fastify 插件：把 openApiSchemas 全部 addSchema 到 fastify 上下文，
 * 使路由的 $ref: 'Name#' 可以在运行时和 OpenAPI 文档里解析
 */
export default async function sharedSchemasPlugin(fastify) {
  for (const [name, schema] of Object.entries(openApiSchemas)) {
    fastify.addSchema({ ...schema, $id: name });
  }
}
