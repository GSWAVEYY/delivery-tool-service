import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../lib/errors.js";

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
        _sum: { amount: true, tips: true },
        _count: true,
      }),
      prisma.earningRecord.aggregate({
        where: { userId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        _sum: { amount: true, tips: true },
        _count: true,
      }),
      prisma.earningRecord.aggregate({
        where: { userId, date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { amount: true, tips: true },
        _count: true,
      }),
      prisma.earningRecord.aggregate({
        where: { userId },
        _sum: { amount: true, tips: true },
        _count: true,
      }),
    ]);

    const fmt = (agg: typeof today) => ({
      earnings: Number(agg._sum.amount || 0),
      tips: Number(agg._sum.tips || 0),
      deliveries: agg._count,
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
  platform: z.string().min(1),
  amount: z.number().positive(),
  tips: z.number().min(0).optional(),
  date: z.string().datetime(),
  description: z.string().optional(),
});

router.post(
  "/",
  validate(createEarningSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const earning = await prisma.earningRecord.create({
      data: {
        userId: req.user!.userId,
        platform: req.body.platform,
        amount: req.body.amount,
        tips: req.body.tips,
        date: new Date(req.body.date),
        description: req.body.description,
      },
    });
    res.status(201).json({ earning });
  }),
);

export default router;
