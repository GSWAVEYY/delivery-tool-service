# DeliveryBridge Manager Web Portal — Design

## Overview

A separate web dashboard for ops managers and dispatchers at small pharma distributors. Managers use it from a desktop to dispatch routes, track drivers, and review analytics. Drivers continue using only the mobile app. Same backend API, same auth system — the portal checks for HUB_ADMIN or SUPER_ADMIN role.

## Target User

Small pharma distributor ops manager (5-15 drivers) who wears both hats: dispatches routes in the morning, reviews performance at end of day.

## Tech Stack

- React + Vite + Tailwind CSS
- New `apps/web` in the monorepo
- Consumes existing Express API (`/api/admin/*`, `/api/auth/*`)
- Same JWT auth — login with existing account, role-gated access
- Mapbox GL JS (free tier, 50k loads/month) for the map page
- Recharts for analytics charts
- React Router for navigation

## Architecture

```
apps/web/          (new)
  src/
    pages/         Login, Dashboard, Map, Drivers, Analytics
    components/    Sidebar, RouteCard, DriverCard, StatCard, Charts
    services/      API client (same pattern as mobile)
    stores/        Zustand auth store
    hooks/         useAuth, useAdminDashboard, useAdminRoutes
```

No new backend work for MVP — reuses existing endpoints:

- POST /api/auth/login
- GET /api/auth/me
- GET /api/admin/dashboard
- GET /api/admin/routes
- GET /api/routes (for route detail)
- POST /api/routes (create route)
- PATCH /api/routes/:id/status

New endpoints needed (Phase 2+):

- POST /api/admin/routes/assign — assign route to a different driver
- GET /api/admin/drivers — driver list with stats (already designed in Phase C)

## Pages

### Login

- Clean centered login form: email + password
- DeliveryBridge logo + "Manager Portal" subtitle
- On success, redirect to Dispatch Board
- If role is WORKER, show error: "This portal is for managers only"

### Page 1: Dispatch Board (default home)

The core operational screen. Three-column layout:

**Left Column — Unassigned / Templates**

- List of route templates available to assign
- "Create Route" button to build a new route
- Click template -> select driver -> creates route for that driver

**Center Column — Today's Routes**

- All active/assigned routes for today, grouped by driver
- Each route card shows: driver name, route name, platform badge, progress bar (stops completed/total), status badge (Assigned/In Progress/Completed)
- Click card to expand: see stop list with status, facility name, address
- Color-coded status: yellow=assigned, blue=in progress, green=completed, red=cancelled

**Right Column — Driver Availability**

- All drivers with on-shift/off-shift status
- Today's stats per driver: routes assigned, stops completed
- Quick action: assign a template to this driver

### Page 2: Live Map

Full-screen map with driver markers and route visualization:

- **Driver markers** — last known location from stop events (arrive/complete). Marker shows initials, colored by status (green=active, gray=idle)
- **Route overlay** — click driver to see their stops as numbered pins. Completed=green, current=blue, upcoming=gray
- **Sidebar** — collapsible driver list, click to zoom. Shows last activity ("Completed stop 4 at 10:32am")
- **Banner** — "Locations update when drivers complete stops" (no real-time GPS in MVP)
- Stop-event locations only for now. Continuous GPS tracking is a future upgrade.

### Page 3: Drivers

Driver management and performance overview:

- **Driver list** — all WORKER role users. Name, email, status (on shift/off), joined date
- **Driver detail** — click to see: last 7 days activity, routes completed, stops completed, completion rate, average time per route
- **Invite driver** — generate invite code or send email (Phase C feature, placeholder for now)

### Page 4: Analytics

Daily/weekly operational intelligence:

- **Today's numbers** — total deliveries, completion rate, active drivers, total routes (stat cards)
- **This week** — bar chart showing deliveries per day
- **Completion rates** — line chart showing % over last 30 days
- **Top performers** — drivers ranked by completions this week
- **Flagged issues** — routes with skipped/attempted stops, incomplete routes
- **Export** — download CSV of route/delivery data (future)

## Sidebar Navigation

Persistent left sidebar:

- DeliveryBridge logo at top
- Dispatch Board (grid icon)
- Live Map (location icon)
- Drivers (people icon)
- Analytics (chart icon)
- Divider
- Profile / Settings
- Logout

Collapsible on smaller screens. Active page highlighted in blue.

## Visual Design

- Dark theme matching the mobile app: #0F172A background, #1E293B cards, #3B82F6 accent
- Tailwind CSS utility classes throughout
- Consistent with mobile design language so demo flows naturally between portal and phone
- Responsive but desktop-first (managers are at a desk)

## Phasing

- **Phase 1 (MVP):** Login + Dispatch Board + Analytics page. Enough to demo and sell.
- **Phase 2:** Live Map with stop-event locations. Drivers page with performance detail.
- **Phase 3:** Real-time GPS tracking, route reassignment drag-and-drop, driver invites, CSV export.

## Competitive Context

Industry standard (Onfleet, DispatchTrack, Upper) all have this web-portal + mobile-app split:

- Dispatcher web dashboard for route planning, live tracking, analytics
- Driver mobile app for task execution, proof of delivery, navigation
- Features that sell: real-time visibility, route optimization, analytics/reporting, proof of delivery

Our differentiator: purpose-built for pharmaceutical delivery (temperature tracking, compliance fields, facility types) rather than generic last-mile delivery.

## Research Sources

- [12 Must Have Fleet Management Software Features in 2026](https://www.upperinc.com/blog/fleet-management-software-features/)
- [Fleet Management Dashboard: Features, Metrics, and Tips](https://pcssoft.com/blog/fleet-management-dashboard/)
- [Onfleet Last Mile Delivery Software Features](https://onfleet.com/last-mile-delivery)
- [Best Pharmacy Delivery Software Guide](https://blog.locus.sh/best-pharmacy-delivery-software/)
- [Pharmaceutical Distribution Software](https://www.tgiltd.com/industries/pharmaceutical-erp-software-solutions/pharmaceutical-distribution-software)
