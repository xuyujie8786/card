import type { Request, Response } from 'express';

const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

async function getFakeCaptcha(_req: Request, res: Response) {
  await waitTime(2000);
  return res.json('captcha-xxx');
}

const { ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION } = process.env;

/**
 * 当前用户的权限，如果为空代表没登录
 * current user access， if is '', user need login
 * 如果是 pro 的预览，默认是有权限的
 */
let access =
  ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION === 'site' ? 'admin' : '';

const getAccess = () => {
  return access;
};

// 代码中会兼容本地 service mock 以及部署站点的静态数据
export default {
  // 支持值为 Object 和 Array
  'GET /api/currentUser': (_req: Request, res: Response) => {
    if (!getAccess()) {
      res.status(401).send({
        data: {
          isLogin: false,
        },
        errorCode: '401',
        errorMessage: '请先登录！',
        success: true,
      });
      return;
    }
    res.send({
      success: true,
      data: {
        name: 'Serati Ma',
        avatar:
          'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
        userid: '00000001',
        email: 'antdesign@alipay.com',
        signature: '海纳百川，有容乃大',
        title: '交互专家',
        group: '蚂蚁金服－某某某事业群－某某平台部－某某技术部－UED',
        tags: [
          {
            key: '0',
            label: '很有想法的',
          },
          {
            key: '1',
            label: '专注设计',
          },
          {
            key: '2',
            label: '辣~',
          },
          {
            key: '3',
            label: '大长腿',
          },
          {
            key: '4',
            label: '川妹子',
          },
          {
            key: '5',
            label: '海纳百川',
          },
        ],
        notifyCount: 12,
        unreadCount: 11,
        country: 'China',
        access: getAccess(),
        geographic: {
          province: {
            label: '浙江省',
            key: '330000',
          },
          city: {
            label: '杭州市',
            key: '330100',
          },
        },
        address: '西湖区工专路 77 号',
        phone: '0752-268888888',
      },
    });
  },
  // GET POST 可省略
  'GET /api/users': (req: Request, res: Response) => {
    // 检查Authorization头
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      res.status(401).send({
        code: 401,
        message: 'Access token is required',
        data: null,
      });
      return;
    }

    // 模拟用户数据
    const mockUsers = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        name: '系统管理员',
        role: 'SUPER_ADMIN',
        roleText: '超级管理员',
        status: 'ACTIVE',
        statusText: '正常',
        balance: 10000.00,
        creditLimit: 5000.00,
        currency: 'USD',
        availableAmount: 15000.00,
        parent: null,
        cardCount: 3,
        totalSpent: 2500.00,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        username: 'user001',
        email: 'user001@example.com',
        name: '张三',
        role: 'ADMIN',
        roleText: '管理员',
        status: 'ACTIVE',
        statusText: '正常',
        balance: 5000.00,
        creditLimit: 2000.00,
        currency: 'USD',
        availableAmount: 7000.00,
        parent: {
          id: 1,
          username: 'admin',
          name: '系统管理员',
        },
        cardCount: 2,
        totalSpent: 1500.00,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
      {
        id: 3,
        username: 'user002',
        email: 'user002@example.com',
        name: '李四',
        role: 'USER',
        roleText: '普通用户',
        status: 'ACTIVE',
        statusText: '正常',
        balance: 1000.00,
        creditLimit: 500.00,
        currency: 'USD',
        availableAmount: 1500.00,
        parent: {
          id: 2,
          username: 'user001',
          name: '张三',
        },
        cardCount: 1,
        totalSpent: 300.00,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      },
    ];

    res.send({
      code: 200,
      message: 'Users retrieved successfully',
      data: {
        list: mockUsers,
        pagination: {
          current: 1,
          pageSize: 20,
          total: mockUsers.length,
        },
      },
    });
  },
  'POST /api/login/account': async (req: Request, res: Response) => {
    const { password, username, type } = req.body;
    await waitTime(2000);
    if (password === 'ant.design' && username === 'admin') {
      res.send({
        status: 'ok',
        type,
        currentAuthority: 'admin',
        token: 'admin-token-123456',
      });
      access = 'admin';
      return;
    }
    if (password === 'ant.design' && username === 'user') {
      res.send({
        status: 'ok',
        type,
        currentAuthority: 'user',
        token: 'user-token-123456',
      });
      access = 'user';
      return;
    }
    if (type === 'mobile') {
      res.send({
        status: 'ok',
        type,
        currentAuthority: 'admin',
        token: 'mobile-token-123456',
      });
      access = 'admin';
      return;
    }

    res.send({
      status: 'error',
      type,
      currentAuthority: 'guest',
    });
    access = 'guest';
  },
  'POST /api/login/outLogin': (_req: Request, res: Response) => {
    access = '';
    res.send({ data: {}, success: true });
  },
  'POST /api/register': (_req: Request, res: Response) => {
    res.send({ status: 'ok', currentAuthority: 'user', success: true });
  },
  'GET /api/500': (_req: Request, res: Response) => {
    res.status(500).send({
      timestamp: 1513932555104,
      status: 500,
      error: 'error',
      message: 'error',
      path: '/base/category/list',
    });
  },
  'GET /api/404': (_req: Request, res: Response) => {
    res.status(404).send({
      timestamp: 1513932643431,
      status: 404,
      error: 'Not Found',
      message: 'No message available',
      path: '/base/category/list/2121212',
    });
  },
  'GET /api/403': (_req: Request, res: Response) => {
    res.status(403).send({
      timestamp: 1513932555104,
      status: 403,
      error: 'Forbidden',
      message: 'Forbidden',
      path: '/base/category/list',
    });
  },
  
  // 获取可选的上级用户列表
  'GET /api/users/parents': (req: Request, res: Response) => {
    // 检查Authorization头
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      res.status(401).send({
        code: 401,
        message: 'Access token is required',
        data: null,
      });
      return;
    }

    // 返回可作为上级的用户列表（超级管理员和管理员）
    const parentOptions = [
      {
        label: 'admin (超级管理员)',
        value: 1,
      },
      {
        label: 'user001 (管理员)',
        value: 2,
      },
    ];

    res.send({
      code: 200,
      message: 'success',
      data: parentOptions,
    });
  },
  
  // 创建用户
  'POST /api/users': (req: Request, res: Response) => {
    // 检查Authorization头
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      res.status(401).send({
        code: 401,
        message: 'Access token is required',
        data: null,
      });
      return;
    }

    const userData = req.body;
    
    // 初始化全局存储（如果不存在）
    if (!global.mockUsers) {
      global.mockUsers = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          name: '系统管理员',
          role: 'SUPER_ADMIN',
          roleText: '超级管理员',
          status: 'ACTIVE',
          statusText: '正常',
          balance: 10000.00,
          creditLimit: 5000.00,
          currency: 'USD',
          availableAmount: 15000.00,
          parent: null,
          cardCount: 3,
          totalSpent: 2500.00,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          username: 'user001',
          email: 'user001@example.com',
          name: '张三',
          role: 'ADMIN',
          roleText: '管理员',
          status: 'ACTIVE',
          statusText: '正常',
          balance: 5000.00,
          creditLimit: 2000.00,
          currency: 'USD',
          availableAmount: 7000.00,
          parent: {
            id: 1,
            username: 'admin',
            name: '系统管理员',
          },
          cardCount: 2,
          totalSpent: 1500.00,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 3,
          username: 'user002',
          email: 'user002@example.com',
          name: '李四',
          role: 'USER',
          roleText: '普通用户',
          status: 'ACTIVE',
          statusText: '正常',
          balance: 1000.00,
          creditLimit: 500.00,
          currency: 'USD',
          availableAmount: 1500.00,
          parent: {
            id: 2,
            username: 'user001',
            name: '张三',
          },
          cardCount: 1,
          totalSpent: 300.00,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
        },
      ];
    }
    
    // 生成新用户ID
    const newId = Math.max(...global.mockUsers.map(u => u.id)) + 1;
    
    // 创建新用户
    const newUser = {
      id: newId,
      username: userData.username,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      roleText: userData.role === 'ADMIN' ? '管理员' : userData.role === 'SUPER_ADMIN' ? '超级管理员' : '子账户',
      status: userData.status || 'ACTIVE',
      statusText: '正常',
      balance: userData.balance || 0,
      creditLimit: userData.creditLimit || 0,
      currency: userData.currency || 'USD',
      availableAmount: (userData.balance || 0) + (userData.creditLimit || 0),
      parent: userData.parentId ? {
        id: userData.parentId,
        username: userData.parentId === 1 ? 'admin' : 'user001',
        name: userData.parentId === 1 ? '系统管理员' : '张三',
      } : null,
      cardCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 将新用户添加到存储中
    global.mockUsers.push(newUser);

    res.send({
      code: 200,
      message: '用户创建成功',
      data: newUser,
    });
  },
  
  'GET /api/401': (_req: Request, res: Response) => {
    res.status(401).send({
      timestamp: 1513932555104,
      status: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
      path: '/base/category/list',
    });
  },

  'GET  /api/login/captcha': getFakeCaptcha,
};
