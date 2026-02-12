/**
 * Sistema de Logging Completo
 * Suporta diferentes níveis de log e formatação colorida no console
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

const colors = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  fatal: "\x1b[35m", // Magenta
  reset: "\x1b[0m"
};

const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[LOG_LEVEL as LogLevel];
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, context, data, error } = entry;
  const color = colors[level];
  const reset = colors.reset;

  let logMessage = `${color}[${timestamp}] [${level.toUpperCase()}]${reset}`;

  if (context) {
    logMessage += ` ${color}[${context}]${reset}`;
  }

  logMessage += ` ${message}`;

  if (data) {
    logMessage += `\n${color}Data:${reset} ${JSON.stringify(data, null, 2)}`;
  }

  if (error) {
    logMessage += `\n${color}Error:${reset} ${error.message}`;
    if (error.stack) {
      logMessage += `\n${color}Stack:${reset}\n${error.stack}`;
    }
  }

  return logMessage;
}

function log(level: LogLevel, message: string, context?: string, data?: any, error?: Error) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    context,
    data,
    error
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
    case "fatal":
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: string, data?: any) => {
    log("debug", message, context, data);
  },

  info: (message: string, context?: string, data?: any) => {
    log("info", message, context, data);
  },

  warn: (message: string, context?: string, data?: any) => {
    log("warn", message, context, data);
  },

  error: (message: string, context?: string, dataOrError?: any) => {
    const error = dataOrError instanceof Error ? dataOrError : undefined;
    const data = dataOrError instanceof Error ? undefined : dataOrError;
    log("error", message, context, data, error);
  },

  fatal: (message: string, context?: string, dataOrError?: any) => {
    const error = dataOrError instanceof Error ? dataOrError : undefined;
    const data = dataOrError instanceof Error ? undefined : dataOrError;
    log("fatal", message, context, data, error);
  },

  // Helpers para request/response
  request: (method: string, path: string, data?: any) => {
    log("info", `${method} ${path}`, "REQUEST", data);
  },

  response: (method: string, path: string, status: number, data?: any) => {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    log(level, `${method} ${path} - ${status}`, "RESPONSE", data);
  },

  db: (operation: string, table: string, data?: any) => {
    log("debug", `${operation} on ${table}`, "DATABASE", data);
  },

  auth: (action: string, userId?: string, data?: any) => {
    log("info", action, "AUTH", { userId, ...data });
  },

  validation: (field: string, error: string, data?: any) => {
    log("warn", `Validation failed for ${field}: ${error}`, "VALIDATION", data);
  }
};
