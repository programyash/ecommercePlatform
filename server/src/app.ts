import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { ApiResponse } from "./utils/ApiResponse";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter";

const app: Application = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.success({ status: "ok" }, "Server is running"));
});

import authRoutes from "./routes/auth.routes";
import testRoutes from "./routes/test.routes";
import productRoutes from "./routes/product.routes";
import sellerRoutes from "./routes/seller.routes";
import adminRoutes from "./routes/admin.routes";
import customerRoutes from "./routes/customer.routes";
import orderRoutes from "./routes/order.routes";

// Mount Routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/test", testRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/sellers", sellerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/orders", orderRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
