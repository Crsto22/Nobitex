import { authFetch } from "@/lib/api/auth-fetch";
import type { PlatformPlanCode } from "@/lib/api/platform-admin";

export type NotificationLevel =
  "informacion" | "exito" | "advertencia" | "error";
export type NotificationAudience = "todos" | "planes" | "empresa" | "usuario";

export type AppNotification = {
  id: string;
  category:
    "aviso" | "plan" | "facturacion" | "sunat" | "limite" | "stock" | "empresa";
  level: NotificationLevel;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  data: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type RawNotificationsResponse = Omit<NotificationsResponse, "meta"> & {
  meta?: NotificationsResponse["meta"];
};

export type ManualNotification = {
  id: string;
  title: string;
  message: string;
  level: NotificationLevel;
  audience: NotificationAudience;
  audienceData: Record<string, unknown> | null;
  recipients: number;
  expiresAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
};

export type ManualNotificationsResponse = {
  data: ManualNotification[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type PublishNotificationPayload = {
  title: string;
  message: string;
  level: NotificationLevel;
  audience: NotificationAudience;
  planCodes?: PlatformPlanCode[];
  companyId?: string;
  userId?: string;
  expiresAt?: string;
};

export const notificationsApi = {
  async findMine(limit = 5, page = 1) {
    const response = await authFetch<RawNotificationsResponse>(
      `/notifications?limit=${limit}&page=${page}`,
    );
    return {
      ...response,
      meta: response.meta ?? {
        page,
        limit,
        total: response.data.length,
        totalPages: 1,
      },
    } satisfies NotificationsResponse;
  },

  markRead(id: string) {
    return authFetch<{ success: true }>(
      `/notifications/${encodeURIComponent(id)}/read`,
      {
        method: "PATCH",
      },
    );
  },

  markAllRead() {
    return authFetch<{ updated: number }>("/notifications/read-all", {
      method: "POST",
    });
  },

  findManual(page = 1, search = "") {
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search.trim()) params.set("search", search.trim());
    return authFetch<ManualNotificationsResponse>(
      `/platform-admin/notifications?${params}`,
    );
  },

  publish(payload: PublishNotificationPayload) {
    return authFetch<{ id: string; recipients: number }>(
      "/platform-admin/notifications",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  archive(id: string) {
    return authFetch<{ success: true }>(
      `/platform-admin/notifications/${encodeURIComponent(id)}/archive`,
      { method: "POST" },
    );
  },

  findCompanyUsers(companyId: string, search = "", page = 1, limit = 30) {
    const params = new URLSearchParams({
      companyId,
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set("search", search.trim());
    return authFetch<{
      data: Array<{ id: string; name: string; email: string }>;
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`/platform-admin/notifications/users?${params}`);
  },
};
