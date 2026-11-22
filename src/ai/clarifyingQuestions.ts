import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { anthropic, baseRequest } from "./client";

const Phrasing = z.object({ questions: z.array(z.object({ id: z.string(), text: z.string() })) });

/**
 * Rephrases the engine's open questions in friendly natural language, tailored to
 * the business. The engine decides WHICH questions to ask and maps answers back to
 * typed fields; the model only words them. No salary data is sent.
 */
export async function phraseQuestions(input: {
  locale: "he" | "en";
  vertical: string;
  goal: string;
  questions: { id: string; text: string }[];
}): Promise<Record<string, string>> {
  const response = await anthropic().beta.messages.parse({
    ...baseRequest(),
    output_config: { effort: "low", format: betaZodOutputFormat(Phrasing) },
    system: `You help a small-business owner answer a short efficiency questionnaire. Rewrite each question so it is clear, friendly and short (one sentence, max 25 words), in ${input.locale === "he" ? "Hebrew" : "English"}. Keep the meaning and the id of each question exactly. Briefly say why it matters only if that fits in the sentence. Do not add numbers, advice or new questions. Industry: ${input.vertical}.`,
    messages: [
      {
        role: "user",
        content: `Owner's goal: ${input.goal || "(not given)"}\n\nQuestions (JSON):\n${JSON.stringify(input.questions)}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return {};
  const ids = new Set(input.questions.map((q) => q.id));
  return Object.fromEntries(response.parsed_output.questions.filter((q) => ids.has(q.id)).map((q) => [q.id, q.text.slice(0, 300)]));
}
