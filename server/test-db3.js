const { PrismaClient } = require('@prisma/client');

async function testCreds() {
  const users = ['postgres'];
  const passwords = ['admin'];
  const ports = [5432, 5433, 5434];

  for (const port of ports) {
    const url = `postgresql://postgres:admin@localhost:${port}/ecommerce?schema=public`;
    const p = new PrismaClient({ datasources: { db: { url } } });
    try {
      await p.$connect();
      console.log(`SUCCESS: ${url}`);
      process.exit(0);
    } catch (e) {
      // failed
    } finally {
      await p.$disconnect();
    }
  }
  console.log('ALL FAILED');
}

testCreds();
