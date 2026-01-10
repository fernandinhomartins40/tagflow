import { pgTable, text, uuid, timestamp, integer, boolean, numeric, date } from "drizzle-orm/pg-core";

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

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("brl"),
  stripePriceId: text("stripe_price_id"),
  features: text("features"),
  tools: text("tools"),
  limits: text("limits"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const companySubscriptions = pgTable("company_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  planId: uuid("plan_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
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
  birthDate: date("birth_date"),
  phone: text("phone"),
  email: text("email"),
  credits: numeric("credits", { precision: 12, scale: 2 }).default("0").notNull(),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const customerIdentifiers = pgTable("customer_identifiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  type: text("type").notNull(),
  code: text("code").notNull(),
  tabType: text("tab_type").notNull().default("prepaid"),
  isMaster: boolean("is_master").default(true).notNull(),
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
  imageUrl: text("image_url"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  priceUnit: text("price_unit").notNull().default("hour"),
  imageUrl: text("image_url"),
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

export const tabs = pgTable("tabs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  customerId: uuid("customer_id").notNull(),
  identifierCode: text("identifier_code").notNull(),
  type: text("type").notNull(), // credit | prepaid
  status: text("status").notNull(), // open | closed
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true })
});

export const tabItems = pgTable("tab_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  tabId: uuid("tab_id").notNull(),
  productId: uuid("product_id"),
  serviceId: uuid("service_id"),
  locationId: uuid("location_id"),
  description: text("description"),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const tabItemParticipants = pgTable("tab_item_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  tabItemId: uuid("tab_item_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull()
});

export const cashRegisters = pgTable("cash_registers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  branchId: uuid("branch_id"),
  openedBy: uuid("opened_by"),
  closedBy: uuid("closed_by"),
  status: text("status").notNull(), // open | closed
  openingFloat: numeric("opening_float", { precision: 12, scale: 2 }).default("0").notNull(),
  closingFloat: numeric("closing_float", { precision: 12, scale: 2 }),
  totalCash: numeric("total_cash", { precision: 12, scale: 2 }).default("0").notNull(),
  totalDebit: numeric("total_debit", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCredit: numeric("total_credit", { precision: 12, scale: 2 }).default("0").notNull(),
  totalPix: numeric("total_pix", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true })
});

export const tabPayments = pgTable("tab_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  tabId: uuid("tab_id").notNull(),
  cashRegisterId: uuid("cash_register_id"),
  method: text("method").notNull(), // cash | debit | credit | pix
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const creditPayments = pgTable("credit_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  cashRegisterId: uuid("cash_register_id"),
  method: text("method").notNull(), // cash | debit | credit | pix
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
