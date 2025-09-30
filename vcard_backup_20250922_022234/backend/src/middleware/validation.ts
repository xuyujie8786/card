import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      code: 400,
      message: 'Validation failed',
      data: null,
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined,
      })),
    });
    return;
  }
  
  next();
};

// 验证中间件包装器
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 运行所有验证
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // 检查验证结果
    handleValidationErrors(req, res, next);
  };
};
