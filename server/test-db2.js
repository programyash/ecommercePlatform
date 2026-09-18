const { PrismaClient } = require('@prisma/client');

async function testCreds() {
  const users = ['postgres', 'admin', 'root', 'yashc'];
  const passwords = ['admin', 'postgres', 'password', '1234', 'root', ''];

  for (const user of users) {
    for (const pass of passwords) {
      const url = `postgresql://${user}:${pass}@localhost:5432/ecommerce?schema=public`;
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
      
      const url2 = `postgresql://${user}:${pass}@localhost:5432/postgres?schema=public`;
      const p2 = new PrismaClient({ datasources: { db: { url: url2 } } });
      try {
        await p2.$connect();
        console.log(`SUCCESS: ${url2}`);
        process.exit(0);
      } catch (e) {
        // failed
      } finally {
        await p2.$disconnect();
      }
    }
  }
  console.log('ALL FAILED');
}

testCreds();
