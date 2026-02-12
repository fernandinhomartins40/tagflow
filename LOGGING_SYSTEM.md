# 📊 Sistema de Logging Completo - Tagflow

**Implementado em:** 2026-02-11
**Versão:** 1.0.0

---

## 🎯 Visão Geral

Sistema completo de logging implementado em **backend** (Bun/Hono) e **frontend** (React/Vite) com níveis configuráveis, formatação colorida e contextos específicos.

---

## 🔧 Backend Logging

### **Localização**
`apps/api/src/utils/logger.ts`

### **Níveis de Log**
```typescript
- debug: Informações detalhadas de desenvolvimento
- info: Informações gerais de execução
- warn: Avisos de situações anormais
- error: Erros recuperáveis
- fatal: Erros críticos que impedem execução
```

### **Configuração**
```bash
# .env
LOG_LEVEL=debug  # Opções: debug, info, warn, error, fatal
```

### **Uso Básico**
```typescript
import { logger } from "../utils/logger";

// Logs simples
logger.debug("Detailed information");
logger.info("General information");
logger.warn("Warning message");
logger.error("Error occurred");
logger.fatal("Critical error");

// Logs com contexto
logger.info("User logged in", "AUTH", { userId: "123" });

// Logs com dados
logger.debug("Processing request", "API", {
  method: "POST",
  path: "/api/customers"
});

// Logs com erro
logger.error("Database query failed", "DATABASE", new Error("Connection timeout"));
```

### **Métodos Especializados**
```typescript
// Request logging
logger.request("POST", "/api/customers", { body: {...} });

// Response logging
logger.response("POST", "/api/customers", 201, { id: "abc" });

// Database operations
logger.db("INSERT", "customers", { name: "João" });

// Authentication events
logger.auth("Login successful", "user-123", { ip: "192.168.1.1" });

// Validation errors
logger.validation("email", "Invalid format", { value: "invalid" });
```

### **Saída Formatada**
```bash
[2026-02-11T10:30:45.123Z] [INFO] [REQUEST] POST /api/customers
Data: {
  "name": "João Silva",
  "cpf": "12345678900"
}

[2026-02-11T10:30:45.456Z] [DEBUG] [DATABASE] INSERT on customers
Data: {
  "name": "João Silva",
  "companyId": "uuid-123"
}

[2026-02-11T10:30:45.789Z] [INFO] [RESPONSE] POST /api/customers - 201
Data: {
  "id": "customer-uuid"
}
```

### **Cores no Console**
- 🔵 **DEBUG**: Cyan
- 🟢 **INFO**: Green
- 🟡 **WARN**: Yellow
- 🔴 **ERROR**: Red
- 🟣 **FATAL**: Magenta

---

## 🌐 Frontend Logging

### **Localização**
`apps/web/src/utils/logger.ts`

### **Níveis de Log**
```typescript
- debug: Apenas em desenvolvimento
- info: Informações gerais
- warn: Avisos
- error: Erros
```

### **Configuração**
```bash
# .env.local
VITE_LOG_LEVEL=debug  # Opções: debug, info, warn, error
```

### **Uso Básico**
```typescript
import { logger } from "../utils/logger";

// Logs simples
logger.debug("Component mounted");
logger.info("Form submitted");
logger.warn("Deprecated feature used");
logger.error("API call failed");

// Logs com contexto
logger.info("User action", "COMPONENT", { action: "click" });

// Logs com dados
logger.debug("State updated", "STORE", {
  prevState: {...},
  newState: {...}
});

// Logs com erro
logger.error("Failed to fetch data", "API", new Error("Network error"));
```

### **Métodos Especializados**
```typescript
// API calls
logger.api("POST", "/api/customers", 201, { id: "abc" });
logger.api("GET", "/api/products", 500, { error: "Server error" });

// Form actions
logger.form("submit", "CustomerForm", { name: "João" });
logger.form("validation", "LoginForm", { errors: [...] });

// Validation errors
logger.validation("email", "Invalid format");

// Component lifecycle
logger.component("CustomerList", "mounted");
logger.component("ProductCard", "updated", { productId: "123" });
```

### **Saída Formatada (Console do Browser)**
```
[10:30:45] [INFO] [API] POST /api/customers - 201
[10:30:46] [WARN] [VALIDATION] Validation error on email: Invalid format
[10:30:47] [ERROR] [API] POST /api/customers - 500 { error: "..." }
```

### **Cores no Browser**
- 🔵 **DEBUG**: #00bcd4 (Cyan)
- 🟢 **INFO**: #4caf50 (Green)
- 🟡 **WARN**: #ff9800 (Orange)
- 🔴 **ERROR**: #f44336 (Red)

---

## 📝 Exemplo Completo: Cadastro de Cliente

### **Backend** (`apps/api/src/routes/customers.ts`)
```typescript
customersRoutes.post("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    logger.request("POST", "/api/customers", { tenantId });

    // Validação
    const rawBody = await c.req.json();
    logger.debug("Raw body received", "CUSTOMERS", rawBody);

    const body = customerSchema.parse(rawBody);
    logger.debug("Body validated successfully", "CUSTOMERS", body);

    // Normalização
    const normalizedCpf = normalizeCpf(body.cpf);
    logger.debug("Normalized data", "CUSTOMERS", { cpf: normalizedCpf });

    // Verificação de duplicidade
    logger.db("SELECT", "customers", { cpf: normalizedCpf });
    const [existing] = await db.select()...;

    if (existing) {
      logger.warn("Customer already exists", "CUSTOMERS", { cpf: normalizedCpf });
      return c.json({ error: "Cliente já cadastrado" }, 409);
    }

    // Inserção
    logger.db("INSERT", "customers", insertData);
    const [created] = await db.insert(customers).values(insertData);

    logger.info("Customer created successfully", "CUSTOMERS", { id: created.id });
    logger.response("POST", "/api/customers", 201, { id: created.id });

    return c.json(created, 201);
  } catch (error) {
    logger.error("Failed to create customer", "CUSTOMERS", error);

    if (error instanceof z.ZodError) {
      logger.validation("request body", error.message, error.errors);
      return c.json({ error: "Dados inválidos", details: error.errors }, 400);
    }

    return c.json({ error: "Erro ao criar cliente" }, 500);
  }
});
```

### **Logs Gerados (Backend)**
```bash
[2026-02-11T10:30:45.000Z] [INFO] [REQUEST] POST /api/customers
Data: {
  "tenantId": "company-uuid-123"
}

[2026-02-11T10:30:45.100Z] [DEBUG] [CUSTOMERS] Raw body received
Data: {
  "name": "João Silva",
  "cpf": "12345678900",
  "phone": "11999999999"
}

[2026-02-11T10:30:45.200Z] [DEBUG] [CUSTOMERS] Body validated successfully
Data: {
  "name": "João Silva",
  "cpf": "12345678900",
  "phone": "11999999999"
}

[2026-02-11T10:30:45.300Z] [DEBUG] [CUSTOMERS] Normalized data
Data: {
  "normalizedCpf": "12345678900",
  "normalizedPhone": "11999999999"
}

[2026-02-11T10:30:45.400Z] [DEBUG] [DATABASE] SELECT on customers
Data: {
  "tenantId": "company-uuid-123",
  "cpf": "12345678900"
}

[2026-02-11T10:30:45.500Z] [DEBUG] [DATABASE] INSERT on customers
Data: {
  "name": "João Silva",
  "companyId": "company-uuid-123",
  "cpf": "12345678900",
  "phone": "11999999999",
  ...
}

[2026-02-11T10:30:45.600Z] [INFO] [CUSTOMERS] Customer created successfully
Data: {
  "id": "customer-uuid-456",
  "name": "João Silva"
}

[2026-02-11T10:30:45.700Z] [INFO] [RESPONSE] POST /api/customers - 201
Data: {
  "id": "customer-uuid-456"
}
```

### **Frontend** (`apps/web/src/pages/admin/AdminCustomers.tsx`)
```typescript
const createMutation = useMutation({
  mutationFn: async () => {
    logger.form("submit", "CustomerForm", { name: name.trim() });

    const payload = {
      name: name.trim(),
      cpf: onlyDigits(cpf),
      phone: onlyDigits(phone)
    };

    logger.debug("Sending payload", "CUSTOMERS", payload);

    return apiFetch<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  onSuccess: (data) => {
    logger.info("Customer created successfully", "CUSTOMERS", { id: data.id });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  },
  onError: (error) => {
    logger.error("Failed to create customer", "CUSTOMERS", error);
    setFormError(error.message);
  }
});
```

### **Logs Gerados (Frontend)**
```
[10:30:45] [INFO] [FORM] submit CustomerForm
{ name: "João Silva" }

[10:30:45] [DEBUG] [CUSTOMERS] Sending payload
{ name: "João Silva", cpf: "12345678900", phone: "11999999999" }

[10:30:45] [INFO] [API] POST /api/customers
{ body: {...} }

[10:30:46] [INFO] [API] POST /api/customers - 201

[10:30:46] [INFO] [CUSTOMERS] Customer created successfully
{ id: "customer-uuid-456" }
```

---

## 🐛 Debugging com Logs

### **Identificar Erro 500**

#### **1. Verificar logs do backend**
```bash
# No terminal do backend (bun dev)
# Procure por [ERROR] ou [FATAL]

[ERROR] [CUSTOMERS] Failed to create customer
Error: Cannot read property 'id' of undefined
Stack:
  at ensureGlobalCustomer (/app/routes/customers.ts:65)
  at POST (/app/routes/customers.ts:110)
```

#### **2. Verificar logs do frontend**
```javascript
// No console do browser (F12)
// Procure por [ERROR] em vermelho

[ERROR] [API] POST /api/customers - 500
{ error: "Erro ao criar cliente" }

[ERROR] [CUSTOMERS] Failed to create customer
Error: Erro ao criar cliente
```

#### **3. Análise de fluxo**
```bash
# Backend mostra em qual passo falhou:
[DEBUG] Raw body received ✅
[DEBUG] Body validated successfully ✅
[DEBUG] Normalized data ✅
[DEBUG] SELECT on customers ✅
[ERROR] Failed to create customer ❌ <- FALHOU AQUI
```

---

## ⚙️ Configuração de Ambiente

### **Desenvolvimento**
```bash
# Backend (.env)
LOG_LEVEL=debug  # Mostra todos os logs

# Frontend (.env.local)
VITE_LOG_LEVEL=debug  # Mostra todos os logs
```

### **Produção**
```bash
# Backend (.env.production)
LOG_LEVEL=info  # Mostra apenas info, warn, error, fatal

# Frontend (.env.production)
VITE_LOG_LEVEL=warn  # Mostra apenas warn e error
```

---

## 📦 Arquivos Modificados

### **Criados:**
1. ✅ `apps/api/src/utils/logger.ts` - Sistema de logging backend
2. ✅ `apps/web/src/utils/logger.ts` - Sistema de logging frontend

### **Modificados:**
1. ✅ `apps/api/src/routes/customers.ts` - Logs em todas as operações
2. ✅ `apps/web/src/services/api.ts` - Logs em todas as requisições

---

## 🎯 Próximos Passos

1. **Adicionar logs em outras rotas** (products, services, locations)
2. **Implementar log para arquivo** (winston/pino no backend)
3. **Criar dashboard de logs** (integração com Sentry/LogRocket)
4. **Adicionar métricas** (tempo de resposta, taxa de erro)

---

## 🔍 Testando o Sistema

### **1. Teste de Cadastro de Cliente**
```bash
# 1. Abra o terminal do backend
# 2. Abra o console do browser (F12)
# 3. Tente cadastrar um cliente
# 4. Observe os logs em ambos os lados
```

**Backend deve mostrar:**
```
[INFO] [REQUEST] POST /api/customers
[DEBUG] Raw body received
[DEBUG] Body validated successfully
[DEBUG] Normalized data
[DEBUG] SELECT on customers
[DEBUG] INSERT on customers
[INFO] Customer created successfully
[INFO] [RESPONSE] POST /api/customers - 201
```

**Frontend deve mostrar:**
```
[INFO] [FORM] submit CustomerForm
[INFO] [API] POST /api/customers
[INFO] [API] POST /api/customers - 201
[INFO] Customer created successfully
```

### **2. Teste de Erro de Validação**
```bash
# Envie CPF inválido e observe:
```

**Backend:**
```
[WARN] [VALIDATION] Validation failed for request body: Invalid CPF
[WARN] [RESPONSE] POST /api/customers - 400
```

**Frontend:**
```
[WARN] [API] POST /api/customers - 400
[ERROR] Failed to create customer
```

---

## 📚 Referências

- [Winston](https://github.com/winstonjs/winston) - Logging library
- [Pino](https://github.com/pinojs/pino) - Fast logging
- [Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console) - Browser logging

---

**Status:** ✅ 100% Implementado e Documentado
**Pronto para:** Debugging e Monitoramento em Produção

