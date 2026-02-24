import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);

// ─── GET /shifts — List shifts ──────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, from, to } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from as string);
      if (to) where.startTime.lte = new Date(to as string);
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 50,
    });

    res.json({ shifts });
  } catch (err) {
    console.error("List shifts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /shifts — Create shift ────────────────────────────

const createShiftSchema = z.object({
  platform: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

router.post("/", validate(createShiftSchema), async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error("Create shift error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /shifts/:id — Update shift ───────────────────────

const updateShiftSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

router.patch("/:id", validate(updateShiftSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shift = await prisma.shift.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!shift) {
      res.status(404).json({ error: "Shift not found" });
      return;
    }

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.endTime && { endTime: new Date(req.body.endTime) }),
        ...(req.body.notes !== undefined && { notes: req.body.notes }),
      },
    });

    res.json({ shift: updated });
  } catch (err) {
    console.error("Update shift error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
