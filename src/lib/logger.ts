type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  error?: string;
  [key: string]: unknown;
};

function log(level: LogLevel, message: string, meta?: Partial<LogEntry>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, meta?: Partial<LogEntry>) => log("info", message, meta),
  warn: (message: string, meta?: Partial<LogEntry>) => log("warn", message, meta),
  error: (message: string, meta?: Partial<LogEntry>) => log("error", message, meta),
  debug: (message: string, meta?: Partial<LogEntry>) => log("debug", message, meta),
};
