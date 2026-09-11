"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    setCheckingSession(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCheckingSession(false);
      return;
    }

    const { data: adminRecord } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminRecord) {
      router.replace("/admin/products");
      return;
    }

    await supabase.auth.signOut();

    setCheckingSession(false);
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError("Unable to sign in.");
        return;
      }

      const {
        data: adminRecord,
        error: adminError,
      } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (adminError) {
        await supabase.auth.signOut();

        setError(
          "Unable to verify admin permissions."
        );

        return;
      }

      if (!adminRecord) {
        await supabase.auth.signOut();

        setError(
          "This account does not have admin access."
        );

        return;
      }

      router.replace("/admin/products");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      setError(
        "Something went wrong while signing in."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-sm text-gray-500">
          Checking session...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Laptop AI Advisor
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Admin Login
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Sign in with an authorized administrator
            account to manage the product catalogue.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
        >
          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-gray-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="admin@example.com"
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-700 focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-gray-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-700 focus:border-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-700">
          Authorized administrators only.
        </p>
      </div>
    </main>
  );
}