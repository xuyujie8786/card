import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有用户路由都需要认证
router.use(authenticateToken);

// 用户管理路由
router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);
router.post('/', UserController.createUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

// 用户资金操作
router.post('/:id/balance', UserController.balanceOperation);
router.get('/:id/balance-logs', UserController.getBalanceLogs);

export default router;