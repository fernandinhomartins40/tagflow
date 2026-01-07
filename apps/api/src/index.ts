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

const app = new Hono();

app.use("/*", secureHeaders());
app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"] }));
app.use("/*", rateLimit(120, 60_000));
app.use("/api/*", tenantMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/uploads/:tenant/:file", (c) => {
  const tenant = c.req.param("tenant");
  const file = c.req.param("file");
  const filePath = join("/app/uploads", tenant, file);
  return c.body(Bun.file(filePath));
});

app.route("/api/auth", authRoutes);

const secure = new Hono();
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

app.route("/api", secure);
app.route("/api/public", publicRoutes);

app.onError((err, c) => {
  logger.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  console.log(`Tagflow API running on ${port}`);
  Bun.serve({
    port,
    fetch: app.fetch
  });
}
