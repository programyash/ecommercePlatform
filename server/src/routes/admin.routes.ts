import { Router } from "express";
import { 
  getDashboardMetrics, 
  listCustomers, 
  updateCustomerStatus,
  listSellers,
  updateSellerStatus,
  listPendingProducts,
  moderateProduct,
  listOrders,
  getOrderDetail,
  updateShipmentStatus,
  getSettings,
  updateSettings
} from "../controllers/admin.controller";
import { getPayouts, settlePayout, getReports, getAdminReviews } from "../controllers/admin-finance.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

// Secure all admin routes
router.use(authenticate, requireRole([Role.ADMIN]));

// Dashboard
router.get("/dashboard", getDashboardMetrics);

// Customers
router.get("/customers", listCustomers);
router.put("/customers/:id/status", updateCustomerStatus);

// Sellers & KYC
router.get("/sellers", listSellers);
router.put("/sellers/:id/status", updateSellerStatus);

// Products
router.get("/products/pending", listPendingProducts);
router.put("/products/:id/moderation", moderateProduct);

// Orders
router.get("/orders", listOrders);
router.get("/orders/:id", getOrderDetail);
router.put("/orders/:orderId/shipments/:shipmentId/status", updateShipmentStatus);
router.put("/shipments/:id/status", updateShipmentStatus);

// Finance & Reports
router.get("/finance/payouts", getPayouts);
router.post("/finance/payouts/:id/settle", settlePayout);
router.get("/finance/reports", getReports);

// Reviews
router.get("/reviews", getAdminReviews);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

export default router;
