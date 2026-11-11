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
    columnContainer: "border-violet-300 bg-violet-50/40",
    headerBorder: "border-violet-200",
    badgeVariant: "default",
    barClass: "bg-violet-600 text-white",
    pillClass: "bg-violet-50 text-violet-800 border-violet-200",
    dotClass: "bg-violet-600",
    label: "Violet",
  },
  amber: {
    columnContainer: "border-amber-300 bg-amber-50/40",
    headerBorder: "border-amber-200",
    badgeVariant: "warning",
    barClass: "bg-amber-500 text-white",
    pillClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
    label: "Amber",
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

