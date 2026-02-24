import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);

// ─── GET /hubs/search?q= — Search hubs ─────────────────────

router.get("/search", async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error("Search hubs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /hubs/my — Get current user's hub ──────────────────

router.get("/my", async (req: Request, res: Response) => {
  try {
    const membership = await prisma.hubMembership.findUnique({
      where: { userId: req.user!.userId },
      include: {
        hub: true,
      },
    });

    if (!membership) {
      res.status(404).json({ error: "Not a member of any hub" });
      return;
    }

    res.json({ membership });
  } catch (err) {
    console.error("My hub error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /hubs — Create hub (admin) ───────────────────────

const createHubSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
});

router.post("/", validate(createHubSchema), async (req: Request, res: Response) => {
  try {
    const hub = await prisma.hub.create({ data: req.body });

    // Make creator the hub owner
    await prisma.hubMembership.create({
      data: {
        userId: req.user!.userId,
        hubId: hub.id,
        role: "OWNER",
      },
    });

    // Upgrade user role to HUB_ADMIN
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: "HUB_ADMIN" },
    });

    res.status(201).json({ hub });
  } catch (err) {
    console.error("Create hub error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /hubs/:hubId/join — Join a hub ───────────────────

router.post("/:hubId/join", async (req: Request, res: Response) => {
  try {
    const hubId = req.params.hubId as string;
    const hub = await prisma.hub.findUnique({ where: { id: hubId } });
    if (!hub) {
      res.status(404).json({ error: "Hub not found" });
      return;
    }

    const existing = await prisma.hubMembership.findUnique({
      where: { userId: req.user!.userId },
    });

    if (existing) {
      res.status(409).json({ error: "Already a member of a hub" });
      return;
    }

    const membership = await prisma.hubMembership.create({
      data: {
        userId: req.user!.userId,
        hubId: hub.id,
        role: "DRIVER",
      },
      include: { hub: true },
    });

    res.status(201).json({ membership });
  } catch (err) {
    console.error("Join hub error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /hubs/:hubId/members — List hub members (admin) ───

router.get("/:hubId/members", async (req: Request, res: Response) => {
  try {
    const hubId = req.params.hubId as string;

    // Verify requester is a manager/owner of this hub
    const membership = await prisma.hubMembership.findFirst({
      where: {
        userId: req.user!.userId,
        hubId,
        role: { in: ["MANAGER", "OWNER"] },
      },
    });

    if (!membership && req.user!.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const members = await prisma.hubMembership.findMany({
      where: { hubId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    res.json({ members });
  } catch (err) {
    console.error("List members error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
