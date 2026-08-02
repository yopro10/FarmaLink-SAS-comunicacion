import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ErrorHandler {
  public static handle(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    console.error(`[ERROR] ${statusCode}: ${message}`);

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  public static createError(message: string, statusCode: number): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
  }
}

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = ErrorHandler.createError(`Ruta no encontrada: ${req.originalUrl}`, 404);
  next(error);
};
