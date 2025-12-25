/**
 * Guardrails for safe agent operation
 */

import type { Action } from '../agent/schemas.js';
import type { Region } from '../shared/types.js';
import { config } from '../config.js';

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

export class Guardrails {
  /**
   * Check if an action is allowed
   */
  async checkAction(action: Action, regions: Region[]): Promise<GuardrailResult> {
    // Check domain allowlist
    if (action.type === 'VISION_CLICK' || action.type === 'DOM_CLICK') {
      const region = regions.find(r => r.id === (action as any).regionId);
      if (region) {
        const labelLower = region.label.toLowerCase();
        
        // Check if action requires confirmation
        for (const keyword of config.guardrails.requireConfirmFor) {
          if (labelLower.includes(keyword.toLowerCase())) {
            return {
              allowed: false,
              reason: `Action on "${region.label}" requires confirmation (keyword: ${keyword})`,
              requiresConfirmation: true,
            };
          }
        }
      }
    }

    // Check for secret values (stubbed)
    if (action.type === 'DOM_FILL') {
      const value = action.value;
      if (value.includes('SECRET.') || value.includes('PASSWORD') || value.includes('API_KEY')) {
        return {
          allowed: false,
          reason: 'Secrets should not be sent to LLM. Use SECRET.username references.',
          requiresConfirmation: false,
        };
      }
    }

    // All other actions are allowed
    return {
      allowed: true,
      requiresConfirmation: false,
    };
  }

  /**
   * Check if URL is in allowed domains
   */
  isDomainAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      for (const allowedDomain of config.guardrails.allowedDomains) {
        if (hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

