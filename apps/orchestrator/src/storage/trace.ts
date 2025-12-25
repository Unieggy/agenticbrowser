/**
 * Trace management for artifacts
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { config } from '../config.js';
import { DatabaseManager } from './db.js';

export class TraceManager {
  constructor(private db: DatabaseManager) {
    // Ensure artifacts directory exists
    mkdirSync(config.storage.artifactsDir, { recursive: true });
  }

  getSessionArtifactsDir(sessionId: string): string {
    const dir = join(config.storage.artifactsDir, sessionId);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  saveScreenshot(sessionId: string, stepNumber: number, buffer: Buffer): string {
    const artifactsDir = this.getSessionArtifactsDir(sessionId);
    const filename = `step-${stepNumber.toString().padStart(4, '0')}.png`;
    const filePath = join(artifactsDir, filename);
    
    writeFileSync(filePath, buffer);
    
    // Record in database
    const relativePath = `artifacts/${sessionId}/${filename}`;
    this.db.insertArtifact(sessionId, stepNumber, relativePath, 'screenshot');
    
    return relativePath;
  }

  saveTrace(sessionId: string, stepNumber: number, data: any): string {
    const artifactsDir = this.getSessionArtifactsDir(sessionId);
    const filename = `step-${stepNumber.toString().padStart(4, '0')}-trace.json`;
    const filePath = join(artifactsDir, filename);
    
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Record in database
    const relativePath = `artifacts/${sessionId}/${filename}`;
    this.db.insertArtifact(sessionId, stepNumber, relativePath, 'trace');
    
    return relativePath;
  }
}

