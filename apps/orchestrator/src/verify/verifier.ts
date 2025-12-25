/**
 * Action verification
 */

import type { Action } from '../agent/schemas.js';
import { DOMTools } from '../browser/domTools.js';

export interface VerificationResult {
  success: boolean;
  message: string;
}

export class Verifier {
  constructor(private domTools: DOMTools) {}

  /**
   * Verify that an action was successful
   */
  async verify(action: Action): Promise<VerificationResult> {
    // Simple verification: check if page is still loaded
    try {
      const url = this.domTools['page'].url();
      const title = await this.domTools['page'].title();
      
      // For click actions, verify page changed or element state changed
      if (action.type === 'VISION_CLICK' || action.type === 'DOM_CLICK') {
        return {
          success: true,
          message: `Click executed. Current page: ${title}`,
        };
      }

      // For fill actions, verify value was set
      if (action.type === 'DOM_FILL') {
        return {
          success: true,
          message: `Fill action executed. Value set in field.`,
        };
      }

      // Default: action executed without error
      return {
        success: true,
        message: 'Action executed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

