# The Story of Uniq

## About the Project

It started with a video. I watched OpenAI demo their "Atlas" agent navigating the web like a human would. Clicking through pages, filling forms, researching topics. It felt like magic. And I thought: *I want to build that myself.*

Not a wrapper around an API. Not a simple script. A real agent that can reason, plan, and act.

The original plan was to use GPT-4 as the brain. But then I stumbled upon the Gemini Hackathon with its "No Limits" theme. I had been curious about Gemini 2.5 Flash for a while. Could it handle the speed and reasoning demands of real-time browser automation? There was only one way to find out.

So I pivoted. The brain would be Gemini.

The goal was ambitious but clear: build an agent that does not just click buttons. It should **research**. It should **read**. It should scroll through articles, visit multiple sources, and synthesize information like a human researcher would.

The architecture is an Orchestrator-Worker pattern. A central Node.js orchestrator maintains session state, manages the browser via Playwright, and coordinates the agent loop. The agent follows a classic cognitive cycle:

$$
A(s_t) = \text{argmax}_a \; P(\text{success} \mid s_t, a, \pi_\theta)
$$

Where $s_t$ is the current page state (DOM regions, URL, screenshot), $a$ is a candidate action (click, type, scroll), and $\pi_\theta$ represents the Gemini-powered policy that scores actions based on the current objective.

In practice, this manifests as a four-phase loop: **OBSERVE** the page, **DECIDE** the next action, **ACT** on the browser, and **VERIFY** the result.

---

## How I Built It

The stack is TypeScript end-to-end. The orchestrator runs on Node.js with Playwright controlling a headless (or headed) Chromium browser. The frontend is a Vite-powered UI with WebSocket streaming so you can watch the agent work in real time.

The key insight was separating *planning* from *execution*. When a user submits a task like "Find the best 4K monitor under $500", the first thing the system does is call Gemini to generate a multi-step plan:

1. Navigate to Google
2. Search for "best 4K monitor under $500 reviews"
3. Visit rtings.com and scroll to read the full article
4. Navigate back and visit reddit.com/r/monitors
5. Synthesize findings

Each step becomes an "objective" that the agent pursues until completion, then moves to the next.

The DOM is scanned for interactive regions (buttons, links, input fields) using Playwright's accessibility tree. These regions are passed to Gemini along with a screenshot and the current objective. Gemini returns a structured action (click region 7, type "mechanical keyboard", scroll down). The action is executed and verified.

SQLite logs every session, every step, every decision. If something goes wrong, you can trace exactly what the agent saw and why it made that choice.

---

## The Challenges

Two bugs nearly broke me.

### The Zombie Page

The first was what I started calling the "Zombie Page" bug. Sometimes the agent would click a link that opened a new tab. The browser would dutifully open that tab. But the agent? It kept operating on the original page. A ghost page. A zombie.

The agent would take screenshots of a blank or stale page. It would try to click elements that did not exist anymore. The logs would show actions being taken, but nothing would change. I spent hours staring at console output, wondering why the agent had gone insane.

The fix was embarrassingly simple once I found it. In the main loop, before every iteration, I now grab the newest page:

```typescript
const allPages = session.browser.getAllPages();
const activePage = allPages[allPages.length - 1];
session.browser.setPage(activePage);
session.domTools.setPage(activePage);
session.screenshotManager = new ScreenshotManager(activePage);
await activePage.bringToFront();
```

Always track the newest tab. Always update all the references. Never let the agent operate on a zombie.

### The Lazy Agent

The second bug was more insidious. I called it the "Lazy Agent" problem.

When I asked the agent to research a topic, it would dutifully go to Google, type the query, and see the search results. Then it would declare: "Objective complete."

No. That is not research. That is a Google search. Research means clicking through to actual articles. Reading them. Scrolling down. Visiting multiple sources. Comparing information.

The agent was being lazy. It found the path of least resistance and stopped.

The fix was pure prompt engineering. In the planner prompt, I added explicit classification:

> **TYPE B — Deep Research**: These REQUIRE visiting multiple distinct pages. A Google Search results page is NEVER the final answer for research tasks. You MUST include explicit steps to scroll down on each page to read full content.

I also added a "mental simulation" requirement where Gemini has to "walk through" the website in its head before generating steps. Predict what tools the site uses. Anticipate gotchas. This forces the model to actually think instead of pattern-matching to the simplest solution.

There was also a race condition in waiting for page stability. After an action, how do you know the page is ready? I used `Promise.race` to compete between a navigation event and network idle:

```typescript
await Promise.race([
  this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: timeoutMs }),
  this.page.waitForLoadState('networkidle', { timeout: timeoutMs }),
]);
```

Whichever comes first, we proceed. This handles both single-page apps that never "navigate" and traditional pages that do.

---

## What I Learned

Building this taught me things I could not have learned from tutorials.

**Latency is the enemy of agency.** When Gemini takes 2 seconds to respond, the agent feels sluggish. When it takes 200ms, the agent feels alive. Gemini 2.5 Flash delivered on speed in a way that made the whole system feel responsive. This matters more than I expected. An agent that thinks too slowly stops feeling like an agent.

**LLMs are lazy by default.** They will find the shortest path to something that looks like success. If you want thorough behavior, you have to demand it explicitly. You have to close every loophole in the prompt. "Research" means nothing to a model. "Visit at least 3 distinct sources and scroll to read full content" means something.

**State management is everything.** The browser is stateful. Tabs open and close. Pages navigate. Elements appear and disappear. The agent must constantly re-observe its environment. The moment it relies on stale state, it becomes a zombie operating on ghosts.

**The 80/20 rule is real.** Getting the basic loop working took 20% of the time. Handling edge cases (new tabs, lazy completions, network timeouts, authentication flows) took the other 80%. The demos always look easy. The production code never is.

I am proud of what this became. An agent that can actually research. That can scroll through articles and visit multiple sources. That knows when to ask for human help and when to proceed on its own.

It is not Atlas. But it is mine. And it works.

---

*Built with Gemini 2.5 Flash, Playwright, TypeScript, and too much coffee.*
