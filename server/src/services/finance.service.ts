import { prisma } from "../server";
import { ShipmentStatus } from "@prisma/client";

export class FinanceService {
  /**
   * Calculates the ledger/commission for a shipment.
   * Returns: { gross, commission, tds, net }
   */
  static async calculateShipmentEarnings(shipmentId: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true }
    });
    
    if (!shipment) throw new Error("Shipment not found");

    const totals: any = shipment.totals;
    const gross = totals.total || 0;
    
    // Platform fee calculation (Mocked 10% commission + Fixed fee 10 INR)
    const settings = await prisma.platformSettings.findFirst();
    const fixedFee = settings?.fixedFee || 10;
    const commissionPct = 0.10;
    const commission = (gross * commissionPct) + fixedFee;
    
    // TDS Mocked 1%
    const tds = gross * (settings?.tdsPct || 0.01);
    
    const net = gross - commission - tds;

    return {
      gross,
      commission,
      tds,
      net
    };
  }

  /**
   * Automatically generate payouts for a seller for unpayouted delivered shipments.
   */
  static async generatePayout(sellerId: string) {
    const unpayoutedShipments = await prisma.shipment.findMany({
      where: {
        sellerId,
        status: ShipmentStatus.DELIVERED,
        payoutId: null
      }
    });

    if (unpayoutedShipments.length === 0) return null;

    let gross = 0;
    let net = 0;
    const lines: any[] = [];

    for (const shipment of unpayoutedShipments) {
      const earnings = await this.calculateShipmentEarnings(shipment.id);
      gross += earnings.gross;
      net += earnings.net;

      lines.push({
        date: new Date().toISOString(),
        type: 'SALE',
        description: `Order ${shipment.orderId} Shipment ${shipment.id}`,
        amount: earnings.net,
        meta: earnings
      });
    }

    const today = new Date();
    const periodStart = today.toISOString().split('T')[0];
    const periodEnd = today.toISOString().split('T')[0];
    
    const settings = await prisma.platformSettings.findFirst();
    const delayDays = settings?.payoutDelayDays || 3;
    const scheduledForDate = new Date(today.getTime() + delayDays * 86400000);

    const payout = await prisma.payout.create({
      data: {
        sellerId,
        periodStart,
        periodEnd,
        scheduledFor: scheduledForDate.toISOString().split('T')[0],
        status: "SCHEDULED",
        gross,
        net,
        lines,
        shipments: {
          connect: unpayoutedShipments.map((s) => ({ id: s.id }))
        }
      }
    });

    return payout;
  }
}
