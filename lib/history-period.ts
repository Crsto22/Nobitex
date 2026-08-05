export type HistoryPeriod =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "custom";

export type HistoryPeriodQuery = {
  period?: HistoryPeriod;
  dateFrom?: string;
  dateTo?: string;
};

export type HistoryPeriodValue = {
  period: HistoryPeriod;
  dateFrom: string;
  dateTo: string;
};

export const defaultHistoryPeriod: HistoryPeriodValue = {
  period: "today",
  dateFrom: "",
  dateTo: "",
};

export function appendHistoryPeriod(
  params: URLSearchParams,
  query: HistoryPeriodQuery,
) {
  params.set("period", query.period ?? "today");
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
}
