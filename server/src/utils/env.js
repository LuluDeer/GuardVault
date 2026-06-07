// 启动时校验关键环境变量，缺一即拒启
export function assertEnv() {
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    TOTP_MASTER_KEY: process.env.TOTP_MASTER_KEY,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v || v.startsWith('REPLACE_WITH'))
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `[FATAL] 缺少或未替换环境变量: ${missing.join(', ')}\n` +
      '请先复制 .env.example 为 .env 并填入真实值。\n' +
      '生成示例:\n' +
      '  JWT_SECRET:        node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n' +
      '  TOTP_MASTER_KEY:   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(process.env.TOTP_MASTER_KEY)) {
    throw new Error('[FATAL] TOTP_MASTER_KEY 必须是 64 位 hex 字符串（32 字节）');
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('[FATAL] JWT_SECRET 长度至少 32 位');
  }
}
