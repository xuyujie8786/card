const crypto = require('crypto');

// 标准的TOTP算法实现
function generateTOTP(secret, time) {
  // Base32解码
  function base32Decode(encoded) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    encoded = encoded.toUpperCase().replace(/=+$/, '');
    
    let bits = '';
    for (let i = 0; i < encoded.length; i++) {
      const val = alphabet.indexOf(encoded[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      if (i + 8 <= bits.length) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
      }
    }
    
    return Buffer.from(bytes);
  }

  const timeStep = 30;
  const currentTime = Math.floor(time / 1000 / timeStep);
  
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(Math.floor(currentTime / 0x100000000), 0);
  timeBuffer.writeUInt32BE(currentTime & 0xffffffff, 4);
  
  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = (hash[offset] & 0x7f) << 24 |
               (hash[offset + 1] & 0xff) << 16 |
               (hash[offset + 2] & 0xff) << 8 |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

// 测试用的密钥（从新生成的QR码中看到的）
const secret = 'PNDCU7DW2GJQGLS6KHUGTDI7XY2QZP5G';

console.log('Secret:', secret);
console.log('Secret length:', secret.length);
const now = Date.now();

console.log('当前时间:', new Date(now).toISOString());
console.log('当前时间戳:', now);
console.log('时间步:', Math.floor(now / 1000 / 30));

// 生成当前时间的TOTP
const currentTOTP = generateTOTP(secret, now);
console.log('当前TOTP:', currentTOTP);

// 生成前后几个时间窗口的TOTP
for (let i = -2; i <= 2; i++) {
  const time = now + (i * 30 * 1000);
  const totp = generateTOTP(secret, time);
  console.log(`时间偏移 ${i*30}s: ${totp} (时间: ${new Date(time).toISOString()})`);
}
