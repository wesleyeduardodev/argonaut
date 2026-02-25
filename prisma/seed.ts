import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  const hash = await bcrypt.hash("admin", 12);
  await prisma.user.create({
    data: {
      username: "admin",
      password: hash,
    },
  });

  console.log("Created admin user (username: admin, password: admin)");
  console.log("⚠ Change the default password after first login!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
