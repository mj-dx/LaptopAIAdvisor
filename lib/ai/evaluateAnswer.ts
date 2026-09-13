import { EVALUATOR_PROMPT } from "@/lib/ai/evaluatorPrompt";

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

type EvaluationResult = {
  accuracy_score: number;
  hallucination_risk: number;
  flagged: boolean;
  summary: string;
  unsupported_claims: string[];
};

type EvaluateAnswerInput = {
  userMessage: string;
  assistantAnswer: string;
  recommendedProductIds: string[];
  products: ProductForEvaluation[];
};

const geminiApiKey =
  process.env.GEMINI_API_KEY;

function clampScore(value: unknown) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(number))
  );
}

export async function evaluateAnswer({
  userMessage,
  assistantAnswer,
  recommendedProductIds,
  products,
}: EvaluateAnswerInput): Promise<EvaluationResult> {
  if (!geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing."
    );
  }

  const catalogueText = products
    .map((product) => {
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
    })
    .join("\n\n--------------------\n\n");

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
  recommendedProductIds.length > 0
    ? recommendedProductIds.join("\n")
    : "No products were recommended."
}

==================================================
PRODUCT CATALOGUE
==================================================

${catalogueText}
`.trim();

  const model =
    "gemini-3.1-flash-lite";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response =
    await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-goog-api-key":
          geminiApiKey,
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",

            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0,
          maxOutputTokens: 700,
          responseMimeType:
            "application/json",
        },
      }),
    });

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Evaluator Gemini error:",
      errorText
    );

    throw new Error(
      "Unable to evaluate AI response."
    );
  }

  const data =
    await response.json();

  const rawText =
    data.candidates?.[0]
      ?.content?.parts
      ?.map(
        (part: { text?: string }) =>
          part.text ?? ""
      )
      .join("")
      .trim();

  if (!rawText) {
    throw new Error(
      "Evaluator returned an empty response."
    );
  }

  let parsed: Partial<EvaluationResult>;

  try {
    parsed =
      JSON.parse(rawText);
  } catch {
    console.error(
      "Invalid evaluator JSON:",
      rawText
    );

    throw new Error(
      "Evaluator returned invalid JSON."
    );
  }

  const accuracy =
    clampScore(
      parsed.accuracy_score
    );

  const risk =
    clampScore(
      parsed.hallucination_risk
    );

  const unsupportedClaims =
    Array.isArray(
      parsed.unsupported_claims
    )
      ? parsed.unsupported_claims
          .filter(
            (
              claim
            ): claim is string =>
              typeof claim === "string"
          )
          .slice(0, 10)
      : [];

  const automaticFlag =
    risk >= 30 ||
    accuracy < 80;

  return {
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
      typeof parsed.summary ===
      "string"
        ? parsed.summary
        : "",

    unsupported_claims:
      unsupportedClaims,
  };
}