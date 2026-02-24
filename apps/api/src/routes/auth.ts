import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, generateToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../lib/errors.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /auth/register ────────────────────────────────────

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict("Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, phone },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const token = generateToken(user);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ user, token });
  }),
);

// ─── POST /auth/login ───────────────────────────────────────

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw AppError.unauthorized("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Invalid email or password");

    // Clean up expired sessions for this user before creating a new one
    await prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    const token = generateToken(user);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPremium: user.isPremium,
      },
      token,
    });
  }),
);

// ─── GET /auth/me ───────────────────────────────────────────

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) throw AppError.notFound("User not found");
    res.json({ user });
  }),
);

// ─── POST /auth/logout ──────────────────────────────────────

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization!.slice(7);
    await prisma.session.deleteMany({ where: { token } });
    res.json({ message: "Logged out" });
  }),
);

export default router;
