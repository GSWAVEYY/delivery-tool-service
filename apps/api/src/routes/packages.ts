import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { PackageStatus } from "@prisma/client";

const router = Router({ mergeParams: true });

// ─── POST /api/routes/:id/packages — add/scan a package ──────

const addPackageSchema = z.object({
  trackingNumber: z.string().min(1),
  barcode: z.string().optional(),
  stopId: z.string().optional(),
  recipientName: z.string().optional(),
});

router.post(
  "/:id/packages",
  validate(addPackageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    if (req.body.stopId) {
      const stop = await prisma.stop.findFirst({ where: { id: req.body.stopId, routeId: id } });
      if (!stop) throw AppError.notFound("Stop not found on this route");
    }

    const pkg = await prisma.$transaction(async (tx) => {
      const created = await tx.package.create({
        data: {
          routeId: id,
          stopId: req.body.stopId ?? null,
          trackingNumber: req.body.trackingNumber,
          barcode: req.body.barcode,
          recipientName: req.body.recipientName,
          status: PackageStatus.SCANNED_IN,
          scannedAt: new Date(),
        },
        include: { stop: { select: { id: true, address: true, sequence: true } } },
      });
      await tx.route.update({
        where: { id },
        data: { totalPackages: { increment: 1 } },
      });
      return created;
    });

    res.status(201).json({ package: pkg });
  }),
);

// ─── POST /api/routes/:id/packages/scan — scan by barcode ────

const scanBarcodeSchema = z.object({
  barcode: z.string().min(1),
});

// Status progression for scan toggle
const SCAN_PROGRESSION: Partial<Record<PackageStatus, PackageStatus>> = {
  [PackageStatus.SCANNED_IN]: PackageStatus.OUT_FOR_DELIVERY,
  [PackageStatus.OUT_FOR_DELIVERY]: PackageStatus.DELIVERED,
};

router.post(
  "/:id/packages/scan",
  validate(scanBarcodeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const { barcode } = req.body as { barcode: string };

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    const existing = await prisma.package.findFirst({
      where: { routeId: id, barcode },
    });
    if (!existing) throw AppError.notFound("Package with that barcode not found in this route");

    const nextStatus = SCAN_PROGRESSION[existing.status] ?? existing.status;
    const isDelivering =
      nextStatus === PackageStatus.DELIVERED && existing.status !== PackageStatus.DELIVERED;

    const updateData: Record<string, unknown> = { status: nextStatus };
    if (isDelivering) updateData.deliveredAt = new Date();

    const pkg = await prisma.$transaction(async (tx) => {
      const updated = await tx.package.update({
        where: { id: existing.id },
        data: updateData,
      });
      if (isDelivering) {
        await tx.route.update({
          where: { id },
          data: { deliveredPackages: { increment: 1 } },
        });
      }
      return updated;
    });

    res.json({ package: pkg });
  }),
);

// ─── PATCH /api/routes/:id/packages/:packageId — update package

const updatePackageSchema = z.object({
  status: z.nativeEnum(PackageStatus),
  notes: z.string().optional(),
  recipientName: z.string().optional(),
});

router.patch(
  "/:id/packages/:packageId",
  validate(updatePackageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const packageId = req.params.packageId as string;
    const { status, notes, recipientName } = req.body as {
      status: PackageStatus;
      notes?: string;
      recipientName?: string;
    };

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    const existing = await prisma.package.findFirst({ where: { id: packageId, routeId: id } });
    if (!existing) throw AppError.notFound("Package not found");

    const pkgData: Record<string, unknown> = { status };
    if (notes !== undefined) pkgData.notes = notes;
    if (recipientName !== undefined) pkgData.recipientName = recipientName;

    const isDelivering =
      status === PackageStatus.DELIVERED && existing.status !== PackageStatus.DELIVERED;
    if (isDelivering) pkgData.deliveredAt = new Date();

    const pkg = await prisma.$transaction(async (tx) => {
      const updated = await tx.package.update({
        where: { id: packageId },
        data: pkgData,
        include: { stop: { select: { id: true, address: true, sequence: true } } },
      });
      if (isDelivering) {
        await tx.route.update({
          where: { id },
          data: { deliveredPackages: { increment: 1 } },
        });
      }
      return updated;
    });

    res.json({ package: pkg });
  }),
);

// ─── GET /api/routes/:id/packages — list packages ────────────

router.get(
  "/:id/packages",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const { status } = req.query;

    const route = await prisma.route.findFirst({ where: { id, userId } });
    if (!route) throw AppError.notFound("Route not found");

    const where: Record<string, unknown> = { routeId: id };
    if (status) where.status = status as PackageStatus;

    const packages = await prisma.package.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      include: { stop: { select: { id: true, address: true, sequence: true } } },
    });

    res.json({ packages });
  }),
);

export default router;
