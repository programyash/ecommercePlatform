// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiResponse } from "../utils/ApiResponse";
import { AuditService } from "../services/audit.service";

export const getPayouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payouts = await prisma.payout.findMany({
      include: { seller: true },
      orderBy: { periodStart: 'desc' }
    });
    res.json(ApiResponse.success(payouts));
  } catch (error) {
    next(error);
  }
};

export const settlePayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const payout = await prisma.payout.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        utr: `UTR-${Math.floor(Math.random() * 1000000000)}`
      }
    });

    AuditService.log('PAYOUT_SETTLED', req.user!.userId, 'PAYOUT', id, `Settled payout for ${payout.net}`);
    res.json(ApiResponse.success(payout, "Payout settled"));
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Return aggregated JSON for the reports table
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        shipments: { include: { seller: true } }
      }
    });

    const reportLines = orders.map(o => {
      const totals: any = o.totals;
      return {
        id: o.id,
        date: o.placedAt,
        customer: o.customer.name,
        gross: totals.total || 0,
        status: o.status,
      };
    });

    res.json(ApiResponse.success(reportLines));
  } catch (error) {
    next(error);
  }
};

export const getAdminReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      include: { seller: true, customer: true, product: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ApiResponse.success(reviews));
  } catch (error) {
    next(error);
  }
};
