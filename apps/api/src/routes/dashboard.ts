import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();
router.use(authenticate);

// ─── GET /dashboard — Worker's unified dashboard ────────────

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const [platformLinks, todayShifts, recentEarnings, unreadNotifications] = await Promise.all([
      prisma.platformLink.findMany({
        where: { userId, isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              deepLinkScheme: true,
              webPortalUrl: true,
              androidPackage: true,
              iosScheme: true,
            },
          },
        },
      }),
      prisma.shift.findMany({
        where: {
          userId,
          startTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.earningRecord.findMany({
        where: { userId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { date: "desc" },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const totalEarnings7d = recentEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalTips7d = recentEarnings.reduce((sum, e) => sum + Number(e.tips || 0), 0);

    res.json({
      platformLinks,
      todayShifts,
      earningsSummary: {
        last7Days: totalEarnings7d,
        tips7Days: totalTips7d,
        recordCount: recentEarnings.length,
      },
      unreadNotifications,
    });
  }),
);

// ─── POST /dashboard/link ───────────────────────────────────

const linkPlatformSchema = z.object({
  platformId: z.string().min(1),
  displayName: z.string().optional(),
  username: z.string().optional(),
});

router.post(
  "/link",
  validate(linkPlatformSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { platformId, displayName, username } = req.body;

    const platform = await prisma.deliveryPlatform.findUnique({ where: { id: platformId } });
    if (!platform) throw AppError.notFound("Platform not found");

    const link = await prisma.platformLink.upsert({
      where: { userId_platformId: { userId, platformId } },
      create: { userId, platformId, displayName, username },
      update: { isActive: true, displayName, username },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            deepLinkScheme: true,
            webPortalUrl: true,
          },
        },
      },
    });

    res.status(201).json({ link });
  }),
);

// ─── DELETE /dashboard/link/:id ─────────────────────────────

router.delete(
  "/link/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const link = await prisma.platformLink.findFirst({ where: { id, userId } });
    if (!link) throw AppError.notFound("Platform link not found");

    await prisma.platformLink.update({ where: { id: link.id }, data: { isActive: false } });
    res.json({ message: "Platform unlinked" });
  }),
);

// ─── PUT /dashboard/link/:id/reorder ────────────────────────

const reorderSchema = z.object({ sortOrder: z.number().int().min(0) });

router.put(
  "/link/:id/reorder",
  validate(reorderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const link = await prisma.platformLink.findFirst({ where: { id, userId } });
    if (!link) throw AppError.notFound("Platform link not found");

    const updated = await prisma.platformLink.update({
      where: { id: link.id },
      data: { sortOrder: req.body.sortOrder },
    });
    res.json({ link: updated });
  }),
);

// ─── POST /dashboard/launch/:id ────────────────────────────

router.post(
  "/launch/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const link = await prisma.platformLink.findFirst({
      where: { id, userId, isActive: true },
      include: { platform: true },
    });
    if (!link) throw AppError.notFound("Platform link not found");

    await prisma.platformLink.update({
      where: { id: link.id },
      data: { lastAccessed: new Date() },
    });

    const { platform } = link;
    res.json({
      platform,
      launchUrl: platform.deepLinkScheme || platform.webPortalUrl,
      androidPackage: platform.androidPackage,
      iosScheme: platform.iosScheme,
    });
  }),
);

export default router;
