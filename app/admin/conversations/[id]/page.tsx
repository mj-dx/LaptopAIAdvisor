"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

import AdminNav from "../../AdminNav";

type Message = {
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

  evaluation_details:
    | {
        summary?: string;
      }
    | null;

  created_at: string;
};

type Feedback = {
  rating: number;

  comment:
    | string
    | null;

  created_at: string;
};

export default function AdminConversationPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const id =
    typeof params.id ===
    "string"
      ? params.id
      : "";

  const [
    messages,
    setMessages,
  ] =
    useState<Message[]>(
      []
    );

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (id) {
      void loadConversation();
    }
  }, [id]);

  async function loadConversation() {
    try {
      const {
        data: auth,
      } =
        await supabase.auth.getUser();

      if (!auth.user) {
        router.replace(
          "/admin/login"
        );

        return;
      }

      const {
        data: admin,
      } =
        await supabase
          .from("admins")
          .select("user_id")
          .eq(
            "user_id",
            auth.user.id
          )
          .maybeSingle();

      if (!admin) {
        setError(
          "Admin access required."
        );

        return;
      }

      const {
        data:
          messageRows,
        error:
          messageError,
      } =
        await supabase
          .from("messages")
          .select(`
            id,
            role,
            content,
            accuracy_score,
            hallucination_risk,
            flagged,
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

      if (messageError) {
        throw messageError;
      }

      setMessages(
        (messageRows ||
          []) as Message[]
      );

      const {
        data:
          feedbackRow,
      } =
        await supabase
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

      setFeedback(
        feedbackRow as Feedback | null
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load conversation."
      );
    } finally {
      setLoading(false);
    }
  }

  const assistantMessages =
    messages.filter(
      (message) =>
        message.role ===
        "assistant"
    );

  const accuracy =
    average(
      assistantMessages
        .map(
          (message) =>
            numeric(
              message
                .accuracy_score
            )
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        )
    );

  const risk =
    average(
      assistantMessages
        .map(
          (message) =>
            numeric(
              message
                .hallucination_risk
            )
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        )
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-500">
        Loading conversation...
      </main>
    );
  }

  return (
    <main className="app-shell text-white">

      <div className="page-container max-w-5xl py-8 sm:py-10">

        <Link
          href="/admin/conversations"
          className="btn-tertiary -ml-2"
        >
          ← Back to conversations
        </Link>

        <div className="mt-5">
          <AdminNav />
        </div>

        <h1 className="mt-5 text-3xl font-bold">
          Conversation
        </h1>

        <p className="mt-2 break-all text-xs text-gray-700">
          {id}
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <Metric
            label="Average Accuracy"
            value={
              accuracy === null
                ? "N/A"
                : `${accuracy}%`
            }
          />

          <Metric
            label="Average Risk"
            value={
              risk === null
                ? "N/A"
                : `${risk}%`
            }
          />

          <Metric
            label="Messages"
            value={
              String(
                messages.length
              )
            }
          />

        </section>

        {feedback && (
          <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-5">

            <p className="text-xs uppercase tracking-wider text-gray-600">
              Customer Feedback
            </p>

            <p className="mt-3 text-2xl font-bold">
              {
                feedback.rating
              }
              /5
            </p>

            {feedback.comment && (
              <p
                dir="auto"
                className="mt-3 text-sm leading-6 text-gray-400"
              >
                {
                  feedback.comment
                }
              </p>
            )}

          </section>
        )}

        <section className="mt-10 space-y-5">

          {messages.map(
            (message) => {
              const user =
                message.role ===
                "user";

              return (
                <article
                  key={
                    message.id
                  }
                  className={
                    user
                      ? "ml-auto max-w-3xl rounded-2xl bg-white p-5 text-black"
                      : "mr-auto max-w-4xl rounded-2xl border border-gray-800 bg-gray-900 p-5"
                  }
                >

                  <p className={
                    user
                      ? "text-xs uppercase tracking-wider text-gray-500"
                      : "text-xs uppercase tracking-wider text-gray-600"
                  }>
                    {user
                      ? "Customer"
                      : "AI Assistant"}
                  </p>

                  <p
                    dir="auto"
                    className="mt-2 whitespace-pre-wrap leading-7"
                  >
                    {
                      message.content
                    }
                  </p>

                  {!user && (
                    <div className="mt-4 flex flex-wrap gap-2">

                      <Badge>
                        Accuracy:{" "}
                        {formatScore(
                          message
                            .accuracy_score
                        )}
                      </Badge>

                      <Badge>
                        Risk:{" "}
                        {formatScore(
                          message
                            .hallucination_risk
                        )}
                      </Badge>

                      <span
                        className={
                          message.flagged
                            ? "rounded-full border border-amber-900 bg-amber-950/30 px-3 py-1 text-xs text-amber-400"
                            : "rounded-full border border-emerald-900 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400"
                        }
                      >
                        {message.flagged
                          ? "Flagged"
                          : "Grounded"}
                      </span>

                    </div>
                  )}

                  {!user &&
                    message
                      .evaluation_details
                      ?.summary && (
                    <p className="mt-3 text-xs leading-5 text-gray-600">
                      {
                        message
                          .evaluation_details
                          .summary
                      }
                    </p>
                  )}

                </article>
              );
            }
          )}

        </section>

      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">

      <p className="text-xs uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

function Badge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-gray-800 bg-gray-950 px-3 py-1 text-xs text-gray-400">
      {children}
    </span>
  );
}

function numeric(
  value:
    | number
    | string
    | null
) {
  if (value === null) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function formatScore(
  value:
    | number
    | string
    | null
) {
  const result =
    numeric(value);

  return result === null
    ? "N/A"
    : `${result}%`;
}

function average(
  values: number[]
) {
  if (!values.length) {
    return null;
  }

  return Math.round(
    (values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
      values.length) *
      10
  ) / 10;
}