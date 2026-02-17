import type { StepExecutor, StepResult } from './types.js';
import type { MissionStep } from '../types/index.js';

export class WriteExecutor implements StepExecutor {
  async execute(step: MissionStep): Promise<StepResult> {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    return {
      success: true,
      output: { content: `Generated content for: ${step.config?.topic || 'unknown'}`, wordCount: 350 },
      tokensUsed: 2500,
      costUsd: 0.005,
    };
  }
}
