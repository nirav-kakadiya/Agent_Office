import { Queue } from 'bullmq';
import { redis } from './redis.js';

export const stepQueue = new Queue('mission-steps', { connection: redis });
