/**
 * 解析 otpauth:// URI
 * 格式: otpauth://totp/ISSUER:ACCOUNT?secret=SECRET&issuer=ISSUER&algorithm=ALGORITHM&digits=DIGITS&period=PERIOD
 * 或:    otpauth://totp/ACCOUNT?secret=SECRET&...
 */
export function parseOtpauthUri(uri) {
  if (!uri || typeof uri !== 'string') {
    return { valid: false, error: 'URI为空' };
  }

  if (!uri.startsWith('otpauth://')) {
    return { valid: false, error: 'URI格式错误，应以 otpauth:// 开头' };
  }

  try {
    const url = new URL(uri);
    if (url.protocol !== 'otpauth:') {
      return { valid: false, error: '协议错误，应为 otpauth' };
    }

    if (url.host !== 'totp') {
      return { valid: false, error: '仅支持 TOTP 协议' };
    }

    const label = decodeURIComponent(url.pathname.replace(/^\//, ''));
    let issuer = url.searchParams.get('issuer') || '';
    let account = label;

    if (label.includes(':')) {
      const parts = label.split(':');
      issuer = issuer || parts[0];
      account = parts[1] || parts[0];
    }

    const secret = url.searchParams.get('secret');
    if (!secret) {
      return { valid: false, error: '缺少 secret 参数' };
    }

    const algorithm = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase();
    const digits = parseInt(url.searchParams.get('digits') || '6', 10);
    const period = parseInt(url.searchParams.get('period') || '30', 10);

    if (!/^[A-Z2-7]+=*$/.test(secret.toUpperCase().replace(/\s/g, ''))) {
      return { valid: false, error: '密钥格式错误，应为Base32编码' };
    }

    return {
      valid: true,
      data: {
        issuer: issuer || '',
        account: account || '',
        secret: secret.toUpperCase().replace(/\s/g, ''),
        algorithm: ['SHA1', 'SHA256', 'SHA512'].includes(algorithm) ? algorithm : 'SHA1',
        digits: [4, 6, 8].includes(digits) ? digits : 6,
        period: [15, 30, 60].includes(period) ? period : 30,
      },
    };
  } catch (err) {
    return { valid: false, error: 'URI解析失败: ' + err.message };
  }
}