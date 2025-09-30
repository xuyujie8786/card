import prisma from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth';
import logger from '../config/logger';

export class AuthService {
  /**
   * 用户登录
   */
  static async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { username, password } = loginData;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        passwordHash: true,
        balance: true,
        creditLimit: true,
        currency: true,
      },
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // 检查用户状态
    if (user.status !== 'ACTIVE') {
      throw new Error('Account is disabled');
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // 生成 JWT Token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      name: user.name || undefined,
    });

    // 计算可用金额
    const availableAmount = user.balance.toNumber() + user.creditLimit.toNumber();

    logger.info(`User ${user.username} logged in successfully`);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name || '',
        role: user.role,
        balance: user.balance.toNumber(),
        creditLimit: user.creditLimit.toNumber(),
        currency: user.currency,
        availableAmount,
      },
    };
  }

  /**
   * 用户注册（仅超级管理员可以创建其他用户）
   */
  static async register(registerData: RegisterRequest): Promise<{ message: string }> {
    const { username, email, name, password } = registerData;

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('Username already exists');
      }
      if (existingUser.email === email) {
        throw new Error('Email already exists');
      }
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        name,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        balance: 0,
        creditLimit: 0,
        currency: 'USD',
      },
    });

    logger.info(`New user registered: ${user.username}`);

    return { message: 'User registered successfully' };
  }

  /**
   * 获取用户信息
   */
  static async getUserById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        balance: true,
        creditLimit: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      balance: user.balance.toNumber(),
      creditLimit: user.creditLimit.toNumber(),
      availableAmount: user.balance.toNumber() + user.creditLimit.toNumber(),
    };
  }

  /**
   * 验证用户权限
   */
  static async checkUserPermission(userId: number, requiredRoles: string[]): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
