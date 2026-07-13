// Story-text LLM lane. Now backed by the OpenAI Responses API (lib/openai.ts);
// previously the Anthropic Messages API. Requires OPENAI_API_KEY in env.
// Model overridable via STORY_MODEL (default gpt-5.6-sol — newest, 2026-07).

import { llmText, openaiConfigured } from "./openai";

export function llmConfigured(): boolean {
  return openaiConfigured();
}

export { llmText };

/** @deprecated legacy name from the Anthropic era — same function as llmText. */
export const claude = llmText;

/** Extract and parse the first JSON object from an LLM reply. */
export function parseJsonBlock<T>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model reply");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
