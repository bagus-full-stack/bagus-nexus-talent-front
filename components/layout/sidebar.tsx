"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  FileText,
  Network,
  ShieldCheck,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { UserRole } from "@/types/user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  badge?: string;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: "Recherche",
    href: "/search",
    icon: Search,
    allowedRoles: ["recruteur", "rh", "admin"],
  },
  {
    name: "Ingestion CV",
    href: "/ingestion",
    icon: FileText,
    allowedRoles: ["rh", "admin"],
  },
  {
    name: "Graphe",
    href: "/graph",
    icon: Network,
    allowedRoles: ["rh", "admin"],
  },
  {
    name: "RGPD & Purge",
    href: "/gdpr",
    icon: ShieldCheck,
    allowedRoles: ["admin"],
  },
  {
    name: "Utilisateurs",
    href: "/users",
    icon: Users,
    allowedRoles: ["admin"],
  },
  {
    name: "Paramètres",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["admin"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, isSidebarCollapsed, toggleSidebar, setUserRole } = useAppStore();

  const userRole: UserRole = currentUser?.role || "admin";

  // Filtrer les liens de navigation selon le rôle actif dans le store
  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  return (
    <aside
      id="main-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/70">
        <Link
          href="/search"
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg leading-tight text-foreground font-sans">
                TalentAI
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Enterprise Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-link-${item.href.replace('/', '')}`}
              title={isSidebarCollapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800/60"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!isSidebarCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
              {item.badge && !isSidebarCollapsed && (
                <span className="ml-auto rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role Simulator Box for Instant Testing */}
      {!isSidebarCollapsed && (
        <div className="mx-2 mb-2 p-2.5 rounded-lg border border-border/80 bg-neutral-50 dark:bg-neutral-900/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Simulateur de rôle
            </span>
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                userRole === "admin"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                  : userRole === "rh"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
              )}
            >
              {userRole}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              id="role-btn-recruteur"
              onClick={() => setUserRole("recruteur")}
              className={cn(
                "px-1.5 py-1 text-[11px] rounded font-medium transition-all text-center truncate",
                userRole === "recruteur"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-background text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-800"
              )}
              title="Recruteur (Recherche seule)"
            >
              Recruteur
            </button>
            <button
              type="button"
              id="role-btn-rh"
              onClick={() => setUserRole("rh")}
              className={cn(
                "px-1.5 py-1 text-[11px] rounded font-medium transition-all text-center truncate",
                userRole === "rh"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-background text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-800"
              )}
              title="RH interne (+ Ingestion & Graphe)"
            >
              RH
            </button>
            <button
              type="button"
              id="role-btn-admin"
              onClick={() => setUserRole("admin")}
              className={cn(
                "px-1.5 py-1 text-[11px] rounded font-medium transition-all text-center truncate",
                userRole === "admin"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-background text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-800"
              )}
              title="Admin (Accès total)"
            >
              Admin
            </button>
          </div>
        </div>
      )}

      {/* Collapse / Expand Toggle Button at Bottom */}
      <div className="p-2 border-t border-border flex items-center justify-between">
        {!isSidebarCollapsed && (
          <span className="text-[11px] text-muted-foreground px-2">
            Rétracter le menu
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          id="sidebar-toggle-btn"
          onClick={toggleSidebar}
          className={cn(
            "h-8 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800",
            isSidebarCollapsed ? "w-full justify-center" : "ml-auto px-2"
          )}
          aria-label={isSidebarCollapsed ? "Déployer la barre latérale" : "Rétracter la barre latérale"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
