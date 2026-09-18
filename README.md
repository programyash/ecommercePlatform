# Chowk — Multi-Vendor E-Commerce Platform

A production-grade, full-stack multi-vendor e-commerce platform built for the Indian retail ecosystem, powered by **PostgreSQL**, **Prisma ORM**, **Express & TypeScript**, **Socket.IO**, and a modern **React 19** frontend.

---

## 🏛 System Architecture & Stack

```text
┌────────────────────────────────────────────────────────┐
│               Chowk Frontend (React 19)                │
│    Storefront (/)  │  Seller Hub (/seller)  │  Admin   │
└───────────────────────────┬────────────────────────────┘
                            │ REST APIs & WebSockets
                            ▼
┌────────────────────────────────────────────────────────┐
│           Express & TypeScript API Gateway             │
│   • Helmet / CORS / In-Memory Rate Limiting            │
│   • JWT Auth & Role-Based Access Control (RBAC)        │
│   • Zod Schema Request Validation & Error Handling     │
│   • Socket.IO Real-Time Order Event Broadcasting       │
└───────────────────────────┬────────────────────────────┘
                            │ Prisma ORM
                            ▼
┌────────────────────────────────────────────────────────┐
│          PostgreSQL Relational Database Engine         │
│   • Users, Customers, Sellers, KYC & Verification      │
│   • Catalog: Categories, Products & Multi-Variants     │
│   • Atomic Multi-Vendor Split Orders & Shipments       │
│   • Financial Ledger, Payouts, Commissions & Reports   │
└────────────────────────────────────────────────────────┘
```

### Technologies Used

| Layer | Stack |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Radix UI Primitives, Lucide Icons, Recharts, Zustand, Sonner |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, Helmet, In-Memory Sliding Window Rate Limiter |
| **ORM & Database** | Prisma ORM, PostgreSQL (ACID transactions, relational constraints) |
| **Validation & Security** | Zod schemas, BCrypt hashing, JWT with role & tenant entity claims |
| **Testing** | Jest, Supertest, ts-jest (8 test suites, 51 integration & state-machine tests) |
| **API Documentation** | OpenAPI 3.0 Specification (`server/src/docs/openapi.json`) |

---

## 📦 Core Platform Capabilities

### 1. Multi-Vendor Order Splitting & Inventory Management
* **Single Customer Checkout**: Shoppers add items from multiple distinct sellers to one cart.
* **Atomic Split Orders**: One checkout creates a parent `Order` and automatically generates separate `Shipment` sub-orders for each participating seller.
* **Concurrency-Safe Stock Deduction**: Inventory is validated and decremented atomically within a database transaction; rollback occurs if stock is insufficient.

### 2. Strict Shipment State Machine
* **Lifecycle Flow**: `PLACED` $\to$ `CONFIRMED` $\to$ `PACKED` $\to$ `READY_FOR_PICKUP` $\to$ `PICKED_UP` $\to$ `IN_TRANSIT` $\to$ `SHIPPED` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED`.
* **State Protection**: Arbitrary status jumps (e.g. `CONFIRMED` $\to$ `DELIVERED`) and backward progressions are strictly rejected with `400 Bad Request`.
* **Seller Isolation**: Sellers can only view and mutate their own shipments; unauthorized cross-vendor mutation attempts return `404 Not Found`.

### 3. Real-Time Order Updates via Socket.IO
* **Bidirectional Events**: Real-time events (`order:updated`, `shipment:status_changed`) broadcast status transitions instantly to customer tracking and admin monitoring dashboards.
* **Graceful Fallback**: The PostgreSQL database remains the single source of truth; if the WebSocket disconnects, all data is retrieved seamlessly via standard REST endpoints.

### 4. Authoritative Financial System & Ledger
* **Server-Side Computations**: All subtotals, GST taxes, delivery fees, COD limits, platform commissions, and seller net earnings are calculated exclusively on the backend.
* **Seller & Admin Ledgers**: Tracks platform revenues, seller earnings, TDS/TCS deductions, and settlement payout batches with hold/release mechanisms.

### 5. Seller Onboarding, KYC & Product Moderation
* **KYC Pipeline**: Document verification workflow with admin approve/reject actions and recorded audit trails.
* **Product Catalog Moderation**: Newly listed products enter moderation queues before being published live to the public storefront catalog.

---

### Quickstart: Run Both Frontend and Backend

From the workspace root directory:

```bash
# 1. Install dependencies across root, server, and client
npm install
npm --prefix server install
npm --prefix client install

# 2. Run both Server (port 5000) and Client (port 5173) together
npm run dev
```

Both services will boot up concurrently:
* **Backend API & WebSockets**: [http://localhost:5000](http://localhost:5000) (Health check: `/health`)
* **Frontend Application**: [http://localhost:5173](http://localhost:5173)

---

### Running Services Independently

You can also run each service in its own terminal or dedicated directory:

```bash
# Option A: From workspace root
npm run server:dev     # Starts Express backend on http://localhost:5000
npm run client:dev     # Starts Vite frontend on http://localhost:5173

# Option B: From subdirectories
cd server && npm run dev
cd client && npm run dev
```

---

## 🔑 Demo User Credentials

| Role | Portal URL | Email | Password |
|---|---|---|---|
| **Super Administrator** | <http://localhost:5173/admin> | `admin@chowk.com` | `admin123` |
| **Active Seller** | <http://localhost:5173/seller> | `seller1@example.com` | `seller123` |
| **Registered Customer** | <http://localhost:5173> | `customer1@example.com` | `customer123` |

---

## 🧪 Automated Testing & Verification

The application includes an extensive suite of end-to-end and unit integration tests testing authentication, role-based authorization, inventory concurrency, multi-vendor checkout, shipment state transitions, and admin finances.

To run all automated test suites:
```bash
cd server
npm test -- --runInBand
```

### Test Suite Summary:
* `src/tests/auth.test.ts`: User registration, duplicate emails, password validation, and JWT generation.
* `src/tests/authz.test.ts`: Cross-role privilege boundaries and IDOR isolation (Customer $\leftrightarrow$ Seller $\leftrightarrow$ Admin).
* `src/tests/customer.test.ts`: Cart manipulation, inventory availability validation, and address management.
* `src/tests/product.test.ts`: Product creation, moderation workflow, and atomic inventory stock controls.
* `src/tests/checkout.test.ts`: Multi-vendor splitting, empty cart validation, transaction rollback, and card payment processing.
* `src/tests/order.test.ts`: Shipment lifecycle state machine, transitions validation, and AWB generation.
* `src/tests/admin.test.ts`: PostgreSQL aggregation metrics, customer blocking, KYC approvals, and settlement payouts.
* `src/tests/e2e-flow.test.ts`: End-to-end multi-vendor lifecycle from customer registration $\to$ split checkout $\to$ status progression $\to$ financial reporting.

---

## 🛠 Production Build

To compile and verify the frontend production bundle:
```bash
npm run build
```
Generates an optimized client build in `dist/` verified with zero TypeScript and bundler errors.

---

## 📖 API Documentation

Complete OpenAPI 3.0 specification is available at:
```text
server/src/docs/openapi.json
```
Compatible with Swagger UI, Postman, and Redoc.
