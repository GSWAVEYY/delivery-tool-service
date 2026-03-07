import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();
router.use(authenticate);

// ─── GET /earnings ──────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { platform, from, to, page = "1", limit = "20" } = req.query;

    const where: Record<string, unknown> = { userId };
    if (platform) where.platform = platform as string;
    if (from || to) {
      where.date = {
        ...(from && { gte: new Date(from as string) }),
        ...(to && { lte: new Date(to as string) }),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [earnings, total] = await Promise.all([
      prisma.earningRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.earningRecord.count({ where }),
    ]);

    res.json({
      earnings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  }),
);

// ─── GET /earnings/summary ──────────────────────────────────

router.get(
  "/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const now = new Date();

    const [today, thisWeek, thisMonth, allTime] = await Promise.all([
      prisma.earningRecord.aggregate({
        where: {
          userId,
          date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
        _sum: { amount: true, tips: true, deliveries: true },
        _count: true,
      }),
      prisma.earningRecord.aggregate({
        where: { userId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        _sum: { amount: true, tips: true, deliveries: true },
        _count: true,
      }),
      prisma.earningRecord.aggregate({
        where: { userId, date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { amount: true, tips: true, deliveries: true },
        _count: true,
      }),
      prisma.earningRecord.aggregate({
        where: { userId },
        _sum: { amount: true, tips: true, deliveries: true },
        _count: true,
      }),
    ]);

    const fmt = (agg: typeof today) => ({
      earnings: Number(agg._sum.amount || 0),
      tips: Number(agg._sum.tips || 0),
      deliveries: agg._count,
      totalDeliveries: Number(agg._sum.deliveries || 0),
    });

    res.json({
      today: fmt(today),
      thisWeek: fmt(thisWeek),
      thisMonth: fmt(thisMonth),
      allTime: fmt(allTime),
    });
  }),
);

// ─── POST /earnings ─────────────────────────────────────────

const createEarningSchema = z.object({
  platformLinkId: z.string().min(1),
  earnings: z.number().positive(),
  tips: z.number().min(0).optional(),
  deliveries: z.number().int().min(0).optional(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

router.post(
  "/",
  validate(createEarningSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { platformLinkId, earnings, tips, deliveries, date, notes } = req.body;

    // Resolve platform name from the link
    const link = await prisma.platformLink.findFirst({
      where: { id: platformLinkId, userId },
      include: { platform: { select: { name: true } } },
    });
    if (!link) throw new AppError(404, "Platform link not found");

    const earning = await prisma.earningRecord.create({
      data: {
        userId,
        platform: link.platform.name,
        platformLinkId,
        amount: earnings,
        tips,
        deliveries,
        date: new Date(date),
        description: notes,
      },
    });
    res.status(201).json({ earning });
  }),
);

export default router;
