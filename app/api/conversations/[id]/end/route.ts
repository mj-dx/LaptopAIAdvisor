import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  generateReportToken,
  hashReportToken,
} from "@/lib/reportToken";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Conversation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------
    // Verify conversation
    // ---------------------------------

    const {
      data: conversation,
      error: conversationError,
    } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (
      conversationError ||
      !conversation
    ) {
      return NextResponse.json(
        {
          error:
            "Conversation not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ---------------------------------
    // Verify conversation has messages
    // ---------------------------------

    const {
      count,
      error: countError,
    } = await supabaseAdmin
      .from("messages")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "conversation_id",
        id
      );

    if (countError) {
      console.error(
        "Conversation message count error:",
        countError
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

    if (!count) {
      return NextResponse.json(
        {
          error:
            "Cannot end an empty conversation.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------
    // Generate secure report token
    // ---------------------------------

    const token =
      generateReportToken();

    const tokenHash =
      hashReportToken(token);

    const now =
      new Date().toISOString();

    // ---------------------------------
    // End conversation
    // ---------------------------------

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("conversations")
      .update({
        ended_at: now,

        report_token_hash:
          tokenHash,

        report_created_at:
          now,
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        "End conversation error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to end conversation.",
        },
        {
          status: 500,
        }
      );
    }

    // ---------------------------------
    // Build report URL
    // ---------------------------------

    const reportPath =
      `/report/${id}?token=${encodeURIComponent(
        token
      )}`;

    const origin =
      new URL(
        request.url
      ).origin;

    const absoluteReportUrl =
      `${origin}${reportPath}`;

    return NextResponse.json({
      success: true,

      conversationId:
        id,

      reportUrl:
        reportPath,

      absoluteReportUrl,
    });
  } catch (error) {
    console.error(
      "End conversation API error:",
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