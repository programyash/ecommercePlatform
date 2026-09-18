import { z } from "zod";

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid(),
    sellerId: z.string().uuid(),
    qty: z.number().int().min(1).default(1),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    variantId: z.string().uuid(),
  }),
  body: z.object({
    qty: z.number().int().min(1),
  }),
});

export const removeCartItemSchema = z.object({
  params: z.object({
    variantId: z.string().uuid(),
  }),
});

export const addWishlistItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid(),
    sellerId: z.string().uuid(),
  }),
});

export const removeWishlistItemSchema = z.object({
  params: z.object({
    variantId: z.string().uuid(),
  }),
});

export const addAddressSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    line1: z.string().min(5),
    line2: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    stateCode: z.string().min(2),
    pin: z.string().min(6),
    type: z.string().default("home"),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    addressId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(10).optional(),
    line1: z.string().min(5).optional(),
    line2: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    stateCode: z.string().min(2).optional(),
    pin: z.string().min(6).optional(),
    type: z.string().optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(10).optional(),
    defaultAddressId: z.string().uuid().nullable().optional(),
  }),
});
