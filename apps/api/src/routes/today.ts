import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler } from "../lib/errors.js";

const router = Router();

// ─── GET /api/today — today's dashboard overview ─────────────

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayRoutes = await prisma.route.findMany({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: "asc" },
      include: {
        platformLink: {
          include: {
            platform: { select: { id: true, name: true, slug: true, logoUrl: true } },
          },
        },
        _count: { select: { stops: true, packages: true } },
      },
    });

    const stats = todayRoutes.reduce(
      (acc, route) => ({
        totalStops: acc.totalStops + route.totalStops,
        completedStops: acc.completedStops + route.completedStops,
        totalPackages: acc.totalPackages + route.totalPackages,
        deliveredPackages: acc.deliveredPackages + route.deliveredPackages,
        activeRoutes: acc.activeRoutes + (route.status === "IN_PROGRESS" ? 1 : 0),
      }),
      {
        totalStops: 0,
        completedStops: 0,
        totalPackages: 0,
        deliveredPackages: 0,
        activeRoutes: 0,
      },
    );

    const routeIds = todayRoutes.map((r) => r.id);

    const recentActivity = routeIds.length
      ? await prisma.package.findMany({
          where: {
            routeId: { in: routeIds },
            OR: [{ scannedAt: { not: null } }, { deliveredAt: { not: null } }],
          },
          orderBy: [{ deliveredAt: "desc" }, { scannedAt: "desc" }],
          take: 5,
          include: {
            stop: { select: { id: true, address: true, sequence: true } },
            route: { select: { id: true, name: true } },
          },
        })
      : [];

    res.json({ todayRoutes, stats, recentActivity });
  }),
);

export default router;
