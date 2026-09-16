import { EVALUATOR_PROMPT } from "@/lib/ai/evaluatorPrompt";

import {
  requestGemini,
} from "@/lib/ai/geminiRequest";

type ProductForEvaluation = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  gpu: string | null;
  screen: string | null;
  battery: string | null;
};

export type EvaluationResult = {
  available: boolean;

  accuracy_score:
    number | null;

  hallucination_risk:
    number | null;

  flagged: boolean;

  summary: string;

  unsupported_claims:
    string[];

  evaluator_model: string;
};

type EvaluateAnswerInput = {
  userMessage: string;

  assistantAnswer: string;

  recommendedProductIds:
    string[];

  products:
    ProductForEvaluation[];
};

const geminiApiKey =
  process.env.GEMINI_API_KEY;

const EVALUATOR_MODEL =
  process.env
    .GEMINI_EVALUATOR_MODEL ||
  "gemini-3.1-flash-lite";

function clampScore(
  value: unknown
) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        number
      )
    )
  );
}

function unavailableEvaluation(
  reason:
    string
): EvaluationResult {
  return {
    available:
      false,

    accuracy_score:
      null,

    hallucination_risk:
      null,

    flagged:
      false,

    summary:
      reason,

    unsupported_claims:
      [],

    evaluator_model:
      EVALUATOR_MODEL,
  };
}

export async function evaluateAnswer({
  userMessage,
  assistantAnswer,
  recommendedProductIds,
  products,
}: EvaluateAnswerInput): Promise<EvaluationResult> {
  // ---------------------------------------
  // Missing key must NOT break chat
  // ---------------------------------------

  if (!geminiApiKey) {
    console.error(
      "Evaluator unavailable: GEMINI_API_KEY is missing."
    );

    return unavailableEvaluation(
      "Evaluation temporarily unavailable."
    );
  }

  // ---------------------------------------
  // Build catalogue
  // ---------------------------------------

  const catalogueText =
    products
      .map(
        (product) => {
          return `
PRODUCT ID: ${product.id}
NAME: ${product.name}
BRAND: ${product.brand ?? "Not provided"}
PRICE: $${product.price}
CPU: ${product.cpu ?? "Not provided"}
RAM: ${product.ram ?? "Not provided"}
STORAGE: ${product.storage ?? "Not provided"}
GPU: ${product.gpu ?? "Not provided"}
SCREEN: ${product.screen ?? "Not provided"}
BATTERY: ${product.battery ?? "Not provided"}
DESCRIPTION: ${product.description ?? "Not provided"}
          `.trim();
        }
      )
      .join(
        "\n\n--------------------\n\n"
      );

  // ---------------------------------------
  // Build prompt
  // ---------------------------------------

  const prompt = `
${EVALUATOR_PROMPT}

==================================================
CUSTOMER MESSAGE
==================================================

${userMessage}

==================================================
ASSISTANT ANSWER
==================================================

${assistantAnswer}

==================================================
VALIDATED RECOMMENDED PRODUCT IDS
==================================================

${
  recommendedProductIds.length >
  0
    ? recommendedProductIds.join(
        "\n"
      )
    : "No products were recommended."
}

==================================================
PRODUCT CATALOGUE
==================================================

${catalogueText}
`.trim();

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${EVALUATOR_MODEL}:generateContent`;

  try {
    // ---------------------------------------
    // Gemini request with retries
    // ---------------------------------------

    const response =
      await requestGemini({
        url,

        apiKey:
          geminiApiKey,

        label:
          "Evaluator",

        maxAttempts:
          3,

        body: {
          contents: [
            {
              role:
                "user",

              parts: [
                {
                  text:
                    prompt,
                },
              ],
            },
          ],

          generationConfig:
            {
              temperature:
                0,

              maxOutputTokens:
                700,

              responseMimeType:
                "application/json",
            },
        },
      });

    // ---------------------------------------
    // Parse Gemini response
    // ---------------------------------------

    const data =
      await response.json();

    const rawText =
      data
        .candidates?.[0]
        ?.content?.parts
        ?.map(
          (
            part: {
              text?: string;
            }
          ) =>
            part.text ??
            ""
        )
        .join("")
        .trim();

    if (!rawText) {
      console.error(
        "Evaluator returned an empty response."
      );

      return unavailableEvaluation(
        "Evaluation temporarily unavailable."
      );
    }

    // ---------------------------------------
    // Parse evaluator JSON
    // ---------------------------------------

    let parsed:
      Partial<EvaluationResult>;

    try {
      parsed =
        JSON.parse(
          rawText
        );
    } catch (error) {
      console.error(
        "Invalid evaluator JSON:",
        {
          error,
          rawText,
        }
      );

      return unavailableEvaluation(
        "Evaluation temporarily unavailable."
      );
    }

    // ---------------------------------------
    // Validate scores
    // ---------------------------------------

    const accuracy =
      clampScore(
        parsed
          .accuracy_score
      );

    const risk =
      clampScore(
        parsed
          .hallucination_risk
      );

    const unsupportedClaims =
      Array.isArray(
        parsed
          .unsupported_claims
      )
        ? parsed
            .unsupported_claims
            .filter(
              (
                claim
              ): claim is string =>
                typeof claim ===
                "string"
            )
            .slice(
              0,
              10
            )
        : [];

    const automaticFlag =
      risk >= 30 ||
      accuracy < 80;

    return {
      available:
        true,

      accuracy_score:
        accuracy,

      hallucination_risk:
        risk,

      flagged:
        Boolean(
          parsed.flagged
        ) ||
        automaticFlag,

      summary:
        typeof parsed
          .summary ===
        "string"
          ? parsed.summary
          : "",

      unsupported_claims:
        unsupportedClaims,

      evaluator_model:
        EVALUATOR_MODEL,
    };
  } catch (error) {
    // ---------------------------------------
    // CRITICAL:
    // Evaluator failure must never kill chat
    // ---------------------------------------

    console.error(
      "Evaluator unavailable after retries:",
      error
    );

    return unavailableEvaluation(
      "Quality evaluation is temporarily unavailable."
    );
  }
}