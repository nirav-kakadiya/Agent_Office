import type { StepExecutor } from './types.js';
import { NoopExecutor } from './noop.js';
import { ResearchExecutor } from './research.js';
import { WriteExecutor } from './write.js';
import { AnalyzeExecutor } from './analyze.js';
import { PublishExecutor } from './publish.js';

const executors: Record<string, StepExecutor> = {
  noop: new NoopExecutor(),
  research: new ResearchExecutor(),
  write: new WriteExecutor(),
  analyze: new AnalyzeExecutor(),
  publish: new PublishExecutor(),
};

export function getExecutor(kind: string): StepExecutor {
  const executor = executors[kind];
  if (!executor) throw new Error(`No executor registered for kind: ${kind}`);
  return executor;
}

export function registerExecutor(kind: string, executor: StepExecutor): void {
  executors[kind] = executor;
}
