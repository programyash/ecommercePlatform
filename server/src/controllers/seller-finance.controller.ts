// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiResponse } from "../utils/ApiResponse";
import { FinanceService } from "../services/finance.service";
import { ShipmentStatus } from "@prisma/client";

export const getSellerSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    // Simple mock logic for sales, returning delivered shipments
    const shipments = await prisma.shipment.findMany({
      where: { sellerId, status: ShipmentStatus.DELIVERED },
      include: { order: true }
    });

    const sales = await Promise.all(shipments.map(async (s) => {
      const earnings = await FinanceService.calculateShipmentEarnings(s.id);
      return {
        shipmentId: s.id,
        orderId: s.orderId,
        deliveredAt: s.deliveredAt,
        ...earnings
      };
    }));

    res.json(ApiResponse.success(sales));
  } catch (error) {
    next(error);
  }
};

export const getSellerPayouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    
    // Auto-generate payout for unpayouted delivered shipments for demo purposes
    await FinanceService.generatePayout(sellerId);

    const payouts = await prisma.payout.findMany({
      where: { sellerId },
      orderBy: { periodStart: 'desc' },
      include: { shipments: true }
    });

    res.json(ApiResponse.success(payouts));
  } catch (error) {
    next(error);
  }
};

export const getSellerReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const reviews = await prisma.review.findMany({
      where: { sellerId },
      include: { customer: true, product: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ApiResponse.success(reviews));
  } catch (error) {
    next(error);
  }
};

export const replyToReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.entityId!;
    const { id } = req.params;
    const { body } = req.body;

    const review = await prisma.review.findFirst({ where: { id, sellerId } });
    if (!review) throw new Error("Review not found");

    const updated = await prisma.review.update({
      where: { id },
      data: {
        sellerReply: { body, at: new Date().toISOString() }
      }
    });

    res.json(ApiResponse.success(updated, "Reply added"));
  } catch (error) {
    next(error);
  }
};
