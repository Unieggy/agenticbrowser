import {config} from '../config.js';
import { PlanSchema } from './schemas.js';
function heuristicPlan(task: string): string[] {
  const normalized = task
    .replace(/\band then\b/gi, ' then ')
    .replace(/\bthen\b/gi, ' then ')
    .replace(/[.;]+/g, ' then ')
    .trim();

  const parts = normalized
    .split(/\bthen\b|,|\n/gi)
    .map(s => s.trim())
    .filter(Boolean);

  // Raw steps (no tags yet)
  const raw = parts.length > 0 ? parts.slice(0, 6) : [task];
  return enforceTags(task, raw);
}
function enforceTags(task: string, plan: string[]): string[] {
  const needsLogin = /sign\s*in|log\s*in|login/i.test(task.toLowerCase());

  // Tag every step if missing
  const tagged = plan.map(s => {
    const x = s.trim();
    if (x.startsWith('[HUMAN]') || x.startsWith('[AGENT]')) return x;
    return `[AGENT] ${x}`;
  });

  // Ensure human login step exists if needed
  const hasHumanLogin = tagged.some(
    s => s.startsWith('[HUMAN]') && /sign\s*in|log\s*in|login|mfa|otp|2fa/i.test(s)
  );

  if (needsLogin && !hasHumanLogin) {
    return ['[HUMAN] Sign in', ...tagged].slice(0, 6);
  }

  return tagged.slice(0, 6);
}

export async function planTaskWithGemini(task: string): Promise<string[]> {
  const apiKey = config.llm?.geminiApiKey;
  if (!apiKey) return heuristicPlan(task);

  const prompt = `
You are a PLANNER for a local-first browser agent.

Your job: break the user task into a short list of browser objectives.
You do NOT execute actions. You only output a plan.

User task:
${task}

OUTPUT FORMAT (STRICT):
Return ONLY valid JSON:
{ "plan": string[] }

HARD RULES:
- Every step MUST start with "[HUMAN]" or "[AGENT]" (exact casing).
- Max 6 steps. Min 1 step.
- Steps must be short objectives, not long explanations.
- NEVER ask for credentials. NEVER include passwords/OTP/payment details.
- If task includes sign-in/login/MFA/OTP/2FA, step 1 MUST be exactly:
  "[HUMAN] Sign in and complete any MFA prompts"

AGENT STEP STYLE:
- Must be executable on a normal webpage using: click / fill / press Enter / wait.
- Use concrete goals like:
  "[AGENT] Search Google for: cat images"
  "[AGENT] Open Google Images results"
  "[AGENT] Click Images tab"
  "[AGENT] Open first image result"

GOOD EXAMPLES:
{ "plan": ["[HUMAN] Sign in and complete any MFA prompts", "[AGENT] Search Google for: cat images", "[AGENT] Open Google Images results"] }

BAD EXAMPLES (do NOT do these):
- "Sign me in"
- "Provide your email"
- "Log into the account using credentials"
- "Search for cats" (missing platform and missing tag)

Now output the JSON plan.
`.trim();




  try {
    const model = 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      return heuristicPlan(task);
    }

    const json = (await res.json()) as any;
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return heuristicPlan(task);

    // Extract first JSON object
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return heuristicPlan(task);

    const parsed = JSON.parse(text.slice(start, end + 1));
    const validated = PlanSchema.safeParse(parsed);
    if (!validated.success) return heuristicPlan(task);
    const plan = enforceTags(task, validated.data.plan);
    return plan;
  } catch {
    return heuristicPlan(task);
  }
}

