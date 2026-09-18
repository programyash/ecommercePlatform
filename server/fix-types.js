const fs = require('fs');

function replace(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(search).join(replace);
  fs.writeFileSync(file, content);
}

// admin.controller.ts
replace('src/controllers/admin.controller.ts', 'const status = req.query.status as string;', 'const status = req.query.status?.toString();');
replace('src/controllers/admin.controller.ts', 'const sellerId = req.query.sellerId as string;', 'const sellerId = req.query.sellerId?.toString();');
replace('src/controllers/admin.controller.ts', 'rejectionReason: status === "REJECTED" ? rejectionReason : null,', '');

// product.controller.ts
replace('src/controllers/product.controller.ts', 'ProductStatus.APPROVED', 'ProductStatus.LIVE');
replace('src/controllers/product.controller.ts', 'const categoryId = req.query.categoryId as string;', 'const categoryId = req.query.categoryId?.toString();');
replace('src/controllers/product.controller.ts', 'const search = req.query.search as string;', 'const search = req.query.search?.toString();');
replace('src/controllers/product.controller.ts', 'isApproved: true,', '');

// seller.controller.ts
replace('src/controllers/seller.controller.ts', 'const search = req.query.search as string;', 'const search = req.query.search?.toString();');
replace('src/controllers/seller.controller.ts', 'const status = req.query.status as string;', 'const status = req.query.status?.toString();');
replace('src/controllers/seller.controller.ts', 'const sku = req.query.sku as string;', 'const sku = req.query.sku?.toString();');
replace('src/controllers/seller.controller.ts', 'const title = req.query.title as string;', 'const title = req.query.title?.toString();');
replace('src/controllers/seller.controller.ts', 'const priceMin = req.query.priceMin as string;', 'const priceMin = req.query.priceMin?.toString();');
replace('src/controllers/seller.controller.ts', 'const priceMax = req.query.priceMax as string;', 'const priceMax = req.query.priceMax?.toString();');

// validateRequest.ts
replace('src/middleware/validateRequest.ts', 'error.errors', 'error.message'); // Fix ZodError errors property missing type error
