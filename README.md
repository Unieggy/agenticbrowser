# Agentic Browser

A local-first browser automation system with an agentic loop, vision-based region detection, and DOM fallback capabilities.

## Architecture

- **UI**: Web-based interface (Vite + TypeScript) that communicates via WebSocket
- **Orchestrator**: Node.js server that controls Playwright, runs the agent loop, and manages state
- **Agent Loop**: OBSERVE → DECIDE → ACT → VERIFY

## Features

- **Works without LLM**: Uses DOM-based region detection and rule-based decision making
- Vision mode: Agent selects from detected regions on screenshots (DOM-based, no vision model needed)
- DOM fallback mode: Uses Playwright role/name selectors
- WebSocket streaming of screenshots and step logs
- SQLite logging of all sessions and steps
- Guardrails for domain allowlisting and risky action confirmation
- **Ready for LLM integration**: Stub implementations can be swapped for real LLM/vision models when needed

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright Chromium:**
   ```bash
   npm run playwright:install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run development servers:**
   ```bash
   npm run dev
   ```

   This starts:
   - Orchestrator on port 3001 (HTTP + WebSocket at /ws)
   - UI dev server on port 5173 (Vite default)

5. **Open the UI:**
   Navigate to `http://localhost:5173` in your browser.

## Usage

**Note**: The current implementation works **without any LLM or API keys**. It uses:
- DOM-based region detection (finds links/buttons via Playwright)
- Simple rule-based task matching (e.g., "click first link" → clicks first link)

1. Enter a task in the UI (e.g., "Click the first link on the page")
2. Click "Start Task"
3. Watch the agent loop execute:
   - Screenshots stream to the UI
   - Step logs appear in real-time
   - If confirmation is needed, the "Needs you" panel will appear

**Example tasks that work:**
- "Click the first link on the page"
- "Click [button text]" (if button text matches)
- The agent will attempt to match your task text with detected elements

## Project Structure

```
agentic-browser/
├── apps/
│   ├── ui/              # Web UI (Vite + TypeScript)
│   └── orchestrator/    # Node.js orchestrator
│       └── src/
│           ├── browser/ # Playwright integration
│           ├── vision/  # Region detection
│           ├── agent/   # Agent controller
│           ├── policy/  # Guardrails
│           ├── verify/  # Action verification
│           └── storage/ # SQLite logging
├── data/               # SQLite database
└── artifacts/          # Screenshots and traces
```

## Next Milestones

1. **Real Vision Parsing**
   - Integrate GPT-4 Vision or Claude Vision API
   - Implement proper region detection from screenshots
   - Add confidence scoring and region filtering

2. **Real LLM Decision Making**
   - Replace rule-based controller with LLM tool-calling
   - Implement proper prompt engineering for browser tasks
   - Add context window management for long sessions

3. **Enhanced Region Detection**
   - Multi-modal understanding (text + visual)
   - Hierarchical region grouping
   - Dynamic region updates as page changes

4. **Advanced Verification**
   - State comparison between steps
   - Success/failure detection
   - Automatic retry logic

5. **User Interaction**
   - MFA handling
   - User confirmation workflows
   - Secret management integration

6. **Performance & Reliability**
   - Screenshot compression/optimization
   - Session persistence and recovery
   - Error handling and graceful degradation

