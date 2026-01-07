import { pgTable, text, uuid, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  theme: text("theme"),
  logoUrl: text("logo_url"),
  domain: text("domain"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  renewedAt: timestamp("renewed_at", { withTimezone: true })
});

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  hours: text("hours"),
  settings: text("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  name: text("name").notNull(),
  cpf: text("cpf"),
  phone: text("phone"),
  email: text("email"),
  credits: numeric("credits", { precision: 12, scale: 2 }).default("0").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const customerIdentifiers = pgTable("customer_identifiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  type: text("type").notNull(),
  code: text("code").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  category: text("category"),
  stock: integer("stock").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  customerId: uuid("customer_id"),
  locationId: uuid("location_id").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const bookingParticipants = pgTable("booking_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  bookingId: uuid("booking_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  share: numeric("share", { precision: 12, scale: 2 }).notNull()
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  customerId: uuid("customer_id"),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const consumptionItems = pgTable("consumption_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  customerId: uuid("customer_id"),
  productId: uuid("product_id"),
  serviceId: uuid("service_id"),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id"),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
