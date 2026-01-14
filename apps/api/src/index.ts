import { Hono } from "hono";
import { join } from "node:path";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "./utils/logger";
import { rateLimit } from "./middleware/rateLimit";
import { tenantMiddleware } from "./middleware/tenant";
import { authMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { companiesRoutes } from "./routes/companies";
import { branchesRoutes } from "./routes/branches";
import { customersRoutes } from "./routes/customers";
import { productsRoutes } from "./routes/products";
import { servicesRoutes } from "./routes/services";
import { locationsRoutes } from "./routes/locations";
import { bookingsRoutes } from "./routes/bookings";
import { transactionsRoutes } from "./routes/transactions";
import { publicRoutes } from "./routes/public";
import { reportsRoutes } from "./routes/reports";
import { notificationsRoutes } from "./routes/notifications";
import { usersRoutes } from "./routes/users";
import { tabsRoutes } from "./routes/tabs";
import { cashRoutes } from "./routes/cash";
import { superAdminRoutes } from "./routes/superadmin";
import { stripeRoutes } from "./routes/stripe";
import { billingRoutes } from "./routes/billing";
import { customerRoutes } from "./routes/customer";

const app = new Hono();

app.use("/*", secureHeaders());
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  "/*",
  cors({
    origin: (origin) => corsOrigin ?? origin ?? "http://localhost:8080",
    allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
    credentials: true
  })
);
app.use("/*", rateLimit(120, 60_000));
app.use("/api/*", tenantMiddleware);
app.use("/auth/*", tenantMiddleware);
app.use("/public/*", tenantMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/uploads/:tenant/:file", (c) => {
  const tenant = c.req.param("tenant");
  const file = c.req.param("file");
  const filePath = join("/app/uploads", tenant, file);
  return c.body(Bun.file(filePath));
});

app.route("/api/auth", authRoutes);
app.route("/auth", authRoutes);
app.route("/api/stripe", stripeRoutes);
app.route("/api/customer", customerRoutes);

const superAdmin = new Hono();
superAdmin.use("/*", authMiddleware);
superAdmin.route("/", superAdminRoutes);
app.route("/api/superadmin", superAdmin);

const secure = new Hono();
secure.use("/*", tenantMiddleware);
secure.use("/*", authMiddleware);
secure.route("/companies", companiesRoutes);
secure.route("/branches", branchesRoutes);
secure.route("/customers", customersRoutes);
secure.route("/products", productsRoutes);
secure.route("/services", servicesRoutes);
secure.route("/locations", locationsRoutes);
secure.route("/bookings", bookingsRoutes);
secure.route("/transactions", transactionsRoutes);
secure.route("/reports", reportsRoutes);
secure.route("/notifications", notificationsRoutes);
secure.route("/users", usersRoutes);
secure.route("/tabs", tabsRoutes);
secure.route("/cash", cashRoutes);
secure.route("/billing", billingRoutes);

app.route("/api", secure);
app.route("/", secure);
app.route("/api/public", publicRoutes);
app.route("/public", publicRoutes);

app.onError((err, c) => {
  logger.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
