"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Boxes,
  ClipboardList,
  FileInput,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { AuthRedirect, useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/karigars", label: "Karigars", icon: UsersRound },
  { href: "/gold-issue", label: "Gold Issue", icon: FileInput },
  { href: "/gold-return", label: "Gold Return", icon: PackageCheck },
  { label: "Karigar Ledger", icon: ClipboardList, disabled: true },
  { href: "/wastage-alerts", label: "Loss Alerts", icon: BellRing },
  { href: "/finance-review", label: "Finance Review", icon: ClipboardList },
  { href: "/stock-statement", label: "Stock Statement", icon: Boxes },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="flex h-[72px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={21} />
            </button>
            <Link href="/dashboard" aria-label="Go to dashboard"><Brand compact /></Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-stone-500">{user?.role === "FINANCE_HEAD" ? "Finance Head" : "Issue Clerk"}</p>
            </div>
            <Button type="button" variant="ghost" className="px-3" onClick={handleLogout} aria-label="Sign out">
              <LogOut size={18} /><span className="ml-2 hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex">
        {sidebarOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-stone-950/20 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-stone-200 bg-white px-4 pt-5 transition-transform lg:sticky lg:top-[72px] lg:z-0 lg:h-[calc(100vh-72px)] lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-[84px]" : "lg:w-64",
        )}>
          <div className="mb-6 flex items-center justify-between px-2 lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Navigation</span>
            <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" className="p-2 text-stone-500"><X size={18} /></button>
          </div>
          <div className="mb-4 flex justify-end px-2">
            <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} className="hidden rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 lg:block" aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}>
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <nav className="space-y-1">
            {links.filter((link) => !["/wastage-alerts", "/finance-review"].includes(link.href ?? "") || user?.role === "FINANCE_HEAD").map((link) => {
              const Icon = link.icon;
              const active = Boolean(link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`)));
              const className = cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-stone-950 text-white" : link.disabled ? "cursor-not-allowed text-stone-400" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
              );
              const content = <><Icon size={18} /><span className={cn(sidebarCollapsed && "lg:hidden")}>{link.label}</span>{link.disabled ? <span className={cn("ml-auto text-[10px] font-medium uppercase tracking-wide text-stone-400", sidebarCollapsed && "lg:hidden")}>Soon</span> : null}</>;
              return link.disabled ? (
                <div key={link.label} aria-disabled="true" className={className}>{content}</div>
              ) : (
                <Link key={link.label} href={link.href ?? "/dashboard"} onClick={() => setSidebarOpen(false)} className={className}>{content}</Link>
              );
            })}
          </nav>
          {user?.role === "FINANCE_HEAD" && !sidebarCollapsed ? (
            <div className="mt-8 hidden rounded-xl border border-amber-200 bg-amber-50 p-4 lg:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Finance view</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">Stock and loss review controls will appear here.</p>
            </div>
          ) : null}
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

export function EmptyRouteCard({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">{description}</p>
      {href && action ? <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800">{action} <ArrowRight size={16} /></Link> : null}
    </div>
  );
}
