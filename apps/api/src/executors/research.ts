import type { StepExecutor, StepResult } from './types.js';
import type { MissionStep } from '../types/index.js';

export class ResearchExecutor implements StepExecutor {
  async execute(step: MissionStep): Promise<StepResult> {
    // Simulate research delay
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    return {
      success: true,
      output: { findings: `Research results for: ${step.config?.topic || 'unknown'}`, sources: 3 },
      tokensUsed: 1200,
      costUsd: 0.002,
    };
  }
}
