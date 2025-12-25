/**
 * SQLite database for logging sessions and steps
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import { config } from '../config.js';

export interface SessionRow {
  id: string;
  task: string;
  start_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StepRow {
  id: number;
  session_id: string;
  step_number: number;
  phase: string;
  action_type?: string;
  action_data?: string;
  observation?: string;
  screenshot_path?: string;
  error?: string;
  created_at: string;
}

export interface ArtifactRow {
  id: number;
  session_id: string;
  step_number: number;
  file_path: string;
  file_type: string;
  created_at: string;
}

export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const dbDir = dirname(config.storage.dbPath);
    mkdirSync(dbDir, { recursive: true });

    this.db = new Database(config.storage.dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        start_url TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Steps table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        phase TEXT NOT NULL,
        action_type TEXT,
        action_data TEXT,
        observation TEXT,
        screenshot_path TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Artifacts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_steps_session ON steps(session_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id);
    `);
  }

  createSession(sessionId: string, task: string, startUrl: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, task, start_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(sessionId, task, startUrl, 'running', now, now);
  }

  updateSessionStatus(sessionId: string, status: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(status, now, sessionId);
  }

  insertStep(
    sessionId: string,
    stepNumber: number,
    phase: string,
    actionType?: string,
    actionData?: any,
    observation?: string,
    screenshotPath?: string,
    error?: string
  ): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO steps (
        session_id, step_number, phase, action_type, action_data,
        observation, screenshot_path, error, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      sessionId,
      stepNumber,
      phase,
      actionType,
      actionData ? JSON.stringify(actionData) : null,
      observation,
      screenshotPath,
      error,
      now
    );
  }

  insertArtifact(
    sessionId: string,
    stepNumber: number,
    filePath: string,
    fileType: string
  ): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO artifacts (session_id, step_number, file_path, file_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(sessionId, stepNumber, filePath, fileType, now);
  }

  getSession(sessionId: string): SessionRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(sessionId) as SessionRow | undefined;
  }

  getSteps(sessionId: string): StepRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM steps WHERE session_id = ? ORDER BY step_number ASC
    `);
    return stmt.all(sessionId) as StepRow[];
  }

  close(): void {
    this.db.close();
  }
}

