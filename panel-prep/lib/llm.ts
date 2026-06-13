// Minimal Anthropic Messages API client (plain fetch — no SDK dependency).
// Requires ANTHROPIC_API_KEY in env. Model overridable via STORY_MODEL.

const API_URL = "https://api.anthropic.com/v1/messages";

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function claude(opts: {
  system?: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY isn't set in Vercel env vars yet — add it to enable story generation.",
    );
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || process.env.STORY_MODEL || "claude-sonnet-4-6",
      max_tokens: opts.maxTokens ?? 3000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Anthropic API returned no text");
  return text;
}

/** Extract and parse the first JSON object from an LLM reply. */
export function parseJsonBlock<T>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model reply");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
