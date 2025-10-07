import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有用户路由都需要认证
router.use(authenticateToken);

// 用户管理路由
router.get('/', UserController.getUsers);
// 获取可用的上级账户选项 - 必须在 /:id 路由之前定义
router.get('/parents', UserController.getAvailableParents);
router.get('/:id', UserController.getUserById);
router.post('/', UserController.createUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

// 用户资金操作  
router.post('/balance-operation', UserController.balanceOperation);

// 系统充值（仅 SUPER_ADMIN）
router.post('/system-recharge', UserController.systemRecharge);

// 管理员功能
router.post('/:id/reset-password', UserController.adminResetPassword);
router.post('/:id/passwordless-login', UserController.generatePasswordlessLogin);
router.post('/:id/reset-2fa', UserController.adminReset2FA);

export default router;