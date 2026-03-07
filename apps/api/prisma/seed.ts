import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLATFORMS = [
  {
    name: "AmerisourceBergen (Cencora)",
    slug: "amerisourcebergen",
    webPortalUrl: "https://www.cencora.com",
    hasOfficialApi: false,
  },
  {
    name: "McKesson",
    slug: "mckesson",
    webPortalUrl: "https://www.mckesson.com",
    hasOfficialApi: false,
  },
  {
    name: "Cardinal Health",
    slug: "cardinal-health",
    webPortalUrl: "https://www.cardinalhealth.com",
    hasOfficialApi: false,
  },
];

const VALID_SLUGS = PLATFORMS.map((p) => p.slug);

async function main() {
  console.log("Seeding delivery platforms...");

  for (const platform of PLATFORMS) {
    await prisma.deliveryPlatform.upsert({
      where: { slug: platform.slug },
      create: platform,
      update: platform,
    });
    console.log(`  ✓ ${platform.name}`);
  }

  // Deactivate any platforms not in the current list
  const deactivated = await prisma.deliveryPlatform.updateMany({
    where: { slug: { notIn: VALID_SLUGS } },
    data: { isActive: false },
  });
  if (deactivated.count > 0) {
    console.log(`  ✗ Deactivated ${deactivated.count} old platform(s)`);
  }

  // Deactivate platform links pointing to deactivated platforms
  const deadLinks = await prisma.platformLink.updateMany({
    where: { platform: { isActive: false } },
    data: { isActive: false },
  });
  if (deadLinks.count > 0) {
    console.log(`  ✗ Deactivated ${deadLinks.count} orphaned platform link(s)`);
  }

  console.log(`\nSeeded ${PLATFORMS.length} platforms.`);

  // ─── Demo accounts ──────────────────────────────────────
  console.log("\nSeeding demo accounts...");
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const glenn = await prisma.user.upsert({
    where: { email: "glenn@deliverybridge.app" },
    create: {
      email: "glenn@deliverybridge.app",
      passwordHash,
      firstName: "Glenn",
      lastName: "Admin",
      role: "SUPER_ADMIN",
    },
    update: { passwordHash, firstName: "Glenn", lastName: "Admin" },
  });
  console.log(`  ✓ Glenn (glenn@deliverybridge.app / demo1234)`);

  const demo = await prisma.user.upsert({
    where: { email: "demo@deliverybridge.app" },
    create: {
      email: "demo@deliverybridge.app",
      passwordHash,
      firstName: "Demo",
      lastName: "Driver",
      role: "WORKER",
    },
    update: { passwordHash, firstName: "Demo", lastName: "Driver" },
  });
  console.log(`  ✓ Demo Driver (demo@deliverybridge.app / demo1234)`);

  // Link all platforms to Glenn's account
  const allPlatforms = await prisma.deliveryPlatform.findMany({ where: { isActive: true } });
  for (const platform of allPlatforms) {
    await prisma.platformLink.upsert({
      where: { userId_platformId: { userId: glenn.id, platformId: platform.id } },
      create: { userId: glenn.id, platformId: platform.id },
      update: {},
    });
  }
  console.log(`  ✓ Linked ${allPlatforms.length} platforms to Glenn`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
