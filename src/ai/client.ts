import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5-5";

/** Natural-language features are optional; the app works fully without them. */
export function aiEnabled(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/**
 * Shared request options: low effort (simple extraction), and server-side refusal
 * fallbacks so a classifier decline is retried on a fallback model automatically.
 */
export function baseRequest() {
  return {
    model: AI_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
    fallbacks: "default" as const,
  };
}

export function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "rate_limited";
  if (e instanceof Anthropic.AuthenticationError) return "ai_auth";
  if (e instanceof Anthropic.APIError) return `ai_error_${e.status ?? "unknown"}`;
  return "ai_unavailable";
}
