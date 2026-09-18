import request from "supertest";
import app from "../app";
import { prisma } from "../server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

const createToken = (userId: string, role: any, entityId?: string) => {
  return jwt.sign({ userId, role, entityId }, JWT_SECRET, { expiresIn: "1h" });
};

describe("Comprehensive Authorization & Role Isolation (RBAC / IDOR)", () => {
  let customer1Token: string;
  let customer1Id: string;
  let customer2Token: string;
  let customer2Id: string;

  let seller1Token: string;
  let seller1Id: string;
  let seller2Token: string;
  let seller2Id: string;

  let adminToken: string;
  let adminId: string;

  let seller2VariantId: string;
  let seller2ShipmentId: string;

  beforeAll(async () => {
    // Clear old test records
    await prisma.cartItem.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.user.deleteMany();

    // Customer 1
    const uC1 = await prisma.user.create({
      data: {
        email: "authz_c1@test.com",
        password: "hash",
        role: "CUSTOMER",
        customer: { create: { name: "C1", phone: "1111111111" } }
      },
      include: { customer: true }
    });
    customer1Id = uC1.customer!.id;
    customer1Token = createToken(uC1.id, "CUSTOMER", customer1Id);

    // Customer 2
    const uC2 = await prisma.user.create({
      data: {
        email: "authz_c2@test.com",
        password: "hash",
        role: "CUSTOMER",
        customer: { create: { name: "C2", phone: "2222222222" } }
      },
      include: { customer: true }
    });
    customer2Id = uC2.customer!.id;
    customer2Token = createToken(uC2.id, "CUSTOMER", customer2Id);

    // Seller 1
    const uS1 = await prisma.user.create({
      data: {
        email: "authz_s1@test.com",
        password: "hash",
        role: "SELLER",
        seller: {
          create: {
            slug: "authz-s1",
            displayName: "Seller 1",
            legalName: "Seller 1 Ltd",
            ownerName: "Owner 1",
            phone: "3333333333",
            pan: "AAAAA1111A",
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
    seller1Id = uS1.seller!.id;
    seller1Token = createToken(uS1.id, "SELLER", seller1Id);

    // Seller 2
    const uS2 = await prisma.user.create({
      data: {
        email: "authz_s2@test.com",
        password: "hash",
        role: "SELLER",
        seller: {
          create: {
            slug: "authz-s2",
            displayName: "Seller 2",
            legalName: "Seller 2 Ltd",
            ownerName: "Owner 2",
            phone: "4444444444",
            pan: "BBBBB2222B",
            city: "Delhi",
            state: "DL",
            stateCode: "07",
            pickupAddress: {},
            bank: {}
          }
        }
      },
      include: { seller: true }
    });
    seller2Id = uS2.seller!.id;
    seller2Token = createToken(uS2.id, "SELLER", seller2Id);

    // Admin
    const uAdmin = await prisma.user.create({
      data: {
        email: "authz_admin@test.com",
        password: "hash",
        role: "ADMIN",
        admin: {
          create: {
            name: "Admin",
            roleId: "superadmin"
          }
        }
      },
      include: { admin: true }
    });
    adminId = uAdmin.admin!.id;
    adminToken = createToken(uAdmin.id, "ADMIN", adminId);

    // Create a product & variant for Seller 2 to test Seller 1 accessing it
    const cat = await prisma.category.create({
      data: {
        name: "Authz Cat",
        slug: "authz-cat",
        icon: "tag",
        description: "Cat for authz",
        gstRate: 18,
        hsnDefault: "8517",
        commissionPct: 5,
        returnDays: 7
      }
    });

    const p2 = await prisma.product.create({
      data: {
        slug: "authz-p2",
        title: "Product Seller 2",
        brand: "Brand 2",
        categoryId: cat.id,
        sellerId: seller2Id,
        description: "Desc",
        highlights: [],
        specs: [],
        media: [],
        axes: [],
        dimensionsCm: [10, 10, 10],
        returnDays: 7,
        hsn: "8517",
        gstRate: 18,
        dispatchDays: 2,
        weightKg: 0.5,
        countryOfOrigin: "India",
        manufacturer: "Mfr",
        status: "LIVE"
      }
    });

    const v2 = await prisma.variant.create({
      data: {
        productId: p2.id,
        sku: "AUTHZ-SKU-2",
        price: 500,
        mrp: 600,
        stock: 20,
        options: {}
      }
    });
    seller2VariantId = v2.id;

    // Create an order & shipment for Seller 2
    const order = await prisma.order.create({
      data: {
        id: "ORD-AUTHZ-TEST",
        customerId: customer2Id,
        shipTo: { line1: "Street 2", city: "Delhi", pin: "110001" },
        paymentMethod: "COD",
        paymentStatus: "COD_PENDING",
        paymentAmount: 500,
        totals: { total: 500 }
      }
    });

    const shp = await prisma.shipment.create({
      data: {
        id: "SHP-AUTHZ-TEST",
        orderId: order.id,
        sellerId: seller2Id,
        status: "CONFIRMED",
        slaDueAt: new Date(Date.now() + 86400000),
        promisedBy: new Date(Date.now() + 172800000),
        events: [{ status: "CONFIRMED", at: new Date(), actor: "system" }],
        totals: { mrp: 500, price: 500, shipping: 0, coupon: 0, total: 500 }
      }
    });
    seller2ShipmentId = shp.id;
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe("Customer Role Boundaries", () => {
    it("should reject customer accessing admin dashboard with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/dashboard")
        .set("Authorization", `Bearer ${customer1Token}`);
      expect(res.status).toBe(403);
    });

    it("should reject customer accessing admin customers list with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/customers")
        .set("Authorization", `Bearer ${customer1Token}`);
      expect(res.status).toBe(403);
    });

    it("should reject customer accessing seller routes with 403", async () => {
      const res = await request(app)
        .get("/api/v1/sellers/products")
        .set("Authorization", `Bearer ${customer1Token}`);
      expect(res.status).toBe(403);
    });

    it("should reject customer creating seller products with 403", async () => {
      const res = await request(app)
        .post("/api/v1/sellers/products")
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({ title: "Hack Product" });
      expect(res.status).toBe(403);
    });
  });

  describe("Seller Role Boundaries", () => {
    it("should reject seller accessing admin dashboard with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/dashboard")
        .set("Authorization", `Bearer ${seller1Token}`);
      expect(res.status).toBe(403);
    });

    it("should reject seller updating customer status with 403", async () => {
      const res = await request(app)
        .put(`/api/v1/admin/customers/${customer1Id}/status`)
        .set("Authorization", `Bearer ${seller1Token}`)
        .send({ status: "BLOCKED" });
      expect(res.status).toBe(403);
    });
  });

  describe("Seller-to-Seller Isolation (IDOR Protection)", () => {
    it("should block Seller 1 from updating Seller 2 inventory (404/403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/sellers/inventory/${seller2VariantId}`)
        .set("Authorization", `Bearer ${seller1Token}`)
        .send({ quantity: 5, type: "SET" });
      
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/unauthorized|not found/i);
    });

    it("should block Seller 1 from updating Seller 2 shipment status (404/403)", async () => {
      const res = await request(app)
        .post(`/api/v1/sellers/shipments/${seller2ShipmentId}/status`)
        .set("Authorization", `Bearer ${seller1Token}`)
        .send({ status: "PACKED" });
      
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/unauthorized|not found/i);
    });
  });

  describe("Customer-to-Customer Isolation", () => {
    it("should ensure Customer 1 cannot see Customer 2 cart items", async () => {
      // Add item to Customer 2 cart
      await prisma.cartItem.create({
        data: {
          customerId: customer2Id,
          productId: (await prisma.product.findFirst())!.id,
          variantId: seller2VariantId,
          sellerId: seller2Id,
          qty: 3
        }
      });

      // Customer 1 fetches cart
      const res = await request(app)
        .get("/api/v1/customers/cart")
        .set("Authorization", `Bearer ${customer1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // Customer 1 sees only their own empty cart
    });
  });
});
