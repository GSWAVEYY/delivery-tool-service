import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();

// ─── GET /platforms ─────────────────────────────────────────

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (_req: Request, res: Response) => {
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
  }),
);

// ─── GET /platforms/search ──────────────────────────────────

router.get(
  "/search",
  asyncHandler(async (req: Request, res: Response) => {
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
  }),
);

// ─── GET /platforms/:slug ───────────────────────────────────

router.get(
  "/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug as string;
    const platform = await prisma.deliveryPlatform.findUnique({ where: { slug } });
    if (!platform) throw AppError.notFound("Platform not found");
    res.json({ platform });
  }),
);

// ─── POST /platforms (admin) ────────────────────────────────

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

router.post(
  "/",
  authenticate,
  validate(createPlatformSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== "SUPER_ADMIN") throw AppError.forbidden("Admin access required");
    const platform = await prisma.deliveryPlatform.create({ data: req.body });
    res.status(201).json({ platform });
  }),
);

export default router;
