/**
 * Shared types between UI and orchestrator
 */

export interface Region {
  id: string;
  label: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  confidence: number;
}

export interface StepLog {
  step: number;
  phase: 'OBSERVE' | 'DECIDE' | 'ACT' | 'VERIFY' | 'NAVIGATE' | 'PLANNING' | 'SYNTHESIS';
  message: string;
  timestamp: string;
  error?: string;
}

export interface ScreenshotUpdate {
  sessionId: string;
  step: number;
  screenshotPath: string;
  observation?: string;
  regions?: Region[];
}

export interface TaskRequest {
  task: string;
  sessionId?: string;
}

export interface TaskResponse {
  sessionId: string;
  status: 'started' | 'running' | 'paused' | 'completed' | 'error';
  message?: string;
}

export interface UserConfirmation {
  sessionId: string;
  approved: boolean;
  actionId?: string;
}

export interface WebSocketMessage {
  type: 'screenshot' | 'log' | 'confirmation' | 'status' | 'error';
  data: ScreenshotUpdate | StepLog | UserConfirmation | TaskResponse | { message: string };
}

