import request from 'supertest';
import app from '../app';
import { prisma } from '../server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

const generateToken = (userId: string, role: string, entityId?: string) => {
  return jwt.sign({ userId, role, entityId }, JWT_SECRET, { expiresIn: '1h' });
};

describe('End-to-End Multi-Vendor Platform Lifecycle Flow', () => {
  let customerToken: string;
  let customerId: string;
  let addressId: string;

  let sellerAUser: any;
  let sellerAToken: string;
  let sellerAId: string;
  let productAId: string;
  let variantAId: string;

  let sellerBUser: any;
  let sellerBToken: string;
  let sellerBId: string;
  let productBId: string;
  let variantBId: string;

  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Teardown previous test records
    await prisma.payout.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.address.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();

    // 1. Admin setup
    adminUser = await prisma.user.create({
      data: { email: 'e2e_admin@example.com', password: 'hash', role: 'ADMIN' },
    });
    adminToken = generateToken(adminUser.id, 'ADMIN', adminUser.id);

    // 2. Category setup
    const category = await prisma.category.upsert({
      where: { slug: 'electronics-apparel' },
      update: {},
      create: {
        name: 'Electronics & Apparel',
        slug: 'electronics-apparel',
        icon: 'cpu',
        description: 'Multi-vendor catalog category',
        gstRate: 18,
        hsnDefault: '8517',
        commissionPct: 10,
        returnDays: 7,
      },
    });

    // 3. Seller A Setup
    sellerAUser = await prisma.user.create({
      data: {
        email: 'e2e_seller_a@example.com',
        password: 'hash',
        role: 'SELLER',
        seller: {
          create: {
            displayName: 'A-Store Technologies',
            slug: 'a-store-tech',
            legalName: 'A-Store Pvt Ltd',
            ownerName: 'Alice Johnson',
            phone: '9988776655',
            pan: 'ABCDE1234F',
            city: 'Bangalore',
            state: 'Karnataka',
            stateCode: 'KA',
            pickupAddress: { street: '123 Tech Park' },
            status: 'ACTIVE',
            bank: { accountNumber: '111122223333', ifsc: 'HDFC0001234' },
          },
        },
      },
      include: { seller: true },
    });
    sellerAId = sellerAUser.seller!.id;
    sellerAToken = generateToken(sellerAUser.id, 'SELLER', sellerAId);

    // Product & Variant for Seller A
    const prodA = await prisma.product.create({
      data: {
        title: 'Pro Ultra Laptop',
        slug: 'pro-ultra-laptop',
        brand: 'TechBrand',
        description: 'High performance laptop',
        hsn: '8471',
        gstRate: 18,
        dispatchDays: 2,
        weightKg: 2.1,
        countryOfOrigin: 'India',
        manufacturer: 'TechCorp',
        categoryId: category.id,
        sellerId: sellerAId,
        highlights: ['16GB RAM', '512GB SSD'],
        specs: [{ key: 'RAM', value: '16GB' }],
        media: [],
        axes: [],
        dimensionsCm: [30, 20, 2],
        status: 'LIVE',
        returnDays: 7,
      },
    });
    productAId = prodA.id;

    const varA = await prisma.variant.create({
      data: {
        productId: productAId,
        sku: 'LAPTOP-PRO-16',
        mrp: 60000,
        price: 50000,
        stock: 10,
        options: { color: 'Space Grey' },
      },
    });
    variantAId = varA.id;

    // 4. Seller B Setup
    sellerBUser = await prisma.user.create({
      data: {
        email: 'e2e_seller_b@example.com',
        password: 'hash',
        role: 'SELLER',
        seller: {
          create: {
            displayName: 'B-Fashion Hub',
            slug: 'b-fashion-hub',
            legalName: 'B-Fashion LLP',
            ownerName: 'Bob Smith',
            phone: '9876543210',
            pan: 'XYZAB5678C',
            city: 'Mumbai',
            state: 'Maharashtra',
            stateCode: 'MH',
            pickupAddress: { street: '456 Fashion St' },
            status: 'ACTIVE',
            bank: { accountNumber: '444455556666', ifsc: 'ICIC0005678' },
          },
        },
      },
      include: { seller: true },
    });
    sellerBId = sellerBUser.seller!.id;
    sellerBToken = generateToken(sellerBUser.id, 'SELLER', sellerBId);

    // Product & Variant for Seller B
    const prodB = await prisma.product.create({
      data: {
        title: 'Organic Cotton Hoodie',
        slug: 'organic-cotton-hoodie',
        brand: 'EcoWear',
        description: 'Premium heavyweight hoodie',
        hsn: '6109',
        gstRate: 12,
        dispatchDays: 1,
        weightKg: 0.8,
        countryOfOrigin: 'India',
        manufacturer: 'EcoCorp',
        categoryId: category.id,
        sellerId: sellerBId,
        highlights: ['100% Organic', 'Eco Friendly'],
        specs: [{ key: 'Material', value: 'Cotton' }],
        media: [],
        axes: [],
        dimensionsCm: [25, 20, 5],
        status: 'LIVE',
        returnDays: 7,
      },
    });
    productBId = prodB.id;

    const varB = await prisma.variant.create({
      data: {
        productId: productBId,
        sku: 'HOODIE-BLK-L',
        mrp: 3000,
        price: 2000,
        stock: 25,
        options: { size: 'L', color: 'Black' },
      },
    });
    variantBId = varB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Step 1: Customer registers, logs in, and sets up shipping address', async () => {
    // 1. Register customer
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'e2e_customer@example.com',
        password: 'Password123!',
        role: 'CUSTOMER',
        name: 'Jane Doe',
        phone: '9123456789',
      });
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // 2. Login customer
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'e2e_customer@example.com',
        password: 'Password123!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();

    customerToken = loginRes.body.data.token;
    customerId = loginRes.body.data.user.entityId;
    expect(customerId).toBeDefined();

    // 3. Create delivery address
    const addr = await prisma.address.create({
      data: {
        customerId,
        name: 'Jane Doe',
        phone: '9123456789',
        line1: 'Flat 402, Green Valley Apartments',
        city: 'Bangalore',
        state: 'Karnataka',
        stateCode: 'KA',
        pin: '560001',
        type: 'home',
      },
    });
    addressId = addr.id;
    expect(addressId).toBeDefined();
  });

  it('Step 2: Customer adds items from both Seller A and Seller B to Cart', async () => {
    // Add 1 Laptop from Seller A (price: 50000)
    const cartResA = await request(app)
      .post('/api/v1/customers/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: productAId, variantId: variantAId, sellerId: sellerAId, qty: 1 });
    expect(cartResA.status).toBe(201);

    // Add 2 Hoodies from Seller B (price: 2000 * 2 = 4000)
    const cartResB = await request(app)
      .post('/api/v1/customers/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: productBId, variantId: variantBId, sellerId: sellerBId, qty: 2 });
    expect(cartResB.status).toBe(201);

    // Verify Cart contents
    const getCart = await request(app)
      .get('/api/v1/customers/cart')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(getCart.status).toBe(200);
    expect(getCart.body.data.length).toBe(2);
  });

  let orderId: string;
  let shipmentAId: string;
  let shipmentBId: string;

  it('Step 3: Multi-vendor checkout atomically decrements stock and splits shipments', async () => {
    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId,
        paymentMethod: 'CARD',
        cardLast4: '4242',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.success).toBe(true);
    orderId = checkoutRes.body.data.orderId;
    expect(orderId).toBeDefined();

    // Verify stock decremented atomically
    const vA = await prisma.variant.findUnique({ where: { id: variantAId } });
    expect(vA?.stock).toBe(9); // 10 - 1

    const vB = await prisma.variant.findUnique({ where: { id: variantBId } });
    expect(vB?.stock).toBe(23); // 25 - 2

    // Verify database created 2 separate shipments for Seller A and Seller B
    const orderInDb = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: { include: { items: true } } },
    });
    expect(orderInDb?.shipments.length).toBe(2);

    const shipA = orderInDb?.shipments.find((s) => s.sellerId === sellerAId);
    const shipB = orderInDb?.shipments.find((s) => s.sellerId === sellerBId);

    expect(shipA).toBeDefined();
    expect(shipB).toBeDefined();
    shipmentAId = shipA!.id;
    shipmentBId = shipB!.id;

    expect((shipA!.totals as any).price).toBe(50000);
    expect((shipB!.totals as any).price).toBe(4000);
  });

  it('Step 4: Seller order isolation and progression through state machine', async () => {
    // Seller A queries their shipments
    const shipmentsA = await request(app)
      .get('/api/v1/sellers/shipments')
      .set('Authorization', `Bearer ${sellerAToken}`);
    expect(shipmentsA.status).toBe(200);
    const shipIdsA = shipmentsA.body.data.map((s: any) => s.id);
    expect(shipIdsA).toContain(shipmentAId);
    expect(shipIdsA).not.toContain(shipmentBId); // Must not see Seller B's shipment

    // Seller A tries to mutate Seller B's shipment status -> must be forbidden (404)
    const hijackRes = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentBId}/status`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ status: 'DELIVERED' });
    expect(hijackRes.status).toBe(404);

    // Seller A progresses their shipment through valid lifecycle states:
    // CONFIRMED -> PACKED -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
    const updateA1 = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentAId}/status`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ status: 'PACKED' });
    expect(updateA1.status).toBe(200);

    const updateA2 = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentAId}/status`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ status: 'SHIPPED' });
    expect(updateA2.status).toBe(200);

    const updateA3 = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentAId}/status`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ status: 'OUT_FOR_DELIVERY' });
    expect(updateA3.status).toBe(200);

    const updateA4 = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentAId}/status`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ status: 'DELIVERED' });
    expect(updateA4.status).toBe(200);

    // Seller B progresses their shipment:
    // CONFIRMED -> PACKED -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
    await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentBId}/status`)
      .set('Authorization', `Bearer ${sellerBToken}`)
      .send({ status: 'PACKED' });

    await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentBId}/status`)
      .set('Authorization', `Bearer ${sellerBToken}`)
      .send({ status: 'SHIPPED' });

    await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentBId}/status`)
      .set('Authorization', `Bearer ${sellerBToken}`)
      .send({ status: 'OUT_FOR_DELIVERY' });

    const updateB4 = await request(app)
      .post(`/api/v1/sellers/shipments/${shipmentBId}/status`)
      .set('Authorization', `Bearer ${sellerBToken}`)
      .send({ status: 'DELIVERED' });
    expect(updateB4.status).toBe(200);
  });

  it('Step 5: Seller & Admin financial reporting reflects real data', async () => {
    // Seller A financial overview
    const financeA = await request(app)
      .get('/api/v1/sellers/finance/sales')
      .set('Authorization', `Bearer ${sellerAToken}`);
    expect(financeA.status).toBe(200);

    // Seller B financial overview
    const financeB = await request(app)
      .get('/api/v1/sellers/finance/sales')
      .set('Authorization', `Bearer ${sellerBToken}`);
    expect(financeB.status).toBe(200);

    // Admin dashboard metrics
    const adminDash = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDash.status).toBe(200);
    expect(adminDash.body.data.totalOrders).toBeGreaterThanOrEqual(1);
    expect(adminDash.body.data.totalSellers).toBeGreaterThanOrEqual(2);
    expect(adminDash.body.data.totalCustomers).toBeGreaterThanOrEqual(1);
  });
});
