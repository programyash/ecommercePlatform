import request from "supertest";
import app from "../app";
import { prisma } from "../server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

const createToken = (userId: string, role: any, entityId?: string) => {
  return jwt.sign({ userId, role, entityId }, JWT_SECRET, { expiresIn: "1h" });
};

describe("Admin Portal & Financial Management Tests", () => {
  let adminToken: string;
  let customerId: string;
  let sellerId: string;
  let payoutId: string;

  beforeAll(async () => {
    // Clear test data
    await prisma.payout.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.user.deleteMany();

    // Admin user
    const uAdmin = await prisma.user.create({
      data: {
        email: "admin_test@test.com",
        password: "hash",
        role: "ADMIN",
        admin: {
          create: {
            name: "Platform Admin",
            roleId: "superadmin"
          }
        }
      },
      include: { admin: true }
    });
    adminToken = createToken(uAdmin.id, "ADMIN", uAdmin.admin!.id);

    // Customer user
    const uCustomer = await prisma.user.create({
      data: {
        email: "admin_cust@test.com",
        password: "hash",
        role: "CUSTOMER",
        customer: {
          create: {
            name: "Customer John",
            phone: "9876543210",
            status: "ACTIVE"
          }
        }
      },
      include: { customer: true }
    });
    customerId = uCustomer.customer!.id;

    // Seller user
    const uSeller = await prisma.user.create({
      data: {
        email: "admin_seller@test.com",
        password: "hash",
        role: "SELLER",
        seller: {
          create: {
            slug: "test-admin-seller",
            displayName: "Test Seller Admin",
            legalName: "Admin Seller LLC",
            ownerName: "John Seller",
            phone: "9123456780",
            pan: "PANKY1234F",
            city: "Pune",
            state: "MH",
            stateCode: "27",
            pickupAddress: {},
            bank: {},
            status: "UNDER_REVIEW"
          }
        }
      },
      include: { seller: true }
    });
    sellerId = uSeller.seller!.id;

    // Payout record for testing settlement
    const payout = await prisma.payout.create({
      data: {
        sellerId,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-15",
        scheduledFor: "2026-09-16",
        gross: 10000,
        net: 8620,
        status: "SCHEDULED",
        lines: []
      }
    });
    payoutId = payout.id;
  });

  afterAll(async () => {
    await prisma.payout.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("should fetch dashboard metrics with real database counts", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalSellers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingKyc).toBeGreaterThanOrEqual(1);
  });

  it("should list all customers", async () => {
    const res = await request(app)
      .get("/api/v1/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((c: any) => c.id === customerId);
    expect(found).toBeDefined();
  });

  it("should block customer", async () => {
    const res = await request(app)
      .put(`/api/v1/admin/customers/${customerId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "BLOCKED", reason: "Terms violation" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("BLOCKED");

    const updated = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(updated?.status).toBe("BLOCKED");
  });

  it("should approve seller KYC application", async () => {
    const res = await request(app)
      .put(`/api/v1/admin/sellers/${sellerId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE", reason: "Documents verified" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");

    const updated = await prisma.seller.findUnique({ where: { id: sellerId } });
    expect(updated?.status).toBe("ACTIVE");
  });

  it("should fetch financial reports", async () => {
    const res = await request(app)
      .get("/api/v1/admin/finance/reports")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should settle a pending payout", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/finance/payouts/${payoutId}/settle`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PAID");
    expect(res.body.data.utr).toBeDefined();

    const updated = await prisma.payout.findUnique({ where: { id: payoutId } });
    expect(updated?.status).toBe("PAID");
  });
});
