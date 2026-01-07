import bcrypt from "bcryptjs";
import { db } from "./db";
import { companies, users } from "./schema";

const demoCompanyId = "11111111-1111-1111-1111-111111111111";

const run = async () => {
  await db
    .insert(companies)
    .values({
      id: demoCompanyId,
      name: "Demo Tagflow",
      cnpj: "00.000.000/0001-00",
      plan: "demo",
      status: "active",
      theme: "sunset"
    })
    .onConflictDoNothing();

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db
    .insert(users)
    .values({
      companyId: demoCompanyId,
      name: "Admin Demo",
      email: "admin@tagflow.local",
      passwordHash,
      role: "super_admin"
    })
    .onConflictDoNothing();

  console.log("Seed completed");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
