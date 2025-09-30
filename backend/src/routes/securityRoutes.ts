import { Router } from 'express';
import { securityController } from '../controllers/securityController';
import { authenticateToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// 修改密码验证规则
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少为6位'),
];

// 验证2FA验证规则
const verify2FAValidation = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
    .withMessage('验证码必须是6位数字'),
];

// 禁用2FA验证规则 - 密码可选
const disable2FAValidation = [
  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('密码不能为空'),
];

// 所有路由都需要认证
router.use(authenticateToken);

// 修改密码
router.post('/change-password', changePasswordValidation, handleValidationErrors, securityController.changePassword);

// 获取2FA状态
router.get('/2fa/status', securityController.getTwoFAStatus);

// 设置2FA
router.post('/2fa/setup', securityController.setup2FA);

// 验证2FA
router.post('/2fa/verify', securityController.verify2FA);

// 禁用2FA
router.post('/2fa/disable', disable2FAValidation, handleValidationErrors, securityController.disable2FA);


export default router;
