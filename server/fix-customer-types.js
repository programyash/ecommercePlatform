const fs = require('fs');

// customer.controller.ts
let controller = fs.readFileSync('src/controllers/customer.controller.ts', 'utf8');
controller = controller.split('req.user!.id').join('req.user!.userId');
controller = controller.replace(/ApiResponse\.success\("([^"]+)", ([^\)]+)\)/g, 'ApiResponse.success($2, "$1")');
fs.writeFileSync('src/controllers/customer.controller.ts', controller);

// customer.routes.ts
let routes = fs.readFileSync('src/routes/customer.routes.ts', 'utf8');
routes = routes.replace('requireRole("CUSTOMER")', 'requireRole(["CUSTOMER"])');
routes = routes.split('validateRequest').join('validate');
fs.writeFileSync('src/routes/customer.routes.ts', routes);

// test
let testFile = fs.readFileSync('src/tests/customer.test.ts', 'utf8');
testFile = testFile.split("import { app } from '../app'").join("import app from '../app'");
testFile = testFile.split("import { env } from '../config/env'").join("");
testFile = testFile.split("env.JWT_SECRET").join("process.env.JWT_SECRET");
fs.writeFileSync('src/tests/customer.test.ts', testFile);
