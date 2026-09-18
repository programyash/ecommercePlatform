import { PrismaClient, Role, CustomerStatus, SellerStatus, ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with full marketplace data...");

  // 1. Clean existing transactional data
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.kycItem.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformSettings.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 2. Platform Settings
  await prisma.platformSettings.create({
    data: {
      id: 1,
      marketplaceName: "Chowk",
      supportEmail: "support@chowk.com",
      freeDeliveryThreshold: 499,
      deliveryFee: 40,
      expressFee: 99,
      codLimit: 5000,
      codFee: 30,
      defaultReturnDays: 7,
      fixedFee: 15,
      shippingFeePerShipment: 40,
      gstOnFeesPct: 18,
      tcsPct: 1,
      tdsPct: 1,
      payoutDelayDays: 7,
      unserviceablePins: ["000000", "999999"],
    },
  });

  // 3. Super Admin
  await prisma.user.create({
    data: {
      email: "admin@chowk.com",
      password: passwordHash,
      role: Role.ADMIN,
      admin: {
        create: {
          id: "adm_super",
          name: "Super Admin",
          roleId: "super_admin",
        },
      },
    },
  });

  // 4. Default Demo Customers
  const priyaUser = await prisma.user.create({
    data: {
      email: "priya.nair@example.in",
      password: passwordHash,
      role: Role.CUSTOMER,
      customer: {
        create: {
          id: "cus_priya",
          name: "Priya Nair",
          phone: "9845012345",
          status: CustomerStatus.ACTIVE,
          addresses: {
            create: [
              {
                id: "addr_home",
                name: "Priya Nair",
                phone: "9845012345",
                line1: "123 Coral Bay, Marine Drive",
                line2: "Apt 4B",
                city: "Kochi",
                state: "Kerala",
                stateCode: "KL",
                pin: "682001",
                type: "home",
              },
              {
                id: "addr_office",
                name: "Priya Nair",
                phone: "9845012345",
                line1: "Infopark Phase 2",
                line2: "Tower 1, 6th Floor",
                city: "Kochi",
                state: "Kerala",
                stateCode: "KL",
                pin: "682042",
                type: "work",
              },
            ],
          },
        },
      },
    },
  });

  // Also create customer1@example.com for tests / demo
  await prisma.user.create({
    data: {
      email: "customer1@example.com",
      password: passwordHash,
      role: Role.CUSTOMER,
      customer: {
        create: {
          name: "Jane Doe",
          phone: "9876543210",
          status: CustomerStatus.ACTIVE,
          addresses: {
            create: {
              name: "Jane Doe",
              phone: "9876543210",
              line1: "123 Main St",
              city: "Mumbai",
              state: "Maharashtra",
              stateCode: "MH",
              pin: "400001",
              type: "home",
            },
          },
        },
      },
    },
  });

  // 5. Load exported seed data
  const seedFile = path.resolve(__dirname, "seed-data.json");
  if (!fs.existsSync(seedFile)) {
    console.error("seed-data.json not found!");
    return;
  }
  const seedData = JSON.parse(fs.readFileSync(seedFile, "utf-8"));

  // 6. Categories (Parents first, then children)
  const parents = seedData.categories.filter((c: any) => !c.parentId);
  const children = seedData.categories.filter((c: any) => Boolean(c.parentId));

  for (const cat of parents) {
    await prisma.category.create({
      data: {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon || "box",
        image: cat.image || null,
        description: cat.description || "",
        gstRate: cat.gstRate || 18,
        hsnDefault: cat.hsnDefault || "8517",
        commissionPct: cat.commissionPct || 5,
        returnDays: cat.returnDays ?? 7,
        sortOrder: cat.sortOrder || 0,
        facets: cat.facets || [],
      },
    });
  }

  for (const cat of children) {
    await prisma.category.create({
      data: {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        parentId: cat.parentId,
        icon: cat.icon || "box",
        image: cat.image || null,
        description: cat.description || "",
        gstRate: cat.gstRate || 18,
        hsnDefault: cat.hsnDefault || "8517",
        commissionPct: cat.commissionPct || 5,
        returnDays: cat.returnDays ?? 7,
        sortOrder: cat.sortOrder || 0,
        facets: cat.facets || [],
      },
    });
  }
  console.log(`Seeded ${seedData.categories.length} categories.`);

  // 7. Sellers
  for (const s of seedData.sellers) {
    const statusMap: Record<string, SellerStatus> = {
      active: SellerStatus.ACTIVE,
      under_review: SellerStatus.UNDER_REVIEW,
      action_required: SellerStatus.ACTION_REQUIRED,
      suspended: SellerStatus.SUSPENDED,
      rejected: SellerStatus.REJECTED,
    };
    const sellerStatus = statusMap[s.status] || SellerStatus.ACTIVE;

    const sellerUser = await prisma.user.create({
      data: {
        email: s.email,
        password: passwordHash,
        role: Role.SELLER,
        seller: {
          create: {
            id: s.id,
            slug: s.slug,
            displayName: s.displayName,
            legalName: s.legalName,
            ownerName: s.ownerName,
            phone: s.phone,
            gstin: s.gstin,
            pan: s.pan,
            city: s.city,
            state: s.state,
            stateCode: s.stateCode,
            pickupAddress: s.pickupAddress || {},
            bank: s.bank || {},
            status: sellerStatus,
            joinedAt: s.joinedAt ? new Date(s.joinedAt) : new Date(),
          },
        },
      },
    });
  }

  // Also create seller1@example.com for tests
  await prisma.user.create({
    data: {
      email: "seller1@example.com",
      password: passwordHash,
      role: Role.SELLER,
      seller: {
        create: {
          slug: "tech-haven",
          displayName: "Tech Haven",
          legalName: "Tech Haven Pvt Ltd",
          ownerName: "John Smith",
          phone: "9988776655",
          gstin: "27ABCDE1234F1Z5",
          pan: "ABCDE1234F",
          city: "Bengaluru",
          state: "Karnataka",
          stateCode: "KA",
          pickupAddress: {
            line1: "45 Tech Park",
            city: "Bengaluru",
            state: "Karnataka",
            stateCode: "KA",
            pin: "560001",
          },
          status: SellerStatus.ACTIVE,
          bank: {
            accountName: "Tech Haven",
            bankName: "HDFC Bank",
            ifsc: "HDFC0001234",
            last4: "9876",
          },
        },
      },
    },
  });
  console.log(`Seeded ${seedData.sellers.length + 1} sellers.`);

  // 8. Products and Variants
  let seededProducts = 0;
  for (const p of seedData.products) {
    const statusMap: Record<string, ProductStatus> = {
      live: ProductStatus.LIVE,
      pending: ProductStatus.PENDING,
      rejected: ProductStatus.REJECTED,
      draft: ProductStatus.DRAFT,
      inactive: ProductStatus.INACTIVE,
      blocked: ProductStatus.BLOCKED,
    };
    const prodStatus = statusMap[p.status] || ProductStatus.LIVE;

    try {
      await prisma.product.create({
        data: {
          id: p.id,
          slug: p.slug,
          title: p.title,
          brand: p.brand || "Generic",
          categoryId: p.categoryId,
          sellerId: p.sellerId,
          description: p.description || "",
          highlights: p.highlights || [],
          specs: p.specs || [],
          media: p.media || [],
          cover: p.cover || null,
          axes: p.axes || [],
          swatches: p.swatches || null,
          tags: p.tags || [],
          returnDays: p.returnDays ?? 7,
          cod: p.cod ?? true,
          status: prodStatus,
          hsn: p.hsn || "8517",
          gstRate: p.gstRate ?? 18,
          dispatchDays: p.dispatchDays ?? 2,
          weightKg: p.weightKg ?? 0.5,
          dimensionsCm: p.dimensionsCm || [10, 10, 10],
          countryOfOrigin: p.countryOfOrigin || "India",
          manufacturer: p.manufacturer || "Generic",
          warranty: p.warranty || null,
          keywords: p.keywords || [],
          rating: p.rating || { avg: 4.5, count: 12 },
          variants: {
            create: p.variants.map((v: any) => ({
              id: v.id,
              sku: v.sku,
              options: v.options || {},
              mrp: Number(v.mrp || v.price),
              price: Number(v.price),
              stock: Number(v.stock ?? 25),
              lowStockAt: Number(v.lowStockAt ?? 5),
              active: v.active !== false,
              media: v.media || null,
            })),
          },
        },
      });
      seededProducts++;
    } catch (err: any) {
      console.warn(`Could not seed product ${p.slug}:`, err.message);
    }
  }

  console.log(`Seeded ${seededProducts} products with variants successfully!`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
