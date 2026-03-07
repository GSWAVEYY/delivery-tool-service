import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
import prisma from "../lib/prisma.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("HUB_ADMIN", "SUPER_ADMIN"));

// GET /api/admin/dashboard — live driver status overview
router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeShifts = await prisma.shift.findMany({
      where: {
        status: "IN_PROGRESS",
        startTime: { gte: today },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    const todayRoutes = await prisma.route.findMany({
      where: { date: { gte: today } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        platformLink: {
          include: { platform: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRoutes = todayRoutes.length;
    const inProgress = todayRoutes.filter((r) => r.status === "IN_PROGRESS").length;
    const completed = todayRoutes.filter((r) => r.status === "COMPLETED").length;
    const completionRate = totalRoutes > 0 ? Math.round((completed / totalRoutes) * 100) : 0;

    const driverMap = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
        shiftStart: string;
        currentRoute: (typeof todayRoutes)[0] | null;
        routesCompleted: number;
        routesTotal: number;
      }
    >();

    for (const shift of activeShifts) {
      const driverRoutes = todayRoutes.filter((r) => r.userId === shift.userId);
      const activeRoute = driverRoutes.find((r) => r.status === "IN_PROGRESS") || null;
      driverMap.set(shift.userId, {
        id: shift.user.id,
        firstName: shift.user.firstName,
        lastName: shift.user.lastName,
        email: shift.user.email,
        avatarUrl: shift.user.avatarUrl,
        shiftStart: shift.startTime.toISOString(),
        currentRoute: activeRoute,
        routesCompleted: driverRoutes.filter((r) => r.status === "COMPLETED").length,
        routesTotal: driverRoutes.length,
      });
    }

    res.json({
      activeDrivers: driverMap.size,
      routes: {
        total: totalRoutes,
        inProgress,
        completed,
        completionRate,
      },
      drivers: Array.from(driverMap.values()),
      todayRoutes: todayRoutes.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        totalStops: r.totalStops,
        completedStops: r.completedStops,
        totalPackages: r.totalPackages,
        deliveredPackages: r.deliveredPackages,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        driver: r.user,
        platform: r.platformLink?.platform?.name || null,
      })),
    });
  }),
);

// GET /api/admin/routes — all routes for today across all drivers
router.get(
  "/routes",
  asyncHandler(async (req, res) => {
    const { status, driver, platform, date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: Record<string, unknown> = {
      date: { gte: targetDate, lt: nextDay },
    };

    if (status) where.status = status as string;
    if (driver) where.userId = driver as string;
    if (platform) {
      where.platformLink = { platform: { slug: platform as string } };
    }

    const routes = await prisma.route.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        platformLink: {
          include: { platform: { select: { id: true, name: true, slug: true } } },
        },
        stops: {
          select: { id: true, status: true, address: true, sequence: true, facilityName: true },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const drivers = await prisma.user.findMany({
      where: { role: "WORKER" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    });

    const platforms = await prisma.deliveryPlatform.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    res.json({
      routes: routes.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        date: r.date,
        totalStops: r.totalStops,
        completedStops: r.completedStops,
        totalPackages: r.totalPackages,
        deliveredPackages: r.deliveredPackages,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        notes: r.notes,
        driver: r.user,
        platform: r.platformLink?.platform || null,
        stops: r.stops,
      })),
      filters: { drivers, platforms },
      total: routes.length,
    });
  }),
);

export default router;
