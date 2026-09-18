// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.user!.entityId!;
    const { productId, rating, title, body } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) throw new ApiError(404, "Product not found");

    // Check if the customer actually purchased this product
    const orders = await prisma.orderItem.findFirst({
      where: {
        productId,
        shipment: {
          order: { customerId }
        }
      }
    });

    if (!orders) throw new ApiError(403, "You can only review products you have purchased.");

    const review = await prisma.review.create({
      data: {
        productId,
        customerId,
        sellerId: product.sellerId,
        rating,
        title,
        body
      }
    });

    res.json(ApiResponse.success(review, "Review submitted"));
  } catch (error) {
    next(error);
  }
};
