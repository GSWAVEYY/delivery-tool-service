import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// All template routes require auth
router.use(authenticate);

// ─── POST /api/templates — save route as template ───────────

const createTemplateSchema = z.object({
  routeId: z.string(),
  name: z.string().min(1).max(100),
});

router.post(
  "/",
  validate(createTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { routeId, name } = req.body;

    const route = await prisma.route.findFirst({
      where: { id: routeId, userId },
      include: { stops: { orderBy: { sequence: "asc" } } },
    });
    if (!route) throw AppError.notFound("Route not found");

    const template = await prisma.routeTemplate.create({
      data: {
        name,
        createdBy: userId,
        platformLinkId: route.platformLinkId,
        notes: route.notes,
        stops: {
          create: route.stops.map((s) => ({
            address: s.address,
            city: s.city,
            state: s.state,
            zipCode: s.zipCode,
            sequence: s.sequence,
            facilityName: s.facilityName,
            facilityType: s.facilityType,
            contactName: s.contactName,
            contactPhone: s.contactPhone,
            deliveryWindow: s.deliveryWindow,
            notes: s.notes,
          })),
        },
      },
      include: {
        stops: { orderBy: { sequence: "asc" } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        platformLink: {
          include: {
            platform: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    res.status(201).json({ template });
  }),
);

// ─── GET /api/templates — list all shared templates ─────────

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const templates = await prisma.routeTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        stops: { orderBy: { sequence: "asc" } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        platformLink: {
          include: {
            platform: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    res.json({ templates });
  }),
);

// ─── POST /api/templates/:id/use — create route from template

const useTemplateSchema = z.object({}).optional();

router.post(
  "/:id/use",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const templateId = req.params.id as string;

    const template = await prisma.routeTemplate.findUnique({
      where: { id: templateId },
      include: { stops: { orderBy: { sequence: "asc" } } },
    });
    if (!template) throw AppError.notFound("Template not found");

    const route = await prisma.route.create({
      data: {
        userId,
        platformLinkId: template.platformLinkId,
        name: template.name,
        notes: template.notes,
        date: new Date(),
        totalStops: template.stops.length,
        stops: {
          create: template.stops.map((s) => ({
            address: s.address,
            city: s.city,
            state: s.state,
            zipCode: s.zipCode,
            sequence: s.sequence,
            facilityName: s.facilityName,
            facilityType: s.facilityType,
            contactName: s.contactName,
            contactPhone: s.contactPhone,
            deliveryWindow: s.deliveryWindow,
            notes: s.notes,
          })),
        },
      },
      include: {
        stops: { orderBy: { sequence: "asc" } },
        platformLink: {
          include: {
            platform: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    res.status(201).json({ route });
  }),
);

// ─── PATCH /api/templates/:id/stops/:stopId — Update template stop notes ──

const updateStopSchema = z.object({
  notes: z.string().optional(),
});

router.patch(
  "/:id/stops/:stopId",
  validate(updateStopSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const templateId = req.params.id as string;
    const stopId = req.params.stopId as string;

    const template = await prisma.routeTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw AppError.notFound("Template not found");

    const stop = await prisma.templateStop.findFirst({
      where: { id: stopId, templateId },
    });
    if (!stop) throw AppError.notFound("Template stop not found");

    const updated = await prisma.templateStop.update({
      where: { id: stopId },
      data: { notes: req.body.notes },
    });

    res.json({ stop: updated });
  }),
);

// ─── DELETE /api/templates/:id — only creator can delete ────

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const templateId = req.params.id as string;

    const template = await prisma.routeTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw AppError.notFound("Template not found");
    if (template.createdBy !== userId) {
      throw new AppError(403, "Only the template creator can delete it");
    }

    await prisma.routeTemplate.delete({ where: { id: templateId } });

    res.json({ message: "Template deleted" });
  }),
);

export default router;
