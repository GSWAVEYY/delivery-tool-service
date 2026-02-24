import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();
router.use(authenticate);

// ─── GET /hubs/search ───────────────────────────────────────

router.get(
  "/search",
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || "";
    const hubs = await prisma.hub.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { name: "asc" },
    });
    res.json({ hubs });
  }),
);

// ─── GET /hubs/my ───────────────────────────────────────────

router.get(
  "/my",
  asyncHandler(async (req: Request, res: Response) => {
    const membership = await prisma.hubMembership.findUnique({
      where: { userId: req.user!.userId },
      include: { hub: true },
    });
    if (!membership) throw AppError.notFound("Not a member of any hub");
    res.json({ membership });
  }),
);

// ─── POST /hubs ─────────────────────────────────────────────

const createHubSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
});

router.post(
  "/",
  validate(createHubSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const hub = await prisma.hub.create({ data: req.body });

    await prisma.hubMembership.create({
      data: { userId: req.user!.userId, hubId: hub.id, role: "OWNER" },
    });

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: "HUB_ADMIN" },
    });

    res.status(201).json({ hub });
  }),
);

// ─── POST /hubs/:hubId/join ────────────────────────────────

router.post(
  "/:hubId/join",
  asyncHandler(async (req: Request, res: Response) => {
    const hubId = req.params.hubId as string;
    const hub = await prisma.hub.findUnique({ where: { id: hubId } });
    if (!hub) throw AppError.notFound("Hub not found");

    const existing = await prisma.hubMembership.findUnique({ where: { userId: req.user!.userId } });
    if (existing) throw AppError.conflict("Already a member of a hub");

    const membership = await prisma.hubMembership.create({
      data: { userId: req.user!.userId, hubId: hub.id, role: "DRIVER" },
      include: { hub: true },
    });
    res.status(201).json({ membership });
  }),
);

// ─── GET /hubs/:hubId/members ──────────────────────────────

router.get(
  "/:hubId/members",
  asyncHandler(async (req: Request, res: Response) => {
    const hubId = req.params.hubId as string;

    const membership = await prisma.hubMembership.findFirst({
      where: { userId: req.user!.userId, hubId, role: { in: ["MANAGER", "OWNER"] } },
    });
    if (!membership && req.user!.role !== "SUPER_ADMIN") {
      throw AppError.forbidden("Admin access required");
    }

    const members = await prisma.hubMembership.findMany({
      where: { hubId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ members });
  }),
);

export default router;
