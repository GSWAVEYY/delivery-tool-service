import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index.js";

let token: string;
let userId: string;
let platformId: string;
let linkId: string;
let shiftId: string;

const testEmail = `test-${Date.now()}@deliverybridge.com`;

describe("DeliveryBridge API", () => {
  // ─── Health ─────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns ok status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("deliverybridge-api");
    });
  });

  // ─── Auth ───────────────────────────────────────────────

  describe("Auth", () => {
    it("registers a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: testEmail,
        password: "testpass123",
        firstName: "Test",
        lastName: "Driver",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.token).toBeDefined();
      token = res.body.token;
      userId = res.body.user.id;
    });

    it("rejects duplicate registration", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: testEmail,
        password: "testpass123",
        firstName: "Test",
        lastName: "Driver",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Email already registered");
    });

    it("logs in with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: "testpass123" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
    });

    it("rejects wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: "wrongpassword" });

      expect(res.status).toBe(401);
    });

    it("gets current user profile", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userId);
    });

    it("rejects unauthenticated requests", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("validates registration input", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "short" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toBeDefined();
    });
  });

  // ─── Platforms ──────────────────────────────────────────

  describe("Platforms", () => {
    it("lists all platforms", async () => {
      const res = await request(app).get("/api/platforms");

      expect(res.status).toBe(200);
      expect(res.body.platforms.length).toBeGreaterThan(0);
      platformId = res.body.platforms[0].id;
    });

    it("searches platforms by name", async () => {
      const res = await request(app).get("/api/platforms/search?q=amazon");

      expect(res.status).toBe(200);
      expect(res.body.platforms.length).toBeGreaterThan(0);
      expect(res.body.platforms[0].name.toLowerCase()).toContain("amazon");
    });

    it("gets platform by slug", async () => {
      const res = await request(app).get("/api/platforms/doordash");

      expect(res.status).toBe(200);
      expect(res.body.platform.slug).toBe("doordash");
    });

    it("returns 404 for unknown slug", async () => {
      const res = await request(app).get("/api/platforms/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  // ─── Dashboard ──────────────────────────────────────────

  describe("Dashboard", () => {
    it("returns empty dashboard for new user", async () => {
      const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.platformLinks).toEqual([]);
      expect(res.body.todayShifts).toEqual([]);
      expect(res.body.unreadNotifications).toBe(0);
    });

    it("links a platform", async () => {
      const res = await request(app)
        .post("/api/dashboard/link")
        .set("Authorization", `Bearer ${token}`)
        .send({ platformId, displayName: "Test Platform" });

      expect(res.status).toBe(201);
      expect(res.body.link.platformId).toBe(platformId);
      linkId = res.body.link.id;
    });

    it("shows linked platform on dashboard", async () => {
      const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.platformLinks.length).toBe(1);
      expect(res.body.platformLinks[0].displayName).toBe("Test Platform");
    });

    it("launches a linked platform", async () => {
      const res = await request(app)
        .post(`/api/dashboard/launch/${linkId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.platform).toBeDefined();
    });

    it("unlinks a platform", async () => {
      const res = await request(app)
        .delete(`/api/dashboard/link/${linkId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Platform unlinked");
    });
  });

  // ─── Earnings ───────────────────────────────────────────

  describe("Earnings", () => {
    it("creates an earning record", async () => {
      const res = await request(app)
        .post("/api/earnings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          platform: "DoorDash",
          amount: 85.5,
          tips: 12.0,
          date: new Date().toISOString(),
          description: "Test delivery",
        });

      expect(res.status).toBe(201);
      expect(res.body.earning.platform).toBe("DoorDash");
    });

    it("gets earnings summary", async () => {
      const res = await request(app)
        .get("/api/earnings/summary")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.today).toBeDefined();
      expect(res.body.thisWeek).toBeDefined();
      expect(res.body.allTime.earnings).toBeGreaterThan(0);
    });

    it("lists earnings with pagination", async () => {
      const res = await request(app)
        .get("/api/earnings?page=1&limit=10")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.earnings.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ─── Shifts ─────────────────────────────────────────────

  describe("Shifts", () => {
    it("creates a shift", async () => {
      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${token}`)
        .send({
          platform: "DoorDash",
          startTime: new Date().toISOString(),
          status: "SCHEDULED",
        });

      expect(res.status).toBe(201);
      expect(res.body.shift.status).toBe("SCHEDULED");
      shiftId = res.body.shift.id;
    });

    it("updates shift status", async () => {
      const res = await request(app)
        .patch(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.shift.status).toBe("IN_PROGRESS");
    });

    it("lists shifts", async () => {
      const res = await request(app).get("/api/shifts").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.shifts.length).toBeGreaterThan(0);
    });
  });

  // ─── Hubs ───────────────────────────────────────────────

  describe("Hubs", () => {
    it("creates a hub and becomes owner", async () => {
      const res = await request(app)
        .post("/api/hubs")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Test Hub", city: "Atlanta", state: "GA" });

      expect(res.status).toBe(201);
      expect(res.body.hub.name).toBe("Test Hub");
    });

    it("gets my hub membership", async () => {
      const res = await request(app).get("/api/hubs/my").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.membership.role).toBe("OWNER");
    });

    it("searches hubs", async () => {
      const res = await request(app)
        .get("/api/hubs/search?q=Test")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.hubs.length).toBeGreaterThan(0);
    });
  });

  // ─── Error handling ─────────────────────────────────────

  describe("Error handling", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(app).get("/api/nonexistent");
      expect(res.status).toBe(404);
    });

    it("returns 401 for invalid token", async () => {
      const res = await request(app)
        .get("/api/dashboard")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });
});
