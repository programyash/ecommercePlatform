import { Router } from "express";
import { createProduct, updateProduct, getMyProducts, updateInventory } from "../controllers/seller.controller";
import { getSellerShipments, updateShipmentStatus } from "../controllers/seller-shipment.controller";
import { getSellerSales, getSellerPayouts, getSellerReviews, replyToReview } from "../controllers/seller-finance.controller";
import { validate } from "../middleware/validateRequest";
import { createProductSchema, updateProductSchema, updateInventorySchema } from "../validators/product.validator";
import { authenticate, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

// Secure all seller routes
router.use(authenticate, requireRole([Role.SELLER]));

// Products
router.post("/products", validate(createProductSchema), createProduct);
router.get("/products", getMyProducts);
router.put("/products/:id", validate(updateProductSchema), updateProduct);

router.patch("/inventory/:variantId", validate(updateInventorySchema), updateInventory);

// Shipment Management
router.get("/shipments", getSellerShipments);
router.post("/shipments/:id/status", updateShipmentStatus);

// Finance & Ledger
router.get("/finance/sales", getSellerSales);
router.get("/finance/payouts", getSellerPayouts);

// Reviews
router.get("/reviews", getSellerReviews);
router.post("/reviews/:id/reply", replyToReview);

export default router;
