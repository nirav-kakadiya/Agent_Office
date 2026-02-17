import type { StepExecutor, StepResult } from './types.js';
import type { MissionStep } from '../types/index.js';

export class NoopExecutor implements StepExecutor {
  async execute(_step: MissionStep): Promise<StepResult> {
    return { success: true, output: { message: 'noop' } };
  }
}
