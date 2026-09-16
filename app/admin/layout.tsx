"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type Status =
  | "checking"
  | "authorized"
  | "unauthorized";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] =
    useState<Status>("checking");

  const isLoginPage =
    pathname === "/admin/login";

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      // Login page is public
      if (isLoginPage) {
        if (mounted) {
          setStatus("authorized");
        }

        return;
      }

      if (mounted) {
        setStatus("checking");
      }

      try {
        // Get current browser session first
        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !sessionData.session?.user
        ) {
          if (mounted) {
            setStatus("unauthorized");

            router.replace(
              "/admin/login"
            );
          }

          return;
        }

        const user =
          sessionData.session.user;

        // Verify this user exists in admins
        const {
          data: admin,
          error: adminError,
        } =
          await supabase
            .from("admins")
            .select("user_id")
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        if (
          adminError ||
          !admin
        ) {
          console.error(
            "Admin verification failed:",
            adminError
          );

          await supabase.auth.signOut();

          if (mounted) {
            setStatus("unauthorized");

            router.replace(
              "/admin/login"
            );
          }

          return;
        }

        if (mounted) {
          setStatus("authorized");
        }
      } catch (error) {
        console.error(
          "Admin guard error:",
          error
        );

        if (mounted) {
          setStatus("unauthorized");

          router.replace(
            "/admin/login"
          );
        }
      }
    }

    void verifyAdmin();

    // Keep layout synchronized with auth changes
    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (!mounted) {
            return;
          }

          if (
            event === "SIGNED_OUT" ||
            !session
          ) {
            if (!isLoginPage) {
              setStatus(
                "unauthorized"
              );

              router.replace(
                "/admin/login"
              );
            }

            return;
          }

          if (
            event === "SIGNED_IN" &&
            !isLoginPage
          ) {
            await verifyAdmin();
          }
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, [
    pathname,
    isLoginPage,
    router,
  ]);

  // -----------------------------------
  // Login page
  // -----------------------------------

  if (isLoginPage) {
    return <>{children}</>;
  }

  // -----------------------------------
  // Do not render admin content yet
  // -----------------------------------

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-white" />

          <p className="mt-4 text-sm text-gray-500">
            Verifying admin access...
          </p>

        </div>

      </main>
    );
  }

  // -----------------------------------
  // Unauthorized
  // -----------------------------------

  if (status !== "authorized") {
    return (
      <main className="min-h-screen bg-gray-950" />
    );
  }

  return <>{children}</>;
}