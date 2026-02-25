import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { RouteStatus, StopStatus } from "@prisma/client";

const router = Router();

// ─── GET /api/routes — list user's routes ────────────────────

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { date, status } = req.query;

    const targetDate = date ? new Date(date as string) : new Date(new Date().setHours(0, 0, 0, 0));

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      userId,
      date: { gte: startOfDay, lte: endOfDay },
    };

    if (status) {
      where.status = status as RouteStatus;
    }

    const routes = await prisma.route.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        platformLink: {
          include: {
            platform: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
        _count: { select: { stops: true, packages: true } },
      },
    });

    res.json({ routes });
  }),
);

// ─── POST /api/routes — create a route ───────────────────────

const createRouteSchema = z.object({
  platformLinkId: z.string().optional(),
  name: z.string().min(1),
  date: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  "/",
  validate(createRouteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { platformLinkId, name, date, notes } = req.body;

    if (platformLinkId) {
      const link = await prisma.platformLink.findFirst({ where: { id: platformLinkId, userId } });
      if (!link) throw AppError.notFound("Platform link not found");
    }

    const route = await prisma.route.create({
      data: {
        userId,
        platformLinkId: platformLinkId ?? null,
        name,
        date: date ? new Date(date) : new Date(),
        notes,
      },
      include: {
        platformLink: {
          include: {
            platform: { select: { id: true, name: true, slug: true, logoUrl: true } },
          },
        },
      },
    });

    res.status(201).json({ route });
  }),
);

// ─── GET /api/routes/:id — route detail ──────────────────────

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const route = await prisma.route.findFirst({
      where: { id, userId },
      include: {
        platformLink: {
          include: {
            platform: { select: { id: true, name: true, slug: true, logoUrl: true } },
          },
        },
        stops: {
          orderBy: { sequence: "asc" },
          include: { packages: true },
        },
      },
    });

    if (!route) throw AppError.notFound("Route not found");
    res.json({ route });
  }),
);

// ─── PATCH /api/routes/:id/status — update route status ──────

const updateStatusSchema = z.object({
  status: z.nativeEnum(RouteStatus),
});

router.patch(
  "/:id/status",
  validate(updateStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const { status } = req.body as { status: RouteStatus };

    const existing = await prisma.route.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound("Route not found");

    const updateData: Record<string, unknown> = { status };
    if (status === RouteStatus.IN_PROGRESS && !existing.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === RouteStatus.COMPLETED && !existing.completedAt) {
      updateData.completedAt = new Date();
    }

    const route = await prisma.route.update({
      where: { id },
      data: updateData,
    });

    res.json({ route });
  }),
);

// ─── POST /api/routes/:id/stops — add a stop ─────────────────

const addStopSchema = z.object({
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sequence: z.number().int().optional(),
});

router.post(
  "/:id/stops",
  validate(addStopSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    let sequence = req.body.sequence as number | undefined;
    if (sequence === undefined) {
      const maxStop = await prisma.stop.findFirst({
        where: { routeId: id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      sequence = (maxStop?.sequence ?? 0) + 1;
    }

    const stop = await prisma.$transaction(async (tx) => {
      const created = await tx.stop.create({
        data: {
          routeId: id,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          zipCode: req.body.zipCode,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          sequence,
        },
      });
      await tx.route.update({
        where: { id },
        data: { totalStops: { increment: 1 } },
      });
      return created;
    });

    res.status(201).json({ stop });
  }),
);

// ─── PATCH /api/routes/:id/stops/:stopId — update stop status ─

const updateStopSchema = z.object({
  status: z.nativeEnum(StopStatus),
  notes: z.string().optional(),
  proofPhotoUrl: z.string().optional(),
});

router.patch(
  "/:id/stops/:stopId",
  validate(updateStopSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const stopId = req.params.stopId as string;
    const { status, notes, proofPhotoUrl } = req.body as {
      status: StopStatus;
      notes?: string;
      proofPhotoUrl?: string;
    };

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    const existingStop = await prisma.stop.findFirst({ where: { id: stopId, routeId: id } });
    if (!existingStop) throw AppError.notFound("Stop not found");

    const stopData: Record<string, unknown> = { status };
    if (notes !== undefined) stopData.notes = notes;
    if (proofPhotoUrl !== undefined) stopData.proofPhotoUrl = proofPhotoUrl;

    if (status === StopStatus.ARRIVED && !existingStop.arrivedAt) {
      stopData.arrivedAt = new Date();
    }
    if (status === StopStatus.COMPLETED && !existingStop.completedAt) {
      stopData.completedAt = new Date();
    }

    const stop = await prisma.$transaction(async (tx) => {
      const updated = await tx.stop.update({ where: { id: stopId }, data: stopData });
      if (status === StopStatus.COMPLETED && existingStop.status !== StopStatus.COMPLETED) {
        await tx.route.update({
          where: { id },
          data: { completedStops: { increment: 1 } },
        });
      }
      return updated;
    });

    res.json({ stop });
  }),
);

// ─── POST /api/routes/:id/stops/bulk — bulk create stops ─────

const bulkStopsSchema = z.object({
  stops: z
    .array(
      z.object({
        address: z.string().min(1),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
      }),
    )
    .min(1),
});

router.post(
  "/:id/stops/bulk",
  validate(bulkStopsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    const maxStop = await prisma.stop.findFirst({
      where: { routeId: id },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    const baseSequence = (maxStop?.sequence ?? 0) + 1;

    const stopsInput = req.body.stops as Array<{
      address: string;
      city?: string;
      state?: string;
      zipCode?: string;
    }>;

    const result = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        stopsInput.map((s, i) =>
          tx.stop.create({
            data: {
              routeId: id,
              address: s.address,
              city: s.city,
              state: s.state,
              zipCode: s.zipCode,
              sequence: baseSequence + i,
            },
          }),
        ),
      );
      await tx.route.update({
        where: { id },
        data: { totalStops: { increment: stopsInput.length } },
      });
      return created;
    });

    res.status(201).json({ stops: result, count: result.length });
  }),
);

export default router;
