import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { evaluateAnswer } from "@/lib/ai/evaluateAnswer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const geminiApiKey =
  process.env.GEMINI_API_KEY;

if (
  !supabaseUrl ||
  !supabaseAnonKey
) {
  throw new Error(
    "Missing Supabase environment variables."
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey
  );

type IncomingMessage = {
  role:
    | "user"
    | "assistant";

  content: string;
};

type GeminiResult = {
  answer?: string;

  recommended_product_ids?:
    string[];
};

export async function POST(
  request: Request
) {
  try {
    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const message =
      typeof body.message ===
      "string"
        ? body.message.trim()
        : "";

    let conversationId =
      typeof body.conversationId ===
      "string"
        ? body.conversationId
        : null;

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const history: IncomingMessage[] =
      Array.isArray(body.history)
        ? body.history
            .filter(
              (
                item: unknown
              ): item is IncomingMessage => {
                if (
                  typeof item !==
                    "object" ||
                  item === null
                ) {
                  return false;
                }

                const candidate =
                  item as IncomingMessage;

                return (
                  (
                    candidate.role ===
                      "user" ||
                    candidate.role ===
                      "assistant"
                  ) &&
                  typeof candidate.content ===
                    "string"
                );
              }
            )
            .slice(-10)
        : [];

    // ========================================
    // Create conversation
    // ========================================

    if (!conversationId) {
      const {
        data: conversation,
        error:
          conversationError,
      } =
        await supabaseAdmin
          .from(
            "conversations"
          )
          .insert({})
          .select("id")
          .single();

      if (
        conversationError ||
        !conversation
      ) {
        console.error(
          conversationError
        );

        return NextResponse.json(
          {
            error:
              "Unable to create conversation.",
          },
          {
            status: 500,
          }
        );
      }

      conversationId =
        conversation.id;
    }

    // ========================================
    // Verify conversation
    // ========================================

    const {
      data:
        existingConversation,
    } =
      await supabaseAdmin
        .from(
          "conversations"
        )
        .select("id")
        .eq(
          "id",
          conversationId
        )
        .maybeSingle();

    if (!existingConversation) {
      return NextResponse.json(
        {
          error:
            "Conversation does not exist.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================
    // Save user message
    // ========================================

    const {
      error:
        userSaveError,
    } =
      await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id:
            conversationId,

          role: "user",

          content:
            message,
        });

    if (userSaveError) {
      console.error(
        userSaveError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save user message.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // Load catalogue
    // ========================================

    const {
      data: products,
      error: productsError,
    } =
      await supabase
        .from("products")
        .select(`
          id,
          name,
          brand,
          description,
          price,
          cpu,
          ram,
          storage,
          gpu,
          screen,
          battery,
          image_url
        `)
        .order(
          "price",
          {
            ascending: true,
          }
        );

    if (
      productsError ||
      !products
    ) {
      console.error(
        productsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load catalogue.",
        },
        {
          status: 500,
        }
      );
    }

    const catalogueText =
      products
        .map(
          (product) => `
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
`.trim()
        )
        .join(
          "\n\n--------------------\n\n"
        );

    const historyText =
      history.length > 0
        ? history
            .map(
              (item) =>
                `${
                  item.role ===
                  "user"
                    ? "CUSTOMER"
                    : "ASSISTANT"
                }: ${item.content}`
            )
            .join("\n\n")
        : "No previous conversation.";

    const prompt = `
${SYSTEM_PROMPT}

==================================================
PRODUCT CATALOGUE
==================================================

${catalogueText}

==================================================
PREVIOUS CONVERSATION
==================================================

${historyText}

==================================================
CURRENT CUSTOMER MESSAGE
==================================================

${message}

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON:

{
  "answer": "your response",
  "recommended_product_ids": []
}
`.trim();

    // ========================================
    // Generate answer
    // ========================================

    const model =
      "gemini-3.1-flash-lite";

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const geminiResponse =
      await fetch(
        geminiUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              geminiApiKey,
          },

          body:
            JSON.stringify({
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
                    0.2,

                  maxOutputTokens:
                    1200,

                  responseMimeType:
                    "application/json",
                },
            }),
        }
      );

    if (!geminiResponse.ok) {
      const errorText =
        await geminiResponse.text();

      console.error(
        "Gemini error:",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "Gemini AI service failed.",
        },
        {
          status:
            geminiResponse.status,
        }
      );
    }

    const geminiData =
      await geminiResponse.json();

    const rawText =
      geminiData
        .candidates?.[0]
        ?.content?.parts
        ?.map(
          (
            part: {
              text?: string;
            }
          ) =>
            part.text ?? ""
        )
        .join("")
        .trim();

    if (!rawText) {
      return NextResponse.json(
        {
          error:
            "Gemini returned an empty response.",
        },
        {
          status: 500,
        }
      );
    }

    let result:
      GeminiResult;

    try {
      result =
        JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error:
            "Gemini returned invalid JSON.",
        },
        {
          status: 500,
        }
      );
    }

    const answer =
      typeof result.answer ===
      "string"
        ? result.answer.trim()
        : "";

    if (!answer) {
      return NextResponse.json(
        {
          error:
            "AI response contained no answer.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // Validate recommended products
    // ========================================

    const catalogueIds =
      new Set(
        products.map(
          (product) =>
            product.id
        )
      );

    const ids =
      Array.isArray(
        result
          .recommended_product_ids
      )
        ? [
            ...new Set(
              result.recommended_product_ids.filter(
                (
                  id
                ): id is string =>
                  typeof id ===
                    "string" &&
                  catalogueIds.has(
                    id
                  )
              )
            ),
          ].slice(0, 3)
        : [];

    const recommendedProducts =
      ids
        .map((id) =>
          products.find(
            (product) =>
              product.id ===
              id
          )
        )
        .filter(Boolean);

    // ========================================
    // Evaluate answer
    // ========================================

    const evaluation =
      await evaluateAnswer({
        userMessage:
          message,

        assistantAnswer:
          answer,

        recommendedProductIds:
          ids,

        products,
      });

    // ========================================
    // Store assistant response + scores
    // ========================================

    const {
      data:
        assistantMessage,
      error:
        assistantSaveError,
    } =
      await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id:
            conversationId,

          role:
            "assistant",

          content:
            answer,

          accuracy_score:
            evaluation
              .accuracy_score,

          hallucination_risk:
            evaluation
              .hallucination_risk,

          flagged:
            evaluation
              .flagged,

          recommended_product_ids:
            ids,

          evaluation_details:
            {
              summary:
                evaluation.summary,

              unsupported_claims:
                evaluation
                  .unsupported_claims,

              evaluator_model:
                model,
            },
        })
        .select("id")
        .single();

    if (
      assistantSaveError
    ) {
      console.error(
        assistantSaveError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save assistant response.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      conversationId,

      messageId:
        assistantMessage.id,

      answer,

      recommendedProducts,

      evaluation: {
        accuracyScore:
          evaluation
            .accuracy_score,

        hallucinationRisk:
          evaluation
            .hallucination_risk,

        flagged:
          evaluation
            .flagged,

        summary:
          evaluation.summary,
      },

      model,
    });
  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}