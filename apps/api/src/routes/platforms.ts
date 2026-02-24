import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// ─── GET /platforms — List all delivery platforms ────────────

router.get("/", optionalAuth, async (_req: Request, res: Response) => {
  try {
    const platforms = await prisma.deliveryPlatform.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        deepLinkScheme: true,
        webPortalUrl: true,
        androidPackage: true,
        iosScheme: true,
        hasOfficialApi: true,
      },
    });

    res.json({ platforms });
  } catch (err) {
    console.error("List platforms error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /platforms/search?q= — Search platforms ────────────

router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const platforms = await prisma.deliveryPlatform.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    res.json({ platforms });
  } catch (err) {
    console.error("Search platforms error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /platforms/:slug — Get single platform ─────────────

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const platform = await prisma.deliveryPlatform.findUnique({
      where: { slug },
    });

    if (!platform) {
      res.status(404).json({ error: "Platform not found" });
      return;
    }

    res.json({ platform });
  } catch (err) {
    console.error("Get platform error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /platforms (admin) — Add platform ─────────────────

const createPlatformSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().url().optional(),
  deepLinkScheme: z.string().optional(),
  webPortalUrl: z.string().url().optional(),
  androidPackage: z.string().optional(),
  iosScheme: z.string().optional(),
  hasOfficialApi: z.boolean().optional(),
  apiBaseUrl: z.string().url().optional(),
});

router.post("/", authenticate, validate(createPlatformSchema), async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const platform = await prisma.deliveryPlatform.create({ data: req.body });
    res.status(201).json({ platform });
  } catch (err) {
    console.error("Create platform error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
