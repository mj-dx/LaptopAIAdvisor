import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { evaluateAnswer } from "@/lib/ai/evaluateAnswer";
import { requestGemini } from "@/lib/ai/geminiRequest";
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
    // ========================================
    // Check Gemini API key
    // ========================================

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

    // ========================================
    // Parse request
    // ========================================

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

    // ========================================
    // Validate history
    // ========================================

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
          "Create conversation error:",
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
    // Verify conversation exists
    // ========================================

    const {
      data:
        existingConversation,
      error:
        conversationLookupError,
    } =
      await supabaseAdmin
        .from(
          "conversations"
        )
        .select(`
          id,
          ended_at
        `)
        .eq(
          "id",
          conversationId
        )
        .maybeSingle();

    if (
      conversationLookupError
    ) {
      console.error(
        "Conversation lookup error:",
        conversationLookupError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify conversation.",
        },
        {
          status: 500,
        }
      );
    }

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

    // Prevent messages after End Conversation

    if (
      existingConversation.ended_at
    ) {
      return NextResponse.json(
        {
          error:
            "This conversation has already ended. Please start a new chat.",
        },
        {
          status: 409,
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

          role:
            "user",

          content:
            message,
        });

    if (userSaveError) {
      console.error(
        "Save user message error:",
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
    // Load product catalogue
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
        "Load products error:",
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

    // ========================================
    // Build catalogue context
    // ========================================

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

    // ========================================
    // Build conversation context
    // ========================================

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
            .join(
              "\n\n"
            )
        : "No previous conversation.";

    // ========================================
    // Build Gemini prompt
    // ========================================

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
    // Generate AI answer
    // ========================================

    const model =
      process.env
        .GEMINI_CHAT_MODEL ||
      "gemini-3.1-flash-lite";

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const geminiResponse =
      await requestGemini({
        url:
          geminiUrl,

        apiKey:
          geminiApiKey,

        label:
          "Chat",

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
                0.2,

              maxOutputTokens:
                1200,

              responseMimeType:
                "application/json",
            },
        },
      });

    // ========================================
    // Parse Gemini response
    // ========================================

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
      console.error(
        "Gemini returned empty response:",
        geminiData
      );

      return NextResponse.json(
        {
          error:
            "Gemini returned an empty response.",
        },
        {
          status: 502,
        }
      );
    }

    // ========================================
    // Parse Gemini JSON
    // ========================================

    let result:
      GeminiResult;

    try {
      result =
        JSON.parse(
          rawText
        );
    } catch (error) {
      console.error(
        "Gemini returned invalid JSON:",
        {
          error,
          rawText,
        }
      );

      return NextResponse.json(
        {
          error:
            "Gemini returned invalid JSON.",
        },
        {
          status: 502,
        }
      );
    }

    // ========================================
    // Validate answer
    // ========================================

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
          status: 502,
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
              result
                .recommended_product_ids
                .filter(
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
          ].slice(
            0,
            3
          )
        : [];

    // ========================================
    // Build recommended product objects
    // ========================================

    const recommendedProducts =
      ids
        .map(
          (id) =>
            products.find(
              (product) =>
                product.id ===
                id
            )
        )
        .filter(
          (
            product
          ): product is NonNullable<
            typeof product
          > =>
            Boolean(product)
        );

    // ========================================
    // Evaluate answer
    //
    // IMPORTANT:
    // evaluateAnswer() now returns
    // available: false instead of throwing
    // when Gemini evaluator is temporarily down.
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
    // Save assistant response
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

          // NULL when evaluator
          // was unavailable

          accuracy_score:
            evaluation.available
              ? evaluation
                  .accuracy_score
              : null,

          hallucination_risk:
            evaluation.available
              ? evaluation
                  .hallucination_risk
              : null,

          flagged:
            evaluation.available
              ? evaluation
                  .flagged
              : false,

          recommended_product_ids:
            ids,

          evaluation_details:
            {
              status:
                evaluation.available
                  ? "completed"
                  : "unavailable",

              summary:
                evaluation.summary,

              unsupported_claims:
                evaluation
                  .unsupported_claims,

              evaluator_model:
                evaluation
                  .evaluator_model,
            },
        })
        .select("id")
        .single();

    if (
      assistantSaveError ||
      !assistantMessage
    ) {
      console.error(
        "Save assistant message error:",
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

    // ========================================
    // Return successful response
    // ========================================

    return NextResponse.json({
      conversationId,

      messageId:
        assistantMessage.id,

      answer,

      recommendedProducts,

      // If evaluator failed,
      // return null.
      // The chat answer still works.

      evaluation:
        evaluation.available
          ? {
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
                evaluation
                  .summary,
            }
          : null,

      evaluationStatus:
        evaluation.available
          ? "completed"
          : "unavailable",

      model,
    });
  } catch (error) {
    // ========================================
    // Unexpected / final Gemini failure
    // ========================================

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