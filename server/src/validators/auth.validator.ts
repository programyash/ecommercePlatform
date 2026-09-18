import { z } from "zod";
import { Role } from "@prisma/client";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    role: z.nativeEnum(Role).optional().default(Role.CUSTOMER),
    name: z.string().min(2, "Name must be at least 2 characters long"),
    phone: z.string().min(10, "Phone must be at least 10 characters long").optional(),
    
    // For sellers
    legalName: z.string().optional(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
  }).refine((data) => {
    if (data.role === Role.SELLER) {
      return !!data.legalName && !!data.pan;
    }
    return true;
  }, {
    message: "legalName and pan are required for SELLER role",
    path: ["body"],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});
