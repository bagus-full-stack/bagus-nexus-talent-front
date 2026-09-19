"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SidebarContent } from "./sidebar-content";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const { isSidebarCollapsed } = useAppStore();

  return (
    <>
      {/* Desktop : sidebar fixe, repliable, inchangée au-delà de lg */}
      <aside
        id="main-sidebar"
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent collapsed={isSidebarCollapsed} />
      </aside>

      {/* Mobile / tablette (<lg) : drawer en overlay, piloté par le hamburger du Header */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-60 max-w-[80vw] p-0 lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Menu de navigation principal
          </SheetDescription>
          <SidebarContent
            collapsed={false}
            showCollapseToggle={false}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
