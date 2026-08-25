"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasTurnosPage() {
  return (
    <AttendancePlaceholder
      title="Turnos"
      description="Turnos y horarios de trabajo."
      icon={CalendarBlankIcon}
    />
  );
}
