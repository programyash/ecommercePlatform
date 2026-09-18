// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { AuditService } from "../services/audit.service";
import { SocketService } from "../services/socket.service";
import { CustomerStatus, SellerStatus, ProductStatus } from "@prisma/client";

// DASHBOARD
export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalCustomers = await prisma.customer.count();
    const totalSellers = await prisma.seller.count();
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();

    const orders = await prisma.order.findMany({ select: { totals: true } });
    let revenue = 0;
    let commissions = 0;
    orders.forEach(o => {
       const t: any = o.totals;
       revenue += t.total || 0;
       commissions += (t.total || 0) * 0.1; // Demo: 10% commission mock
    });

    const pendingKyc = await prisma.seller.count({ where: { status: SellerStatus.UNDER_REVIEW } });
    const pendingProducts = await prisma.product.count({ where: { status: ProductStatus.PENDING } });
    const pendingShipments = await prisma.shipment.count({ where: { status: { in: ['PLACED', 'CONFIRMED', 'PACKED', 'PROCESSING'] } } });

    res.json(ApiResponse.success({
      totalCustomers,
      totalSellers,
      totalProducts,
      totalOrders,
      revenue,
      commissions,
      pendingKyc,
      pendingProducts,
      pendingShipments
    }));
  } catch (error) {
    next(error);
  }
};

// CUSTOMERS
export const listCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { user: { select: { email: true, createdAt: true } } }
    });
    res.json(ApiResponse.success(customers));
  } catch (error) {
    next(error);
  }
};

export const updateCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const customer = await prisma.customer.update({
      where: { id },
      data: { status, statusReason: reason }
    });
    
    AuditService.log('CUSTOMER_STATUS_UPDATED', req.user!.userId, 'CUSTOMER', id, `Updated customer status to ${status}`);
    res.json(ApiResponse.success(customer, "Customer status updated"));
  } catch (error) {
    next(error);
  }
};

// SELLERS & KYC
export const listSellers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellers = await prisma.seller.findMany({
      include: { user: { select: { email: true, createdAt: true } }, kyc: true }
    });
    res.json(ApiResponse.success(sellers));
  } catch (error) {
    next(error);
  }
};

export const updateSellerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const seller = await prisma.seller.update({
      where: { id },
      data: { status, statusReason: reason }
    });

    AuditService.log('SELLER_STATUS_UPDATED', req.user!.userId, 'SELLER', id, `Updated seller status to ${status}`);
    SocketService.emitToSeller(id, 'kyc_updated', { status, reason });
    res.json(ApiResponse.success(seller, "Seller status updated"));
  } catch (error) {
    next(error);
  }
};

// PRODUCTS
export const listPendingProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: ProductStatus.PENDING },
      include: { seller: true }
    });
    res.json(ApiResponse.success(products));
  } catch (error) {
    next(error);
  }
};

export const moderateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: { status }
    });

    AuditService.log('PRODUCT_MODERATED', req.user!.userId, 'PRODUCT', id, `Product status changed to ${status}`);
    SocketService.emitToSeller(product.sellerId, 'product_moderated', { productId: id, status, reason });
    res.json(ApiResponse.success(product, "Product moderation applied"));
  } catch (error) {
    next(error);
  }
};

// ORDERS
export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          include: {
            user: true
          }
        },
        shipments: {
          include: {
            items: true,
            seller: true,
          }
        }
      },
      orderBy: { placedAt: 'desc' }
    });
    const formattedOrders = orders.map(order => ({
      ...order,
      customer: order.customer ? {
        ...order.customer,
        email: order.customer.user?.email
      } : null
    }));
    res.json(ApiResponse.success(formattedOrders));
  } catch (error) {
    next(error);
  }
};

export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: true
          }
        },
        shipments: {
          include: {
            items: true,
            seller: true,
            returnReqs: true,
          }
        }
      }
    });
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    const formattedOrder = {
      ...order,
      customer: order.customer ? {
        ...order.customer,
        email: order.customer.user?.email
      } : null
    };
    res.json(ApiResponse.success(formattedOrder));
  } catch (error) {
    next(error);
  }
};

export const updateShipmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipmentId = req.params.shipmentId || req.params.id;
    const { status, note, awb, courier } = req.body;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true }
    });

    if (!shipment) {
      throw new ApiError(404, "Shipment not found");
    }

    const upperStatus = String(status).toUpperCase() as any;

    const events = (shipment.events as any[]) || [];
    events.push({
      status: upperStatus,
      code: String(status).toLowerCase(),
      at: new Date(),
      actor: 'admin',
      note: note || `Status updated to ${status} by admin`
    });

    const updateData: any = {
      status: upperStatus,
      events,
    };

    if (awb) updateData.awb = awb;
    if (courier) updateData.courier = courier;
    if ((upperStatus === 'SHIPPED' || upperStatus === 'READY_FOR_PICKUP' || upperStatus === 'OUT_FOR_DELIVERY') && !shipment.awb && !awb) {
      updateData.awb = `DS${String(Math.floor(1000000000 + Math.random() * 8999999999))}`;
      updateData.courier = courier || "Delhivery";
    }
    if (upperStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: updateData,
      include: { order: true, items: true, seller: true }
    });

    AuditService.log('SHIPMENT_STATUS_UPDATED', req.user!.userId, 'SHIPMENT', shipmentId, `Admin updated status to ${upperStatus}`);
    SocketService.emitToCustomer(updated.order.customerId, 'shipment_updated', {
      shipmentId: updated.id,
      orderId: updated.orderId,
      status: upperStatus
    });
    SocketService.emitToSeller(updated.sellerId, 'shipment_updated', {
      shipmentId: updated.id,
      status: upperStatus
    });

    res.json(ApiResponse.success(updated, `Shipment status updated to ${status}`));
  } catch (error) {
    next(error);
  }
};

// SETTINGS
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.platformSettings.findFirst();
    res.json(ApiResponse.success(settings));
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const current = await prisma.platformSettings.findFirst();
    if (!current) throw new ApiError(500, "Settings not found");
    const updated = await prisma.platformSettings.update({
      where: { id: current.id },
      data: req.body
    });
    AuditService.log('SETTINGS_UPDATED', req.user!.userId, 'SETTINGS', String(current.id), `Platform settings updated`);
    res.json(ApiResponse.success(updated, "Settings updated"));
  } catch (error) {
    next(error);
  }
};
