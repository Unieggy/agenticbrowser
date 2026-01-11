/**
 * DOM manipulation tools using Playwright selectors
 */

import { Page } from 'playwright';
import type { Region } from '../shared/types.js';

export interface DOMElement {
  selector: string;
  text?: string;
  role?: string;
  name?: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export class DOMTools {
  constructor(private page: Page) {}

  /**
   * Find clickable elements (links, buttons) and return as regions
   */
  async findClickableRegions(): Promise<Region[]> {
    const regions: Region[] = [];
    
    // Find all links
    const links = await this.page.locator('a[href]').all();
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const bbox = await link.boundingBox();
      if (bbox) {
        const text = await link.textContent() || '';
        regions.push({
          id: `link-${i}`,
          label: text.trim() || `Link ${i + 1}`,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            w: bbox.width,
            h: bbox.height,
          },
          confidence: 0.8,
        });
      }
    }

    // Find all buttons
    const buttons = await this.page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const bbox = await button.boundingBox();
      if (bbox) {
        const text = await button.textContent() || '';
        regions.push({
          id: `button-${i}`,
          label: text.trim() || `Button ${i + 1}`,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            w: bbox.width,
            h: bbox.height,
          },
          confidence: 0.8,
        });
      }
    }

    // Find clickable elements with role
    const clickables = await this.page.locator('[role="button"], [role="link"]').all();
    for (let i = 0; i < clickables.length; i++) {
      const clickable = clickables[i];
      const bbox = await clickable.boundingBox();
      if (bbox) {
        const text = await clickable.textContent() || '';
        const role = await clickable.getAttribute('role') || '';
        regions.push({
          id: `role-${role}-${i}`,
          label: text.trim() || `${role} ${i + 1}`,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            w: bbox.width,
            h: bbox.height,
          },
          confidence: 0.7,
        });
      }
    }

    return regions;
  }

  /**
   * Find input fields
   */
  async findInputFields(): Promise<Region[]> {
    const regions: Region[] = [];
    const inputs = await this.page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all();
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const bbox = await input.boundingBox();
      if (bbox) {
        const placeholder = await input.getAttribute('placeholder') || '';
        const name = await input.getAttribute('name') || '';
        const label = placeholder || name || `Input ${i + 1}`;
        
        regions.push({
          id: `input-${i}`,
          label,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            w: bbox.width,
            h: bbox.height,
          },
          confidence: 0.8,
        });
      }
    }

    return regions;
  }

  /**
   * Click by region ID (DOM fallback)
   */
  async clickByRegionId(regionId: string): Promise<void> {
    const [type, index] = regionId.split('-');
    
    if (type === 'link') {
      const links = await this.page.locator('a[href]').all();
      const idx = parseInt(index, 10);
      if (links[idx]) {
        await links[idx].click();
      } else {
        throw new Error(`Link region ${regionId} not found`);
      }
    } else if (type === 'button') {
      const buttons = await this.page.locator('button').all();
      const idx = parseInt(index, 10);
      if (buttons[idx]) {
        await buttons[idx].click();
      } else {
        throw new Error(`Button region ${regionId} not found`);
      }
    } else if (type === 'role') {
      const parts = regionId.split('-');
      const role = parts[1];
      const idx = parseInt(parts[2], 10);
      const clickables = await this.page.locator(`[role="${role}"]`).all();
      if (clickables[idx]) {
        await clickables[idx].click();
      } else {
        throw new Error(`Role region ${regionId} not found`);
      }
    } else {
      throw new Error(`Unknown region type: ${type}`);
    }
  }

  /**
   * Click by role and name (Playwright best practice)
   */
  async clickByRole(role: 'button' | 'link' | 'textbox' | 'checkbox' | 'radio', name: string): Promise<void> {
    await this.page.getByRole(role, { name }).click();
  }

  /**
   * Fill input by role and name
   */
  async fillByRole(role: 'textbox', name: string, value: string): Promise<void> {
    await this.page.getByRole(role, { name }).fill(value);
  }

  /**
   * Fill input by region ID
   */
  async fillByRegionId(regionId: string, value: string): Promise<void> {
    const [type, index] = regionId.split('-');
    
    if (type === 'input') {
      const inputs = await this.page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all();
      const idx = parseInt(index, 10);
      if (inputs[idx]) {
        await inputs[idx].fill(value);
      } else {
        throw new Error(`Input region ${regionId} not found`);
      }
    } else {
      throw new Error(`Cannot fill region type: ${type}`);
    }
  }

  /**
   * Get page text content for observation
   */
  async getPageText(): Promise<string> {
    return await this.page.textContent('body') || '';
  }

  getUrl(): string {
    return this.page.url();
  }

  async clickSelector(selector: string): Promise<void> {
    await this.page.click(selector);
  }

    /**
   * Fill using a CSS selector string.
   * Useful when an action comes in as selector-based DOM_FILL.
   */
  async fillSelector(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }
    /**
   * Wait for the page to reach a certain load state.
   */
  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void> {
    await this.page.waitForLoadState(state);
  }


}

