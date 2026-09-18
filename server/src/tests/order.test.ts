import request from "supertest";
import app from "../app";
import { prisma } from "../server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

const createToken = (userId: string, role: any, entityId?: string) => {
  return jwt.sign({ userId, role, entityId }, JWT_SECRET, { expiresIn: "1h" });
};

describe("Order & Shipment State Machine Tests", () => {
  let sellerToken: string;
  let sellerId: string;
  let shipmentId: string;
  let orderId: string;

  beforeAll(async () => {
    // Clear old test data
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();

    const uCustomer = await prisma.user.create({
      data: {
        email: "order_cust@test.com",
        password: "hash",
        role: "CUSTOMER",
        customer: { create: { name: "Order Customer", phone: "1234567890" } }
      },
      include: { customer: true }
    });

    const uSeller = await prisma.user.create({
      data: {
        email: "order_seller@test.com",
        password: "hash",
        role: "SELLER",
        seller: {
          create: {
            slug: "order-seller",
            displayName: "Order Seller",
            legalName: "Order Seller Ltd",
            ownerName: "Owner",
            phone: "9876543210",
            pan: "AAAAA9999A",
            city: "Mumbai",
            state: "MH",
            stateCode: "27",
            pickupAddress: {},
            bank: {}
          }
        }
      },
      include: { seller: true }
    });
    sellerId = uSeller.seller!.id;
    sellerToken = createToken(uSeller.id, "SELLER", sellerId);

    const order = await prisma.order.create({
      data: {
        id: "ORD-STATE-MACHINE",
        customerId: uCustomer.customer!.id,
        shipTo: { line1: "123 Main St", city: "Mumbai", pin: "400001" },
        paymentMethod: "COD",
        paymentStatus: "COD_PENDING",
        paymentAmount: 1200,
        totals: { total: 1200 }
      }
    });
    orderId = order.id;

    const shipment = await prisma.shipment.create({
      data: {
        id: "SHP-STATE-TEST",
        orderId: order.id,
        sellerId,
        status: "CONFIRMED",
        slaDueAt: new Date(Date.now() + 86400000),
        promisedBy: new Date(Date.now() + 172800000),
        events: [{ status: "CONFIRMED", at: new Date(), actor: "system" }],
        totals: { mrp: 1200, price: 1200, shipping: 0, coupon: 0, total: 1200 }
      }
    });
    shipmentId = shipment.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("should block arbitrary illegal jump: CONFIRMED -> DELIVERED", async () => {
    const res = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "DELIVERED" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid state transition/i);
  });

  it("should allow valid transition: CONFIRMED -> PACKED", async () => {
    const res = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "PACKED" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PACKED");

    // Verify events log was updated in database
    const shp = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    const events = shp?.events as any[];
    expect(events.length).toBe(2);
    expect(events[1].status).toBe("PACKED");
    expect(events[1].actor).toBe("seller");
  });

  it("should allow valid transition: PACKED -> READY_FOR_PICKUP and assign AWB", async () => {
    const res = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "READY_FOR_PICKUP" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READY_FOR_PICKUP");
    expect(res.body.data.awb).toBeDefined();
  });

  it("should block backwards transition: READY_FOR_PICKUP -> PROCESSING", async () => {
    const res = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "PROCESSING" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid state transition/i);
  });
});
