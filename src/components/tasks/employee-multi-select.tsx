import React, { useState, useMemo } from "react";
import { Search, X, Check, Users, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/types";

export interface EmployeeMultiSelectProps {
  employees: Employee[];
  selectedEmployeeIds: string[];
  onChange: (selectedIds: string[], selectedEmployees: Employee[]) => void;
  label?: string;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export const EmployeeMultiSelect: React.FC<EmployeeMultiSelectProps> = ({
  employees,
  selectedEmployeeIds,
  onChange,
  label = "Assigned Team Members",
  placeholder = "Search employees by name, designation, or code...",
  readOnly = false,
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const activeEmployees = useMemo(() => {
    const raw = (employees || []).filter((e) => e.is_active !== false && e.employment_status !== "Terminated");
    const seen = new Set<string>();
    const unique: Employee[] = [];
    for (const emp of raw) {
      const nameKey = (emp.full_name || "").trim().toLowerCase();
      const codeKey = (emp.employee_code || "").trim().toLowerCase();
      const idKey = emp.id;
      if (!seen.has(idKey) && !seen.has(nameKey)) {
        seen.add(idKey);
        if (nameKey) seen.add(nameKey);
        if (codeKey) seen.add(codeKey);
        unique.push(emp);
      }
    }
    return unique;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.designation_name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.team_name?.toLowerCase().includes(q)
    );
  }, [activeEmployees, searchQuery]);

  const selectedEmployees = useMemo(() => {
    const raw = employees || [];
    return activeEmployees.filter((e) => {
      if (selectedEmployeeIds.includes(e.id)) return true;
      return selectedEmployeeIds.some((selId) => {
        const matchingRaw = raw.find((r) => r.id === selId);
        return matchingRaw && matchingRaw.full_name?.trim().toLowerCase() === e.full_name?.trim().toLowerCase();
      });
    });
  }, [activeEmployees, selectedEmployeeIds, employees]);

  const handleToggle = (empId: string) => {
    if (readOnly) return;
    let nextIds: string[];
    if (selectedEmployeeIds.includes(empId)) {
      nextIds = selectedEmployeeIds.filter((id) => id !== empId);
    } else {
      nextIds = [...selectedEmployeeIds, empId];
    }
    const nextEmps = activeEmployees.filter((e) => nextIds.includes(e.id));
    onChange(nextIds, nextEmps);
  };

  const handleRemove = (empId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    const nextIds = selectedEmployeeIds.filter((id) => id !== empId);
    const nextEmps = activeEmployees.filter((e) => nextIds.includes(e.id));
    onChange(nextIds, nextEmps);
  };

  const handleSelectAllFiltered = () => {
    if (readOnly) return;
    const currentSet = new Set(selectedEmployeeIds);
    filteredEmployees.forEach((emp) => currentSet.add(emp.id));
    const nextIds = Array.from(currentSet);
    const nextEmps = activeEmployees.filter((e) => nextIds.includes(e.id));
    onChange(nextIds, nextEmps);
  };

  const handleClearAll = () => {
    if (readOnly) return;
    onChange([], []);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#201815]" />
            <span>{label}</span>
          </label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-bold rounded-full px-2 py-0.5">
              {selectedEmployeeIds.length} Selected
            </Badge>
            {!readOnly && selectedEmployeeIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[10px] font-bold text-slate-500 hover:text-rose-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Assignees Chips */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200">
          {selectedEmployees.map((emp) => {
            const initials = emp.full_name
              ? emp.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "EM";

            return (
              <span
                key={emp.id}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-white border border-slate-300 shadow-xs text-xs font-semibold text-slate-800 transition-all hover:border-[#201815]"
              >
                <span className="h-5 w-5 rounded-full bg-[#EFE8DC] text-[#201815] font-bold text-[10px] flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="truncate max-w-[130px]">{emp.full_name}</span>
                {emp.designation_name && (
                  <span className="text-[10px] text-slate-600 truncate max-w-[90px]">
                    ({emp.designation_name})
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(emp.id, e)}
                    className="h-4 w-4 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 ml-0.5"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Search Input Box */}
      {!readOnly && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-8 pr-8 h-9 text-xs rounded-xl border-slate-300 bg-white font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Multi-Select Options Scroll List */}
      {!readOnly && (
        <div className="rounded-xl border border-slate-200 bg-white max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-xs">
          {filteredEmployees.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No team members match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = selectedEmployeeIds.includes(emp.id);
              const initials = emp.full_name
                ? emp.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "EM";

              return (
                <div
                  key={emp.id}
                  onClick={() => handleToggle(emp.id)}
                  className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                    isSelected ? "bg-[#EFE8DC]/80 text-[#201815] font-bold" : "hover:bg-slate-50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#201815] border-[#201815] text-[#FAF8F5]"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-slate-900">{emp.full_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {emp.designation_name || emp.employee_code || "Staff"}
                        {emp.team_name ? ` • ${emp.team_name}` : ""}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Badge variant="outline" className="border-[#E2DACD] bg-[#EFE8DC] text-[#201815] text-[10px] font-bold rounded-md shrink-0">
                      Assigned
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

