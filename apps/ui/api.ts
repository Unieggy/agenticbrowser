/**
 * WebSocket API client for communicating with orchestrator
 */

import type { WebSocketMessage, TaskRequest, TaskResponse, UserConfirmation } from './types.js';

export class OrchestratorAPI {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(
    private wsUrl: string,
    private onMessage: (message: WebSocketMessage) => void,
    private onError?: (error: Error) => void,
    private onOpen?: () => void,
    private onClose?: () => void
  ) {
    // wsUrl should be like 'ws://localhost:3001/ws'
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          if (this.onOpen) this.onOpen();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.onMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          const err = new Error('WebSocket error');
          if (this.onError) this.onError(err);
          reject(err);
        };

        this.ws.onclose = () => {
          if (this.onClose) this.onClose();
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);
  }

  sendTask(task: string, sessionId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const request: TaskRequest = { task, sessionId };
    this.ws.send(JSON.stringify({ type: 'task', data: request }));
  }

  sendConfirmation(sessionId: string, approved: boolean, actionId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const confirmation: UserConfirmation = {
      sessionId,
      approved,
      actionId,
    };
    this.ws.send(JSON.stringify({ type: 'confirmation', data: confirmation }));
  }

  stopTask(sessionId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({ type: 'stop', data: { sessionId } }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

