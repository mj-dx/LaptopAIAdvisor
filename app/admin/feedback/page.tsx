"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

import AdminNav from "../AdminNav";

type Feedback = {
  conversation_id:
    string;

  rating: number;

  comment:
    | string
    | null;

  created_at: string;
};

export default function AdminFeedbackPage() {
  const router =
    useRouter();

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadFeedback();
  }, []);

  async function loadFeedback() {
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
        data,
        error,
      } =
        await supabase
          .from("feedback")
          .select(`
            conversation_id,
            rating,
            comment,
            created_at
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw error;
      }

      setFeedback(
        (data ||
          []) as Feedback[]
      );
    } catch (error) {
      console.error(
        "Feedback admin error:",
        error
      );

      setError(
        "Unable to load feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  const averageRating =
    feedback.length
      ? Math.round(
          (feedback.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.rating
              ),
            0
          ) /
            feedback.length) *
            10
        ) / 10
      : null;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-500">
        Loading feedback...
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
          Customer Feedback
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Ratings and comments submitted after AI conversations.
        </p>

        <div className="mt-8">
          <AdminNav />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">

            <p className="text-xs uppercase tracking-wider text-gray-600">
              Total Feedback
            </p>

            <p className="mt-2 text-3xl font-bold">
              {feedback.length}
            </p>

          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">

            <p className="text-xs uppercase tracking-wider text-gray-600">
              Average Rating
            </p>

            <p className="mt-2 text-3xl font-bold">
              {averageRating ===
              null
                ? "N/A"
                : `${averageRating}/5`}
            </p>

          </div>

        </section>

        <div className="space-y-4">

          {feedback.map(
            (item) => (
              <article
                key={
                  item
                    .conversation_id
                }
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
              >

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <p className="text-2xl font-bold">
                      {
                        item.rating
                      }
                      /5
                    </p>

                    <p className="mt-1 text-xs text-gray-600">
                      {new Date(
                        item
                          .created_at
                      ).toLocaleString()}
                    </p>

                  </div>

                  <Link
                    href={`/admin/conversations/${item.conversation_id}`}
                    className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
                  >
                    Open Conversation
                  </Link>

                </div>

                {item.comment ? (
                  <p
                    dir="auto"
                    className="mt-5 rounded-xl bg-gray-950 p-4 text-sm leading-6 text-gray-400"
                  >
                    {
                      item.comment
                    }
                  </p>
                ) : (
                  <p className="mt-5 text-sm text-gray-600">
                    No comment provided.
                  </p>
                )}

              </article>
            )
          )}

          {feedback.length ===
            0 && (
            <div className="empty-state text-gray-600">
              No customer feedback yet.
            </div>
          )}

        </div>

      </div>
    </main>
  );
}