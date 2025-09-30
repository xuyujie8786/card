import { Response } from 'express';
import { ApiResponse, PaginationResponse } from '../types/api';

/**
 * 成功响应
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  code: number = 200
): Response<ApiResponse<T>> => {
  return res.status(code).json({
    code,
    message,
    data,
  });
};

/**
 * 分页成功响应
 */
export const paginationResponse = <T>(
  res: Response,
  list: T[],
  total: number,
  current: number,
  pageSize: number,
  message: string = 'Success'
): Response<ApiResponse<PaginationResponse<T>>> => {
  return res.status(200).json({
    code: 200,
    message,
    data: {
      list,
      pagination: {
        current,
        pageSize,
        total,
      },
    },
  });
};

/**
 * 错误响应
 */
export const errorResponse = (
  res: Response,
  message: string,
  code: number = 400,
  data: any = null
): Response<ApiResponse> => {
  return res.status(code).json({
    code,
    message,
    data,
  });
};

/**
 * 未找到响应
 */
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response<ApiResponse> => {
  return errorResponse(res, message, 404);
};

/**
 * 未授权响应
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response<ApiResponse> => {
  return errorResponse(res, message, 401);
};

/**
 * 禁止访问响应
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Forbidden'
): Response<ApiResponse> => {
  return errorResponse(res, message, 403);
};

/**
 * 服务器错误响应
 */
export const serverErrorResponse = (
  res: Response,
  message: string = 'Internal Server Error'
): Response<ApiResponse> => {
  return errorResponse(res, message, 500);
};
