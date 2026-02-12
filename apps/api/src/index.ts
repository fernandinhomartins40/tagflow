import { Hono } from "hono";
import { join } from "node:path";
import { unlink } from "node:fs/promises";
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
import { planLimitsRoutes } from "./routes/plan-limits";

const app = new Hono();

// === Global Middlewares (ordem importa!) ===

// 1. Security headers
app.use("/*", secureHeaders());

// 2. CORS - permite cookies httpOnly
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  "/*",
  cors({
    origin: (origin) => corsOrigin ?? origin ?? "http://localhost:8080",
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true // ✅ Essencial para cookies httpOnly
  })
);

// 3. Rate limiting
app.use("/*", rateLimit(120, 60_000));

// 4. Tenant detection (opcional: apenas subdomain)
// AuthMiddleware vai setar tenantId do JWT cookie nas rotas protegidas
app.use("/api/*", tenantMiddleware);
app.use("/auth/*", tenantMiddleware);
app.use("/public/*", tenantMiddleware);

// === Public Routes (sem autenticação) ===

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/health/storage", async (c) => {
  const testFile = "/app/uploads/.healthcheck";

  try {
    // Testar escrita
    await Bun.write(testFile, "healthcheck-ok");

    // Testar leitura
    const content = await Bun.file(testFile).text();

    if (content !== "healthcheck-ok") {
      throw new Error("Storage read verification failed");
    }

    // Limpar arquivo de teste
    await unlink(testFile);

    return c.json({
      status: "healthy",
      storage: "read/write operational",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Storage healthcheck failed:", error);
    return c.json(
      {
        status: "unhealthy",
        storage: "read/write failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

app.get("/uploads/:tenant/:file", (c) => {
  const tenant = c.req.param("tenant");
  const file = c.req.param("file");
  const filePath = join("/app/uploads", tenant, file);
  return c.body(Bun.file(filePath));
});

// Rotas de autenticação (login, signup, etc)
app.route("/api/auth", authRoutes);
app.route("/auth", authRoutes);

// Webhooks e integrações externas
app.route("/api/stripe", stripeRoutes);

// Customer app (PWA separado, sem tenant)
app.route("/api/customer", customerRoutes);

// Rotas públicas (plans, etc)
app.route("/api/public", publicRoutes);
app.route("/public", publicRoutes);

// === Protected Routes (requerem autenticação) ===

// SuperAdmin routes
const superAdmin = new Hono();
superAdmin.use("/*", authMiddleware); // ✅ AuthMiddleware seta tenantId aqui
superAdmin.route("/", superAdminRoutes);
app.route("/api/superadmin", superAdmin);

// Admin/User routes
const secure = new Hono();
secure.use("/*", authMiddleware); // ✅ AuthMiddleware seta tenantId do JWT cookie
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
secure.route("/plan", planLimitsRoutes);

app.route("/api", secure);
app.route("/", secure);

app.onError((err, c) => {
  logger.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
