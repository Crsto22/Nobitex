"use client";

import { SquaresFourIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasDashboardPage() {
  return (
    <AttendancePlaceholder
      title="Dashboard de asistencias"
      description="Resumen general de asistencias."
      icon={SquaresFourIcon}
    />
  );
}
