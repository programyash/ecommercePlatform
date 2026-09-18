// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { ShipmentStatus } from "@prisma/client";
import { LogisticsService } from "../services/logistics.service";
import { SocketService } from "../services/socket.service";

export const getSellerShipments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const { status, q } = req.query;

    const where: any = { sellerId };
    
    if (status && status !== 'all') {
      if (status === 'processing') {
         where.status = { in: [ShipmentStatus.CONFIRMED, ShipmentStatus.PROCESSING] };
      } else {
         where.status = status as ShipmentStatus;
      }
    }

    if (q) {
      where.orderId = { contains: q as string, mode: 'insensitive' };
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: {
          include: { customer: true }
        },
        items: true,
        returnReqs: true
      },
      orderBy: { slaDueAt: 'asc' }
    });
    
    const formattedShipments = shipments.map(shipment => {
      const order = shipment.order;
      const customer = order.customer;
      const items = shipment.items;
      
      const isOpen = shipment.status !== 'DELIVERED' && shipment.status !== 'CANCELLED';
      const isOverdue = isOpen && shipment.slaDueAt < new Date();
      
      let action = null;
      if (shipment.status === 'PLACED') action = 'Confirm';
      else if (shipment.status === 'CONFIRMED') action = 'Pack';
      else if (shipment.status === 'PACKED') action = 'Hand over';

      const prepaid = order.paymentMethod !== 'COD';

      return {
        shipment,
        order,
        items,
        buyer: customer ? `${customer.name.split(' ')[0]}, ${order.shipTo.city || 'Unknown'}` : 'Unknown Buyer',
        buyerPin: order.shipTo.pin || '000000',
        amount: shipment.totals.total || 0,
        units: items.reduce((sum, item) => sum + item.qty, 0),
        prepaid,
        dueAt: shipment.slaDueAt,
        overdue: isOverdue,
        action,
        ...(shipment.returnReqs[0] ? { return: shipment.returnReqs[0] } : {})
      };
    });

    res.json(ApiResponse.success(formattedShipments));
  } catch (error) {
    next(error);
  }
};

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PLACED: [ShipmentStatus.CONFIRMED, ShipmentStatus.CANCELLED],
  CONFIRMED: [ShipmentStatus.PROCESSING, ShipmentStatus.PACKED, ShipmentStatus.CANCELLED],
  PROCESSING: [ShipmentStatus.PACKED, ShipmentStatus.CANCELLED],
  PACKED: [ShipmentStatus.READY_FOR_PICKUP, ShipmentStatus.SHIPPED, ShipmentStatus.CANCELLED],
  READY_FOR_PICKUP: [ShipmentStatus.PICKED_UP],
  PICKED_UP: [ShipmentStatus.IN_TRANSIT],
  IN_TRANSIT: [ShipmentStatus.OUT_FOR_DELIVERY],
  SHIPPED: [ShipmentStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [ShipmentStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: []
};

export const updateShipmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const { id } = req.params;
    const { status } = req.body; // Target status

    const shipment = await prisma.shipment.findFirst({
      where: { id, sellerId }
    });

    if (!shipment) {
      throw new ApiError(404, "Shipment not found or unauthorized");
    }

    const currentStatus = shipment.status as ShipmentStatus;
    const targetStatus = status as ShipmentStatus;

    // Admin/System overrides can be checked here, but this is the seller controller
    if (!VALID_TRANSITIONS[currentStatus].includes(targetStatus)) {
      throw new ApiError(400, `Invalid state transition from ${currentStatus} to ${targetStatus}`);
    }

    // Prepare events array update
    const events = (shipment.events as any[]) || [];
    events.push({ status: targetStatus, at: new Date(), actor: 'seller' });

    const updateData: any = {
      status: targetStatus,
      events,
    };

    // Simulate calling logistics when ready for pickup or shipped
    if (targetStatus === ShipmentStatus.READY_FOR_PICKUP || targetStatus === ShipmentStatus.SHIPPED) {
      if (!shipment.awb) {
        updateData.awb = LogisticsService.generateAWB();
        updateData.courier = "Delhivery Express";
      }
      
      // We asynchronously trigger the mock courier progression in the background
      setTimeout(() => {
        LogisticsService.simulateCourierProgression(id).catch(console.error);
      }, 2000);
    }

    if (targetStatus === ShipmentStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: updateData,
      include: { order: true }
    });

    // Emit event to Customer
    SocketService.emitToCustomer(updated.order.customerId, 'shipment_updated', {
      shipmentId: updated.id,
      orderId: updated.orderId,
      status: targetStatus
    });
    
    // Emit event to Admin
    SocketService.emitToAdmin('shipment_updated', {
      shipmentId: updated.id,
      sellerId,
      status: targetStatus
    });

    res.json(ApiResponse.success(updated, `Status updated to ${targetStatus}`));
  } catch (error) {
    next(error);
  }
};
