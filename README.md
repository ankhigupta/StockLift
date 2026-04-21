# StockLift — B2B Dead Inventory Auction Marketplace

> A production-grade real-time auction platform that helps businesses unlock working capital from dead inventory through competitive bidding.

---

## Table of Contents
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Team](#team)

---

## Problem Statement

Every year, Indian businesses lose crores of rupees to dead inventory — products manufactured but never sold, sitting in warehouses bleeding working capital. Existing solutions like brokers charge 8-15% commission and take weeks. StockLift solves this with real-time competitive auctions at 2% commission, unlocking capital in 24 hours.

---

## Solution

StockLift is a B2B auction marketplace where:
- **Sellers** list excess inventory with a reserve price and auction window
- **Buyers** compete in real-time auctions
- **Winners** complete payment within 24 hours
- **Non-payment fallback** automatically promotes to second-highest bidder

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Real-time | Socket.IO + Redis (Upstash) |
| File Storage | Cloudinary |
| Payments | Razorpay (placeholder) |
| Notifications | Firebase FCM |
| Background Jobs | node-cron |

---

## Architecture

```
Mobile App (React Native)
        ↓
   Load Balancer
        ↓
EC2 Backend (Node.js + Express)
   ├── REST APIs
   ├── WebSocket (Socket.IO)
   └── Cron Jobs
        ↓
   Redis Pub/Sub (Upstash)
        ↓
   PostgreSQL Database
        ↓
   Cloudinary (Images)
```

---

## Features

### Core Features
- ✅ Business authentication with JWT (register, login, refresh, logout)
- ✅ Auction listing with image upload (Cloudinary)
- ✅ Real-time bidding with Socket.IO + Redis Pub/Sub
- ✅ Automatic auction lifecycle (UPCOMING → ACTIVE → ENDED)
- ✅ Auction auto-extension by 60 mins if bid placed in last 60 mins
- ✅ Non-payment fallback - auto-promotes to second highest bidder
- ✅ Payment integration (placeholder, Razorpay ready)
- ✅ Seller and buyer dashboards
- ✅ Push notifications via Firebase FCM
- ✅ Full order management lifecycle

### Technical Features
- ✅ Row-level locking (SELECT FOR UPDATE) for concurrent bid handling
- ✅ Database transactions for atomic operations
- ✅ Cron jobs for automated auction management
- ✅ Redis Pub/Sub for multi-server WebSocket broadcasting
- ✅ JWT refresh token rotation with database storage
- ✅ Global error handling middleware
- ✅ Request logging with Morgan

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- Redis (or Upstash account)
- Cloudinary account
- Firebase project

### Clone the repository
```bash
git clone https://github.com/ankhigupta/StockLift.git
cd StockLift
```

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your environment variables
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npx expo start
```

### Database Setup
```bash
# Create database
psql -U your_username -c "CREATE DATABASE stocklift;"

# Run migrations
cd backend
node src/migrate.js
```

---

## Environment Variables

Create a `.env` file in the `backend` folder:

```env
PORT=8000
DATABASE_URL=postgresql://USERNAME@localhost:5432/stocklift
JWT_SECRET=your_jwt_secret_here
UPSTASH_REDIS_URL=rediss://default:PASSWORD@HOST.upstash.io:6379
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## API Documentation

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Register new user | Public |
| POST | /auth/login | Login user | Public |
| GET | /auth/me | Get current user | Protected |
| POST | /auth/refresh | Refresh access token | Public |
| POST | /auth/logout | Logout user | Protected |
| POST | /auth/fcm-token | Save FCM token | Protected |

### Auctions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /auctions | List all auctions | Public |
| GET | /auctions/:id | Get single auction | Public |
| POST | /auctions | Create auction | Protected |
| PUT | /auctions/:id | Update auction | Protected |
| DELETE | /auctions/:id | Delete auction | Protected |

### Bids
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /bids | Place a bid | Protected |
| GET | /bids/auction/:id | Get bids for auction | Public |
| GET | /bids/my | Get my bids | Protected |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /orders/create-from-auction/:id | Create order from auction | Protected |
| GET | /orders/my | Get buyer orders | Protected |
| GET | /orders/seller | Get seller orders | Protected |
| GET | /orders/:id | Get single order | Protected |
| PUT | /orders/:id/promote | Promote to second bidder | Protected |

### Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /payments/create-order | Create payment order | Protected |
| POST | /payments/verify | Verify payment | Protected |
| GET | /payments/order/:id | Get payment status | Protected |

### Dashboard
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /dashboard/seller | Seller dashboard stats | Protected |
| GET | /dashboard/buyer | Buyer dashboard stats | Protected |

### Upload
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /upload/images | Upload images to Cloudinary | Protected |
| DELETE | /upload/image | Delete image | Protected |

---

## Real-time Architecture

StockLift uses Socket.IO with Redis Pub/Sub for real-time bidding:

```
Buyer places bid
      ↓
Backend validates bid (SELECT FOR UPDATE)
      ↓
Bid committed to PostgreSQL
      ↓
Event published to Redis
      ↓
All server instances receive event
      ↓
Socket.IO broadcasts to all clients in auction room
      ↓
All connected buyers see new bid instantly
```

### Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| join:auction | Client → Server | Join auction room |
| leave:auction | Client → Server | Leave auction room |
| bid:new | Server → Client | New bid placed |
| auction:extended | Server → Client | Auction auto-extended |
| auction:sync | Client → Server | Sync auction state |
| auction:state | Server → Client | Current auction state |

---

## Auction Lifecycle

```
UPCOMING → ACTIVE → ENDED → SOLD
                  ↘ EXPIRED (no bids)
```

- **UPCOMING** — auction created, waiting for start time
- **ACTIVE** — auction is live, accepting bids
- **ENDED** — auction ended, winner selected, order created
- **SOLD** — payment received
- **EXPIRED** — no bids or payment failed

---

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| startScheduledAuctions | Every minute | Activates UPCOMING auctions |
| endExpiredAuctions | Every minute | Ends ACTIVE auctions past end time |
| promoteUnpaidOrders | Every 5 minutes | Promotes to second bidder if unpaid |

---

## Project Structure

```
StockLift/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── cloudinary.js
│   │   │   └── firebase.js
│   │   ├── controllers/
│   │   │   ├── auction.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── bid.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── order.controller.js
│   │   │   └── payment.controller.js
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── index.js
│   │   ├── jobs/
│   │   │   └── auction.jobs.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── routes/
│   │   │   ├── auction.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── bid.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── index.js
│   │   │   ├── order.routes.js
│   │   │   ├── payment.routes.js
│   │   │   └── upload.routes.js
│   │   ├── socket/
│   │   │   └── socket.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── navigation/
    │   │   └── AppNavigator.jsx
    │   ├── screens/
    │   │   ├── AuctionDetailScreen.jsx
    │   │   ├── AuctionListScreen.jsx
    │   │   ├── BidScreen.jsx
    │   │   ├── CreateAuctionScreen.jsx
    │   │   ├── DashboardScreen.jsx
    │   │   ├── LoginScreen.jsx
    │   │   ├── PaymentScreen.jsx
    │   │   └── RegisterScreen.jsx
    │   └── services/
    │       ├── api.js
    │       ├── auction.service.js
    │       ├── auth.service.js
    │       ├── bid.service.js
    │       ├── dashboard.service.js
    │       ├── order.service.js
    │       └── payment.service.js
    └── package.json
```

---

## Team

Built by **Ankhi Gupta** and **Pooja Bishnoi** as a production-grade B2B marketplace solution.

---

## License

MIT License

---

*StockLift — Turning dead stock into working capital*