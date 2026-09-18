const { PrismaClient } = require('@prisma/client');
const p1 = new PrismaClient({datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public' }}});
p1.$connect().then(()=>console.log('postgres:postgres works')).catch(e=>console.log('postgres:postgres fails'));

const p2 = new PrismaClient({datasources: { db: { url: 'postgresql://postgres:password@localhost:5432/ecommerce?schema=public' }}});
p2.$connect().then(()=>console.log('postgres:password works')).catch(e=>console.log('postgres:password fails'));

const p3 = new PrismaClient({datasources: { db: { url: 'postgresql://postgres:admin@localhost:5432/ecommerce?schema=public' }}});
p3.$connect().then(()=>console.log('postgres:admin works')).catch(e=>console.log('postgres:admin fails'));

const p4 = new PrismaClient({datasources: { db: { url: 'postgresql://postgres:@localhost:5432/ecommerce?schema=public' }}});
p4.$connect().then(()=>console.log('postgres:no-password works')).catch(e=>console.log('postgres:no-password fails'));
