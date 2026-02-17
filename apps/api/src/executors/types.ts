import type { MissionStep } from '../types/index.js';

export interface StepResult {
  success: boolean;
  output: unknown;
  tokensUsed?: number;
  costUsd?: number;
}

export interface StepExecutor {
  execute(step: MissionStep): Promise<StepResult>;
}
