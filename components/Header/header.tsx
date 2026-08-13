import {
  ArrowRightIcon,
  BellIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CrownIcon,
  InfoIcon,
  SignOutIcon,
  GearSixIcon,
  MoonIcon,
  SidebarIcon,
  SunIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { getUserDisplayName, type SessionUser } from "@/lib/auth/session";
import { UserAvatar } from "@/components/UserAvatar/user-avatar";
import { cn } from "@/lib/utils";
import {
  notificationsApi,
  type AppNotification,
  type NotificationsResponse,
} from "@/lib/api/notifications";
import { relativeTimeFormatter } from "@/lib/intl";

type HeaderProps = {
  title?: ReactNode;
  className?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  user?: SessionUser | null;
  planCode?: string;
  onLogout?: () => Promise<void> | void;
};

const notificationsRefreshCooldownMs = positiveNumber(
  process.env.NEXT_PUBLIC_NOTIFICATIONS_REFRESH_COOLDOWN_MS,
  60_000,
);

type NotificationLoadOptions = RequestInit & { force?: boolean };

export function Header({
  title = "Punto de Venta",
  className,
  isSidebarCollapsed = false,
  onToggleSidebar,
  user,
  planCode,
  onLogout,
}: HeaderProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationsResponse>({
    data: [],
    unreadCount: 0,
    nextCursor: null,
    meta: { page: 1, limit: 5, total: 0, totalPages: 1 },
  });
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const lastNotificationsLoadedAt = useRef(0);
  const notificationsRequestRef =
    useRef<Promise<NotificationsResponse> | null>(null);

  const loadNotifications = useCallback(async (options: NotificationLoadOptions = {}) => {
    if (!user) return;
    const now = Date.now();
    if (
      !options.force &&
      lastNotificationsLoadedAt.current &&
      now - lastNotificationsLoadedAt.current < notificationsRefreshCooldownMs
    ) {
      return;
    }

    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      notificationsRequestRef.current ??= notificationsApi.findMine(
        5,
        1,
        { signal: options.signal },
      );
      const response = await notificationsRequestRef.current;
      lastNotificationsLoadedAt.current = Date.now();
      setNotifications(response);
    } catch {
      if (options.signal?.aborted) return;
      setNotificationsError("No se pudieron cargar las notificaciones.");
    } finally {
      notificationsRequestRef.current = null;
      if (!options.signal?.aborted) setIsLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen && !isNotificationsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isNotificationsOpen, isUserMenuOpen]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void loadNotifications({ force: true, signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadNotifications, user]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    void onLogout?.();
    router.replace("/login");
  };

  const openNotifications = () => {
    setIsUserMenuOpen(false);
    setIsNotificationsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) void loadNotifications();
      return nextOpen;
    });
  };

  const selectNotification = (notification: AppNotification) => {
    if (!notification.readAt) {
      setNotifications((current) => ({
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        data: current.data.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      }));
      void notificationsApi
        .markRead(notification.id)
        .catch(() => loadNotifications({ force: true }));
    }
    setIsNotificationsOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const markAllRead = async () => {
    setNotifications((current) => ({
      ...current,
      unreadCount: 0,
      data: current.data.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    }));
    try {
      await notificationsApi.markAllRead();
    } catch {
      void loadNotifications({ force: true });
    }
  };

  const userName = getUserDisplayName(user ?? null);
  const companyName = user?.empresaNombreComercial;
  const isSuperAdmin = user?.roles.includes("SUPERADMIN") ?? false;
  const isTrial = !planCode || planCode === "prueba";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between gap-2 bg-[var(--color-header-bg)] px-3 transition-colors duration-200 sm:px-5 md:gap-4 md:px-7",
        isNotificationsOpen && "z-[100]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Alternar sidebar"
          aria-pressed={isSidebarCollapsed}
        >
          <SidebarIcon size={18} />
        </button>
        <div className="min-w-0 text-sm font-circular-regular whitespace-nowrap text-[var(--color-text)]/70">
          {title}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
        {!isSuperAdmin ? (
          <button
            type="button"
            onClick={() =>
              router.push(
                isTrial
                  ? "/configuracion/plan"
                  : "/configuracion/plan?tab=usage",
              )
            }
            className="flex h-9 items-center justify-center gap-2 rounded-full px-2 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          >
            {isTrial ? (
              <CrownIcon size={17} weight="fill" className="text-[#eab308]" />
            ) : (
              <ChartLineUpIcon
                size={17}
                weight="bold"
                className="text-[var(--color-primary)]"
              />
            )}
            <span className="hidden sm:inline">
              {isTrial ? "Mejorar plan" : "Uso y plan"}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Tema"
        >
          {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        <button
          type="button"
          onClick={() => router.push("/configuracion/mi-cuenta")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Configuracion"
        >
          <GearSixIcon size={18} />
        </button>

        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={openNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            aria-label="Notificaciones"
            aria-expanded={isNotificationsOpen}
          >
            <BellIcon size={18} />
            {notifications.unreadCount > 0 ? (
              <span className="absolute top-0 right-0 flex min-w-[18px] items-center justify-center rounded-full bg-[#ff4a4a] px-1 text-[9px] font-circular-bold leading-4 text-white">
                {notifications.unreadCount > 99
                  ? "99+"
                  : notifications.unreadCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="fixed left-3 right-3 top-16 z-[9999] overflow-hidden rounded-[14px] bg-[var(--color-background)] p-3 shadow-[0_12px_36px_rgba(21,25,34,0.24)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[410px]">
              <div className="flex h-10 items-center justify-between px-1">
                <span className="text-sm font-circular-bold text-[var(--color-text)]">
                  Notificaciones
                </span>
                {notifications.unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-xs font-circular-bold text-[var(--color-primary)]"
                  >
                    Marcar todas como leidas
                  </button>
                ) : null}
              </div>
              <div className="max-h-[min(68vh,480px)] overflow-y-auto py-2">
                {isLoadingNotifications && notifications.data.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[var(--color-text)]/55">
                    Cargando...
                  </div>
                ) : notificationsError && notifications.data.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#ef4444]">
                    {notificationsError}
                  </div>
                ) : notifications.data.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[var(--color-text)]/55">
                    No tienes notificaciones
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.data.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => selectNotification(notification)}
                        className={cn(
                          "flex w-full gap-3 rounded-[14px] bg-[var(--color-card)] p-3 text-left shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)]",
                          !notification.readAt &&
                            "bg-[var(--color-primary)]/[0.06]",
                        )}
                      >
                        <NotificationIcon level={notification.level} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-circular-bold text-[var(--color-text)]">
                              {notification.title}
                            </span>
                            {!notification.readAt ? (
                              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[var(--color-text)]/65">
                            {notification.message}
                          </span>
                          <span className="mt-1 block text-[10px] text-[var(--color-text)]/45">
                            {relativeDate(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(false);
                  router.push("/notificaciones");
                }}
                className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-xs font-circular-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                Ver todas las notificaciones
                <ArrowRightIcon size={14} />
              </button>
            </div>
          ) : null}
        </div>

        {userName && (
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
              className="flex min-w-0 items-center gap-2 "
              aria-label="Menu de usuario"
              aria-expanded={isUserMenuOpen}
            >
              <UserAvatar
                seed={user?.id ?? userName}
                name={userName}
                size={28}
                className="size-7 ring-1 ring-[var(--color-border)]"
              />
              <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                <span className="max-w-36 truncate text-sm font-circular-regular text-[var(--color-text)] whitespace-nowrap">
                  {userName}
                </span>
                {companyName && (
                  <span className="max-w-36 truncate text-[11px]  text-[var(--color-text)]/55 whitespace-nowrap">
                    {companyName}
                  </span>
                )}
              </span>
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[180px] rounded-xl bg-[var(--color-input-bg)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  <SignOutIcon size={16} />
                  <span>Cerrar sesion</span>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}

function NotificationIcon({ level }: { level: AppNotification["level"] }) {
  const styles = {
    informacion: [InfoIcon, "bg-[#3b82f6]/10 text-[#3b82f6]"],
    exito: [CheckCircleIcon, "bg-[#10b981]/10 text-[#10b981]"],
    advertencia: [WarningCircleIcon, "bg-[#f59e0b]/10 text-[#f59e0b]"],
    error: [XCircleIcon, "bg-[#ef4444]/10 text-[#ef4444]"],
  } as const;
  const [Icon, className] = styles[level];
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg",
        className,
      )}
    >
      <Icon size={18} weight="fill" />
    </span>
  );
}

function relativeDate(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (Math.abs(seconds) < 60) return relativeTimeFormatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relativeTimeFormatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTimeFormatter.format(hours, "hour");
  return relativeTimeFormatter.format(Math.round(hours / 24), "day");
}

function positiveNumber(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
