import bcrypt from 'bcryptjs';

/**
 * 哈希密码
 * @param password 原始密码
 * @returns 哈希后的密码
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * 验证密码
 * @param password 原始密码
 * @param hashedPassword 哈希密码
 * @returns 是否匹配
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * 生成随机密码
 * @param length 密码长度
 * @returns 随机密码
 */
export const generateRandomPassword = (length: number = 8): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};


