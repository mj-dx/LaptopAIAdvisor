"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  description:
    | string
    | null;
  price: number;
  cpu: string | null;
  ram: string | null;
  storage:
    | string
    | null;
  gpu: string | null;
  screen:
    | string
    | null;
  battery:
    | string
    | null;
  image_url:
    | string
    | null;
};

type ReportMessage = {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  accuracyScore:
    | number
    | null;

  hallucinationRisk:
    | number
    | null;

  flagged: boolean;

  evaluationSummary:
    | string
    | null;

  unsupportedClaims:
    string[];

  createdAt: string;

  products: Product[];
};

type ReportData = {
  conversation: {
    id: string;
    createdAt: string;
    endedAt: string;
    reportCreatedAt:
      | string
      | null;
  };

  customerRequestSummary:
    string;

  messages:
    ReportMessage[];

  recommendations: {
    product: Product;
    reason: string;
  }[];

  quality: {
    averageAccuracy:
      | number
      | null;

    averageHallucinationRisk:
      | number
      | null;

    flaggedAnswers:
      number;

    evaluatedAnswers:
      number;
  };

  feedback:
    | {
        rating: number;
        comment:
          | string
          | null;
        createdAt:
          string;
      }
    | null;
};

export default function ConversationReportPage() {
  const [
    report,
    setReport,
  ] =
    useState<ReportData | null>(
      null
    );

  const [
    conversationId,
    setConversationId,
  ] =
    useState("");

  const [token, setToken] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    rating,
    setRating,
  ] =
    useState<number | null>(
      null
    );

  const [
    comment,
    setComment,
  ] =
    useState("");

  const [
    feedbackLoading,
    setFeedbackLoading,
  ] =
    useState(false);

  const [
    feedbackMessage,
    setFeedbackMessage,
  ] =
    useState("");

  useEffect(() => {
    const pathname =
      window.location.pathname;

    const parts =
      pathname
        .split("/")
        .filter(Boolean);

    const id =
      parts[
        parts.length - 1
      ] || "";

    const params =
      new URLSearchParams(
        window.location.search
      );

    const reportToken =
      params.get("token") ||
      "";

    setConversationId(id);
    setToken(reportToken);

    if (
      !id ||
      !reportToken
    ) {
      setError(
        "This report link is invalid."
      );

      setLoading(false);

      return;
    }

    void loadReport(
      id,
      reportToken
    );
  }, []);

  async function loadReport(
    id: string,
    reportToken: string
  ) {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/conversations/${encodeURIComponent(
            id
          )}/report?token=${encodeURIComponent(
            reportToken
          )}`,
          {
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load report."
        );
      }

      setReport(data);

      if (data.feedback) {
        setRating(
          data.feedback.rating
        );

        setComment(
          data.feedback
            .comment || ""
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!rating) {
      setFeedbackMessage(
        "Please select a rating."
      );

      return;
    }

    setFeedbackLoading(
      true
    );

    setFeedbackMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/feedback",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                conversationId,
                token,
                rating,
                comment,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save feedback."
        );
      }

      setFeedbackMessage(
        "Thank you. Your feedback has been saved."
      );

      if (
        conversationId &&
        token
      ) {
        await loadReport(
          conversationId,
          token
        );
      }
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Unable to save feedback."
      );
    } finally {
      setFeedbackLoading(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center text-white">
        <p className="text-gray-500">
          Loading conversation report...
        </p>
      </main>
    );
  }

  if (
    error ||
    !report
  ) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-6 text-white">
        <div className="max-w-lg rounded-2xl border border-red-900/70 bg-red-950/20 p-8 text-center">
          <h1 className="text-2xl font-bold">
            Report unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-300">
            {error ||
              "This report could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* Header */}

        <header className="border-b border-gray-900 pb-8">
          <p className="page-kicker">
            Laptop AI Advisor
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Conversation Report
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            A summary of the customer request,
            recommendations, conversation quality,
            and feedback.
          </p>

          <p className="mt-4 text-xs text-gray-700">
            Conversation{" "}
            {report.conversation.id}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/chat" className="btn-primary">Start New Chat</Link>
            <Link href="/catalogue" className="btn-secondary">Back to Catalogue</Link>
          </div>
        </header>

        {/* Summary */}

        <section className="surface mt-8 p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-600">
            Customer Request Summary
          </p>

          <p
            dir="auto"
            className="mt-3 leading-7 text-gray-200"
          >
            {
              report.customerRequestSummary
            }
          </p>
        </section>

        {/* Overall quality */}

        <section className="mt-8">
          <h2 className="text-2xl font-semibold">
            Conversation Quality
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">

            <QualityMetric
              label="Average Accuracy"
              value={
                report.quality
                  .averageAccuracy
              }
              suffix="%"
            />

            <QualityMetric
              label="Average Hallucination Risk"
              value={
                report.quality
                  .averageHallucinationRisk
              }
              suffix="%"
            />

            <QualityMetric
              label="Flagged Answers"
              value={
                report.quality
                  .flaggedAnswers
              }
            />

          </div>
        </section>

        {/* Recommendations */}

        <section className="mt-12">

          <h2 className="text-2xl font-semibold">
            Recommended Products
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Products recommended during this conversation
            and the assistant response explaining the recommendation.
          </p>

          {report.recommendations
            .length === 0 ? (
            <div className="empty-state mt-5 text-gray-500">
              No specific products were recommended.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {report.recommendations.map(
                (
                  recommendation
                ) => (
                  <RecommendationCard
                    key={
                      recommendation
                        .product.id
                    }
                    product={
                      recommendation
                        .product
                    }
                    reason={
                      recommendation
                        .reason
                    }
                  />
                )
              )}
            </div>
          )}

        </section>

        {/* Conversation */}

        <section className="mt-12">

          <h2 className="text-2xl font-semibold">
            Full Conversation
          </h2>

          <div className="mt-5 space-y-5">
            {report.messages.map(
              (message) => (
                <MessageCard
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />
              )
            )}
          </div>

        </section>

        {/* Feedback */}

        <section className="surface mt-12 p-6 sm:p-8">

          <p className="text-xs uppercase tracking-[0.2em] text-gray-600">
            Customer Feedback
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            How useful was this recommendation?
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your feedback helps improve the recommendation experience.
          </p>

          <form
            onSubmit={
              submitFeedback
            }
            className="mt-6"
          >

            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setRating(
                        value
                      )
                    }
                    className={
                      rating ===
                      value
                        ? "h-12 w-12 rounded-xl bg-white font-semibold text-black"
                        : "h-12 w-12 rounded-xl border border-gray-700 bg-gray-950 text-gray-400 transition hover:border-gray-500 hover:text-white"
                    }
                  >
                    {value}
                  </button>
                )
              )}
            </div>

            <p className="mt-2 text-xs text-gray-600">
              1 = Not useful · 5 = Very useful
            </p>

            <textarea
              value={comment}
              onChange={(
                event
              ) =>
                setComment(
                  event.target
                    .value
                )
              }
              maxLength={2000}
              rows={5}
              placeholder="Optional comment..."
              className="mt-5 w-full resize-none rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none placeholder:text-gray-700 focus:border-gray-600"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">

              <button
                type="submit"
                disabled={
                  feedbackLoading ||
                  !rating
                }
                className="btn-primary px-6"
              >
                {feedbackLoading
                  ? "Saving..."
                  : report.feedback
                    ? "Update Feedback"
                    : "Submit Feedback"}
              </button>

              {feedbackMessage && (
                <p className="text-sm text-gray-400">
                  {
                    feedbackMessage
                  }
                </p>
              )}

            </div>

          </form>

        </section>

      </div>
    </main>
  );
}

function QualityMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;

  value:
    | number
    | null;

  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">

      <p className="text-xs uppercase tracking-[0.15em] text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value === null
          ? "N/A"
          : `${value}${suffix}`}
      </p>

    </div>
  );
}

function MessageCard({
  message,
}: {
  message: ReportMessage;
}) {
  const isUser =
    message.role ===
    "user";

  return (
    <article
      className={
        isUser
          ? "ml-auto max-w-3xl rounded-2xl bg-white p-5 text-black"
          : "mr-auto max-w-4xl rounded-2xl border border-gray-800 bg-gray-900 p-5"
      }
    >

      <p className={
        isUser
          ? "text-xs uppercase tracking-wider text-gray-500"
          : "text-xs uppercase tracking-wider text-gray-600"
      }>
        {isUser
          ? "Customer"
          : "AI Assistant"}
      </p>

      <p
        dir="auto"
        className="mt-2 whitespace-pre-wrap leading-7"
      >
        {message.content}
      </p>

      {!isUser && (
        <div className="mt-4 flex flex-wrap gap-2">

          <ScoreBadge
            label="Accuracy"
            value={
              message
                .accuracyScore
            }
          />

          <ScoreBadge
            label="Risk"
            value={
              message
                .hallucinationRisk
            }
          />

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

      {!isUser &&
        message.evaluationSummary && (
        <p className="mt-3 text-xs leading-5 text-gray-600">
          {
            message.evaluationSummary
          }
        </p>
      )}

    </article>
  );
}

function ScoreBadge({
  label,
  value,
}: {
  label: string;

  value:
    | number
    | null;
}) {
  return (
    <span className="rounded-full border border-gray-800 bg-gray-950 px-3 py-1 text-xs text-gray-400">

      {label}:{" "}

      {value === null
        ? "N/A"
        : `${value}%`}

    </span>
  );
}

function RecommendationCard({
  product,
  reason,
}: {
  product: Product;
  reason: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

      <div className="flex flex-col md:flex-row">

        <div className="h-56 shrink-0 bg-white md:h-auto md:w-64">

          {product.image_url ? (
            <img
              src={
                product.image_url
              }
              alt={
                product.name
              }
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No product image
            </div>
          )}

        </div>

        <div className="flex-1 p-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-wider text-gray-600">
                {product.brand ||
                  "Laptop"}
              </p>

              <h3 className="mt-1 text-xl font-semibold">
                {product.name}
              </h3>

            </div>

            <p className="text-2xl font-bold">
              $
              {Number(
                product.price
              ).toFixed(2)}
            </p>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">

            <ProductSpec
              label="CPU"
              value={
                product.cpu
              }
            />

            <ProductSpec
              label="GPU"
              value={
                product.gpu
              }
            />

            <ProductSpec
              label="RAM"
              value={
                product.ram
              }
            />

            <ProductSpec
              label="Storage"
              value={
                product.storage
              }
            />

          </div>

          <div className="mt-5 rounded-xl bg-gray-950 p-4">

            <p className="text-xs uppercase tracking-wider text-gray-600">
              Why it was recommended
            </p>

            <p
              dir="auto"
              className="mt-2 text-sm leading-6 text-gray-400"
            >
              {reason}
            </p>

          </div>

        </div>

      </div>

    </article>
  );
}

function ProductSpec({
  label,
  value,
}: {
  label: string;

  value:
    | string
    | null;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-gray-950 p-3">

      <p className="text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p
        title={
          value ||
          undefined
        }
        className="mt-1 truncate text-xs text-gray-300"
      >
        {value || "—"}
      </p>

    </div>
  );
}