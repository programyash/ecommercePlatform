const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const prod = await p.product.findUnique({
    where: { id: 'prd_voltix_nova_5g' },
    include: { variants: true }
  });
  console.log('Product:', prod?.title);
  console.log('Variants & Stock:', prod?.variants.map(v => ({ id: v.id, sku: v.sku, stock: v.stock })));
}

check().finally(() => p.$disconnect());
