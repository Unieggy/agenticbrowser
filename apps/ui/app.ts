/**
 * Main UI application logic
 */

import { OrchestratorAPI } from './api.js';
import type { WebSocketMessage, ScreenshotUpdate, StepLog, UserConfirmation } from './types.js';
import { initLiquidBackground } from './liquidbg';

// UI Elements
const taskInput = document.getElementById('taskInput') as HTMLTextAreaElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const screenshotImg = document.getElementById('screenshotImg') as HTMLImageElement;
const screenshotPlaceholder = document.getElementById('screenshotPlaceholder') as HTMLDivElement;
const stepLog = document.getElementById('stepLog') as HTMLDivElement;
const needsYouPanel = document.getElementById('needsYouPanel') as HTMLElement;
const needsYouMessage = document.getElementById('needsYouMessage') as HTMLParagraphElement;
const confirmBtn = document.getElementById('confirmBtn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
const logToggle = document.getElementById('logToggle') as HTMLButtonElement;
const logContainer = document.getElementById('logContainer') as HTMLDivElement;
const needsYouBackdrop = document.getElementById('needsYouBackdrop') as HTMLDivElement;

// State
let api: OrchestratorAPI | null = null;
let currentSessionId: string | null = null;
let pendingConfirmation: { sessionId: string; actionId?: string } | null = null;
let logVisible = true;

// Initialize
function init() {
  const wsUrl = `ws://localhost:3001/ws`;
  initLiquidBackground();
  api = new OrchestratorAPI(
    wsUrl,
    handleMessage,
    (error) => {
      addLogEntry('error', `Connection error: ${error.message}`);
    },
    () => {
      addLogEntry('observe', 'Connected to orchestrator');
    },
    () => {
      addLogEntry('error', 'Disconnected from orchestrator');
    }
  );

  // Connect on load
  api.connect().catch((error) => {
    addLogEntry('error', `Failed to connect: ${error.message}`);
  });

  // Event listeners
  startBtn.addEventListener('click', handleStart);
  stopBtn.addEventListener('click', handleStop);
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  
  // Log toggle — slides neural log panel
  logToggle.addEventListener('click', () => {
    logVisible = !logVisible;
    logContainer.classList.toggle('hidden-log', !logVisible);
  });
}

function handleMessage(message: WebSocketMessage): void {
  switch (message.type) {
    case 'screenshot':
      handleScreenshot(message.data as ScreenshotUpdate);
      break;
    case 'log':
      handleLog(message.data as StepLog);
      break;
    case 'status':
      handleStatus(message.data as any);
      break;
    case 'error':
      addLogEntry('error', (message.data as any).message || 'Unknown error');
      break;
  }
}

function handleScreenshot(update: ScreenshotUpdate): void {
  currentSessionId = update.sessionId;
  
  // Update screenshot image
  // In production, you'd serve this via the orchestrator's HTTP server
  // For now, we'll use a data URL or fetch from the orchestrator
  const screenshotUrl = `http://localhost:3001/${update.screenshotPath}`;
  screenshotImg.src = screenshotUrl;
  screenshotImg.onload = () => {
    screenshotImg.classList.add('loaded');
    screenshotPlaceholder.style.display = 'none';
  };
  screenshotImg.onerror = () => {
    screenshotPlaceholder.textContent = 'Failed to load screenshot';
  };

  // Add observation log if available
  if (update.observation) {
    addLogEntry('observe', update.observation);
  }
}

function handleLog(log: StepLog): void {
  addLogEntry(log.phase.toLowerCase() as any, log.message, log.error);
}


function handleStatus(status: any): void {
  if (status.sessionId) {
    currentSessionId = status.sessionId;
  }

  addLogEntry('observe', status.message || 'Status update');

  // If orchestrator paused due to confirmation, show Needs You panel
  if (status.status === 'paused' && currentSessionId) {
    pendingConfirmation = {
      sessionId: currentSessionId,
      actionId: status.pendingAction?.actionId,
    };

    //show a clearer message depending on pauseKind
    if(status.pauseKind==='ASK_USER'){
      needsYouMessage.textContent = status.message || 'Please complete the required step in the browser';
    }
    else if(status.pauseKind==='CONFIRM'){
      needsYouMessage.textContent = status.message || 'Please confirm to continue';
    }else{
      needsYouMessage.textContent = status.message || 'Paused. Click continue to proceed.';
    }
    needsYouPanel.style.display = 'block';
    needsYouBackdrop.style.display = 'block';
  }

  // If task ended, re-enable UI controls
  if (status.status === 'stopped') {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    taskInput.disabled = false;
  } else if (status.status === 'completed' || status.status === 'error') {
    // Keep stop button enabled so user can close browser when done viewing
    startBtn.disabled = false;
    stopBtn.disabled = false;
    taskInput.disabled = false;
  }
}


function handleStart(): void {
  const task = taskInput.value.trim();
  if (!task) {
    alert('Please enter a task');
    return;
  }

  if (!api || !api.isConnected()) {
    alert('Not connected to orchestrator');
    return;
  }

  try {
    api.sendTask(task, currentSessionId || undefined);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    taskInput.disabled = true;
    addLogEntry('observe', `Starting task: ${task}`);
  } catch (error) {
    alert(`Failed to send task: ${error}`);
  }
}

function handleStop(): void {
  if (!api || !api.isConnected()) {
    return;
  }

  if (currentSessionId) {
    try {
      api.stopTask(currentSessionId);
      addLogEntry('observe', 'Task stopped');
    } catch (error) {
      console.error('Failed to stop task:', error);
    }
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  taskInput.disabled = false;
  currentSessionId = null;
}

function handleConfirm(): void {
  if (!api || !pendingConfirmation) return;

  try {
    api.sendConfirmation(
      pendingConfirmation.sessionId,
      true,
      pendingConfirmation.actionId
    );

    needsYouPanel.style.display = 'none';
    needsYouBackdrop.style.display = 'none';
    pendingConfirmation = null;
  } catch (error) {
    console.error('Failed to send confirmation:', error);
  }
}

function handleCancel(): void {
  if (!api || !pendingConfirmation) return;

  try {
    api.sendConfirmation(
      pendingConfirmation.sessionId,
      false,
      pendingConfirmation.actionId
    );
    needsYouPanel.style.display = 'none';
    needsYouBackdrop.style.display = 'none';
    pendingConfirmation = null;
  } catch (error) {
    console.error('Failed to send cancellation:', error);
  }
}

function addLogEntry(phase: string, message: string, error?: string): void {
  const entry = document.createElement('div');
  entry.className = `log-entry ${phase}`;

  const timestamp = new Date().toLocaleTimeString();
  const timestampEl = document.createElement('span');
  timestampEl.className = 'log-timestamp';
  timestampEl.textContent = timestamp;

  const messageEl = document.createElement('span');
  messageEl.className = 'log-message';

  // Synthesis results get special rendering with pre-wrap for formatting
  if (phase === 'synthesis' && message.startsWith('RESEARCH FINDINGS:')) {
    messageEl.textContent = message;
  } else {
    messageEl.textContent = error ? `${message}: ${error}` : message;
  }

  entry.appendChild(timestampEl);
  entry.appendChild(messageEl);

  stepLog.appendChild(entry);
  stepLog.scrollTop = stepLog.scrollHeight;
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

