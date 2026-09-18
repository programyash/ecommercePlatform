import { Router } from "express";
import { register, login, logout, getCurrentUser, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { validate } from "../middleware/validateRequest";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validator";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
