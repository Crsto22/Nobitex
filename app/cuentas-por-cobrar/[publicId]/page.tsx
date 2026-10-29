"use client";

import { useParams, useRouter } from "next/navigation";

import { ReceivableDrawer } from "@/components/AccountsReceivable/receivable-drawer";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

export default function ReceivableDetailPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();

  return (
    <DashboardShell
      headerTitle="Detalle de cuenta"
      headerParent={{
        label: "Cuentas por cobrar",
        href: "/cuentas-por-cobrar",
      }}
    >
      <div className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:p-6">
        <ReceivableDrawer
          publicId={params.publicId}
          variant="page"
          onClose={() => router.push("/cuentas-por-cobrar")}
          onChanged={() => undefined}
        />
      </div>
    </DashboardShell>
  );
}
