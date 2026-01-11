/**
 * Agent controller - orchestrates the OBSERVE → DECIDE → ACT → VERIFY loop
 */

import type { Region } from '../shared/types.js';
import type { Action, Decision } from './schemas.js';
import { DecisionSchema} from './schemas.js';
import { Guardrails } from '../policy/guardrails.js';
import { Verifier } from '../verify/verifier.js';
import { DOMTools } from '../browser/domTools.js';
import { Regionizer } from '../vision/regionizer.js';
export class AgentController {
  private stepCount = 0;
  private maxSteps = 50; // Safety limit

  constructor(
    private domTools: DOMTools,
    private regionizer: Regionizer,
    private guardrails: Guardrails,
    private verifier: Verifier

  ) {}

  /**
   * Main agent loop: OBSERVE → DECIDE → ACT → VERIFY
   */
  async runLoop(
    task: string,
    onStep: (phase: 'OBSERVE' | 'DECIDE' | 'ACT' | 'VERIFY', message: string, action?: Action) => Promise<void>
  ): Promise<{ completed: boolean; reason: string;pendingAction?: Action ;pauseKind?:'ASK_USER'|'CONFIRM' }> {
    this.stepCount = 0;

    while (this.stepCount < this.maxSteps) {
      this.stepCount++;
      
      // OBSERVE
      await onStep('OBSERVE', `Step ${this.stepCount}: Observing page state`);
      const regions = await this.regionizer.detectRegions();
      const observation = await this.observe(regions);
      await onStep('OBSERVE', observation);

      // DECIDE
      await onStep('DECIDE', `Step ${this.stepCount}: Deciding next action`);
      const decision = await this.decide(task, regions, this.stepCount);
      const parsed= DecisionSchema.safeParse(decision);
      if(!parsed.success){
        await onStep('DECIDE', `Decision schema validation failed: ${parsed.error.message}`);
        return {completed:false, reason:`Decision schema validation failed: ${parsed.error.message}`};
      }
      const validatedDecision=parsed.data;
      await onStep('DECIDE', validatedDecision.reasoning, validatedDecision.action );

      // Check if done
      if (validatedDecision.action.type === 'DONE') {
        return { completed: true, reason: validatedDecision.action.reason || 'Task completed' };
      }
      if (validatedDecision.action.type === 'CONFIRM') {
        await onStep('DECIDE', validatedDecision.action.message, validatedDecision.action);
        return { completed: false, reason: validatedDecision.action.message,pauseKind:'CONFIRM' };
      }

      if (validatedDecision.action.type === 'ASK_USER') {
        await onStep('DECIDE', validatedDecision.action.message, validatedDecision.action);
        return { completed: false, reason: validatedDecision.action.message, pauseKind:'ASK_USER' };
      }


      // Check guardrails
      const guardrailCheck = await this.guardrails.checkAction(validatedDecision.action, regions);
      if (!guardrailCheck.allowed) {
        await onStep('DECIDE', `Guardrail blocked: ${guardrailCheck.reason}`);
        
        if (guardrailCheck.requiresConfirmation) {
          
          await onStep('DECIDE', guardrailCheck.reason || 'This action requires confirmation', validatedDecision.action);

          // Pause the loop so orchestrator can wait for user
          return { completed: false, reason: guardrailCheck.reason||'This action requires confirmation', pendingAction: validatedDecision.action, pauseKind:'CONFIRM'  };
        }
        await onStep('ACT', 'Action skipped due to guardrail');
        continue;
      }
      

      // ACT
      await onStep('ACT', `Step ${this.stepCount}: Executing action`);
      try {
        await this.act(validatedDecision.action);
        await onStep('ACT', `Executed: ${validatedDecision.action.type}`);
      } catch (error) {
        await onStep('ACT', `Action failed: ${error instanceof Error ? error.message : String(error)}`);
        // Continue to next step
        continue;
      }

      // VERIFY
      await onStep('VERIFY', `Step ${this.stepCount}: Verifying action result`);
      const verification = await this.verifier.verify(validatedDecision.action);
      await onStep('VERIFY', verification.message);

      // Wait a bit for page to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { completed: false, reason: 'Max steps reached'};
  }

  private async observe(regions: Region[]): Promise<string> {
    const pageText = await this.domTools.getPageText();
    const url = this.domTools.getUrl();

    
    return `Page: ${url}, ${regions.length} interactive regions detected, ${pageText.length} characters of text`;
  }

  /**
   * Decide next action based on task and current state
   * 
   * V1: Simple rule-based controller
   * Future: Replace with LLM tool-calling
   */
  private async decide(task: string, regions: Region[], step: number): Promise<Decision> {
    // Simple rule-based controller for v1
    // If task mentions "click first link", do that
    if (task.toLowerCase().includes('click') && task.toLowerCase().includes('first link')) {
      const links = regions.filter(r => r.id.startsWith('link-'));
      if (links.length > 0) {
        return {
          action: {
            type: 'VISION_CLICK',
            regionId: links[0].id,
            description: 'Click first link as requested',
          },
          reasoning: `Found ${links.length} link(s), clicking the first one`,
          confidence: 0.8,
        };
      }
    }

    // If task mentions "click link" or "click button", try to find matching label
    if (task.toLowerCase().includes('click')) {
      const clickables = regions.filter(r => 
        r.id.startsWith('link-') || r.id.startsWith('button-') || r.id.startsWith('role-')
      );
      
      // Try to match task text with region labels
      const taskLower = task.toLowerCase();
      for (const region of clickables) {
        if (region.label && taskLower.includes(region.label.toLowerCase())) {
          return {
            action: {
              type: 'VISION_CLICK',
              regionId: region.id,
              description: `Click "${region.label}" as requested`,
            },
            reasoning: `Found matching element: ${region.label}`,
            confidence: 0.7,
          };
        }
      }

      // Fallback: click first clickable
      if (clickables.length > 0) {
        return {
          action: {
            type: 'VISION_CLICK',
            regionId: clickables[0].id,
            description: 'Click first available element',
          },
          reasoning: `Clicking first clickable element: ${clickables[0].label}`,
          confidence: 0.5,
        };
      }
    }

    // Default: done (no action found)
    return {
      action: {
        type: 'DONE',
        reason: 'No matching action found for task',
      },
      reasoning: 'Could not determine appropriate action',
      confidence: 0.3,
    };
  }
  public async executeAction(action: Action): Promise<void> {
    await this.act(action);
  }
  /**
   * Execute an action
   */
  private async act(action: Action): Promise<void> {
    switch (action.type) {
      case 'VISION_CLICK':
        await this.domTools.clickByRegionId(action.regionId);
        break;

      case 'DOM_CLICK':
        if (action.role && action.name) {
          await this.domTools.clickByRole(action.role, action.name);
        } else if (action.selector) {
          await this.domTools.clickSelector(action.selector);
        } else {
          throw new Error('DOM_CLICK requires either role+name or selector');
        }
        break;

      case 'DOM_FILL':
        if (action.role && action.name) {
          await this.domTools.fillByRole(action.role, action.name, action.value);
        } else if (action.selector) {
          await this.domTools.fillSelector(action.selector, action.value);
        } else {
          throw new Error('DOM_FILL requires either role+name or selector');
        }
        break;

      case 'WAIT':
        if (action.duration) {
          await new Promise(resolve => setTimeout(resolve, action.duration));
        } else if (action.until) {
          await this.domTools.waitForLoadState(action.until as 'load' | 'domcontentloaded' | 'networkidle');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        break;

      case 'ASK_USER':
      case 'CONFIRM':
        // These are handled by the orchestrator, not here
        throw new Error('ASK_USER and CONFIRM actions must be handled by orchestrator');

      case 'DONE':
        // No action needed
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }
  
}

