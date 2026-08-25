"use client";

import { PresentationChartIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasReportesPage() {
  return (
    <AttendancePlaceholder
      title="Reportes"
      description="Reportes de asistencias."
      icon={PresentationChartIcon}
    />
  );
}
