import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLATFORMS = [
  {
    name: "Amazon Flex",
    slug: "amazon-flex",
    deepLinkScheme: "amzn-flex://",
    webPortalUrl: "https://flex.amazon.com",
    androidPackage: "com.amazon.flex",
    iosScheme: "amzn-flex://",
  },
  {
    name: "Amazon DSP",
    slug: "amazon-dsp",
    webPortalUrl: "https://logistics.amazon.com",
    androidPackage: "com.amazon.dsp.driver",
  },
  {
    name: "FedEx Ground",
    slug: "fedex-ground",
    webPortalUrl: "https://ground.fedex.com",
    androidPackage: "com.fedex.ground",
  },
  {
    name: "UPS",
    slug: "ups",
    webPortalUrl: "https://www.ups.com/driver",
    androidPackage: "com.ups.driver",
  },
  {
    name: "DoorDash",
    slug: "doordash",
    deepLinkScheme: "doordash-driver://",
    webPortalUrl: "https://driver.doordash.com",
    androidPackage: "com.doordash.driverapp",
    iosScheme: "doordash-driver://",
    hasOfficialApi: true,
    apiBaseUrl: "https://developer.doordash.com",
  },
  {
    name: "Uber Eats",
    slug: "uber-eats",
    deepLinkScheme: "uber-driver://",
    webPortalUrl: "https://drivers.uber.com",
    androidPackage: "com.ubercab.driver",
    iosScheme: "uberdriver://",
    hasOfficialApi: true,
  },
  {
    name: "Instacart",
    slug: "instacart",
    deepLinkScheme: "instacart-shopper://",
    webPortalUrl: "https://shoppers.instacart.com",
    androidPackage: "com.instacart.shopper",
    iosScheme: "instacart-shopper://",
    hasOfficialApi: true,
    apiBaseUrl: "https://developer.instacart.com",
  },
  {
    name: "LaserShip",
    slug: "lasership",
    webPortalUrl: "https://www.lasership.com/driver",
    androidPackage: "com.lasership.driver",
  },
  {
    name: "OnTrac",
    slug: "ontrac",
    webPortalUrl: "https://www.ontrac.com/driver",
    androidPackage: "com.ontrac.driver",
  },
  {
    name: "Grubhub",
    slug: "grubhub",
    deepLinkScheme: "grubhub-driver://",
    webPortalUrl: "https://driver.grubhub.com",
    androidPackage: "com.grubhub.driver",
    iosScheme: "grubhub-driver://",
  },
  {
    name: "Spark Driver (Walmart)",
    slug: "spark-driver",
    deepLinkScheme: "sparkdriver://",
    webPortalUrl: "https://drive4spark.walmart.com",
    androidPackage: "com.walmart.spark.driver",
    iosScheme: "sparkdriver://",
  },
  {
    name: "GoPuff",
    slug: "gopuff",
    webPortalUrl: "https://driver.gopuff.com",
    androidPackage: "com.gopuff.driver",
  },
  {
    name: "Shipt",
    slug: "shipt",
    deepLinkScheme: "shipt-shopper://",
    webPortalUrl: "https://shop.shipt.com",
    androidPackage: "com.shipt.shopper",
    iosScheme: "shipt-shopper://",
  },
  {
    name: "USPS",
    slug: "usps",
    webPortalUrl: "https://liteblue.usps.gov",
  },
];

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

  console.log(`\nSeeded ${PLATFORMS.length} platforms.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
