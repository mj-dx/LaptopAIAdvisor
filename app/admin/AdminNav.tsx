"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/products",
    label: "Products",
  },
  {
    href: "/admin/conversations",
    label: "Conversations",
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="mb-8 flex flex-wrap gap-2 border-b border-gray-900 pb-3">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black"
                : "rounded-lg px-4 py-2.5 text-sm text-gray-400 transition hover:bg-gray-900 hover:text-white"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}