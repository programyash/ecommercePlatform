import request from 'supertest';
import app from '../app';
import { prisma } from '../server';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
;

// Mock auth token helper
const generateToken = (userId: string, role: Role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

describe('Customer API Tests', () => {
  let customer1Token: string;
  let customer2Token: string;
  let productId: string;
  let variantId: string;
  let sellerId: string;

  beforeAll(async () => {
    try {
      await prisma.cartItem.deleteMany();
      await prisma.wishlistItem.deleteMany();
      await prisma.address.deleteMany();
      await prisma.variant.deleteMany({ where: { sku: 'SKU1' } });
      await prisma.product.deleteMany({ where: { slug: 'p1' } });
      await prisma.category.deleteMany({ where: { slug: 'cat' } });
      await prisma.seller.deleteMany({ where: { slug: 's1' } });
      await prisma.user.deleteMany({ where: { email: { in: ['c1@test.com', 'c2@test.com', 's1@test.com'] } } });

      const u1 = await prisma.user.create({ data: { email: 'c1@test.com', password: 'hash', role: 'CUSTOMER', customer: { create: { name: 'C1', phone: '11' } } }, include: { customer: true } });
      const u2 = await prisma.user.create({ data: { email: 'c2@test.com', password: 'hash', role: 'CUSTOMER', customer: { create: { name: 'C2', phone: '22' } } }, include: { customer: true } });
      customer1Token = generateToken(u1.id, 'CUSTOMER');
      customer2Token = generateToken(u2.id, 'CUSTOMER');

      const sellerUser = await prisma.user.create({ data: { email: 's1@test.com', password: 'hash', role: 'SELLER', seller: { create: { displayName: 'S1', slug: 's1', legalName: 's1', ownerName: 's1', phone: '1', pan: '1', city: 'c', state: 's', stateCode: 's', pickupAddress: {}, status: 'ACTIVE', bank: {} } } }, include: { seller: true } });
      sellerId = sellerUser.seller!.id;

      const cat = await prisma.category.create({ data: { name: 'Cat', slug: 'cat', icon: 'tag', description: '', gstRate: 0, hsnDefault: '1', commissionPct: 1, returnDays: 1 } });
      const product = await prisma.product.create({ data: { title: 'P1', slug: 'p1', brand: 'B1', description: 'd', hsn: '1', gstRate: 1, dispatchDays: 1, weightKg: 1, countryOfOrigin: 'c', manufacturer: 'm', categoryId: cat.id, sellerId, highlights: [], specs: [], media: [], axes: [], dimensionsCm: [], status: 'LIVE', returnDays: 1 } });
      productId = product.id;

      const variant = await prisma.variant.create({ data: { productId, sku: 'SKU1', mrp: 100, price: 90, stock: 10, options: {} } });
      variantId = variant.id;
    } catch (e) {
      console.log('Setup failed', e);
    }
  });

  afterAll(async () => {
    try {
      await prisma.cartItem.deleteMany();
      await prisma.wishlistItem.deleteMany();
      await prisma.address.deleteMany();
      await prisma.variant.deleteMany();
      await prisma.product.deleteMany();
      await prisma.seller.deleteMany();
      await prisma.customer.deleteMany();
      await prisma.user.deleteMany();
      await prisma.$disconnect();
    } catch (e) {}
  });

  describe('Cart API', () => {
    it('should add item to cart', async () => {
      const res = await request(app)
        .post('/api/v1/customers/cart')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ productId, variantId, sellerId, qty: 2 });
      
      expect(res.status).toBe(201);
      expect(res.body.data.qty).toBe(2);
    });

    it('should reject quantity exceeding stock', async () => {
      const res = await request(app)
        .post('/api/v1/customers/cart')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ productId, variantId, sellerId, qty: 50 }); // stock is 10
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Insufficient stock');
    });

    it('should maintain customer isolation for cart', async () => {
      const res = await request(app)
        .get('/api/v1/customers/cart')
        .set('Authorization', `Bearer ${customer2Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // Customer 2 cart should be empty
    });
  });

  describe('Address API', () => {
    it('should add address', async () => {
      const res = await request(app)
        .post('/api/v1/customers/addresses')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ name: 'Home', phone: '1234567890', line1: 'Street 1', city: 'City', state: 'State', stateCode: 'ST', pin: '123456' });
      
      expect(res.status).toBe(201);
      expect(res.body.data.city).toBe('City');
    });
  });
});
