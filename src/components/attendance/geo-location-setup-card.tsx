import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Radar,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted } from "@/lib/access";
import { getBrowserCoordinates } from "@/lib/geo";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface GeoLocationSetupCardProps {
  showOpenAttendanceLink?: boolean;
  onSaved?: () => void;
}

export function GeoLocationSetupCard({
  showOpenAttendanceLink = false,
  onSaved,
}: GeoLocationSetupCardProps) {
  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const existing = pmsStore.getOfficeGeoConfig();

  const [locationName, setLocationName] = useState(
    existing?.location_name || "Linear Management Advisory — Chennai HQ"
  );
  const [address, setAddress] = useState(
    existing?.address || "No.B-36, Karthikeyan Salai, Periyar Nagar, Chennai - 600082"
  );
  const [latitude, setLatitude] = useState(
    existing?.latitude !== undefined ? String(existing.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    existing?.longitude !== undefined ? String(existing.longitude) : ""
  );
  const [radiusMeters, setRadiusMeters] = useState(
    existing?.radius_meters !== undefined ? String(existing.radius_meters) : "50"
  );
  const [coordPaste, setCoordPaste] = useState("");
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    return pmsStore.subscribe(() => {
      const latest = pmsStore.getOfficeGeoConfig();
      if (latest) {
        setLocationName(latest.location_name);
        setAddress(latest.address || "");
        setLatitude(String(latest.latitude));
        setLongitude(String(latest.longitude));
        setRadiusMeters(String(latest.radius_meters));
      }
    });
  }, []);

  const handleCaptureGps = async () => {
    setCapturing(true);
    try {
      const coords = await getBrowserCoordinates();
      setLatitude(coords.latitude.toFixed(6));
      setLongitude(coords.longitude.toFixed(6));
      toast.success(
        `Captured current GPS (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}, ±${Math.round(coords.accuracy)}m accuracy). Click Save Location to apply.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to capture current GPS location.");
    } finally {
      setCapturing(false);
    }
  };

  const handlePasteCoordinates = (val: string) => {
    setCoordPaste(val);
    const match = val.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
    if (match) {
      setLatitude(match[1]);
      setLongitude(match[2]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latitude);
    const lng = Number(longitude);
    const rad = Math.max(10, Number(radiusMeters) || 50);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.error("Please enter a valid Latitude between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.error("Please enter a valid Longitude between -180 and 180.");
      return;
    }

    pmsStore.setOfficeGeoConfig({
      location_name: locationName.trim() || "Head Office",
      address,
      latitude: lat,
      longitude: lng,
      radius_meters: rad,
    });

    toast.success(`Office Geo-Location saved (${lat.toFixed(6)}, ${lng.toFixed(6)}) within ±${rad}m.`);
    onSaved?.();
  };

  if (isEmployee) return null;

  return (
    <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#E3E2F5] text-[#272769] flex items-center justify-center">
              <Radar className="h-4 w-4" />
            </div>
            <h2 className="text-base font-extrabold text-[#16172d]">
              Admin Geo-Attendance Location Setup
            </h2>
            {existing ? (
              <Badge variant="success" className="text-[10px] rounded-full gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active &bull; ±{existing.radius_meters}m
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px] rounded-full">
                Location Not Set
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#6b7280]">
            Set the office coordinates below. Employees clicking attendance must match within{" "}
            <strong className="text-[#16172d]">±{Number(radiusMeters) || 50} meters</strong> of this location.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCaptureGps}
            disabled={capturing}
            className="h-9 rounded-xl border-slate-300 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
          >
            {capturing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#272769]" />
            ) : (
              <Crosshair className="h-3.5 w-3.5 text-[#272769]" />
            )}
            <span>{capturing ? "Detecting GPS..." : "Use My Current Location"}</span>
          </Button>

          {showOpenAttendanceLink && (
            <Link to="/attendance">
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
              >
                <span>Attendance Page</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
        <div className="md:col-span-4 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Office / Branch Name *
          </label>
          <Input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Chennai Head Office"
            className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
            required
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Latitude *
          </label>
          <Input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="13.082680"
            className="h-9 rounded-xl border-slate-300 text-xs font-mono font-semibold"
            required
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Longitude *
          </label>
          <Input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="80.270718"
            className="h-9 rounded-xl border-slate-300 text-xs font-mono font-semibold"
            required
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Radius (± meters)
          </label>
          <Input
            type="number"
            min={10}
            max={5000}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
            className="h-9 rounded-xl border-slate-300 text-xs font-bold"
            required
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="submit"
            className="w-full h-9 rounded-full bg-[#272769] hover:bg-[#1E1E4F] text-[#E0A95C] text-xs font-bold gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Location</span>
          </Button>
        </div>

        <div className="md:col-span-6 space-y-1">
          <label className="text-[11px] font-semibold text-slate-500">
            Office Address (Optional)
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full office address"
            className="h-9 rounded-xl border-slate-300 text-xs"
          />
        </div>

        <div className="md:col-span-6 space-y-1">
          <label className="text-[11px] font-semibold text-slate-500">
            Quick Paste Coordinates (e.g. from Google Maps: 13.0827, 80.2707)
          </label>
          <Input
            value={coordPaste}
            onChange={(e) => handlePasteCoordinates(e.target.value)}
            placeholder="Paste lat, lng to auto-fill Latitude & Longitude..."
            className="h-9 rounded-xl border-slate-300 text-xs font-mono"
          />
        </div>
      </form>

      {existing && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-[#272769]" />
            <span>
              <strong className="text-slate-900">{existing.location_name}</strong> &bull;{" "}
              <span className="font-mono">
                {existing.latitude.toFixed(6)}, {existing.longitude.toFixed(6)}
              </span>{" "}
              &bull; Match radius: <strong>±{existing.radius_meters}m</strong>
            </span>
          </span>
          <span className="text-slate-400">
            Updated {formatDateTime(existing.updated_at)} by {existing.updated_by_name || "Admin"}
          </span>
        </div>
      )}
    </div>
  );
}

