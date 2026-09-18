import request from "supertest";
import app from "../app";
import { prisma } from "../server";
import bcrypt from "bcryptjs";

let sellerToken: string;
let adminToken: string;
let customerToken: string;

let sellerId: string;
let categoryId: string;
let productId: string;
let variantId: string;

beforeAll(async () => {
  // Clear DB
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const password = await bcrypt.hash("Password123!", 10);

  // Seller
  const sellerUser = await prisma.user.create({
    data: {
      email: "seller1@example.com",
      password,
      role: "SELLER",
    }
  });

  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      slug: "seller-1",
      displayName: "Seller 1",
      legalName: "Seller 1 LLC",
      ownerName: "Owner",
      phone: "9999999999",
      pan: "ABCDE1234F",
      city: "Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      pickupAddress: {},
      bank: {},
    }
  });
  sellerId = seller.id;

  const sellerRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "seller1@example.com", password: "Password123!" });
  sellerToken = sellerRes.body.data.token;

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password,
      role: "ADMIN",
      admin: {
        create: {
          name: "Admin Tester",
          roleId: "superadmin",
        },
      },
    },
  });
  const adminRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@example.com", password: "Password123!" });
  adminToken = adminRes.body.data.token;

  // Customer
  const customerUser = await prisma.user.create({
    data: {
      email: "customer@example.com",
      password,
      role: "CUSTOMER",
      customer: {
        create: {
          name: "Customer Tester",
          phone: "9876543210",
        },
      },
    },
  });
  const customerRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "customer@example.com", password: "Password123!" });
  customerToken = customerRes.body.data.token;

  // Create Category
  const category = await prisma.category.create({
    data: {
      slug: "electronics",
      name: "Electronics",
      description: "Devices",
      icon: "smartphone",
      gstRate: 18,
      hsnDefault: "8517",
      commissionPct: 5,
      returnDays: 7,
    }
  });
  categoryId = category.id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("Product & Inventory APIs", () => {
  it("should allow seller to create a product", async () => {
    const res = await request(app)
      .post("/api/v1/sellers/products")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        title: "Test Smartphone",
        description: "A great smartphone",
        categoryId,
        gstPercentage: 18,
        brand: "TestBrand",
        variants: [
          {
            sku: "SKU-1",
            title: "Black 128GB",
            price: 10000,
            stock: 50,
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Test Smartphone");
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.variants.length).toBe(1);

    productId = res.body.data.id;
    variantId = res.body.data.variants[0].id;
  });

  it("should not expose pending products to public", async () => {
    const res = await request(app).get(`/api/v1/products/${productId}`);
    expect(res.status).toBe(404); // Hidden from customers
  });

  it("should allow admin to approve a product", async () => {
    const res = await request(app)
      .put(`/api/v1/admin/products/${productId}/moderation`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "LIVE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("LIVE");
  });

  it("should expose approved products to public", async () => {
    const res = await request(app).get(`/api/v1/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Test Smartphone");
  });

  it("should allow atomic stock deduction", async () => {
    const res = await request(app)
      .patch(`/api/v1/sellers/inventory/${variantId}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ quantity: 10, type: "DECREMENT" });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(40); // 50 - 10
  });

  it("should prevent negative stock", async () => {
    const res = await request(app)
      .patch(`/api/v1/sellers/inventory/${variantId}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ quantity: 100, type: "DECREMENT" });

    expect(res.status).toBe(400); // Insufficient stock
  });
});
