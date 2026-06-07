const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678',
  'qwerty', 'abc123', 'monkey', '123123', '654321',
  'superman', 'iloveyou', 'trustno1', 'dragon', 'baseball',
  'master', 'sunshine', 'ashley', 'bailey', 'shadow',
  '123qwe', 'zxcvbn', 'asdfgh', 'qazwsx', 'admin',
  'admin123', 'root', 'root123', 'toor', 'changeme',
  'welcome', 'welcome1', 'welcome123', 'letmein', 'passw0rd',
]);

const WEAK_PATTERNS = [
  /^[0-9]+$/,
  /^[a-z]+$/,
  /^[A-Z]+$/,
  /^[0-9a-z]+$/,
  /^[0-9A-Z]+$/,
  /^[a-zA-Z]+$/,
];

export function checkPasswordStrength(password) {
  if (!password) return { strength: 0, label: '无效', suggestions: [] };

  const suggestions = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else suggestions.push('密码长度至少8位');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else suggestions.push('包含小写字母');

  if (/[A-Z]/.test(password)) score += 1;
  else suggestions.push('包含大写字母');

  if (/[0-9]/.test(password)) score += 1;
  else suggestions.push('包含数字');

  if (/[^a-zA-Z0-9]/.test(password)) score += 2;
  else suggestions.push('包含特殊字符');

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = 0;
    suggestions.unshift('请勿使用常见密码');
  }

  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 2);
      break;
    }
  }

  if (/(\w)\1{3,}/.test(password)) {
    score -= 1;
    suggestions.push('避免连续重复字符');
  }

  if (/(\w{3,})\1+/.test(password)) {
    score -= 1;
    suggestions.push('避免重复模式');
  }

  let label;
  if (score <= 2) label = '弱';
  else if (score <= 4) label = '中';
  else if (score <= 6) label = '强';
  else label = '非常强';

  return { strength: Math.max(0, score), label, suggestions };
}

export function validatePassword(password) {
  const result = checkPasswordStrength(password);
  if (result.strength < 3) {
    return { valid: false, message: `密码强度不足（当前为"${result.label}"），建议：${result.suggestions.slice(0, 3).join('；')}` };
  }
  return { valid: true, message: '密码强度合格', strength: result };
}
