import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  LogOut,
  MapPin,
  Radar,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GeoLocationSetupCard } from "@/components/attendance/geo-location-setup-card";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted } from "@/lib/access";
import { formatDistance, getBrowserCoordinates } from "@/lib/geo";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function AttendancePage() {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [markingEmployeeId, setMarkingEmployeeId] = useState<string | null>(null);
  const [lastGeoResultByEmp, setLastGeoResultByEmp] = useState<
    Record<string, { matched: boolean; distanceMeters: number; radiusMeters: number; msg: string }>
  >({});

  useEffect(() => {
    return pmsStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const rawEmployees = pmsStore.getEmployees();
  const employees = isEmployee
    ? rawEmployees.filter((e) => e.id === empId)
    : rawEmployees;
  const geoConfig = pmsStore.getOfficeGeoConfig();
  const todayStr = new Date().toISOString().slice(0, 10);
  const rawRecords = pmsStore.getAttendanceRecords();
  const allRecords = isEmployee
    ? rawRecords.filter((r) => r.employee_id === empId)
    : rawRecords;
  const todayRecords = useMemo(
    () => allRecords.filter((r) => r.date === todayStr),
    [allRecords, todayStr]
  );
  const myTodayRecord = todayRecords.find((r) => r.employee_id === empId);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.full_name.toLowerCase().includes(q) ||
        emp.employee_code.toLowerCase().includes(q) ||
        (emp.designation_name && emp.designation_name.toLowerCase().includes(q))
    );
  }, [employees, search]);

  const dateFilteredLogs = useMemo(() => {
    return allRecords.filter((rec) => (!selectedDate ? true : rec.date === selectedDate));
  }, [allRecords, selectedDate]);

  const presentCount = useMemo(() => {
    const presentIds = new Set(
      todayRecords
        .filter((r) => r.matched && (r.status === "Present" || r.status === "Checked Out"))
        .map((r) => r.employee_id)
    );
    return presentIds.size;
  }, [todayRecords]);

  const checkedOutCount = useMemo(() => {
    const outIds = new Set(
      todayRecords
        .filter((r) => r.matched && r.status === "Checked Out")
        .map((r) => r.employee_id)
    );
    return outIds.size;
  }, [todayRecords]);

  const pendingCount = Math.max(0, employees.length - presentCount);

  const handleClickAttendance = async (
    employeeId: string,
    employeeName: string,
    action: "check-in" | "check-out" = "check-in"
  ) => {
    if (!geoConfig) {
      toast.error("Admin must set the office Geo-Location first before marking attendance.");
      return;
    }

    setMarkingEmployeeId(employeeId);
    try {
      const coords = await getBrowserCoordinates();
      const result = pmsStore.markAttendanceByGeo({
        employee_id: employeeId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: coords.accuracy,
        action,
      });

      setLastGeoResultByEmp((prev) => ({
        ...prev,
        [employeeId]: {
          matched: result.matched,
          distanceMeters: result.distanceMeters,
          radiusMeters: result.radiusMeters,
          msg: result.matched
            ? `Matched ${formatDistance(result.distanceMeters)} from office (±${result.radiusMeters}m)`
            : result.error || `Outside ±${result.radiusMeters}m limit`,
        },
      }));

      if (result.matched) {
        toast.success(
          action === "check-out"
            ? `${employeeName} checked out (${formatDistance(result.distanceMeters)} from office).`
            : `${employeeName} marked Present! (${formatDistance(result.distanceMeters)} from office — within ±${result.radiusMeters}m)`
        );
      } else {
        toast.error(
          result.error ||
            `${employeeName}: ${result.distanceMeters}m away (allowed within ±${result.radiusMeters}m).`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify GPS location.");
    } finally {
      setMarkingEmployeeId(null);
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = dateFilteredLogs.map((r) => ({
      Date: r.date,
      "Employee Code": r.employee_code || "—",
      Employee: r.employee_name,
      Status: r.status,
      "Geo Match": r.matched ? "Matched" : "Out of Range",
      "Distance (m)": r.distance_meters,
      "Allowed Radius (m)": r.allowed_radius_meters,
      "Check-In Time": formatDateTime(r.check_in_at),
      "Check-Out Time": r.check_out_at ? formatDateTime(r.check_out_at) : "—",
      Coordinates: `${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}`,
      Location: r.location_name || "Head Office",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Geo Attendance");
    XLSX.writeFile(wb, `Linear_Audit_Attendance_${selectedDate || "All"}.xlsx`);
    toast.success("Attendance register exported to Excel.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Employee Geo-Attendance
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-9 px-3 rounded-xl border-slate-300 bg-white font-mono text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#6c5ce7]" />
            Today: {formatDate(todayStr)}
          </Badge>
          {!isEmployee && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 rounded-xl border-slate-300 bg-white text-xs font-bold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Row (Box View) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[22px] bg-white border-[1.5px] border-slate-300 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] block">
              {isEmployee ? "My Status Today" : "Total Staff"}
            </span>
            <span className="text-2xl font-extrabold text-[#16172d] mt-1 block">
              {isEmployee
                ? myTodayRecord?.check_in_at
                  ? myTodayRecord.check_out_at
                    ? "Checked Out"
                    : "Checked In"
                  : "Pending"
                : employees.length}
            </span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-[#f3f0ff] text-[#6c5ce7] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-[22px] bg-white border-[1.5px] border-slate-300 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] block">
              {isEmployee ? "Check-In Time" : "Present Today"}
            </span>
            {isEmployee ? (
              <span className="text-sm font-extrabold text-emerald-700 mt-1.5 block">
                {myTodayRecord?.check_in_at
                  ? formatDateTime(myTodayRecord.check_in_at)
                  : "Not Marked"}
              </span>
            ) : (
              <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                {presentCount}
                {checkedOutCount > 0 && (
                  <span className="ml-1.5 text-xs font-semibold text-slate-500">
                    ({checkedOutCount} out)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-[22px] bg-white border-[1.5px] border-slate-300 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] block">
              {isEmployee ? "Check-Out Time" : "Yet to Mark"}
            </span>
            {isEmployee ? (
              <span className="text-sm font-extrabold text-amber-700 mt-1.5 block">
                {myTodayRecord?.check_out_at
                  ? formatDateTime(myTodayRecord.check_out_at)
                  : "—"}
              </span>
            ) : (
              <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-[22px] bg-white border-[1.5px] border-slate-300 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] block">
              Geo-Fence Radius
            </span>
            <span className="text-2xl font-extrabold text-[#19196f] mt-1 block">
              ±{geoConfig?.radius_meters || 50}m
            </span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-[#19196f] flex items-center justify-center">
            <Radar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Admin Geo-Fence Configuration Card (Admin Only) */}
      {!isEmployee && <GeoLocationSetupCard />}

      {/* Employees Attendance Cards (Click Attendance) */}
      <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-extrabold text-[#16172d] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#6c5ce7]" />
              <span>
                {isEmployee
                  ? "My Personal GPS Attendance Card"
                  : `All Employees — Click Attendance (${employees.length})`}
              </span>
            </h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Click <strong>Click Attendance</strong> to verify GPS position within ±
              {geoConfig?.radius_meters || 50}m of {geoConfig?.location_name || "the office location"}.
            </p>
          </div>

          {!isEmployee && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
              <Input
                type="search"
                placeholder="Search employee name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl border-slate-300 text-xs"
              />
            </div>
          )}
        </div>

        {!geoConfig && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3 text-xs text-amber-900">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              Office location is not set yet. Use <strong>Use My Current Location</strong> or enter coordinates above and click <strong>Save Location</strong> before marking attendance.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const matchedToday = todayRecords.find(
              (r) => r.employee_id === emp.id && r.matched
            );
            const lastAttempt = lastGeoResultByEmp[emp.id];
            const isBusy = markingEmployeeId === emp.id;

            const initials = emp.full_name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase();

            return (
              <div
                key={emp.id}
                className={`rounded-2xl border-[1.5px] p-4 flex flex-col justify-between gap-4 transition-all ${
                  matchedToday?.status === "Checked Out"
                    ? "border-slate-300 bg-slate-50/80"
                    : matchedToday?.status === "Present"
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-slate-300 bg-white hover:border-[#6c5ce7]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-[#16172d] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-[#111827] truncate">
                        {emp.full_name}
                      </div>
                      <div className="text-[11px] text-[#6b7280] font-mono truncate">
                        {emp.employee_code} &bull; {emp.designation_name || emp.role_code || "Staff"}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      matchedToday?.status === "Present"
                        ? "success"
                        : matchedToday?.status === "Checked Out"
                          ? "secondary"
                          : "warning"
                    }
                    className="text-[10px] rounded-full shrink-0"
                  >
                    {matchedToday ? matchedToday.status : "Not Marked"}
                  </Badge>
                </div>

                {matchedToday ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Check-In:</span>
                      <span className="font-bold text-slate-900">
                        {new Date(matchedToday.check_in_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {matchedToday.check_out_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Check-Out:</span>
                        <span className="font-bold text-slate-900">
                          {new Date(matchedToday.check_out_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Geo Distance:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatDistance(matchedToday.distance_meters)} (≤{" "}
                        {matchedToday.allowed_radius_meters}m)
                      </span>
                    </div>
                  </div>
                ) : lastAttempt ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-[11px] font-medium ${
                      lastAttempt.matched
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {lastAttempt.msg}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
                    Ready for GPS attendance match (±{geoConfig?.radius_meters || 50}m)
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!matchedToday && (
                    <Button
                      type="button"
                      onClick={() => handleClickAttendance(emp.id, emp.full_name, "check-in")}
                      disabled={isBusy || !geoConfig}
                      className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      <span>{isBusy ? "Verifying GPS..." : "Click Attendance"}</span>
                    </Button>
                  )}

                  {matchedToday?.status === "Present" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleClickAttendance(emp.id, emp.full_name, "check-out")}
                      disabled={isBusy || !geoConfig}
                      className="w-full h-9 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold gap-1.5"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      <span>{isBusy ? "Verifying GPS..." : "Check Out (GPS)"}</span>
                    </Button>
                  )}

                  {matchedToday?.status === "Checked Out" && (
                    <div className="w-full h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Checked Out for Today</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendance Verification Log Table */}
      <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-extrabold text-[#16172d]">
              Attendance &amp; Geo-Verification Log ({dateFilteredLogs.length})
            </h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Immutable GPS check-in, check-out, and out-of-range verification logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-40 rounded-xl border-slate-300 text-xs font-semibold"
            />
            {selectedDate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate("")}
                className="h-9 rounded-xl border-slate-300 text-xs font-bold"
              >
                All Dates
              </Button>
            )}
          </div>
        </div>

        {dateFilteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            No attendance logs recorded for {selectedDate || "any date"} yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Distance Match</th>
                  <th className="py-3 px-4">GPS Coords</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dateFilteredLogs.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-[#111827]">
                      {rec.employee_name}
                      {rec.employee_code && (
                        <span className="ml-1.5 font-mono text-[10px] text-slate-500 font-normal">
                          ({rec.employee_code})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{rec.date}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(rec.check_in_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {rec.check_out_at
                        ? new Date(rec.check_out_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      <span className={rec.matched ? "text-emerald-700" : "text-rose-600"}>
                        {formatDistance(rec.distance_meters)}
                      </span>{" "}
                      <span className="text-slate-400">/ ±{rec.allowed_radius_meters}m</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          rec.status === "Present"
                            ? "success"
                            : rec.status === "Checked Out"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {rec.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
