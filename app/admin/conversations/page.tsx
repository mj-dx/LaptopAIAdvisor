"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

import AdminNav from "../AdminNav";

type Conversation = {
  id: string;
  created_at: string;
  ended_at:
    | string
    | null;
};

type Message = {
  id: string;
  conversation_id:
    string;

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

  created_at: string;
};

type ConversationRow = {
  conversation:
    Conversation;

  firstUserMessage:
    string;

  messageCount:
    number;

  averageAccuracy:
    | number
    | null;

  averageRisk:
    | number
    | null;

  flaggedCount:
    number;
};

export default function AdminConversationsPage() {
  const router =
    useRouter();

  const [
    conversations,
    setConversations,
  ] =
    useState<
      ConversationRow[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData.user;

      if (!user) {
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
            user.id
          )
          .maybeSingle();

      if (!admin) {
        setError(
          "This account does not have admin access."
        );

        return;
      }

      const {
        data:
          conversationRows,
        error:
          conversationsError,
      } =
        await supabase
          .from(
            "conversations"
          )
          .select(`
            id,
            created_at,
            ended_at
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (
        conversationsError
      ) {
        throw conversationsError;
      }

      const rows =
        (conversationRows ||
          []) as Conversation[];

      if (
        rows.length === 0
      ) {
        setConversations([]);
        return;
      }

      const ids =
        rows.map(
          (conversation) =>
            conversation.id
        );

      const {
        data:
          messageRows,
        error:
          messagesError,
      } =
        await supabase
          .from("messages")
          .select(`
            id,
            conversation_id,
            role,
            content,
            accuracy_score,
            hallucination_risk,
            flagged,
            created_at
          `)
          .in(
            "conversation_id",
            ids
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (messagesError) {
        throw messagesError;
      }

      const messages =
        (messageRows ||
          []) as Message[];

      const result =
        rows.map(
          (
            conversation
          ): ConversationRow => {

            const conversationMessages =
              messages.filter(
                (message) =>
                  message
                    .conversation_id ===
                  conversation.id
              );

            const firstUserMessage =
              conversationMessages.find(
                (message) =>
                  message.role ===
                  "user"
              );

            const assistantMessages =
              conversationMessages.filter(
                (message) =>
                  message.role ===
                  "assistant"
              );

            const accuracyValues =
              assistantMessages
                .map(
                  (message) =>
                    toNumber(
                      message
                        .accuracy_score
                    )
                )
                .filter(
                  (
                    value
                  ): value is number =>
                    value !==
                    null
                );

            const riskValues =
              assistantMessages
                .map(
                  (message) =>
                    toNumber(
                      message
                        .hallucination_risk
                    )
                )
                .filter(
                  (
                    value
                  ): value is number =>
                    value !==
                    null
                );

            return {
              conversation,

              firstUserMessage:
                firstUserMessage
                  ?.content ||
                "No customer message",

              messageCount:
                conversationMessages.length,

              averageAccuracy:
                average(
                  accuracyValues
                ),

              averageRisk:
                average(
                  riskValues
                ),

              flaggedCount:
                assistantMessages.filter(
                  (message) =>
                    Boolean(
                      message.flagged
                    )
                ).length,
            };
          }
        );

      setConversations(
        result
      );
    } catch (error) {
      console.error(
        "Load conversations error:",
        error
      );

      setError(
        "Unable to load conversations."
      );
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return conversations;
      }

      return conversations.filter(
        (row) =>
          row.conversation.id
            .toLowerCase()
            .includes(query) ||
          row.firstUserMessage
            .toLowerCase()
            .includes(query)
      );
    }, [
      conversations,
      search,
    ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-500">
        Loading conversations...
      </main>
    );
  }

  return (
    <main className="app-shell text-white">

      <div className="page-container py-8 sm:py-10">

        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
          Laptop AI Advisor
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Conversations
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Review customer chats,
          recommendations and AI quality.
        </p>

        <div className="mt-8">
          <AdminNav />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search conversations..."
            className="field-control max-w-xl"
          />

        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-800">

          <table className="w-full min-w-[900px]">

            <thead className="bg-gray-900">

              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="p-4">
                  Customer Request
                </th>

                <th className="p-4">
                  Messages
                </th>

                <th className="p-4">
                  Accuracy
                </th>

                <th className="p-4">
                  Risk
                </th>

                <th className="p-4">
                  Flagged
                </th>

                <th className="p-4">
                  Status
                </th>

                <th className="p-4">
                  Date
                </th>

                <th className="p-4" />

              </tr>

            </thead>

            <tbody>

              {filtered.map(
                (row) => (
                  <tr
                    key={
                      row
                        .conversation
                        .id
                    }
                    className="border-t border-gray-800 bg-gray-950 transition hover:bg-gray-900/50"
                  >

                    <td className="max-w-sm p-4">

                      <p
                        dir="auto"
                        className="truncate text-sm text-gray-200"
                      >
                        {
                          row
                            .firstUserMessage
                        }
                      </p>

                      <p className="mt-1 text-xs text-gray-700">
                        {
                          row
                            .conversation
                            .id
                        }
                      </p>

                    </td>

                    <td className="p-4 text-sm text-gray-400">
                      {
                        row.messageCount
                      }
                    </td>

                    <td className="p-4 text-sm">
                      {score(
                        row.averageAccuracy
                      )}
                    </td>

                    <td className="p-4 text-sm">
                      {score(
                        row.averageRisk
                      )}
                    </td>

                    <td className="p-4">

                      <span
                        className={
                          row.flaggedCount >
                          0
                            ? "text-amber-400"
                            : "text-gray-500"
                        }
                      >
                        {
                          row.flaggedCount
                        }
                      </span>

                    </td>

                    <td className="p-4">

                      <span
                        className={
                          row
                            .conversation
                            .ended_at
                            ? "rounded-full border border-emerald-900 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400"
                            : "rounded-full border border-gray-800 px-3 py-1 text-xs text-gray-500"
                        }
                      >
                        {row
                          .conversation
                          .ended_at
                          ? "Completed"
                          : "Active"}
                      </span>

                    </td>

                    <td className="p-4 text-xs text-gray-500">
                      {formatDate(
                        row
                          .conversation
                          .created_at
                      )}
                    </td>

                    <td className="p-4">

                      <Link
                        href={`/admin/conversations/${row.conversation.id}`}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black"
                      >
                        Open
                      </Link>

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

          {filtered.length ===
            0 && (
            <div className="p-10 text-center text-gray-600">
              No conversations found.
            </div>
          )}

        </div>

      </div>
    </main>
  );
}

function toNumber(
  value:
    | number
    | string
    | null
) {
  if (value === null) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
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

function score(
  value:
    | number
    | null
) {
  return value === null
    ? "N/A"
    : `${value}%`;
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString();
}