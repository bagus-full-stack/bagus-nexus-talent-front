"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Settings,
  User as UserIcon,
  Shield,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsDropdown } from "./notifications-dropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/search": {
    title: "Recherche Sémantique Candidats",
    subtitle: "Recherche par intention en langage naturel & scoring IA",
  },
  "/ingestion": {
    title: "Ingestion & Traitement des CV",
    subtitle: "Extraction OCR, enrichissement sémantique et vectorisation",
  },
  "/graph": {
    title: "Visualisation du Graphe de Connaissances",
    subtitle: "Ontologie des compétences, entreprises et diplômes",
  },
  "/gdpr": {
    title: "Conformité & Registre RGPD",
    subtitle: "Gouvernance des droits d'effacement (Art. 17) et de limitation (Art. 18)",
  },
  "/users": {
    title: "Gestion des utilisateurs & Accès",
    subtitle: "Contrôle des autorisations et rôles de l'organisation",
  },
  "/settings": {
    title: "Paramètres de la plateforme",
    subtitle: "Configuration des modèles d'IA, seuils et connexions",
  },
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, isSidebarCollapsed } = useAppStore();

  const currentRouteMeta =
    ROUTE_TITLES[pathname] || {
      title: "TalentAI",
      subtitle: "Plateforme interne d'évaluation de talents",
    };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "rh":
        return "RH interne";
      case "recruteur":
        return "Recruteur";
      default:
        return "Invité";
    }
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur-sm transition-all"
    >
      {/* Page Title & Context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
            {currentRouteMeta.title}
          </h1>
          {currentRouteMeta.subtitle && (
            <p className="hidden sm:block text-xs text-muted-foreground truncate">
              {currentRouteMeta.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Status indicator pill */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>PROD-EU (Paris)</span>
        </div>

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              id="user-profile-menu-trigger"
              className="relative flex items-center gap-2.5 h-10 px-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-primary text-primary-foreground font-semibold border border-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                  {currentUser?.avatar || "AV"}
                </AvatarFallback>
              </Avatar>

              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {currentUser?.name || "Alexandre V."}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {getRoleLabel(currentUser?.role)}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl p-1.5 shadow-lg border border-border bg-card text-card-foreground"
          >
            <DropdownMenuLabel className="font-normal px-2.5 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-foreground">
                  {currentUser?.name || "Alexandre V."}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser?.email || "alexandre.v@talentai.internal"}
                </p>
                <div className="pt-1">
                  <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase">
                    Rôle : {getRoleLabel(currentUser?.role)}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Paramètres du compte
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
