// @ts-nocheck
import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validateRequest";
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getWishlist,
  addToWishlist,
  removeWishlistItem,
} from "../controllers/customer.controller";
import { createReview } from "../controllers/customer-review.controller";
import {
  addAddressSchema,
  updateAddressSchema,
  updateProfileSchema,
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  addWishlistItemSchema,
  removeWishlistItemSchema,
} from "../validators/customer.validator";

const router = Router();

// All customer routes require authentication and CUSTOMER role
router.use(authenticate, requireRole(["CUSTOMER"]));

// Profile
router.get("/profile", getProfile);
router.put("/profile", validate(updateProfileSchema), updateProfile);

// Addresses
router.get("/addresses", getAddresses);
router.post("/addresses", validate(addAddressSchema), addAddress);
router.put("/addresses/:addressId", validate(updateAddressSchema), updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

// Cart
router.get("/cart", getCart);
router.post("/cart", validate(addCartItemSchema), addToCart);
router.put("/cart/:variantId", validate(updateCartItemSchema), updateCartItem);
router.delete("/cart/:variantId", validate(removeCartItemSchema), removeCartItem);
router.delete("/cart", clearCart);

// Wishlist
router.get("/wishlist", getWishlist);
router.post("/wishlist", validate(addWishlistItemSchema), addToWishlist);
router.delete("/wishlist/:variantId", validate(removeWishlistItemSchema), removeWishlistItem);

// Reviews
router.post("/reviews", createReview);

export default router;
