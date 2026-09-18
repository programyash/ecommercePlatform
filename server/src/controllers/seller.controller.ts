// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { ProductStatus } from "@prisma/client";

// PRODUCT CRUD

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const { 
      id,
      title, 
      description, 
      categoryId, 
      tags, 
      hsn, 
      gstPercentage, 
      gstRate, 
      brand, 
      variants, 
      slug,
      highlights,
      specs,
      media,
      axes,
      dimensionsCm,
      returnDays,
      dispatchDays,
      weightKg,
      countryOfOrigin,
      manufacturer,
    } = req.body;

    const generatedSlug = slug || (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 7));

    let cat = await prisma.category.findFirst({
      where: { OR: [{ id: categoryId }, { slug: categoryId }] }
    });
    if (!cat) {
      cat = await prisma.category.findFirst();
    }
    const resolvedCategoryId = cat ? cat.id : categoryId;

    const isLive = req.body.status === "LIVE" || req.body.status === "live";

    const product = await prisma.product.create({
      data: {
        id: id || undefined,
        slug: generatedSlug,
        title,
        description,
        categoryId: resolvedCategoryId,
        sellerId,
        brand: brand || "Generic",
        tags: tags || [],
        hsn: hsn || "8517",
        gstRate: gstRate !== undefined ? Number(gstRate) : (gstPercentage !== undefined ? Number(gstPercentage) : 18),
        dispatchDays: dispatchDays !== undefined ? Number(dispatchDays) : 2,
        weightKg: weightKg !== undefined ? Number(weightKg) : 0.5,
        countryOfOrigin: countryOfOrigin || "India",
        manufacturer: manufacturer || "Generic",
        highlights: highlights || [],
        specs: specs || [],
        media: media || [],
        axes: axes || [],
        dimensionsCm: dimensionsCm || [10, 10, 10],
        returnDays: returnDays !== undefined ? Number(returnDays) : 7,
        status: isLive ? ProductStatus.LIVE : ProductStatus.PENDING,
        variants: {
          create: variants.map((v: any, index: number) => ({
            id: v.id || (id ? `${id}_v${index + 1}` : undefined),
            sku: v.sku,
            price: Number(v.price),
            mrp: Number(v.mrp || v.price),
            stock: Number(v.stock),
            options: v.options || v.attributes || {},
            media: v.media || v.images || [],
          }))
        }
      },
      include: { variants: true }
    });

    res.status(201).json(ApiResponse.success(product, isLive ? "Product created and live" : "Product created and pending review"));
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const { id } = req.params;
    
    // Ensure the product belongs to the seller
    const existing = await prisma.product.findFirst({
      where: { id, sellerId }
    });

    if (!existing) {
      return next(new ApiError(404, "Product not found or unauthorized", "NOT_FOUND"));
    }

    const { gstPercentage, ...rest } = req.body;
    const data: any = { ...rest };
    if (gstPercentage !== undefined) {
      data.gstRate = Number(gstPercentage);
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    res.status(200).json(ApiResponse.success(updated, "Product updated"));
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: {
        variants: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(ApiResponse.success(products));
  } catch (error) {
    next(error);
  }
};

// INVENTORY MANAGEMENT

export const updateInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const { variantId } = req.params;
    const { quantity, type } = req.body; // type: SET, INCREMENT, DECREMENT

    // Ensure variant belongs to seller
    const variant = await prisma.variant.findFirst({
      where: { 
        id: variantId,
        product: { sellerId }
      },
      include: { product: true }
    });

    if (!variant) {
      return next(new ApiError(404, "Variant not found or unauthorized", "NOT_FOUND"));
    }

    let updatedVariant;

    // Use Prisma transaction for atomic decrement check
    await prisma.$transaction(async (tx) => {
      if (type === "DECREMENT") {
        const current = await tx.variant.findUnique({ where: { id: variantId } });
        if (!current || current.stock < quantity) {
          throw new ApiError(400, "Insufficient stock", "INSUFFICIENT_STOCK");
        }
        updatedVariant = await tx.variant.update({
          where: { id: variantId },
          data: { stock: { decrement: quantity } }
        });
      } else if (type === "INCREMENT") {
        updatedVariant = await tx.variant.update({
          where: { id: variantId },
          data: { stock: { increment: quantity } }
        });
      } else {
        // SET
        if (quantity < 0) throw new ApiError(400, "Stock cannot be negative", "INVALID_STOCK");
        updatedVariant = await tx.variant.update({
          where: { id: variantId },
          data: { stock: quantity }
        });
      }
    });

    res.status(200).json(ApiResponse.success(updatedVariant, "Inventory updated"));
  } catch (error) {
    next(error);
  }
};
