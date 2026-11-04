"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  LayoutDashboard,
  LogOut,
  UsersRound,
} from "lucide-react";
import { AuthRedirect, useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/karigars", label: "Karigar master", icon: UsersRound },
];

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthRedirect>
      <ShellContent>{children}</ShellContent>
    </AuthRedirect>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/dashboard" aria-label="Go to dashboard">
            <Brand compact />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-stone-500">
                {user?.role === "FINANCE_HEAD" ? "Finance head" : "Issue clerk"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="px-3"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut size={18} />
              <span className="ml-2 hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
        <aside className="lg:w-56">
          <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-stone-950 text-white"
                      : "text-stone-600 hover:bg-white hover:text-stone-950",
                  )}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {user?.role === "FINANCE_HEAD" ? (
            <div className="mt-8 hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 lg:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Finance view
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Stock and loss review controls will appear here.
              </p>
            </div>
          ) : null}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function EmptyRouteCard({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
        {description}
      </p>
      {href && action ? (
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800"
        >
          {action} <ArrowRight size={16} />
        </Link>
      ) : null}
    </div>
  );
}
