export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
  staleStepTimeoutMs: parseInt(process.env.STALE_STEP_TIMEOUT_MS || '300000', 10), // 5 min
  retryBaseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
  retryMaxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '60000', 10),
} as const;
