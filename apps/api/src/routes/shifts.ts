import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();
router.use(authenticate);

// ─── GET /shifts ────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { status, from, to } = req.query;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {
        ...(from && { gte: new Date(from as string) }),
        ...(to && { lte: new Date(to as string) }),
      };
    }

    const shifts = await prisma.shift.findMany({ where, orderBy: { startTime: "desc" }, take: 50 });
    res.json({ shifts });
  }),
);

// ─── POST /shifts ───────────────────────────────────────────

const createShiftSchema = z.object({
  platform: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

router.post(
  "/",
  validate(createShiftSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const shift = await prisma.shift.create({
      data: {
        userId: req.user!.userId,
        platform: req.body.platform,
        startTime: new Date(req.body.startTime),
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        status: req.body.status || "SCHEDULED",
        notes: req.body.notes,
      },
    });
    res.status(201).json({ shift });
  }),
);

// ─── PATCH /shifts/:id ─────────────────────────────────────

const updateShiftSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

router.patch(
  "/:id",
  validate(updateShiftSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const shift = await prisma.shift.findFirst({ where: { id, userId: req.user!.userId } });
    if (!shift) throw AppError.notFound("Shift not found");

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.endTime && { endTime: new Date(req.body.endTime) }),
        ...(req.body.notes !== undefined && { notes: req.body.notes }),
      },
    });
    res.json({ shift: updated });
  }),
);

export default router;
