import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Lightweight structured logger (pino-compatible format, zero extra deps)
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level: LogLevel, service: string, msg: string, meta?: Record<string, unknown>) {
  const entry = {
    level: LEVELS[level],
    time: Date.now(),
    service,
    msg,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export function createLogger(service: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', service, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', service, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', service, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', service, msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;

// Request ID middleware
export function registerRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (req: FastifyRequest, _reply: FastifyReply) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).reqId = reqId;
  });

  app.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, _payload: unknown) => {
    const reqId = (req as any).reqId;
    if (reqId) reply.header('X-Request-Id', reqId);
    return _payload;
  });

  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    log('info', 'http', `${req.method} ${req.url} ${reply.statusCode}`, {
      reqId: (req as any).reqId,
      responseTime: reply.elapsedTime,
    });
  });
}
