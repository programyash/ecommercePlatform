import request from 'supertest';
import app from '../app';
import { prisma } from '../server';
import jwt from 'jsonwebtoken';

const generateToken = (userId: string) => {
  return jwt.sign({ userId, role: 'CUSTOMER' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

describe('Checkout & Order API', () => {
  let customerToken: string;
  let customerId: string;
  let addressId: string;
  let productId1: string, variantId1: string;
  let productId2: string, variantId2: string;
  let sellerBId: string;
  let productId3: string, variantId3: string;

  beforeAll(async () => {
    try {
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

      const u = await prisma.user.create({ data: { email: 'checkout@test.com', password: 'hash', role: 'CUSTOMER', customer: { create: { name: 'CTester', phone: '123' } } }, include: { customer: true } });
      customerId = u.customer!.id;
      customerToken = generateToken(u.id);

      const address = await prisma.address.create({ data: { customerId, name: 'Home', phone: '1', line1: 'L1', city: 'C', state: 'S', stateCode: 'ST', pin: '123', type: 'home' } });
      addressId = address.id;

      const sellerUser = await prisma.user.create({ data: { email: 's_checkout@test.com', password: 'hash', role: 'SELLER', seller: { create: { displayName: 'S', slug: 's_ch', legalName: 'S', ownerName: 'S', phone: '1', pan: '1', city: 'C', state: 'S', stateCode: 'S', pickupAddress: {}, status: 'ACTIVE', bank: {} } } }, include: { seller: true } });
      sellerId = sellerUser.seller!.id;

      const sellerUserB = await prisma.user.create({ data: { email: 's_checkout_b@test.com', password: 'hash', role: 'SELLER', seller: { create: { displayName: 'Seller B', slug: 's_ch_b', legalName: 'SB', ownerName: 'SB', phone: '2', pan: '2', city: 'CB', state: 'SB', stateCode: 'SB', pickupAddress: {}, status: 'ACTIVE', bank: {} } } }, include: { seller: true } });
      sellerBId = sellerUserB.seller!.id;

      const cat = await prisma.category.create({ data: { name: 'C', slug: 'c_ch', icon: 'tag', description: '', gstRate: 0, hsnDefault: '1', commissionPct: 1, returnDays: 1 } });

      const p1 = await prisma.product.create({ data: { title: 'P1', slug: 'p1_ch', brand: 'B', description: 'D', hsn: '1', gstRate: 1, dispatchDays: 1, weightKg: 1, countryOfOrigin: 'IN', manufacturer: 'M', categoryId: cat.id, sellerId, highlights: [], specs: [], media: [], axes: [], dimensionsCm: [], status: 'LIVE', returnDays: 1 } });
      productId1 = p1.id;
      const v1 = await prisma.variant.create({ data: { productId: productId1, sku: 'SKU1_CH', mrp: 100, price: 90, stock: 5, options: {} } });
      variantId1 = v1.id;

      const p2 = await prisma.product.create({ data: { title: 'P2', slug: 'p2_ch', brand: 'B', description: 'D', hsn: '1', gstRate: 1, dispatchDays: 1, weightKg: 1, countryOfOrigin: 'IN', manufacturer: 'M', categoryId: cat.id, sellerId, highlights: [], specs: [], media: [], axes: [], dimensionsCm: [], status: 'LIVE', returnDays: 1 } });
      productId2 = p2.id;
      const v2 = await prisma.variant.create({ data: { productId: productId2, sku: 'SKU2_CH', mrp: 200, price: 150, stock: 1, options: {} } });
      variantId2 = v2.id;

      const p3 = await prisma.product.create({ data: { title: 'P3 Seller B', slug: 'p3_ch', brand: 'B', description: 'D', hsn: '1', gstRate: 1, dispatchDays: 1, weightKg: 1, countryOfOrigin: 'IN', manufacturer: 'M', categoryId: cat.id, sellerId: sellerBId, highlights: [], specs: [], media: [], axes: [], dimensionsCm: [], status: 'LIVE', returnDays: 1 } });
      productId3 = p3.id;
      const v3 = await prisma.variant.create({ data: { productId: productId3, sku: 'SKU3_CH', mrp: 300, price: 250, stock: 10, options: {} } });
      variantId3 = v3.id;
    } catch (e) {
      console.log('Setup failed', e);
    }
  });

  afterAll(async () => {
    try {
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
      await prisma.$disconnect();
    } catch (e) { }
  });

  beforeEach(async () => {
    // Clear and populate cart
    try {
      await prisma.cartItem.deleteMany({ where: { customerId } });
      await prisma.variant.update({ where: { id: variantId1 }, data: { stock: 5 } });
      await prisma.variant.update({ where: { id: variantId2 }, data: { stock: 1 } });
      await prisma.variant.update({ where: { id: variantId3 }, data: { stock: 10 } });
      await prisma.cartItem.create({ data: { customerId, productId: productId1, variantId: variantId1, sellerId, qty: 2 } });
      await prisma.cartItem.create({ data: { customerId, productId: productId2, variantId: variantId2, sellerId, qty: 1 } });
    } catch (e) { }
  });

  it('should successfully checkout and create order, shipments, and items', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId, paymentMethod: 'COD' });

    expect(res.status).toBe(200);
    expect(res.body.data.orderId).toBeDefined();

    // Verify stock decremented
    const v1 = await prisma.variant.findUnique({ where: { id: variantId1 } });
    expect(v1?.stock).toBe(3); // 5 - 2

    // Verify cart cleared
    const cart = await prisma.cartItem.findMany({ where: { customerId } });
    expect(cart.length).toBe(0);

    // Verify order snapshots
    const order = await prisma.order.findUnique({ where: { id: res.body.data.orderId }, include: { shipments: { include: { items: true } } } });
    expect(order).toBeDefined();
    expect(order?.shipments.length).toBe(1);
    expect(order?.shipments[0].items.length).toBe(2);
  });

  it('should support multi-vendor checkout and split order into multiple seller shipments', async () => {
    // Add item from Seller B to cart
    await prisma.cartItem.create({ data: { customerId, productId: productId3, variantId: variantId3, sellerId: sellerBId, qty: 2 } });

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId, paymentMethod: 'COD' });

    expect(res.status).toBe(200);
    expect(res.body.data.orderId).toBeDefined();

    const order = await prisma.order.findUnique({
      where: { id: res.body.data.orderId },
      include: { shipments: { include: { items: true } } }
    });

    // Should create exactly 2 sub-shipments: 1 for Seller A, 1 for Seller B
    expect(order?.shipments.length).toBe(2);
    const sellerIds = order?.shipments.map(s => s.sellerId);
    expect(sellerIds).toContain(sellerId);
    expect(sellerIds).toContain(sellerBId);

    // Verify Seller B stock decremented
    const v3 = await prisma.variant.findUnique({ where: { id: variantId3 } });
    expect(v3?.stock).toBe(8); // 10 - 2
  });

  it('should reject checkout if cart is empty', async () => {
    await prisma.cartItem.deleteMany({ where: { customerId } });

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId, paymentMethod: 'COD' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/empty/i);
  });

  it('should prevent checkout if stock is insufficient and rollback transaction', async () => {
    // Try to checkout 10 items of v1 when stock is only 3
    try {
      await prisma.cartItem.update({
        where: { customerId_variantId: { customerId, variantId: variantId1 } },
        data: { qty: 10 }
      });
    } catch (e) { }

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId, paymentMethod: 'COD' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock/i);

    // Verify stock did not decrement (rollback)
    const v1 = await prisma.variant.findUnique({ where: { id: variantId1 } });
    expect(v1?.stock).toBe(5); // reset in beforeEach
  });

  it('should fail checkout if mock card declines', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId, paymentMethod: 'CARD', cardLast4: '0000' });

    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/declined/i);
  });
});
