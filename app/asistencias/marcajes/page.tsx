"use client";

import { ClockUserIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasMarcajesPage() {
  return (
    <AttendancePlaceholder
      title="Asistencias"
      description="Registro y revision de marcajes."
      icon={ClockUserIcon}
    />
  );
}
