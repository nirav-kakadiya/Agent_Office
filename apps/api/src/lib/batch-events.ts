import { supabase } from './supabase.js';

interface PendingEvent {
  agent_id: string;
  event_type: string;
  tags: string[];
  payload: Record<string, unknown>;
}

let buffer: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 500; // ms
const MAX_BATCH = 50;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL);
}

async function flush() {
  flushTimer = null;
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, MAX_BATCH);
  try {
    const { error } = await supabase.from('agent_events').insert(batch);
    if (error) console.error('[batch-events] Insert error:', error);
  } catch (err) {
    console.error('[batch-events] Flush error:', err);
  }
  // If there's more, schedule again
  if (buffer.length > 0) scheduleFlush();
}

/** Queue an event for batch insert. Does NOT return the inserted row. */
export function queueEvent(agentId: string, eventType: string, tags: string[], payload: Record<string, unknown> = {}) {
  buffer.push({ agent_id: agentId, event_type: eventType, tags, payload });
  if (buffer.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
}

/** Flush any pending events immediately (call on shutdown). */
export async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}
