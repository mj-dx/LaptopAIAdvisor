"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Product } from "@/types/product";

type Evaluation = {
  accuracyScore: number;
  hallucinationRisk: number;
  flagged: boolean;
  summary?: string;
};

type ChatMessage = {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  products?: Product[];

  evaluation?: Evaluation;
};

export default function ChatPage() {
  const [
    conversationId,
    setConversationId,
  ] =
    useState<string | null>(
      null
    );

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>(
      []
    );

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    endingConversation,
    setEndingConversation,
  ] =
    useState(false);

  const [error, setError] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages,
    loading,
  ]);

  async function submitMessage(
    message: string
  ) {
    const cleanMessage =
      message.trim();

    if (
      !cleanMessage ||
      loading ||
      endingConversation
    ) {
      return;
    }

    const userMessage:
      ChatMessage = {
      id:
        crypto.randomUUID(),

      role:
        "user",

      content:
        cleanMessage,
    };

    const currentHistory =
      messages.map(
        (message) => ({
          role:
            message.role,

          content:
            message.content,
        })
      );

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setInput("");
    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message:
                  cleanMessage,

                conversationId,

                history:
                  currentHistory,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to get AI response."
        );
      }

      if (
        data.conversationId
      ) {
        setConversationId(
          data.conversationId
        );
      }

      const assistantMessage:
        ChatMessage = {
        id:
          data.messageId ||
          crypto.randomUUID(),

        role:
          "assistant",

        content:
          data.answer,

        products:
          Array.isArray(
            data
              .recommendedProducts
          )
            ? data
                .recommendedProducts
            : [],

        evaluation:
          data.evaluation
            ? {
                accuracyScore:
                  Number(
                    data
                      .evaluation
                      .accuracyScore
                  ) || 0,

                hallucinationRisk:
                  Number(
                    data
                      .evaluation
                      .hallucinationRisk
                  ) || 0,

                flagged:
                  Boolean(
                    data
                      .evaluation
                      .flagged
                  ),

                summary:
                  typeof data
                    .evaluation
                    .summary ===
                  "string"
                    ? data
                        .evaluation
                        .summary
                    : "",
              }
            : undefined,
      };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);

      requestAnimationFrame(
        () => {
          textareaRef
            .current
            ?.focus();
        }
      );
    }
  }

  async function sendMessage(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await submitMessage(
      input
    );
  }

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void submitMessage(
        input
      );
    }
  }

  function useExample(
    value: string
  ) {
    setInput(value);

    requestAnimationFrame(
      () => {
        textareaRef
          .current
          ?.focus();
      }
    );
  }

  function askAboutProduct(
    product: Product
  ) {
    setInput(
      `Tell me more about ${product.name}`
    );

    requestAnimationFrame(
      () => {
        textareaRef
          .current
          ?.focus();
      }
    );
  }

  async function endConversation() {
    if (
      !conversationId ||
      messages.length === 0 ||
      loading ||
      endingConversation
    ) {
      return;
    }

    setEndingConversation(
      true
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/conversations/${encodeURIComponent(
            conversationId
          )}/end`,
          {
            method:
              "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to end conversation."
        );
      }

      if (!data.reportUrl) {
        throw new Error(
          "The report URL was not generated."
        );
      }

      window.location.assign(
        data.reportUrl
      );
    } catch (error) {
      console.error(
        "End conversation error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to end conversation."
      );

      setEndingConversation(
        false
      );
    }
  }

  function clearChat() {
    if (
      conversationId &&
      messages.length > 0
    ) {
      const confirmed =
        window.confirm(
          "Start a new chat without generating a report for this conversation?"
        );

      if (!confirmed) {
        return;
      }
    }

    setMessages([]);
    setConversationId(null);
    setInput("");
    setError("");
  }

  return (
    <main className="app-shell text-white">

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">

        {/* Header */}

        <header className="sticky top-0 z-20 border-b border-gray-900 bg-[#090a0c]/95 py-4 backdrop-blur sm:py-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Laptop AI Advisor
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                AI Shopping Assistant
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                عربي · English · Arabizi
              </p>

            </div>

            {messages.length >
              0 && (
              <div className="flex flex-wrap gap-2">

                {conversationId && (
                  <button
                    type="button"
                    onClick={
                      endConversation
                    }
                    disabled={
                      loading ||
                      endingConversation
                    }
                    className="btn-primary"
                  >
                    {endingConversation
                      ? "Creating Report..."
                      : "End Conversation"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    clearChat
                  }
                  disabled={
                    loading ||
                    endingConversation
                  }
                  className="btn-secondary"
                >
                  New Chat
                </button>

              </div>
            )}

          </div>

        </header>

        {/* Messages */}

        <section className="flex-1 space-y-7 py-6 sm:py-8">

          {messages.length ===
            0 && (
            <Welcome
              onExample={
                useExample
              }
            />
          )}

          {messages.map(
            (message) => (
              <ChatBubble
                key={
                  message.id
                }
                message={
                  message
                }
                onAskProduct={
                  askAboutProduct
                }
              />
            )
          )}

          {loading && (
            <TypingIndicator />
          )}

          {endingConversation && (
            <div className="flex justify-center">
              <div className="surface-muted px-5 py-3 text-sm text-gray-500">
                Finalizing conversation and creating secure report...
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-red-900/70 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div
            ref={bottomRef}
          />

        </section>

        {/* Composer */}

        <form
          onSubmit={
            sendMessage
          }
          className="sticky bottom-0 z-20 border-t border-gray-900 bg-gray-950/95 py-5 backdrop-blur"
        >

          <div className="surface p-2 transition focus-within:border-gray-500">

            <textarea
              ref={
                textareaRef
              }
              value={
                input
              }
              onChange={(
                event
              ) =>
                setInput(
                  event
                    .target
                    .value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              rows={2}
              disabled={
                loading ||
                endingConversation
              }
              placeholder="مثلاً: بدي laptop للـ programming والـ AI تحت 1000$..."
              className="min-h-[64px] w-full resize-none bg-transparent px-3 py-3 text-white outline-none placeholder:text-gray-600 disabled:opacity-60"
            />

            <div className="flex items-center justify-between gap-4 border-t border-gray-800 px-2 pt-2">

              <p className="hidden text-xs text-gray-600 sm:block">
                Enter to send · Shift + Enter for new line
              </p>

              <button
                type="submit"
                disabled={
                  loading ||
                  endingConversation ||
                  !input.trim()
                }
                className="btn-primary ml-auto px-5"
              >
                {loading
                  ? "Sending..."
                  : "Send"}
              </button>

            </div>

          </div>

        </form>

      </div>

    </main>
  );
}

type WelcomeProps = {
  onExample: (
    value: string
  ) => void;
};

function Welcome({
  onExample,
}: WelcomeProps) {
  const examples = [
    "بدي لابتوب للبرمجة تحت 1000$",

    "bade laptop gaming w budget 1200$",

    "Which laptop is best for AI and programming?",

    "قارنلي بين أفضل خيارين للـ gaming",
  ];

  return (
    <div className="surface p-6 sm:p-8">

      <p className="text-sm font-medium text-gray-500">
        AI Product Advisor
      </p>

      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
        شو نوع اللابتوب يلي عم تدور عليه؟
      </h2>

      <p className="mt-3 text-sm leading-7 text-gray-500">
        قلي ميزانيتك وشو بدك تستعمل
        اللابتوب، والمساعد رح يقترح
        منتجات موجودة فعلياً بالـ catalogue.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">

        {examples.map(
          (example) => (
            <button
              key={
                example
              }
              type="button"
              onClick={() =>
                onExample(
                  example
                )
              }
              className="rounded-full border border-gray-800 bg-gray-950 px-4 py-2.5 text-left text-xs text-gray-400 transition hover:border-gray-600 hover:text-gray-200"
            >
              {example}
            </button>
          )
        )}

      </div>

    </div>
  );
}

type ChatBubbleProps = {
  message:
    ChatMessage;

  onAskProduct: (
    product: Product
  ) => void;
};

function ChatBubble({
  message,
  onAskProduct,
}: ChatBubbleProps) {
  const isUser =
    message.role ===
    "user";

  return (
    <div
      className={
        isUser
          ? "flex justify-end"
          : "flex justify-start"
      }
    >

      <div
        className={
          isUser
            ? "max-w-[90%] sm:max-w-[75%]"
            : "w-full max-w-[95%]"
        }
      >

        <div
          className={
            isUser
              ? "ml-auto max-w-full rounded-2xl rounded-br-md bg-white px-5 py-4 text-black"
              : "rounded-2xl rounded-bl-md border border-gray-800 bg-gray-900 px-5 py-4 text-gray-200"
          }
        >

          <p
            dir="auto"
            className="whitespace-pre-wrap leading-7"
          >
            {message.content}
          </p>

        </div>

        {!isUser &&
          message.evaluation && (
            <EvaluationCard
              evaluation={
                message
                  .evaluation
              }
            />
          )}

        {!isUser &&
          message.products &&
          message.products
            .length >
            0 && (
            <div className="mt-4 space-y-4">

              <p className="px-1 text-xs uppercase tracking-[0.2em] text-gray-600">
                Recommended products
              </p>

              {message.products.map(
                (
                  product
                ) => (
                  <ChatProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    onAsk={() =>
                      onAskProduct(
                        product
                      )
                    }
                  />
                )
              )}

            </div>
          )}

      </div>

    </div>
  );
}

function EvaluationCard({
  evaluation,
}: {
  evaluation:
    Evaluation;
}) {
  const grounded =
    !evaluation.flagged &&
    evaluation
      .hallucinationRisk <
      30 &&
    evaluation
      .accuracyScore >=
      80;

  return (
    <div className="surface-muted mt-3 overflow-hidden">

      <div className="grid grid-cols-2 divide-x divide-gray-800 sm:grid-cols-3">

        <div className="p-4">

          <p className="text-xs uppercase tracking-wider text-gray-600">
            Accuracy
          </p>

          <p className="mt-1 text-xl font-semibold text-white">
            {
              evaluation
                .accuracyScore
            }
            %
          </p>

        </div>

        <div className="p-4">

          <p className="text-xs uppercase tracking-wider text-gray-600">
            Hallucination Risk
          </p>

          <p className="mt-1 text-xl font-semibold text-white">
            {
              evaluation
                .hallucinationRisk
            }
            %
          </p>

        </div>

        <div className="col-span-2 border-t border-gray-800 p-4 sm:col-span-1 sm:border-t-0">

          <p className="text-xs uppercase tracking-wider text-gray-600">
            Status
          </p>

          <p
            className={
              grounded
                ? "mt-1 text-sm font-semibold text-emerald-400"
                : "mt-1 text-sm font-semibold text-amber-400"
            }
          >
            {grounded
              ? "Grounded"
              : "Flagged"}
          </p>

        </div>

      </div>

      {evaluation.summary && (
        <div className="border-t border-gray-800 px-4 py-3">

          <p className="text-xs leading-5 text-gray-600">
            {
              evaluation
                .summary
            }
          </p>

        </div>
      )}

    </div>
  );
}

type ChatProductCardProps = {
  product: Product;
  onAsk: () => void;
};

function ChatProductCard({
  product,
  onAsk,
}: ChatProductCardProps) {
  return (
    <article className="surface overflow-hidden">

      <div className="flex flex-col md:flex-row">

        <div className="h-52 shrink-0 bg-white md:h-auto md:w-64">

          {product.image_url ? (
            <img
              src={
                product
                  .image_url
              }
              alt={
                product.name
              }
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center px-5 text-center text-sm text-gray-500">
              No product image
            </div>
          )}

        </div>

        <div className="flex flex-1 flex-col p-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.2em] text-gray-600">
                {product.brand ||
                  "Laptop"}
              </p>

              <h3 className="mt-1 text-xl font-semibold text-white">
                {
                  product.name
                }
              </h3>

            </div>

            <p className="text-2xl font-bold">
              $
              {Number(
                product.price
              ).toFixed(2)}
            </p>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">

            <MiniSpec
              label="CPU"
              value={
                product.cpu
              }
            />

            <MiniSpec
              label="GPU"
              value={
                product.gpu
              }
            />

            <MiniSpec
              label="RAM"
              value={
                product.ram
              }
            />

            <MiniSpec
              label="Storage"
              value={
                product
                  .storage
              }
            />

          </div>

          {(product.screen ||
            product.battery) && (
            <div className="mt-4 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">

              {product.screen && (
                <div>
                  <span className="text-gray-600">
                    Screen:
                  </span>{" "}
                  {
                    product
                      .screen
                  }
                </div>
              )}

              {product.battery && (
                <div>
                  <span className="text-gray-600">
                    Battery:
                  </span>{" "}
                  {
                    product
                      .battery
                  }
                </div>
              )}

            </div>
          )}

          {product.description && (
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-500">
              {
                product
                  .description
              }
            </p>
          )}

          <div className="mt-auto pt-5">

            <button
              type="button"
              onClick={
                onAsk
              }
              className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              Ask about this product
            </button>

          </div>

        </div>

      </div>

    </article>
  );
}

function MiniSpec({
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

      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-600">
        {label}
      </p>

      <p
        className="mt-1 truncate text-xs font-medium text-gray-300"
        title={
          value ||
          undefined
        }
      >
        {value || "—"}
      </p>

    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">

      <div className="rounded-2xl rounded-bl-md border border-gray-800 bg-gray-900 px-5 py-4">

        <div className="flex items-center gap-3">

          <div className="flex gap-1">

            <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500" />

            <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500 [animation-delay:150ms]" />

            <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500 [animation-delay:300ms]" />

          </div>

          <span className="text-sm text-gray-500">
            Evaluating response...
          </span>

        </div>

      </div>

    </div>
  );
}