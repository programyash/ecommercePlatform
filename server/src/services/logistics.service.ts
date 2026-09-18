import { ShipmentStatus } from "@prisma/client";
import { prisma } from "../server";

export class LogisticsService {
  static generateAWB(): string {
    return `AWB-${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
  }

  // A mock function that automatically progresses the shipment status
  static async simulateCourierProgression(shipmentId: string) {
    // Note: In real life, this is done via Webhooks from the courier API
    const delays = [2000, 3000, 3000, 2000]; // simulate delays
    const progression = [
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED
    ];

    for (let i = 0; i < progression.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
      
      const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
      if (!shipment || shipment.status === ShipmentStatus.CANCELLED) return; // stopped

      const events = (shipment.events as any[]) || [];
      events.push({ status: progression[i], at: new Date(), actor: 'courier' });
      
      const data: any = {
         status: progression[i],
         events
      };

      if (progression[i] === ShipmentStatus.DELIVERED) {
         data.deliveredAt = new Date();
      }
      
      await prisma.shipment.update({
        where: { id: shipmentId },
        data
      });
    }
  }
}
