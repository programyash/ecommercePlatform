const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('Products count:', await p.product.count());
  console.log('Sellers count:', await p.seller.count());
  console.log('Orders count:', await p.order.count());
  console.log('Shipments count:', await p.shipment.count());
  console.log('Categories count:', await p.category.count());
  const prods = await p.product.findMany({
    include: { variants: true }
  });
  console.log('Products:', JSON.stringify(prods, null, 2));
  const orders = await p.order.findMany({
    include: { shipments: { include: { items: true } } }
  });
  console.log('Orders:', JSON.stringify(orders, null, 2));
}

check().finally(() => p.$disconnect());
