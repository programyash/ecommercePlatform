import { Router } from "express";
import { searchProducts, getProductById } from "../controllers/product.controller";
import { validate } from "../middleware/validateRequest";
import { productQuerySchema } from "../validators/product.validator";

const router = Router();

// Public routes for Customers/Guests
router.get("/", validate(productQuerySchema), searchProducts);
router.get("/:id", getProductById);

export default router;
