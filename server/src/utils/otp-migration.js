export function parseOtpMigrationUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL为空' };
  }

  if (!url.startsWith('otpauth-migration://')) {
    return { valid: false, error: 'URL格式错误，应以 otpauth-migration:// 开头' };
  }

  try {
    const parsed = new URL(url);
    const dataParam = parsed.searchParams.get('data');
    if (!dataParam) {
      return { valid: false, error: '缺少 data 参数' };
    }

    const dataBase64 = dataParam.replace(/\s/g, '+');
    const binaryData = Buffer.from(dataBase64, 'base64');

    const otps = parseMigrationPayload(binaryData);
    return { valid: true, data: otps };
  } catch (err) {
    return { valid: false, error: 'URL解析失败: ' + err.message };
  }
}

function parseMigrationPayload(buffer) {
  const otps = [];
  let offset = 0;

  while (offset < buffer.length) {
    const [fieldNum, wireType] = decodeVarint(buffer, offset);
    if (wireType === 0) {
      offset += varintLength(buffer, offset);
    } else if (wireType === 2) {
      const [length, lenBytes] = decodeVarint(buffer, offset + 1);
      const fieldOffset = offset + 1 + lenBytes;

      if (fieldNum === 1) {
        const otp = parseOtpParameters(buffer.slice(fieldOffset, fieldOffset + length));
        otps.push(otp);
      }

      offset = fieldOffset + length;
    } else {
      offset += 1;
    }
  }

  return otps;
}

function parseOtpParameters(buffer) {
  const otp = {
    secret: '',
    name: '',
    issuer: '',
    algorithm: 'SHA1',
    digits: 6,
    type: 'totp',
    counter: null,
  };

  let offset = 0;

  while (offset < buffer.length) {
    const [fieldNum, wireType] = decodeVarint(buffer, offset);

    if (wireType === 0) {
      const [value, lenBytes] = decodeVarint(buffer, offset + 1);
      offset += 1 + lenBytes;

      switch (fieldNum) {
        case 4:
          otp.algorithm = 'SHA1';
          break;
        case 5:
          otp.digits = value;
          break;
        case 6:
          otp.type = value === 1 ? 'hotp' : 'totp';
          break;
        case 7:
          otp.counter = value;
          break;
      }
    } else if (wireType === 2) {
      const [length, lenBytes] = decodeVarint(buffer, offset + 1);
      const fieldOffset = offset + 1 + lenBytes;
      const fieldData = buffer.slice(fieldOffset, fieldOffset + length);

      switch (fieldNum) {
        case 1:
          otp.secret = base32Encode(fieldData);
          break;
        case 2:
          otp.name = fieldData.toString('utf-8');
          break;
        case 3:
          otp.issuer = fieldData.toString('utf-8');
          break;
      }

      offset = fieldOffset + length;
    } else {
      offset += 1;
    }
  }

  return otp;
}

function decodeVarint(buffer, offset) {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  while (offset < buffer.length) {
    const byte = buffer[offset];
    bytesRead++;
    value |= (byte & 0x7F) << shift;

    if ((byte & 0x80) === 0) {
      break;
    }

    shift += 7;
    offset++;
  }

  return [value, bytesRead];
}

function varintLength(buffer, offset) {
  let length = 0;
  while (offset < buffer.length && (buffer[offset] & 0x80) !== 0) {
    length++;
    offset++;
  }
  return length + 1;
}

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

export function buildOtpauthUrl(otp) {
  const params = new URLSearchParams();
  params.set('secret', otp.secret);

  if (otp.issuer) {
    params.set('issuer', otp.issuer);
  }

  if (otp.digits && otp.digits !== 6) {
    params.set('digits', otp.digits.toString());
  }

  if (otp.type === 'hotp' && otp.counter !== null) {
    params.set('counter', otp.counter.toString());
  }

  const label = otp.issuer ? `${otp.issuer}:${otp.name}` : otp.name;
  return `otpauth://${otp.type}/${encodeURIComponent(label)}?${params.toString()}`;
}