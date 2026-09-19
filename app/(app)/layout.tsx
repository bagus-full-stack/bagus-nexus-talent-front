"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import { useIsClient } from "@/hooks/use-is-client";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/api/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isSidebarCollapsed, setUser } = useAppStore();
  const isClient = useIsClient();
  const [isRehydrating, setIsRehydrating] = React.useState(true);

  // Au premier chargement, tente de restaurer la session depuis le token stocké
  // (le store repart toujours à isAuthenticated: false au montage).
  useEffect(() => {
    if (!isClient) return;
    if (isAuthenticated || !getAccessToken()) {
      setIsRehydrating(false);
      return;
    }
    getCurrentUser().then((user) => {
      if (user) setUser(user);
      setIsRehydrating(false);
    });
  }, [isClient, isAuthenticated, setUser]);

  // Protection de route : redirection vers /login si non authentifié
  useEffect(() => {
    if (isClient && !isRehydrating && !isAuthenticated) {
      router.push("/login");
    }
  }, [isClient, isRehydrating, isAuthenticated, router]);

  if (!isClient || isRehydrating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-medium">Chargement de TalentAI...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // En cours de redirection vers /login
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar fixe à gauche (240px rétractable en 64px) */}
      <Sidebar />

      {/* Zone principale à droite de la sidebar */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0",
          isSidebarCollapsed ? "pl-16" : "pl-60"
        )}
      >
        {/* Header supérieur avec titre, notifications, thème et profil */}
        <Header />

        {/* Zone de contenu scrollable */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
