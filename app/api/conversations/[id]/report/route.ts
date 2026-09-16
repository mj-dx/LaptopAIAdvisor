import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  verifyReportToken,
} from "@/lib/reportToken";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RawMessage = {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  accuracy_score:
    | number
    | string
    | null;

  hallucination_risk:
    | number
    | string
    | null;

  flagged:
    | boolean
    | null;

  recommended_product_ids:
    | string[]
    | null;

  evaluation_details:
    | {
        summary?: string;

        unsupported_claims?:
          string[];
      }
    | null;

  created_at:
    string;
};

function numberOrNull(
  value:
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function average(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return null;
  }

  const total =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    );

  return Math.round(
    (total /
      values.length) *
      10
  ) / 10;
}

function buildCustomerSummary(
  messages: RawMessage[]
) {
  const userMessages =
    messages
      .filter(
        (message) =>
          message.role ===
          "user"
      )
      .map(
        (message) =>
          message.content.trim()
      )
      .filter(Boolean);

  if (
    userMessages.length === 0
  ) {
    return "No customer request was recorded.";
  }

  const combined =
    userMessages.join(" ");

  if (
    combined.length <=
    700
  ) {
    return combined;
  }

  return `${combined.slice(
    0,
    697
  )}...`;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const token =
      request.nextUrl
        .searchParams
        .get("token");

    if (!id || !token) {
      return NextResponse.json(
        {
          error:
            "Invalid report link.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------
    // Load conversation
    // ---------------------------------

    const {
      data: conversation,
      error: conversationError,
    } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        created_at,
        ended_at,
        report_created_at,
        report_token_hash
      `)
      .eq("id", id)
      .maybeSingle();

    if (
      conversationError ||
      !conversation
    ) {
      return NextResponse.json(
        {
          error:
            "Report not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !conversation
        .report_token_hash ||
      !conversation
        .ended_at
    ) {
      return NextResponse.json(
        {
          error:
            "This conversation has not been completed.",
        },
        {
          status: 404,
        }
      );
    }

    // ---------------------------------
    // Verify secure token
    // ---------------------------------

    const validToken =
      verifyReportToken(
        token,
        conversation
          .report_token_hash
      );

    if (!validToken) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired report link.",
        },
        {
          status: 404,
        }
      );
    }

    // ---------------------------------
    // Load messages
    // ---------------------------------

    const {
      data: rawMessages,
      error: messagesError,
    } = await supabaseAdmin
      .from("messages")
      .select(`
        id,
        role,
        content,
        accuracy_score,
        hallucination_risk,
        flagged,
        recommended_product_ids,
        evaluation_details,
        created_at
      `)
      .eq(
        "conversation_id",
        id
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (messagesError) {
      console.error(
        "Report messages error:",
        messagesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load conversation.",
        },
        {
          status: 500,
        }
      );
    }

    const messages =
      (rawMessages ||
        []) as RawMessage[];

    // ---------------------------------
    // Gather product IDs
    // ---------------------------------

    const productIds =
      [
        ...new Set(
          messages.flatMap(
            (message) =>
              Array.isArray(
                message
                  .recommended_product_ids
              )
                ? message
                    .recommended_product_ids
                : []
          )
        ),
      ];

    // ---------------------------------
    // Load recommended products
    // ---------------------------------

    let products: {
      id: string;
      name: string;
      brand:
        | string
        | null;
      description:
        | string
        | null;
      price: number;
      cpu:
        | string
        | null;
      ram:
        | string
        | null;
      storage:
        | string
        | null;
      gpu:
        | string
        | null;
      screen:
        | string
        | null;
      battery:
        | string
        | null;
      image_url:
        | string
        | null;
    }[] = [];

    if (
      productIds.length >
      0
    ) {
      const {
        data:
          productRows,
        error:
          productsError,
      } = await supabaseAdmin
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
        .in(
          "id",
          productIds
        );

      if (
        productsError
      ) {
        console.error(
          "Report products error:",
          productsError
        );
      } else {
        products =
          productRows || [];
      }
    }

    const productMap =
      new Map(
        products.map(
          (product) => [
            product.id,
            product,
          ]
        )
      );

    // ---------------------------------
    // Message output
    // ---------------------------------

    const formattedMessages =
      messages.map(
        (message) => ({
          id:
            message.id,

          role:
            message.role,

          content:
            message.content,

          accuracyScore:
            numberOrNull(
              message
                .accuracy_score
            ),

          hallucinationRisk:
            numberOrNull(
              message
                .hallucination_risk
            ),

          flagged:
            Boolean(
              message.flagged
            ),

          evaluationSummary:
            message
              .evaluation_details
              ?.summary ||
            null,

          unsupportedClaims:
            Array.isArray(
              message
                .evaluation_details
                ?.unsupported_claims
            )
              ? message
                  .evaluation_details
                  ?.unsupported_claims
              : [],

          createdAt:
            message
              .created_at,

          products:
            (
              message
                .recommended_product_ids ||
              []
            )
              .map(
                (productId) =>
                  productMap.get(
                    productId
                  )
              )
              .filter(Boolean),
        })
      );

    // ---------------------------------
    // Build recommendation summary
    // ---------------------------------

    const recommendationMap =
      new Map<
        string,
        {
          product:
            (typeof products)[number];

          reason: string;
        }
      >();

    for (
      const message of
      messages
    ) {
      if (
        message.role !==
          "assistant" ||
        !Array.isArray(
          message
            .recommended_product_ids
        )
      ) {
        continue;
      }

      for (
        const productId of
        message
          .recommended_product_ids
      ) {
        const product =
          productMap.get(
            productId
          );

        if (
          product &&
          !recommendationMap.has(
            productId
          )
        ) {
          recommendationMap.set(
            productId,
            {
              product,

              reason:
                message.content,
            }
          );
        }
      }
    }

    // ---------------------------------
    // Quality averages
    // ---------------------------------

    const assistantMessages =
      messages.filter(
        (message) =>
          message.role ===
          "assistant"
      );

    const accuracyValues =
      assistantMessages
        .map(
          (message) =>
            numberOrNull(
              message
                .accuracy_score
            )
        )
        .filter(
          (
            score
          ): score is number =>
            score !== null
        );

    const riskValues =
      assistantMessages
        .map(
          (message) =>
            numberOrNull(
              message
                .hallucination_risk
            )
        )
        .filter(
          (
            score
          ): score is number =>
            score !== null
        );

    const flaggedCount =
      assistantMessages.filter(
        (message) =>
          Boolean(
            message.flagged
          )
      ).length;

    // ---------------------------------
    // Existing feedback
    // ---------------------------------

    const {
      data:
        feedback,
      error:
        feedbackError,
    } = await supabaseAdmin
      .from("feedback")
      .select(`
        rating,
        comment,
        created_at
      `)
      .eq(
        "conversation_id",
        id
      )
      .maybeSingle();

    if (feedbackError) {
      console.error(
        "Report feedback error:",
        feedbackError
      );
    }

    // ---------------------------------
    // Response
    // ---------------------------------

    return NextResponse.json({
      conversation: {
        id:
          conversation.id,

        createdAt:
          conversation
            .created_at,

        endedAt:
          conversation
            .ended_at,

        reportCreatedAt:
          conversation
            .report_created_at,
      },

      customerRequestSummary:
        buildCustomerSummary(
          messages
        ),

      messages:
        formattedMessages,

      recommendations:
        Array.from(
          recommendationMap.values()
        ),

      quality: {
        averageAccuracy:
          average(
            accuracyValues
          ),

        averageHallucinationRisk:
          average(
            riskValues
          ),

        flaggedAnswers:
          flaggedCount,

        evaluatedAnswers:
          accuracyValues.length,
      },

      feedback: feedback
        ? {
            rating:
              feedback.rating,

            comment:
              feedback.comment,

            createdAt:
              feedback
                .created_at,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Conversation report API error:",
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