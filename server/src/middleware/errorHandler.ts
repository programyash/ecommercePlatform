import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let code = "INTERNAL_ERROR";
  let details = {};

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details || {};
  } else {
    // Handle Prisma or Zod errors globally here if needed
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new ApiError(404, `Not Found - ${req.originalUrl}`, "NOT_FOUND"));
};
