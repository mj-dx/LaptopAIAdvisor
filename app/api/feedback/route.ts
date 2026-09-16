import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  verifyReportToken,
} from "@/lib/reportToken";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const conversationId =
      typeof body.conversationId ===
      "string"
        ? body.conversationId
        : "";

    const token =
      typeof body.token ===
      "string"
        ? body.token
        : "";

    const rating =
      Number(body.rating);

    const comment =
      typeof body.comment ===
      "string"
        ? body.comment.trim()
        : "";

    // ---------------------------------
    // Validate input
    // ---------------------------------

    if (
      !conversationId ||
      !token
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid feedback request.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        rating
      ) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          error:
            "Rating must be between 1 and 5.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      comment.length >
      2000
    ) {
      return NextResponse.json(
        {
          error:
            "Comment must be 2000 characters or fewer.",
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
      error:
        conversationError,
    } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        ended_at,
        report_token_hash
      `)
      .eq(
        "id",
        conversationId
      )
      .maybeSingle();

    if (
      conversationError ||
      !conversation ||
      !conversation
        .report_token_hash ||
      !conversation
        .ended_at
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid conversation report.",
        },
        {
          status: 404,
        }
      );
    }

    // ---------------------------------
    // Verify token
    // ---------------------------------

    if (
      !verifyReportToken(
        token,
        conversation
          .report_token_hash
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid report link.",
        },
        {
          status: 403,
        }
      );
    }

    // ---------------------------------
    // Save / update feedback
    // ---------------------------------

    const {
      data: feedback,
      error:
        feedbackError,
    } = await supabaseAdmin
      .from("feedback")
      .upsert(
        {
          conversation_id:
            conversationId,

          rating,

          comment:
            comment ||
            null,

          created_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "conversation_id",
        }
      )
      .select(`
        rating,
        comment,
        created_at
      `)
      .single();

    if (
      feedbackError
    ) {
      console.error(
        "Feedback save error:",
        feedbackError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save feedback.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error(
      "Feedback API error:",
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