# Hub Admin Dashboard — Design

## Overview

A new admin view for ops managers that shows live driver activity, route oversight, daily analytics, and driver management. Accessed by users with HUB_ADMIN or SUPER_ADMIN role. Flat access for now (sees all drivers), hub isolation later.

## Navigation Change

Bottom tab bar becomes role-aware:

- **Drivers** see: Today, Routes, Scan, Earnings, Profile
- **Admins** see: Dashboard, Routes, Drivers, Analytics, Profile

Same app, different tabs based on user.role.

## Admin Tab 1: Dashboard (Live Status)

- Active shifts count — how many drivers on shift right now
- Today's routes — total, in progress, completed, percentage
- Live driver cards — each active driver showing: name, current route, stops completed/total, time on shift
- Tap a driver card → see their route detail
- Auto-refreshes every 30 seconds

## Admin Tab 2: Routes (Oversight)

- All routes for today across all drivers (not just the admin's own)
- Filter by: status, driver, platform
- Each route card shows: driver name, route name, platform, progress bar, status
- Tap to view full route detail with stops
- Assign template to driver — pick a template, pick a driver, create their route for them

## Admin Tab 3: Drivers

- List of all registered drivers (role = WORKER)
- Each card: name, email, status (on shift / off), today's stats (routes completed, deliveries)
- Invite driver — generate an invite code or send email invite
- Tap driver → see their recent activity (last 7 days routes + earnings)

## Admin Tab 4: Analytics (Daily Summary)

- Today's numbers — total deliveries, completion rate, total earnings, active drivers
- This week chart — simple bar showing deliveries per day
- Top performers — drivers ranked by completions this week
- Flagged issues — routes with skipped/attempted stops, incomplete routes

## Backend

- GET /api/admin/dashboard — aggregates live shift/route/driver data
- GET /api/admin/routes — all routes (not user-scoped), with driver info
- GET /api/admin/drivers — all workers with today's stats
- GET /api/admin/analytics — daily/weekly aggregations
- POST /api/admin/invite — create invite code
- All admin endpoints check role === HUB_ADMIN || SUPER_ADMIN

## Visual Upgrade (applies to whole app)

- Replace Unicode icons with Expo vector icons
- Add loading skeletons instead of spinners
- Smooth transitions between tabs
- Consistent card design system across all screens

## Phasing

- Phase A: Live driver status + Route oversight (ships first — the demo that sells)
- Phase B: Daily summary / analytics
- Phase C: Driver management + invites
