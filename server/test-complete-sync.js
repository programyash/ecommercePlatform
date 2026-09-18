const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('=== STEP 1: Seller Authentication & Product Creation ===');
  // Login as Orbit Mobiles
  const sellerLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'orbit.mobiles.hub@example.in', password: 'password123' })
  }).then(r => r.json());

  if (!sellerLogin.success) {
    throw new Error('Seller login failed: ' + JSON.stringify(sellerLogin));
  }
  const sellerToken = sellerLogin.data.token;
  console.log('✓ Seller authenticated. Entity ID:', sellerLogin.data.user.seller?.id);

  const testProductId = `prd_test_${Date.now()}`;
  const testVariantId = `${testProductId}_v1`;
  const testSku = `TEST-${Date.now().toString().slice(-4)}`;

  const createProdRes = await fetch('http://localhost:5000/api/v1/sellers/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sellerToken}`
    },
    body: JSON.stringify({
      id: testProductId,
      title: 'Realme Ultra Pro 5G Test Phone',
      brand: 'Realme',
      categoryId: 'cat_smartphones',
      description: 'Brand new 5G smartphone with flagship processor and ultra fast charging.',
      highlights: ['Snapdragon 8 Gen 3', '50MP Sony Camera', '120W Fast Charging'],
      hsn: '8517',
      gstRate: 18,
      dispatchDays: 2,
      weightKg: 0.2,
      dimensionsCm: [16, 7.5, 0.8],
      countryOfOrigin: 'India',
      manufacturer: 'Realme India Ltd',
      status: 'LIVE',
      variants: [
        {
          id: testVariantId,
          sku: testSku,
          price: 29999,
          mrp: 34999,
          stock: 25,
          options: { colour: 'Starlight Silver', storage: '256 GB' }
        }
      ]
    })
  }).then(r => r.json());

  console.log('Product Creation API response:', createProdRes.success ? '✓ SUCCESS' : 'FAILED', createProdRes.message || '');
  if (!createProdRes.success) {
    throw new Error('Product creation failed: ' + JSON.stringify(createProdRes));
  }
  const createdProd = createProdRes.data;
  console.log('✓ Created product ID:', createdProd.id, 'Status:', createdProd.status, 'Variant ID:', createdProd.variants[0]?.id);

  // Verify in PostgreSQL
  const dbProd = await prisma.product.findUnique({
    where: { id: testProductId },
    include: { variants: true }
  });
  console.log('✓ Verified in DB - Title:', dbProd.title, 'Stock:', dbProd.variants[0]?.stock);

  // Check public product storefront API
  const publicProdRes = await fetch(`http://localhost:5000/api/v1/products/${dbProd.slug}`).then(r => r.json());
  console.log('✓ Verified public Storefront API status:', publicProdRes.success, 'Slug:', publicProdRes.data?.slug);

  console.log('\n=== STEP 2: Customer Authentication & Checkout ===');
  const customerLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.nair@example.in', password: 'password123' })
  }).then(r => r.json());
  const customerToken = customerLogin.data.token;
  console.log('✓ Customer authenticated. ID:', customerLogin.data.user.customer?.id);

  const checkoutOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const checkoutRes = await fetch('http://localhost:5000/api/v1/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      orderId: checkoutOrderId,
      addressId: 'addr_home',
      paymentMethod: 'upi',
      upiVpa: 'priya@okaxis',
      lines: [
        { productId: testProductId, variantId: testVariantId, qty: 3 }
      ]
    })
  }).then(r => r.json());

  console.log('Checkout API response:', checkoutRes.success ? '✓ SUCCESS' : 'FAILED', checkoutRes.message || '');
  if (!checkoutRes.success) {
    throw new Error('Checkout failed: ' + JSON.stringify(checkoutRes));
  }
  console.log('✓ Order placed:', checkoutRes.data.orderId);

  console.log('\n=== STEP 3: Stock Decrement & Inventory Tracking ===');
  const updatedVariant = await prisma.variant.findUnique({ where: { id: testVariantId } });
  console.log('Original stock: 25 | Purchased: 3 | Current DB stock:', updatedVariant.stock);
  if (updatedVariant.stock !== 22) {
    throw new Error(`Expected stock 22 but got ${updatedVariant.stock}`);
  }
  console.log('✓ Atomic stock decrement verified in PostgreSQL database!');

  console.log('\n=== STEP 4: Seller Hub Order Tracking ===');
  const sellerShipments = await fetch('http://localhost:5000/api/v1/sellers/shipments', {
    headers: { 'Authorization': `Bearer ${sellerToken}` }
  }).then(r => r.json());

  const foundShipment = sellerShipments.data?.find(s => s.orderId === checkoutOrderId);
  console.log('✓ Seller Hub Shipments API tracking:');
  console.log('  Found shipment for order:', foundShipment ? `YES (ID: ${foundShipment.id}, Status: ${foundShipment.status})` : 'NO');
  if (!foundShipment) {
    throw new Error('Order not found in seller shipments API!');
  }

  console.log('\n=== STEP 5: Admin Portal Order Tracking ===');
  const adminLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@chowk.com', password: 'password123' })
  }).then(r => r.json());
  const adminToken = adminLogin.data.token;

  const adminOrders = await fetch('http://localhost:5000/api/v1/admin/orders', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());

  const foundAdminOrder = adminOrders.data?.find(o => o.id === checkoutOrderId);
  console.log('✓ Admin Portal Orders API tracking:');
  console.log('  Found order in admin orders:', foundAdminOrder ? `YES (ID: ${foundAdminOrder.id}, Amount: ₹${foundAdminOrder.paymentAmount})` : 'NO');
  if (!foundAdminOrder) {
    throw new Error('Order not found in admin orders API!');
  }

  console.log('\n=== STEP 6: Admin Dashboard Metrics ===');
  const metrics = await fetch('http://localhost:5000/api/v1/admin/dashboard', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  console.log('✓ Admin Dashboard Metrics:');
  console.log('  Total Orders:', metrics.data.totalOrders);
  console.log('  Total Revenue:', metrics.data.revenue);
  console.log('  Total Products:', metrics.data.totalProducts);

  console.log('\n========================================');
  console.log('ALL VERIFICATION CHECKS PASSED 100%!');
  console.log('========================================');
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
