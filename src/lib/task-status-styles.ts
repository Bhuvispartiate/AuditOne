import { TaskStatusColor, TaskStatusConfig } from "@/types";

export interface TaskStatusVisualStyle {
  columnContainer: string;
  headerBorder: string;
  badgeVariant: "secondary" | "default" | "warning" | "destructive" | "success";
  barClass: string;
  pillClass: string;
  dotClass: string;
  label: string;
}

const COLOR_MAP: Record<TaskStatusColor, TaskStatusVisualStyle> = {
  slate: {
    columnContainer: "border-slate-300 bg-slate-50/70",
    headerBorder: "border-slate-200",
    badgeVariant: "secondary",
    barClass: "bg-slate-500 text-white",
    pillClass: "bg-slate-100 text-slate-800 border-slate-300",
    dotClass: "bg-slate-500",
    label: "Slate",
  },
  violet: {
    columnContainer: "border-[#E6E4F0] bg-white",
    headerBorder: "border-[#E6E4F0]",
    badgeVariant: "default",
    barClass: "bg-[#272769] text-white",
    pillClass: "bg-[#E3E2F5] text-[#272769] border-[#E6E4F0]",
    dotClass: "bg-[#272769]",
    label: "Navy (On Track)",
  },
  amber: {
    columnContainer: "border-amber-200 bg-amber-50/40",
    headerBorder: "border-amber-200",
    badgeVariant: "warning",
    barClass: "bg-[#E0A95C] text-[#1E1E4F]",
    pillClass: "bg-[#F6E4C5] text-[#6B4A12] border-amber-200",
    dotClass: "bg-[#E0A95C]",
    label: "Gold (At Risk)",
  },
  sky: {
    columnContainer: "border-sky-300 bg-sky-50/40",
    headerBorder: "border-sky-200",
    badgeVariant: "secondary",
    barClass: "bg-sky-600 text-white",
    pillClass: "bg-sky-50 text-sky-800 border-sky-200",
    dotClass: "bg-sky-600",
    label: "Sky Blue",
  },
  rose: {
    columnContainer: "border-rose-300 bg-rose-50/40",
    headerBorder: "border-rose-200",
    badgeVariant: "destructive",
    barClass: "bg-rose-600 text-white",
    pillClass: "bg-rose-50 text-rose-800 border-rose-200",
    dotClass: "bg-rose-600",
    label: "Rose",
  },
  emerald: {
    columnContainer: "border-emerald-300 bg-emerald-50/40",
    headerBorder: "border-emerald-200",
    badgeVariant: "success",
    barClass: "bg-emerald-600 text-white",
    pillClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-600",
    label: "Emerald",
  },
};

export const TASK_STATUS_COLOR_OPTIONS: Array<{ value: TaskStatusColor; label: string }> = (
  Object.keys(COLOR_MAP) as TaskStatusColor[]
).map((key) => ({
  value: key,
  label: COLOR_MAP[key].label,
}));

export function getStyleForColor(color?: TaskStatusColor): TaskStatusVisualStyle {
  return COLOR_MAP[color || "slate"] || COLOR_MAP.slate;
}

export function getTaskStatusVisual(
  statusLabel: string,
  configuredStatuses: TaskStatusConfig[]
): TaskStatusVisualStyle {
  const normalized = statusLabel.trim().toLowerCase();
  const matched = configuredStatuses.find(
    (s) => s.label.trim().toLowerCase() === normalized
  );
  if (matched) return getStyleForColor(matched.color);

  if (normalized === "completed" || normalized === "done") return COLOR_MAP.emerald;
  if (normalized === "in progress") return COLOR_MAP.violet;
  if (normalized === "pending") return COLOR_MAP.amber;
  if (normalized === "under review") return COLOR_MAP.sky;
  if (normalized === "blocked") return COLOR_MAP.rose;
  return COLOR_MAP.slate;
}

