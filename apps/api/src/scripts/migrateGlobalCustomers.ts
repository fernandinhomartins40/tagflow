import bcrypt from "bcryptjs";
import { db } from "../db";
import { customers, globalCustomers } from "../schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { initialCustomerPassword, normalizeCpf, normalizePhone } from "../utils/customer";

const run = async () => {
  const rows = await db
    .select()
    .from(customers)
    .where(and(isNotNull(customers.cpf), isNotNull(customers.phone)));

  for (const customer of rows) {
    const cpf = normalizeCpf(customer.cpf ?? "");
    const phone = normalizePhone(customer.phone ?? "");
    if (!cpf || !phone) continue;

    let globalId = customer.globalCustomerId;
    if (!globalId) {
      const [existing] = await db.select().from(globalCustomers).where(eq(globalCustomers.cpf, cpf));
      if (existing) {
        globalId = existing.id;
      } else {
        const [created] = await db
          .insert(globalCustomers)
          .values({
            cpf,
            phone,
            name: customer.name,
            passwordHash: await bcrypt.hash(initialCustomerPassword(customer.name), 10)
          })
          .returning();
        globalId = created.id;
      }
    }

    await db
      .update(customers)
      .set({ globalCustomerId: globalId, cpf, phone })
      .where(eq(customers.id, customer.id));
  }

  console.log(`Migrated ${rows.length} customers`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
