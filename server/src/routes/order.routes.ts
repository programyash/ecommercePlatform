import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validateRequest";
import { checkout, getCustomerOrders, getCustomerOrder } from "../controllers/order.controller";
import { checkoutSchema } from "../validators/checkout.validator";

const router = Router();

// Order routes (customer only for now)
router.use(authenticate, requireRole(["CUSTOMER"]));

// Checkout endpoint
router.post("/checkout", validate(checkoutSchema), checkout);
router.get("/", getCustomerOrders);
router.get("/:id", getCustomerOrder);

export default router;
