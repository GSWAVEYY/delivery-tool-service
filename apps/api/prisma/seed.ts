import { PrismaClient } from "@prisma/client";

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
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
