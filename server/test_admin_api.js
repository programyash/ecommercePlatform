require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.adminUser.findFirst();
  const token = jwt.sign({ userId: admin.userId, role: 'ADMIN' }, process.env.JWT_SECRET || 'secret');
  await prisma.$disconnect();
  
  const res = await fetch('http://localhost:5000/api/v1/admin/orders', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
