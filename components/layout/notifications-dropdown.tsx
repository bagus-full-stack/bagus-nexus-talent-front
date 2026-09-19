"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import Link from 'next/link';
import { fetchNotifications, markAllAsRead as apiMarkAllAsRead } from '@/lib/api/notifications';
import { NotificationItem, NotificationType } from '@/types/notification';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[] | null>(null);

  const { data: initialData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const notifications = localNotifications ?? initialData ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setLocalNotifications((prev) =>
      (prev ?? notifications).map((n) => ({ ...n, read: true }))
    );
    apiMarkAllAsRead().catch(() => {});
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'alert':
        return <AlertOctagon className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          id="notifications-button"
          className="relative h-9 w-9 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Afficher les notifications"
        >
          <Bell className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Chargement des notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucune notification pour le moment.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted/50',
                  !item.read && 'bg-primary/5 dark:bg-primary/10'
                )}
              >
                <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  {item.link && (
                    <Link
                      href={item.link}
                      onClick={() => setIsOpen(false)}
                      className="inline-block pt-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      Voir le détail &rarr;
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-2 text-center bg-muted/20">
          <span className="text-[11px] text-muted-foreground">
            Synchronisation temps réel avec le journal d&apos;événements
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
