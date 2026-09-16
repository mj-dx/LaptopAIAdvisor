"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import AdminNav from "./AdminNav";

type Stats = {
  conversations: number;
  messages: number;
  feedback: number;
  flagged: number;
};

export default function AdminDashboardPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    stats,
    setStats,
  ] =
    useState<Stats>({
      conversations: 0,
      messages: 0,
      feedback: 0,
      flagged: 0,
    });

  // ========================================
  // Load Dashboard
  // Auth protection is handled by:
  // app/admin/layout.tsx
  // ========================================

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        conversationsResult,
        messagesResult,
        feedbackResult,
        flaggedResult,
      ] =
        await Promise.all([
          // Conversations count

          supabase
            .from(
              "conversations"
            )
            .select("*", {
              count: "exact",
              head: true,
            }),

          // Messages count

          supabase
            .from(
              "messages"
            )
            .select("*", {
              count: "exact",
              head: true,
            }),

          // Feedback count

          supabase
            .from(
              "feedback"
            )
            .select("*", {
              count: "exact",
              head: true,
            }),

          // Flagged AI answers

          supabase
            .from(
              "messages"
            )
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq(
              "role",
              "assistant"
            )
            .eq(
              "flagged",
              true
            ),
        ]);

      // ========================================
      // Check query errors
      // ========================================

      if (
        conversationsResult.error
      ) {
        throw conversationsResult.error;
      }

      if (
        messagesResult.error
      ) {
        throw messagesResult.error;
      }

      if (
        feedbackResult.error
      ) {
        throw feedbackResult.error;
      }

      if (
        flaggedResult.error
      ) {
        throw flaggedResult.error;
      }

      // ========================================
      // Save stats
      // ========================================

      setStats({
        conversations:
          conversationsResult.count ??
          0,

        messages:
          messagesResult.count ??
          0,

        feedback:
          feedbackResult.count ??
          0,

        flagged:
          flaggedResult.count ??
          0,
      });
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // Logout
  // ========================================

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setError("");

    try {
      const {
        error:
          signOutError,
      } =
        await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.replace(
        "/admin/login"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setError(
        "Unable to log out. Please try again."
      );

      setLoggingOut(false);
    }
  }

  // ========================================
  // Loading
  // ========================================

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center text-white">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-white" />

          <p className="mt-4 text-sm text-gray-500">
            Loading admin dashboard...
          </p>

        </div>

      </main>
    );
  }

  // ========================================
  // Dashboard
  // ========================================

  return (
    <main className="app-shell text-white">

      <div className="page-container py-8 sm:py-10">

        {/* Header */}

        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Laptop AI Advisor
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Monitor the product catalogue,
              conversations, AI quality,
              and customer feedback.
            </p>

          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut
            }
            className="btn-danger"
          >
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </button>

        </header>

        {/* Navigation */}

        <div className="mt-8">
          <AdminNav />
        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Statistics */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            label="Conversations"
            value={
              stats.conversations
            }
          />

          <StatCard
            label="Messages"
            value={
              stats.messages
            }
          />

          <StatCard
            label="Feedback"
            value={
              stats.feedback
            }
          />

          <StatCard
            label="Flagged Answers"
            value={
              stats.flagged
            }
          />

        </section>

        {/* Management Sections */}

        <section className="mt-10 grid gap-5 md:grid-cols-3">

          <AdminCard
            title="Products"
            description="Add, edit, delete, and manage the product catalogue used by the AI assistant."
            href="/admin/products"
            action="Manage Products"
          />

          <AdminCard
            title="Conversations"
            description="Review complete customer conversations, recommendations, and AI evaluation scores."
            href="/admin/conversations"
            action="View Conversations"
          />

          <AdminCard
            title="Customer Feedback"
            description="Review customer ratings and comments linked to completed conversations."
            href="/admin/feedback"
            action="View Feedback"
          />

        </section>

      </div>

    </main>
  );
}

// ========================================
// Stat Card
// ========================================

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="surface p-5">

      <p className="text-xs uppercase tracking-[0.15em] text-gray-600">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>

    </div>
  );
}

// ========================================
// Admin Card
// ========================================

function AdminCard({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <Link
        href={href}
        className="mt-6 inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-gray-200"
      >
        {action}
      </Link>

    </article>
  );
}