# Agentic Browser

An intelligent browser automation system with LLM-powered planning, vision-based region detection, and real-time WebSocket streaming.

## Architecture

- **UI**: Web-based interface (Vite + TypeScript) with glassmorphism design and animated WebGL background
- **Orchestrator**: Node.js server that controls Playwright, runs the agent loop, and manages state
- **Agent Loop**: OBSERVE → DECIDE → ACT → VERIFY
- **LLM Integration**: Gemini 2.5 Flash for intelligent task planning and decision-making

## Features

- **LLM-Powered Planning**: Uses Gemini API for intelligent task decomposition and step-by-step planning
- **Deep Research Mode**: Multi-page research with scrolling, source visits, and information synthesis
- **Visual Click Actions**: Human-like cursor physics for natural interactions
- **DOM-Based Region Detection**: Finds all interactive elements (buttons, links, inputs)
- **DOM Fallback Mode**: Uses Playwright role/name selectors when region IDs become stale
- **Real-Time Streaming**: WebSocket streaming of screenshots and step logs
- **Persistent Logging**: SQLite database for sessions, steps, actions, and observations
- **DB-Backed Memory**: Short-term history for agent context awareness
- **Safety Guardrails**: Domain allowlisting, sensitive field protection, and risky action confirmation
- **User Confirmation Flows**: ASK_USER (manual action needed) and CONFIRM (permission required) pause types
- **Zombie Page Fix**: Tracks newest tab and handles pop-ups gracefully
- **Heuristic Fallback**: Works without API keys using rule-based decision making

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

   Key environment variables:
   ```
   GEMINI_API_KEY=your_key_here   # Optional but recommended for full LLM power
   START_URL=https://www.google.com/
   ALLOWED_DOMAINS=example.com,localhost,google.com
   BROWSER_HEADLESS=false
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

1. Enter a task in the UI (e.g., "Search for best 4K monitors under $500")
2. Click "Execute" to start
3. Watch the agent loop execute:
   - Screenshots stream to the UI in real-time
   - Neural log shows every step and decision
   - If confirmation is needed, a modal will appear

**Example tasks:**
- "Click the first link on the page"
- "Search for 'ChatGPT' on Google"
- "Find and compare prices on Amazon"
- "Navigate to [URL] and look for [content]"
- "Research the latest news about [topic]" (deep research mode)

**User Confirmation:**
- **ASK_USER**: Requires manual action (e.g., MFA, CAPTCHA, payment)
- **CONFIRM**: Asks permission before risky actions (submit, delete, pay)

## Project Structure

```
agentic-browser/
├── apps/
│   ├── ui/                    # Web UI (Vite + TypeScript)
│   │   ├── app.ts            # Main UI app logic
│   │   ├── api.ts            # WebSocket client
│   │   ├── liquidbg.ts       # WebGL animated background
│   │   └── styles.css        # Glassmorphism styles
│   └── orchestrator/          # Node.js orchestrator
│       └── src/
│           ├── index.ts      # Main entry, orchestrator class
│           ├── server.ts     # HTTP + WebSocket server
│           ├── config.ts     # Environment configuration
│           ├── browser/      # Playwright integration
│           │   ├── playwright.ts  # Browser controller
│           │   ├── screenshot.ts  # Screenshot capture
│           │   └── domTools.ts    # DOM scanning
│           ├── agent/        # Agent loop
│           │   ├── controller.ts  # OBSERVE/DECIDE/ACT/VERIFY
│           │   ├── planner.ts     # Gemini-based task planning
│           │   └── schemas.ts     # Zod action schemas
│           ├── vision/       # Region detection
│           ├── policy/       # Guardrails
│           ├── verify/       # Action verification
│           └── storage/      # SQLite logging + traces
├── data/                      # SQLite database
└── artifacts/                 # Screenshots and traces
```

## Available Scripts

- `npm run dev` - Start dev servers (orchestrator + UI)
- `npm run dev:orchestrator` - Orchestrator only (port 3001)
- `npm run dev:ui` - UI dev server only (port 5173)
- `npm run build` - Build both apps
- `npm run playwright:install` - Download Chromium browser

## Completed Features

- [x] LLM-powered task planning (Gemini 2.5 Flash)
- [x] Deep research mode with multi-page navigation
- [x] Visual click with human-like cursor physics
- [x] DB-backed short-term memory
- [x] Zombie page fix (multi-tab handling)
- [x] User confirmation workflows (ASK_USER, CONFIRM)
- [x] Glassmorphism UI with WebGL background

## Next Milestones

1. **Vision Model Integration**
   - Integrate GPT-4 Vision or Claude Vision API
   - Screenshot-based region detection
   - Confidence scoring and filtering

2. **Enhanced Region Detection**
   - Multi-modal understanding (text + visual)
   - Hierarchical region grouping
   - Dynamic region updates

3. **Performance & Reliability**
   - Screenshot compression/optimization
   - Session persistence and recovery
   - Error handling and graceful degradation
