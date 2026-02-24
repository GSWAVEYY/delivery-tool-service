# DeliveryBridge Architecture

## Overview

DeliveryBridge is a unified platform for delivery hub workers who operate across multiple carrier systems. The architecture follows a phased approach, starting with a smart launcher and progressing toward full API integrations.

## Monorepo Structure

```
delivery-tool-service/
├── apps/
│   ├── mobile/          # React Native (Expo) mobile app
│   └── api/             # Express + Prisma backend
├── packages/
│   └── shared/          # Shared TypeScript types
└── docs/                # Documentation
```

## Tech Stack

- **Mobile**: React Native + Expo + TypeScript + Zustand + React Query
- **Backend**: Express + TypeScript + Prisma + PostgreSQL
- **Auth**: JWT (own auth) + future OAuth 2.0 (platform auth)
- **Cache**: Redis (session management, rate limiting)

## Phase 1: Smart Launcher (Current)

Workers can:
1. Register/login to DeliveryBridge
2. Browse and link delivery platforms to their dashboard
3. Quick-launch platform apps via deep links or web portals
4. View basic earnings and shift summaries

No credential storage — all platform access via deep links/web URLs.

## API Routes

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | User login |
| `GET /api/auth/me` | Get current user |
| `GET /api/dashboard` | Unified worker dashboard |
| `POST /api/dashboard/link` | Link a platform |
| `POST /api/dashboard/launch/:id` | Track & launch platform |
| `GET /api/platforms` | List all delivery platforms |
| `GET /api/earnings/summary` | Earnings aggregation |
| `GET/POST /api/shifts` | Shift management |
| `GET/POST /api/hubs` | Hub management (B2B) |

## Database Schema

Core models: User, DeliveryPlatform, PlatformLink, Hub, HubMembership, EarningRecord, Shift, Notification, Session.

PlatformLink has encrypted credential fields (Phase 2 prep) but they're unused in Phase 1.
