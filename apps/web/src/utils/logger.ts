/**
 * Sistema de Logging Frontend
 * Console com níveis e formatação
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const IS_DEV = import.meta.env.DEV;
const LOG_LEVEL = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || "info";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[LOG_LEVEL];
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", { hour12: false });
}

const colors = {
  debug: "color: #00bcd4",
  info: "color: #4caf50",
  warn: "color: #ff9800",
  error: "color: #f44336",
  reset: "color: inherit"
};

function log(level: LogLevel, message: string, context?: string, data?: any) {
  if (!shouldLog(level)) return;

  const timestamp = formatTimestamp();
  const color = colors[level];
  const prefix = `%c[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ""}`;

  if (data) {
    console[level === "debug" || level === "info" ? "log" : level](
      prefix,
      color,
      message,
      data
    );
  } else {
    console[level === "debug" || level === "info" ? "log" : level](
      prefix,
      color,
      message
    );
  }
}

export const logger = {
  debug: (message: string, context?: string, data?: any) => {
    if (IS_DEV) log("debug", message, context, data);
  },

  info: (message: string, context?: string, data?: any) => {
    log("info", message, context, data);
  },

  warn: (message: string, context?: string, data?: any) => {
    log("warn", message, context, data);
  },

  error: (message: string, context?: string, dataOrError?: any) => {
    const error = dataOrError instanceof Error ? dataOrError : undefined;
    const data = dataOrError instanceof Error ?
      { message: dataOrError.message, stack: dataOrError.stack } :
      dataOrError;
    log("error", message, context, data);
  },

  // Helpers para operações específicas
  api: (method: string, path: string, status?: number, data?: any) => {
    if (status) {
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      log(level, `${method} ${path} - ${status}`, "API", data);
    } else {
      log("info", `${method} ${path}`, "API", data);
    }
  },

  form: (action: string, formName: string, data?: any) => {
    log("info", `${action} ${formName}`, "FORM", data);
  },

  validation: (field: string, error: string) => {
    log("warn", `Validation error on ${field}: ${error}`, "VALIDATION");
  },

  component: (name: string, action: string, data?: any) => {
    log("debug", `${name} - ${action}`, "COMPONENT", data);
  }
};
