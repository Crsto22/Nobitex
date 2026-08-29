import { authFetch } from "@/lib/api/auth-fetch";
import type { DashboardDateFilter } from "@/lib/api/dashboard";

export type AttendanceDashboardSummary = {
  attendances: number;
  absences: number;
  lateArrivals: number;
  incompleteEntries: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesWithShift: number;
  employeesWithoutShift: number;
  activeShifts: number;
  activeQrPoints: number;
};

export type AttendanceDashboardStatusItem = {
  name: string;
  value: number;
  color: string;
};

export type AttendanceDashboardTrendItem = {
  date: string;
  label: string;
  asistencias: number;
  faltas: number;
  tardanzas: number;
  incompletos: number;
};

export type AttendanceDashboardShiftItem = {
  turnoId: string | null;
  name: string;
  value: number;
};

export type AttendanceDashboardQrBranchItem = {
  sucursalId: string;
  name: string;
  value: number;
};

export type AttendanceDashboardBranchItem = {
  sucursalId: string | null;
  name: string;
  value: number;
};

export type AttendanceDashboardResponse = {
  filters: {
    sucursalId: string | null;
    dateFilter: DashboardDateFilter;
    range: {
      start: string;
      end: string;
    };
  };
  summary: AttendanceDashboardSummary;
  employeesByStatus: AttendanceDashboardStatusItem[];
  attendanceByStatus: AttendanceDashboardStatusItem[];
  attendanceTrend: AttendanceDashboardTrendItem[];
  attendanceByBranch: AttendanceDashboardBranchItem[];
  employeesByShift: AttendanceDashboardShiftItem[];
  qrPointsByBranch: AttendanceDashboardQrBranchItem[];
  alerts: {
    employeesWithoutShift: number;
    inactiveShifts: number;
    inactiveQrPoints: number;
    branchesWithQrTotal: number;
  };
};

export type AttendanceDashboardQuery = {
  sucursalId?: string;
  dateFilter?: DashboardDateFilter;
};

export const attendanceDashboardApi = {
  find(query: AttendanceDashboardQuery = {}, options: RequestInit = {}) {
    const params = new URLSearchParams();

    if (query.sucursalId && query.sucursalId !== "all") {
      params.set("sucursalId", query.sucursalId);
    }

    if (query.dateFilter) {
      params.set("dateFilter", query.dateFilter);
    }

    const queryString = params.toString();
    return authFetch<AttendanceDashboardResponse>(
      queryString
        ? `/attendance/dashboard?${queryString}`
        : "/attendance/dashboard",
      options,
    );
  },
};
