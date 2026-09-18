const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function testPurchase() {
  console.log('1. Logging in as customer...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.nair@example.in', password: 'password123' })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data.token;
  console.log('Logged in. Token acquired.');

  console.log('2. Placing checkout order for 2 units of Voltix Nova 5G...');
  const checkoutRes = await fetch('http://localhost:5000/api/v1/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      addressId: 'addr_home',
      paymentMethod: 'upi',
      upiVpa: 'priya@okaxis',
      lines: [
        { productId: 'prd_voltix_nova_5g', variantId: 'prd_voltix_nova_5g_v1', qty: 2 }
      ]
    })
  });

  const checkoutJson = await checkoutRes.json();
  console.log('Checkout response:', JSON.stringify(checkoutJson, null, 2));

  if (!checkoutJson.success) {
    console.error('Checkout failed!');
    process.exit(1);
  }

  const orderId = checkoutJson.data.orderId;
  console.log(`Order created: ${orderId}`);

  // 3. Verify stock decreased
  const variant = await p.variant.findUnique({ where: { id: 'prd_voltix_nova_5g_v1' } });
  console.log(`New stock for prd_voltix_nova_5g_v1: ${variant.stock} (was 18, should be 16)`);

  // 4. Verify order in DB
  const order = await p.order.findUnique({
    where: { id: orderId },
    include: { shipments: { include: { items: true } } }
  });
  console.log(`Order in DB totals:`, order.totals);
  console.log(`Shipments in DB:`, order.shipments.map(s => ({ id: s.id, sellerId: s.sellerId, status: s.status, items: s.items.length })));

  // 5. Test Seller Shipments API
  console.log('5. Testing Seller Shipments API for Orbit Mobiles...');
  const sellerLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'orbit.mobiles.hub@example.in', password: 'password123' })
  }).then(r => r.json());
  const sellerToken = sellerLogin.data.token;

  const sellerShipments = await fetch('http://localhost:5000/api/v1/sellers/shipments', {
    headers: { 'Authorization': `Bearer ${sellerToken}` }
  }).then(r => r.json());
  console.log(`Seller shipments count: ${sellerShipments.data?.length}`);
  console.log(`Latest seller shipment order ID: ${sellerShipments.data?.[0]?.order?.id}`);

  // 6. Test Admin Orders API
  console.log('6. Testing Admin Orders API...');
  const adminLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@chowk.com', password: 'password123' })
  }).then(r => r.json());
  const adminToken = adminLogin.data.token;

  const adminOrders = await fetch('http://localhost:5000/api/v1/admin/orders', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  console.log(`Admin orders count: ${adminOrders.data?.length}`);
  console.log(`Latest admin order ID: ${adminOrders.data?.[0]?.id}`);
}

testPurchase().catch(console.error).finally(() => p.$disconnect());
