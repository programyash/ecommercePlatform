import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Role, CustomerStatus, SellerStatus } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const JWT_EXPIRES_IN = "1d";

const generateToken = (userId: string, role: Role, entityId?: string) => {
  return jwt.sign({ userId, role, entityId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, name, phone, legalName, gstin, pan } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ApiError(400, "Email already in use", "EMAIL_EXISTS"));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
        },
      });

      if (role === Role.CUSTOMER) {
        await tx.customer.create({
          data: {
            userId: newUser.id,
            name,
            phone: phone || "",
            status: CustomerStatus.ACTIVE,
          },
        });
      } else if (role === Role.SELLER) {
        await tx.seller.create({
          data: {
            userId: newUser.id,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            displayName: name,
            legalName: legalName!,
            ownerName: name,
            phone: phone || "",
            gstin,
            pan: pan!,
            city: "",
            state: "",
            stateCode: "",
            pickupAddress: {},
            bank: {},
            status: SellerStatus.UNDER_REVIEW,
          },
        });
      }

      return newUser;
    });

    res.status(201).json(ApiResponse.success({ id: user.id, email: user.email, role: user.role }, "Registration successful"));
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true, seller: true, admin: true },
    });

    if (!user) {
      return next(new ApiError(401, "Invalid email or password", "AUTH_FAILED"));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new ApiError(401, "Invalid email or password", "AUTH_FAILED"));
    }

    let entityId;
    if (user.role === Role.CUSTOMER) entityId = user.customer?.id;
    else if (user.role === Role.SELLER) entityId = user.seller?.id;
    else if (user.role === Role.ADMIN) entityId = user.admin?.id;

    const token = generateToken(user.id, user.role, entityId);

    res.status(200).json(
      ApiResponse.success({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          entityId,
        },
      }, "Login successful")
    );
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated", "UNAUTHORIZED"));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return next(new ApiError(404, "User not found", "USER_NOT_FOUND"));
    }

    res.status(200).json(ApiResponse.success({ user }, "Current user retrieved"));
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't leak that the user doesn't exist
      return res.status(200).json(ApiResponse.success(null, "If an account with that email exists, we sent a password reset link."));
    }

    const resetToken = require("crypto").randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires,
      },
    });

    // In a real app, send email with resetToken here.
    // For demo purposes, we return the unhashed token.
    res.status(200).json(ApiResponse.success({ resetToken }, "Password reset link sent (demo token provided)"));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    // We would typically find the user by email or the token itself if stored unhashed.
    // Since we hashed the token, we need the user to send their email as well, OR we can lookup all valid tokens (expensive).
    // Let's modify the requirement to require email + token, or just decode if it was a JWT.
    // Since it's a random hex string, let's assume the frontend passes the email in the request.
    const { email } = req.body;

    if (!email) {
      return next(new ApiError(400, "Email is required to reset password", "VALIDATION_ERROR"));
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      return next(new ApiError(400, "Invalid or expired reset token", "INVALID_TOKEN"));
    }

    if (user.resetPasswordExpires < new Date()) {
      return next(new ApiError(400, "Reset token has expired", "EXPIRED_TOKEN"));
    }

    const isValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isValid) {
      return next(new ApiError(400, "Invalid reset token", "INVALID_TOKEN"));
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(200).json(ApiResponse.success(null, "Password has been reset successfully"));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  // For stateless JWT, logout is handled client-side by dropping the token.
  res.status(200).json(ApiResponse.success(null, "Logged out successfully"));
};
