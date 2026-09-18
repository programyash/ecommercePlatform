// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { ProductStatus, Prisma } from "@prisma/client";

export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, category, seller, minPrice, maxPrice, page, limit, sort } = req.query as any;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * take;

    // Build the where clause
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.LIVE, // Customers can only see APPROVED products
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;
    if (seller) where.sellerId = seller;
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.variants = {
        some: {
          price: {
            gte: minPrice ? parseFloat(minPrice) : undefined,
            lte: maxPrice ? parseFloat(maxPrice) : undefined,
          }
        }
      };
    }

    // Build sort
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === "price_asc") {
      orderBy = { variants: { _count: 'asc' } }; // Simplified for now, real DB needs complex sort or materialized views for exact min variant price
    } else if (sort === "price_desc") {
      orderBy = { variants: { _count: 'desc' } };
    } else if (sort === "rating") {
      orderBy = { rating: "desc" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: { select: { id: true, displayName: true } },
          category: { select: { id: true, name: true } },
          variants: {
            where: { stock: { gt: 0 } },
            take: 1, // Only grab one default variant for listing
          }
        },
        orderBy,
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        items: products,
        page: pageNum,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      },
      include: {
        seller: { select: { id: true, displayName: true, city: true, state: true } },
        category: { select: { id: true, name: true, slug: true } },
        variants: true,
        reviews: {
          where: { status: 'published' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { name: true } } }
        }
      },
    });

    if (!product) {
      return next(new ApiError(404, "Product not found", "NOT_FOUND"));
    }

    // Check visibility
    // If not approved, only Admin or the product's Seller can view it
    if (product.status !== ProductStatus.LIVE) {
      const user = req.user;
      if (!user) {
         return next(new ApiError(404, "Product not found", "NOT_FOUND"));
      }
      if (user.role === "CUSTOMER") {
         return next(new ApiError(404, "Product not found", "NOT_FOUND"));
      }
      if (user.role === "SELLER" && user.entityId !== product.sellerId) {
         return next(new ApiError(404, "Product not found", "NOT_FOUND"));
      }
    }

    res.status(200).json(ApiResponse.success(product));
  } catch (error) {
    next(error);
  }
};
