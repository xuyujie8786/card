import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// 登录验证规则
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// 注册验证规则
const registerValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

// 免密登录验证规则
const passwordlessLoginValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Token format is invalid'),
  body('userId')
    .isNumeric()
    .withMessage('UserId must be a number')
    .toInt(),
];

// 路由定义
router.post('/login', loginLimiter, validate(loginValidation), AuthController.login);
router.post('/passwordless-login', validate(passwordlessLoginValidation), AuthController.passwordlessLogin);
router.post('/register', validate(registerValidation), AuthController.register);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.get('/me', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/refresh', authenticateToken, AuthController.refreshToken);

export default router;
