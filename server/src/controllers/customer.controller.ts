// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { ProductStatus, SellerStatus } from "@prisma/client";

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.userId },
      include: { addresses: true },
    });

    if (!customer) {
      throw new ApiError(404, "Customer profile not found");
    }

    res.json(ApiResponse.success(customer, "Profile fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, defaultAddressId } = req.body;
    const customer = await prisma.customer.update({
      where: { userId: req.user!.userId },
      data: { name, phone, defaultAddressId },
      include: { addresses: true },
    });

    res.json(ApiResponse.success(customer, "Profile updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.userId },
      include: { addresses: true },
    });
    res.json(ApiResponse.success(customer?.addresses || [], "Addresses fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const address = await prisma.address.create({
      data: {
        ...req.body,
        customerId: customer.id,
      },
    });

    res.status(201).json(ApiResponse.success(address, "Address added successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId } = req.params;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customer.id) {
      throw new ApiError(404, "Address not found");
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: req.body,
    });

    res.json(ApiResponse.success(updatedAddress, "Address updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId } = req.params;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customer.id) {
      throw new ApiError(404, "Address not found");
    }

    await prisma.address.delete({ where: { id: addressId } });

    res.json(ApiResponse.success(null, "Address deleted successfully"));
  } catch (error) {
    next(error);
  }
};

// CART

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        product: { select: { title: true, brand: true, cover: true, media: true } },
        variant: true,
        seller: { select: { displayName: true } }
      }
    });

    res.json(ApiResponse.success(cartItems, "Cart fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, variantId, sellerId, qty } = req.body;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    // Validations
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
    if (!product) throw new ApiError(404, "Product not found");
    if (product.status !== ProductStatus.LIVE) throw new ApiError(400, "Product is not available");
    if (product.seller.status !== SellerStatus.ACTIVE) throw new ApiError(400, "Seller is not active");

    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) throw new ApiError(404, "Variant not found");
    if (!variant.active) throw new ApiError(400, "Variant is not active");
    
    // Check stock
    if (variant.stock < qty) throw new ApiError(400, "Insufficient stock");

    // Upsert cart item
    const cartItem = await prisma.cartItem.upsert({
      where: {
        customerId_variantId: {
          customerId: customer.id,
          variantId,
        }
      },
      update: {
        qty: qty
      },
      create: {
        customerId: customer.id,
        productId,
        variantId,
        sellerId,
        qty
      }
    });

    res.status(201).json(ApiResponse.success(cartItem, "Added to cart"));
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variantId } = req.params;
    const { qty } = req.body;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new ApiError(404, "Variant not found");
    if (variant.stock < qty) throw new ApiError(400, "Insufficient stock");

    const cartItem = await prisma.cartItem.update({
      where: {
        customerId_variantId: {
          customerId: customer.id,
          variantId
        }
      },
      data: { qty }
    });

    res.json(ApiResponse.success(cartItem, "Cart item updated"));
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variantId } = req.params;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    await prisma.cartItem.delete({
      where: {
        customerId_variantId: {
          customerId: customer.id,
          variantId
        }
      }
    });

    res.json(ApiResponse.success(null, "Cart item removed"));
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    await prisma.cartItem.deleteMany({
      where: { customerId: customer.id }
    });

    res.json(ApiResponse.success(null, "Cart cleared"));
  } catch (error) {
    next(error);
  }
};

// WISHLIST

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const wishlist = await prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      include: {
        product: { select: { title: true, brand: true, cover: true, media: true } },
        variant: true,
        seller: { select: { displayName: true } }
      }
    });

    res.json(ApiResponse.success(wishlist, "Wishlist fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, variantId, sellerId } = req.body;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const wishlistItem = await prisma.wishlistItem.upsert({
      where: {
        customerId_variantId: {
          customerId: customer.id,
          variantId
        }
      },
      update: {},
      create: {
        customerId: customer.id,
        productId,
        variantId,
        sellerId
      }
    });

    res.status(201).json(ApiResponse.success(wishlistItem, "Added to wishlist"));
  } catch (error) {
    next(error);
  }
};

export const removeWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variantId } = req.params;
    const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    await prisma.wishlistItem.delete({
      where: {
        customerId_variantId: {
          customerId: customer.id,
          variantId
        }
      }
    });

    res.json(ApiResponse.success(null, "Removed from wishlist"));
  } catch (error) {
    next(error);
  }
};
