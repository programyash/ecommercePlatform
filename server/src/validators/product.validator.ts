import { z } from "zod";
import { ProductStatus } from "@prisma/client";

export const createProductSchema = z.object({
  body: z.object({
    id: z.string().optional(),
    slug: z.string().optional(),
    title: z.string().min(3),
    description: z.string().min(10),
    categoryId: z.string().min(1),
    subCategoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    hsn: z.string().optional(),
    gstPercentage: z.number().min(0).max(100).optional(),
    gstRate: z.number().min(0).max(100).optional(),
    brand: z.string().optional(),
    status: z.enum(["DRAFT", "PENDING", "LIVE", "REJECTED", "BLOCKED", "INACTIVE"]).optional(),
    highlights: z.array(z.string()).optional(),
    specs: z.any().optional(),
    media: z.any().optional(),
    axes: z.any().optional(),
    dimensionsCm: z.any().optional(),
    returnDays: z.number().optional(),
    dispatchDays: z.number().optional(),
    weightKg: z.number().optional(),
    countryOfOrigin: z.string().optional(),
    manufacturer: z.string().optional(),
    warranty: z.string().optional(),
    variants: z.array(z.object({
      id: z.string().optional(),
      sku: z.string().min(1),
      title: z.string().optional(),
      price: z.number().min(0),
      mrp: z.number().min(0).optional(),
      discountedPrice: z.number().min(0).optional(),
      stock: z.number().int().min(0),
      options: z.record(z.string(), z.any()).optional(),
      attributes: z.record(z.string(), z.any()).optional(),
      images: z.array(z.string()).optional(),
      media: z.any().optional(),
    })).min(1),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    categoryId: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    gstPercentage: z.number().min(0).max(100).optional(),
    gstRate: z.number().min(0).max(100).optional(),
    brand: z.string().optional(),
    status: z.enum(["DRAFT", "PENDING", "LIVE", "REJECTED", "BLOCKED", "INACTIVE"]).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const moderateProductSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ProductStatus),
    rejectionReason: z.string().optional(),
  }).refine((data) => {
    if (data.status === ProductStatus.REJECTED) {
      return !!data.rejectionReason;
    }
    return true;
  }, {
    message: "rejectionReason is required when rejecting a product",
    path: ["body"],
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateInventorySchema = z.object({
  body: z.object({
    quantity: z.number().int(),
    type: z.enum(["SET", "INCREMENT", "DECREMENT"]),
  }),
  params: z.object({
    variantId: z.string().uuid(),
  }),
});

export const productQuerySchema = z.object({
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    seller: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).default("newest"),
  }),
});
