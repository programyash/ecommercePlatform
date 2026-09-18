import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

const router = Router();

// Mock endpoints to test authorization boundaries

router.get("/customer-only", authenticate, requireRole([Role.CUSTOMER]), (req: Request, res: Response) => {
  res.json(ApiResponse.success(null, "Customer route accessed"));
});

router.get("/seller-only", authenticate, requireRole([Role.SELLER]), (req: Request, res: Response) => {
  res.json(ApiResponse.success(null, "Seller route accessed"));
});

router.get("/admin-only", authenticate, requireRole([Role.ADMIN]), (req: Request, res: Response) => {
  res.json(ApiResponse.success(null, "Admin route accessed"));
});

// Test Customer A accessing Customer B
router.get("/customers/:id/private", authenticate, requireRole([Role.CUSTOMER]), (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.entityId !== req.params.id) {
    return next(new ApiError(403, "Access denied. Cannot access another customer's data.", "FORBIDDEN"));
  }
  res.json(ApiResponse.success(null, "Own customer data accessed"));
});

// Test Seller A accessing Seller B
router.get("/sellers/:id/private", authenticate, requireRole([Role.SELLER]), (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.entityId !== req.params.id) {
    return next(new ApiError(403, "Access denied. Cannot access another seller's data.", "FORBIDDEN"));
  }
  res.json(ApiResponse.success(null, "Own seller data accessed"));
});

export default router;
