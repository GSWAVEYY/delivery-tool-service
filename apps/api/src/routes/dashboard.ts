import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// ─── GET /dashboard — Worker's unified dashboard ────────────

router.get("/", async (req: Request, res: Response) => {
  try {
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
        where: {
          userId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "desc" },
      }),

      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    const totalEarnings7d = recentEarnings.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );
    const totalTips7d = recentEarnings.reduce(
      (sum, e) => sum + Number(e.tips || 0),
      0
    );

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
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /dashboard/link — Link a platform ─────────────────

const linkPlatformSchema = z.object({
  platformId: z.string().min(1),
  displayName: z.string().optional(),
  username: z.string().optional(),
});

router.post("/link", validate(linkPlatformSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { platformId, displayName, username } = req.body;

    const platform = await prisma.deliveryPlatform.findUnique({
      where: { id: platformId },
    });
    if (!platform) {
      res.status(404).json({ error: "Platform not found" });
      return;
    }

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
  } catch (err) {
    console.error("Link platform error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /dashboard/link/:id — Unlink a platform ─────────

router.delete("/link/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const link = await prisma.platformLink.findFirst({
      where: { id, userId },
    });

    if (!link) {
      res.status(404).json({ error: "Platform link not found" });
      return;
    }

    await prisma.platformLink.update({
      where: { id: link.id },
      data: { isActive: false },
    });

    res.json({ message: "Platform unlinked" });
  } catch (err) {
    console.error("Unlink platform error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /dashboard/link/:id/reorder — Reorder platforms ────

const reorderSchema = z.object({
  sortOrder: z.number().int().min(0),
});

router.put("/link/:id/reorder", validate(reorderSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const link = await prisma.platformLink.findFirst({
      where: { id, userId },
    });

    if (!link) {
      res.status(404).json({ error: "Platform link not found" });
      return;
    }

    const updated = await prisma.platformLink.update({
      where: { id: link.id },
      data: { sortOrder: req.body.sortOrder },
    });

    res.json({ link: updated });
  } catch (err) {
    console.error("Reorder error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /dashboard/launch/:id — Track platform launch ────

router.post("/launch/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const link = await prisma.platformLink.findFirst({
      where: { id, userId, isActive: true },
      include: { platform: true },
    });

    if (!link) {
      res.status(404).json({ error: "Platform link not found" });
      return;
    }

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
  } catch (err) {
    console.error("Launch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
