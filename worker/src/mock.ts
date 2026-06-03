/**
 * Mock AI responses for local dev when no API keys are configured.
 *
 * Returns plausible-looking structured responses so the UI is fully
 * exercisable. Real responses come from Groq/OpenRouter once the user
 * sets secrets in the Worker.
 */

import type { ParsedCheck, ParsedExplain } from "./parse";

export function mockCheck(answer: string, question: string): ParsedCheck {
  const a = answer.trim();
  const q = question.toLowerCase();
  if (a.length === 0) {
    return {
      verdict: "partial",
      feedback:
        "You didn't write an answer yet. Try again once you've thought it through.",
    };
  }
  // Very loose "correctness" heuristic for demo: if the answer mentions
  // numbers or units, treat it as partial; otherwise plausible.
  const hasNumeric = /\d/.test(a);
  const asksForCalculation = /calculate|compute|find the/i.test(q);
  if (asksForCalculation && hasNumeric) {
    return {
      verdict: "partial",
      feedback:
        "Mock feedback: your answer includes numbers, which is a good start. " +
        "Check the units and significant figures. (Configure a Worker secret to get real AI feedback.)",
    };
  }
  if (a.length > 20) {
    return {
      verdict: "partial",
      feedback:
        "Mock feedback: thanks for the answer. The real AI would now assess it in detail. " +
        "Set GEMINI_KEY_1 or GROQ_KEY_1 as a Worker secret to enable the real check.",
    };
  }
  return {
    verdict: "partial",
    feedback:
      "Mock feedback: that's a start. The real AI would expand on it. " +
      "Set Worker secrets (see docs/SETUP.md) to enable the actual check.",
  };
}

export function mockExplain(lesson: string, _module: string): ParsedExplain {
  return {
    concepts: [
      `${lesson} — key idea 1 (configure Worker secrets for the real explanation)`,
      `${lesson} — key idea 2`,
      `${lesson} — key idea 3`,
    ],
    formulas: [
      {
        name: "Sample formula",
        equation: "v = d / t",
        variables: "v: velocity, d: distance, t: time",
      },
    ],
    example: `Imagine a real-life example involving ${lesson.toLowerCase()}. ` +
      "The full AI-generated explanation will appear once you set Worker secrets.",
  };
}
