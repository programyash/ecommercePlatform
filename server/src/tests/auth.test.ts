import request from "supertest";
import app from "../app";
import { prisma } from "../server";
import { Role } from "@prisma/client";

beforeAll(async () => {
  // Clear the DB before tests (except if seeded data is preferred, but for auth we should create our own test users)
  await prisma.user.deleteMany({
    where: { email: { contains: "test" } },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Auth & Authorization", () => {
  let customerToken: string;
  let sellerToken: string;
  let customerId: string;
  let sellerId: string;

  it("should register a customer", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "testcustomer@example.com",
      password: "password123",
      name: "Test Customer",
      role: "CUSTOMER",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("testcustomer@example.com");
  });

  it("should fail duplicate email registration", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "testcustomer@example.com",
      password: "password123",
      name: "Test Customer",
      role: "CUSTOMER",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EMAIL_EXISTS");
  });

  it("should login customer and issue token", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testcustomer@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    customerToken = res.body.data.token;
    customerId = res.body.data.user.entityId;
  });

  it("should fail login with invalid password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testcustomer@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_FAILED");
  });

  it("should register a seller", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "testseller@example.com",
      password: "password123",
      name: "Test Seller",
      legalName: "Test Seller Ltd",
      pan: "ABCDE1234F",
      role: "SELLER",
    });

    expect(res.status).toBe(201);
  });

  it("should login seller and issue token", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "testseller@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    sellerToken = res.body.data.token;
    sellerId = res.body.data.user.entityId;
  });

  describe("Protected Routes & RBAC", () => {
    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });

    it("should allow customer to access customer route", async () => {
      const res = await request(app)
        .get("/api/v1/test/customer-only")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
    });

    it("should block customer from accessing seller route", async () => {
      const res = await request(app)
        .get("/api/v1/test/seller-only")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it("should block seller from accessing admin route", async () => {
      const res = await request(app)
        .get("/api/v1/test/admin-only")
        .set("Authorization", `Bearer ${sellerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("IDOR Protection", () => {
    it("should allow customer to access their own private data", async () => {
      const res = await request(app)
        .get(`/api/v1/test/customers/${customerId}/private`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
    });

    it("should block customer from accessing another customer's private data", async () => {
      const res = await request(app)
        .get(`/api/v1/test/customers/some-other-id/private`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });
});
