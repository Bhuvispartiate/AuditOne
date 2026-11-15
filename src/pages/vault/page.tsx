import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Clock,
  Building2,
  User,
  Users,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Pencil,
  Sparkles,
  Sliders,
  Calendar,
  Info,
  Check,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted, isSuperAdmin } from "@/lib/access";
import {
  VaultCredential,
  VaultCategory,
  VaultAuditLog,
  VaultAuditAction,
  VaultPasswordHistoryEntry,
  Client,
  Employee,
} from "@/types";
import {
  encryptVaultPassword,
  decryptVaultPassword,
  generateStrongPassword,
  calculatePasswordStrength,
  PasswordGeneratorOptions,
} from "@/lib/vault-crypto";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { EmployeeMultiSelect } from "@/components/tasks/employee-multi-select";

const VAULT_CATEGORIES: VaultCategory[] = [
  "Taxation",
  "Corporate / MCA",
  "Banking & Finance",
  "Payroll & Labour",
  "Government & DGFT",
  "Cloud & Software",
  "Other",
];

const PORTAL_PRESETS = [
  { name: "GST Portal", url: "https://www.gst.gov.in", category: "Taxation" as VaultCategory },
  { name: "Income Tax e-Filing", url: "https://www.incometax.gov.in", category: "Taxation" as VaultCategory },
  { name: "TRACES TDS Portal", url: "https://contents.tdscpc.gov.in", category: "Taxation" as VaultCategory },
  { name: "MCA21 V3 Portal", url: "https://www.mca.gov.in", category: "Corporate / MCA" as VaultCategory },
  { name: "EPFO Unified Portal", url: "https://unifiedportal-emp.epfindia.gov.in", category: "Payroll & Labour" as VaultCategory },
  { name: "ESIC Portal", url: "https://www.esic.in", category: "Payroll & Labour" as VaultCategory },
  { name: "DGFT Portal", url: "https://www.dgft.gov.in", category: "Government & DGFT" as VaultCategory },
  { name: "Icegate Customs", url: "https://www.icegate.gov.in", category: "Government & DGFT" as VaultCategory },
  { name: "HDFC NetBanking", url: "https://netbanking.hdfcbank.com", category: "Banking & Finance" as VaultCategory },
  { name: "ICICI Corporate", url: "https://cibnext.icicibank.com", category: "Banking & Finance" as VaultCategory },
  { name: "SBI Corporate", url: "https://corp.onlinesbi.sbi", category: "Banking & Finance" as VaultCategory },
];

export default function VaultPage() {
  const [, setTick] = useState(0);

  // Subscribe to central store
  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isAdmin = !isEmployeeRestricted(currentUser) || isSuperAdmin(currentUser);
  const clients = pmsStore.getClients();
  const employees = pmsStore.getEmployees();
  const credentials = pmsStore.getVaultCredentials();
  const auditLogs = pmsStore.getVaultAuditLogs();

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [filterRotationOnly, setFilterRotationOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Temporary in-memory decrypted passwords map: { [credentialId]: { plaintext: string; expiryMs: number } }
  const [decryptedCache, setDecryptedCache] = useState<{ [id: string]: { plaintext: string; expiryMs: number } }>({});
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Periodic cleanup of decrypted passwords from memory after 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDecryptedCache((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [id, val] of Object.entries(prev)) {
          if (val.expiryMs > now) {
            next[id] = val;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<VaultCredential | null>(null);

  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetCred, setHistoryTargetCred] = useState<VaultCredential | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Form Fields State
  const [formPortalName, setFormPortalName] = useState("");
  const [formLoginUrl, setFormLoginUrl] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPasswordPlaintext, setFormPasswordPlaintext] = useState("");
  const [formRegEmail, setFormRegEmail] = useState("");
  const [formRegMobile, setFormRegMobile] = useState("");
  const [formAccountHolder, setFormAccountHolder] = useState("");
  const [formCategory, setFormCategory] = useState<VaultCategory>("Taxation");
  const [formClientId, setFormClientId] = useState("");
  const [formAssignedEmpIds, setFormAssignedEmpIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formRotationDays, setFormRotationDays] = useState<number>(90);
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Standalone Generator State
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNums, setGenNums] = useState(true);
  const [genSyms, setGenSyms] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState("");

  useEffect(() => {
    if (isGeneratorModalOpen) {
      handleRegenerateStandalone();
    }
  }, [isGeneratorModalOpen]);

  const handleRegenerateStandalone = () => {
    const pw = generateStrongPassword({
      length: genLength,
      uppercase: genUpper,
      lowercase: genLower,
      numbers: genNums,
      symbols: genSyms,
    });
    setGeneratedPassword(pw);
  };

  // Check if current user has permission to access a specific credential
  const canAccessCredential = (cred: VaultCredential): boolean => {
    if (isAdmin) return true;
    if (!cred.assigned_employee_ids || cred.assigned_employee_ids.length === 0) return true;
    return cred.assigned_employee_ids.includes(currentUser.id);
  };

  // Helper: Is credential overdue for password rotation?
  const isRotationDue = (cred: VaultCredential): boolean => {
    const lastChanged = new Date(cred.last_password_changed_at || cred.created_at).getTime();
    const daysSince = (Date.now() - lastChanged) / (1000 * 60 * 60 * 24);
    return daysSince >= (cred.rotation_reminder_days || 90);
  };

  const getDaysSinceRotation = (cred: VaultCredential): number => {
    const lastChanged = new Date(cred.last_password_changed_at || cred.created_at).getTime();
    return Math.max(0, Math.floor((Date.now() - lastChanged) / (1000 * 60 * 60 * 24)));
  };

  // Filtered credentials list
  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      // Permission filtering for restricted employees
      if (!isAdmin && !canAccessCredential(cred)) {
        return false;
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        cred.portal_name.toLowerCase().includes(q) ||
        cred.username.toLowerCase().includes(q) ||
        (cred.client_name && cred.client_name.toLowerCase().includes(q)) ||
        (cred.account_holder_name && cred.account_holder_name.toLowerCase().includes(q)) ||
        (cred.registered_email && cred.registered_email.toLowerCase().includes(q)) ||
        (cred.registered_mobile && cred.registered_mobile.toLowerCase().includes(q)) ||
        (cred.notes && cred.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedCategory !== "ALL" && cred.category !== selectedCategory) return false;
      if (selectedClientId !== "ALL" && cred.client_id !== selectedClientId) return false;
      if (filterRotationOnly && !isRotationDue(cred)) return false;

      return true;
    });
  }, [credentials, search, selectedCategory, selectedClientId, filterRotationOnly, isAdmin, currentUser.id]);

  // Rotation due counter
  const rotationDueCount = useMemo(() => {
    return credentials.filter((c) => isRotationDue(c)).length;
  }, [credentials]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCred(null);
    setFormPortalName("");
    setFormLoginUrl("");
    setFormUsername("");
    const initialPw = generateStrongPassword({ length: 16 });
    setFormPasswordPlaintext(initialPw);
    setFormRegEmail("");
    setFormRegMobile("");
    setFormAccountHolder("");
    setFormCategory("Taxation");
    setFormClientId("");
    setFormAssignedEmpIds([]);
    setFormNotes("");
    setFormRotationDays(90);
    setFormShowPassword(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = async (cred: VaultCredential) => {
    if (!canAccessCredential(cred)) {
      toast.error("Security policy: You are not authorized to edit this credential.");
      return;
    }
    setEditingCred(cred);
    setFormPortalName(cred.portal_name);
    setFormLoginUrl(cred.login_url || "");
    setFormUsername(cred.username);
    setFormRegEmail(cred.registered_email || "");
    setFormRegMobile(cred.registered_mobile || "");
    setFormAccountHolder(cred.account_holder_name || "");
    setFormCategory(cred.category || "Taxation");
    setFormClientId(cred.client_id || "");
    setFormAssignedEmpIds(cred.assigned_employee_ids || []);
    setFormNotes(cred.notes || "");
    setFormRotationDays(cred.rotation_reminder_days || 90);
    setFormShowPassword(false);

    // Try to decrypt current password for editing
    try {
      const decrypted = await decryptVaultPassword(cred.password_encrypted);
      setFormPasswordPlaintext(decrypted);
    } catch {
      setFormPasswordPlaintext("");
    }

    setIsFormModalOpen(true);
  };

  // Save / Submit Credential
  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPortalName.trim()) {
      toast.error("Please enter a portal or application name.");
      return;
    }
    if (!formUsername.trim()) {
      toast.error("Please enter the login username or user ID.");
      return;
    }
    if (!formPasswordPlaintext.trim()) {
      toast.error("Please enter or generate a password.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Encrypt with AES-256-GCM
      const encrypted = await encryptVaultPassword(formPasswordPlaintext.trim());

      const chosenClient = clients.find((c) => c.id === formClientId);
      const assignedNames = formAssignedEmpIds
        .map((id) => employees.find((e) => e.id === id)?.full_name)
        .filter(Boolean)
        .join(", ");

      if (editingCred) {
        // Update
        await pmsStore.updateVaultCredential(editingCred.id, {
          portal_name: formPortalName.trim(),
          login_url: formLoginUrl.trim(),
          username: formUsername.trim(),
          password_encrypted: encrypted,
          registered_email: formRegEmail.trim() || undefined,
          registered_mobile: formRegMobile.trim() || undefined,
          account_holder_name: formAccountHolder.trim() || undefined,
          category: formCategory,
          client_id: chosenClient?.id,
          client_name: chosenClient?.client_name,
          assigned_employee_ids: formAssignedEmpIds,
          assigned_employee_names: assignedNames || undefined,
          notes: formNotes.trim() || undefined,
          rotation_reminder_days: Number(formRotationDays) || 90,
        });
        toast.success(`Updated "${formPortalName}" with AES-256-GCM encryption.`);
      } else {
        // Create
        await pmsStore.addVaultCredential({
          portal_name: formPortalName.trim(),
          login_url: formLoginUrl.trim(),
          username: formUsername.trim(),
          password_encrypted: encrypted,
          registered_email: formRegEmail.trim() || undefined,
          registered_mobile: formRegMobile.trim() || undefined,
          account_holder_name: formAccountHolder.trim() || undefined,
          category: formCategory,
          client_id: chosenClient?.id,
          client_name: chosenClient?.client_name,
          assigned_employee_ids: formAssignedEmpIds,
          assigned_employee_names: assignedNames || undefined,
          notes: formNotes.trim() || undefined,
          last_password_changed_at: new Date().toISOString(),
          rotation_reminder_days: Number(formRotationDays) || 90,
        });
        toast.success(`Stored credential for "${formPortalName}" securely in Vault.`);
      }

      setIsFormModalOpen(false);
    } catch (err: any) {
      toast.error(`Encryption error: ${err.message || "Failed to secure password."}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reveal / Hide Password toggle
  const handleToggleReveal = async (cred: VaultCredential) => {
    if (!canAccessCredential(cred)) {
      toast.error("Permission denied: You do not have access to view this credential.");
      return;
    }

    // If currently decrypted and visible, hide it
    if (decryptedCache[cred.id]) {
      setDecryptedCache((prev) => {
        const next = { ...prev };
        delete next[cred.id];
        return next;
      });
      return;
    }

    // Decrypt on-demand with AES-256-GCM
    setDecryptingId(cred.id);
    try {
      const plaintext = await decryptVaultPassword(cred.password_encrypted);

      // Cache for 30 seconds only, then automatically wipe
      const expiryMs = Date.now() + 30 * 1000;
      setDecryptedCache((prev) => ({
        ...prev,
        [cred.id]: { plaintext, expiryMs },
      }));

      // Record in security audit log
      pmsStore.logVaultActivity({
        credential_id: cred.id,
        portal_name: cred.portal_name,
        action: "VIEW",
        performed_by_id: currentUser.id,
        performed_by_name: currentUser.full_name,
        details: `Decrypted and viewed password for "${cred.portal_name}" (${cred.username})`,
        client_name: cred.client_name,
      });

      toast.info(`Password revealed for 30 seconds. (Audit logged)`);
    } catch (err: any) {
      toast.error(err.message || "Decryption failed. Authentication tag mismatch.");
    } finally {
      setDecryptingId(null);
    }
  };

  // Copy Password to Clipboard
  const handleCopyPassword = async (cred: VaultCredential) => {
    if (!canAccessCredential(cred)) {
      toast.error("Permission denied: You do not have access to copy this password.");
      return;
    }

    try {
      let plaintext = decryptedCache[cred.id]?.plaintext;
      if (!plaintext) {
        plaintext = await decryptVaultPassword(cred.password_encrypted);
      }

      await navigator.clipboard.writeText(plaintext);

      // Record in security audit log
      pmsStore.logVaultActivity({
        credential_id: cred.id,
        portal_name: cred.portal_name,
        action: "COPY_PASSWORD",
        performed_by_id: currentUser.id,
        performed_by_name: currentUser.full_name,
        details: `Copied password for "${cred.portal_name}" to clipboard`,
        client_name: cred.client_name,
      });

      toast.success(`Password for "${cred.portal_name}" copied to clipboard! (Audit logged)`);
    } catch (err: any) {
      toast.error(err.message || "Failed to copy password.");
    }
  };

  // Copy Username to Clipboard
  const handleCopyUsername = async (cred: VaultCredential) => {
    try {
      await navigator.clipboard.writeText(cred.username);
      pmsStore.logVaultActivity({
        credential_id: cred.id,
        portal_name: cred.portal_name,
        action: "COPY_USERNAME",
        performed_by_id: currentUser.id,
        performed_by_name: currentUser.full_name,
        details: `Copied username "${cred.username}" for "${cred.portal_name}"`,
        client_name: cred.client_name,
      });
      toast.success(`Username copied to clipboard!`);
    } catch {
      toast.error("Failed to copy username.");
    }
  };

  // Delete Credential (move to Universal Recycle Bin)
  const handleDeleteCredential = async (cred: VaultCredential) => {
    if (!isAdmin) {
      toast.error("Only Administrators can delete vault credentials.");
      return;
    }
    if (confirm(`Move "${cred.portal_name} (${cred.username})" to the Recycle Bin? (25-day recovery window)`)) {
      try {
        await pmsStore.deleteVaultCredential(cred.id);
        toast.success(`Moved "${cred.portal_name}" to Recycle Bin.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete credential.");
      }
    }
  };

  // Export Vault (Admin only)
  const handleExportVault = () => {
    if (!isAdmin) {
      toast.error("Security policy: Only Super Admins / Practice Admins can export Vault data.");
      return;
    }

    const exportRows = credentials.map((c) => ({
      portal_name: c.portal_name,
      login_url: c.login_url,
      username: c.username,
      category: c.category,
      client_name: c.client_name || "",
      account_holder_name: c.account_holder_name || "",
      registered_email: c.registered_email || "",
      registered_mobile: c.registered_mobile || "",
      assigned_employees: c.assigned_employee_names || "All Team",
      notes: c.notes || "",
      last_changed_date: c.last_password_changed_at || c.created_at,
      created_at: c.created_at,
    }));

    const jsonStr = JSON.stringify(exportRows, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pms_vault_audit_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    pmsStore.logVaultActivity({
      credential_id: "export-all",
      portal_name: "FULL_VAULT_EXPORT",
      action: "EXPORT",
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.full_name,
      details: `Exported metadata of ${credentials.length} vault credential entries`,
    });

    setIsExportModalOpen(false);
    toast.success(`Vault metadata exported securely. (Audit logged)`);
  };

  // Strength score of the password currently in form
  const formPwStrength = useMemo(() => {
    return calculatePasswordStrength(formPasswordPlaintext);
  }, [formPasswordPlaintext]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* 1. TOP HEADER & VAULT BADGES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
                  Client &amp; Firm Credential Vault
                </h1>
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-extrabold uppercase tracking-wider">
                  AES-256-GCM
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Zero-plaintext password repository with strict role access, automated rotation alerts &amp; audit logging.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsGeneratorModalOpen(true)}
            className="rounded-xl border-slate-300 text-xs font-bold gap-1.5 h-9 text-slate-700 hover:text-purple-700 hover:border-purple-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>Password Generator</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="rounded-xl border-slate-300 text-xs font-bold gap-1.5 h-9 text-slate-700 hover:text-blue-700 hover:border-blue-300"
          >
            <History className="h-3.5 w-3.5 text-blue-600" />
            <span>Audit Trail ({auditLogs.length})</span>
          </Button>

          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="rounded-xl border-slate-300 text-xs font-bold gap-1.5 h-9 text-slate-700 hover:text-slate-900"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateModal}
            className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Credential</span>
          </Button>
        </div>
      </div>

      {/* 2. STRICT SECURITY COMPLIANCE BANNER */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-orange-50/80 p-4 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-amber-950 block text-[13px]">
              Firm Security &amp; Compliance Safeguards
            </span>
            <p className="text-amber-900/90 text-xs leading-relaxed mt-0.5">
              Passwords are encrypted with industry-standard <strong>AES-256-GCM</strong>. Every reveal or copy event is logged in the permanent audit trail.
              <strong className="text-rose-900 ml-1">
                Notice: Do not store OTPs, UPI MPINs, or bank transaction authorization codes as ordinary credentials.
              </strong>
            </p>
          </div>
        </div>

        <Link
          to="/recycle-bin?type=VAULT"
          className="shrink-0 text-amber-900 hover:text-amber-950 font-bold underline flex items-center gap-1 text-[11px] bg-white/70 border border-amber-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-white transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-amber-700" />
          <span>Vault Recycle Bin</span>
        </Link>
      </div>

      {/* 3. METRIC COUNTERS & ROTATION STATUS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="rounded-2xl border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Vault Credentials
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-[#111827]">{credentials.length}</span>
            <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
              All Portals
            </Badge>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Client Accounts Linked
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-700">
              {new Set(credentials.map((c) => c.client_id).filter(Boolean)).size}
            </span>
            <span className="text-xs text-slate-400 font-medium">Clients</span>
          </div>
        </Card>

        <Card className={`rounded-2xl border p-3.5 shadow-xs ${rotationDueCount > 0 ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Password Rotation Due
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-extrabold ${rotationDueCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
              {rotationDueCount}
            </span>
            {rotationDueCount > 0 ? (
              <button
                type="button"
                onClick={() => setFilterRotationOnly((v) => !v)}
                className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg transition-colors"
              >
                {filterRotationOnly ? "Show All" : "Filter Due"}
              </button>
            ) : (
              <span className="text-xs text-emerald-600 font-bold">All Healthy</span>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Audit Activity Count
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-blue-700">{auditLogs.length}</span>
            <span className="text-xs text-slate-400 font-medium">Events</span>
          </div>
        </Card>
      </div>

      {/* 4. SEARCH, FILTER & VIEW CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by portal, username, client, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-slate-300 bg-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {VAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:outline-none max-w-[180px]"
          >
            <option value="ALL">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name}
              </option>
            ))}
          </select>

          {/* Rotation Toggle */}
          <button
            type="button"
            onClick={() => setFilterRotationOnly((v) => !v)}
            className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterRotationOnly
                ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Rotation Due ({rotationDueCount})</span>
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-300 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewMode === "cards" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Dense Table View"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 5. CREDENTIALS LIST (GRID OR TABLE) */}
      {filteredCredentials.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
            <KeyRound className="h-6 w-6 text-purple-600" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">No Credentials Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {search || selectedCategory !== "ALL" || selectedClientId !== "ALL" || filterRotationOnly
                ? "No credentials match your active filters. Try clearing your search query or filters."
                : "Store your practice & client portal logins securely with AES-256-GCM encryption."}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleOpenCreateModal}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Store First Credential</span>
          </Button>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((cred) => {
            const isVisible = Boolean(decryptedCache[cred.id]);
            const plaintextPw = decryptedCache[cred.id]?.plaintext || "";
            const isDue = isRotationDue(cred);
            const daysSince = getDaysSinceRotation(cred);

            return (
              <Card
                key={cred.id}
                className="rounded-2xl border-slate-200 hover:border-purple-300 transition-all bg-white shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-4 space-y-3">
                  {/* Top: Portal Name, Category & Quick Launch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-[#111827] truncate" title={cred.portal_name}>
                          {cred.portal_name}
                        </h3>
                        {cred.login_url && (
                          <a
                            href={cred.login_url.startsWith("http") ? cred.login_url : `https://${cred.login_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-purple-600 transition-colors shrink-0"
                            title={`Open ${cred.portal_name}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-purple-50 text-purple-800 border-purple-200 font-bold px-2 py-0"
                        >
                          {cred.category}
                        </Badge>
                        {cred.client_name && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 truncate max-w-[140px]"
                            title={cred.client_name}
                          >
                            <Building2 className="h-2.5 w-2.5 mr-1 text-emerald-600" />
                            {cred.client_name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isDue && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Rotation Due
                      </span>
                    )}
                  </div>

                  {/* Username Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Username / User ID
                      </span>
                      <span className="font-mono font-bold text-slate-800 truncate block">
                        {cred.username}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyUsername(cred)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors shrink-0"
                      title="Copy Username"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Password Secure Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Password (AES-256-GCM)
                      </span>
                      <span className="font-mono font-bold text-slate-800 block truncate">
                        {isVisible ? plaintextPw : "••••••••••••••••"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleReveal(cred)}
                        disabled={decryptingId === cred.id}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                        title={isVisible ? "Hide Password" : "View Password (30s auto-hide)"}
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5 text-purple-600" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(cred)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Copy Password"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Additional Metadata: Email, Mobile, Account Holder */}
                  {(cred.registered_email || cred.registered_mobile || cred.account_holder_name) && (
                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                      {cred.account_holder_name && (
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">Holder: <strong className="text-slate-700">{cred.account_holder_name}</strong></span>
                        </div>
                      )}
                      {cred.registered_email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate font-mono">{cred.registered_email}</span>
                        </div>
                      )}
                      {cred.registered_mobile && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{cred.registered_mobile}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes & Security Instruction */}
                  {cred.notes && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 rounded-lg p-2 border border-slate-200/60 line-clamp-2">
                      &ldquo;{cred.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Card Footer: Rotation Age & Actions */}
                <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>Changed {daysSince}d ago</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {cred.password_history && cred.password_history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryTargetCred(cred);
                          setIsHistoryModalOpen(true);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white text-[10px] font-bold flex items-center gap-1 px-1.5 border border-slate-200"
                        title="View Password History"
                      >
                        <History className="h-3 w-3" />
                        <span>{cred.password_history.length}</span>
                      </button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(cred)}
                      className="h-7 w-7 p-0 rounded-lg text-slate-600 hover:text-slate-900"
                      title="Edit Credential"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCredential(cred)}
                        className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* STRUCTURED DENSE TABLE VIEW */
        <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Portal / Application</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Last Changed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCredentials.map((cred) => {
                  const isVisible = Boolean(decryptedCache[cred.id]);
                  const plaintextPw = decryptedCache[cred.id]?.plaintext || "";
                  const isDue = isRotationDue(cred);

                  return (
                    <tr key={cred.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{cred.portal_name}</span>
                          {cred.login_url && (
                            <a
                              href={cred.login_url.startsWith("http") ? cred.login_url : `https://${cred.login_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-purple-600"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {cred.account_holder_name && (
                          <span className="text-[10px] text-slate-500 block">Holder: {cred.account_holder_name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {cred.client_name ? (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                            {cred.client_name}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 italic">Firm Internal</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                          <span>{cred.username}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUsername(cred)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy Username"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-slate-800">
                            {isVisible ? plaintextPw : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleReveal(cred)}
                            className="p-1 rounded text-slate-500 hover:text-purple-700"
                            title={isVisible ? "Hide" : "View"}
                          >
                            {isVisible ? <EyeOff className="h-3 w-3 text-purple-600" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(cred)}
                            className="p-1 rounded text-slate-500 hover:text-emerald-700"
                            title="Copy Password"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-800 border-purple-200">
                          {cred.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600">{formatDate(cred.last_password_changed_at || cred.created_at)}</span>
                          {isDue && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Due
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(cred)}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCredential(cred)}
                              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CREDENTIAL                                            */}
      {/* ========================================================================= */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border-slate-300 p-6">
          <DialogHeader className="pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-purple-700">
              <KeyRound className="h-5 w-5" />
              <DialogTitle className="text-lg font-extrabold text-[#111827]">
                {editingCred ? `Edit Credential — ${editingCred.portal_name}` : "Store New Portal Login"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Passwords are encrypted client-side with AES-256-GCM before database storage.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Portal Preset Chips */}
          {!editingCred && (
            <div className="py-2 border-b border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">Quick Portal Presets:</span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {PORTAL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setFormPortalName(preset.name);
                      setFormLoginUrl(preset.url);
                      setFormCategory(preset.category);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-[11px] font-semibold text-slate-700 transition-colors"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveCredential} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Portal / Application Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Portal / Application Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. GST Portal, Income Tax, MCA21"
                  value={formPortalName}
                  onChange={(e) => setFormPortalName(e.target.value)}
                  className="h-9 rounded-xl border-slate-300"
                />
              </div>

              {/* Login URL */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Login URL</label>
                <Input
                  placeholder="https://services.gst.gov.in/services/login"
                  value={formLoginUrl}
                  onChange={(e) => setFormLoginUrl(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 font-mono text-[11px]"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as VaultCategory)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-semibold text-slate-800"
                >
                  {VAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Related Client or Company */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Related Client or Company</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-semibold text-slate-800"
                >
                  <option value="">-- Internal Firm / Generic Login --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.client_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Username / User ID */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Username / User ID <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. 27AAAAA0000A1Z5, admin_firm"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 font-mono font-bold"
                />
              </div>

              {/* Password & Generator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pw = generateStrongPassword({ length: 16 });
                      setFormPasswordPlaintext(pw);
                      setFormShowPassword(true);
                      toast.info("Generated high-entropy secure password!");
                    }}
                    className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <Input
                    required
                    type={formShowPassword ? "text" : "password"}
                    value={formPasswordPlaintext}
                    onChange={(e) => setFormPasswordPlaintext(e.target.value)}
                    placeholder="Enter or generate strong password"
                    className="h-9 rounded-xl border-slate-300 pr-9 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {formShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formPasswordPlaintext && (
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <span className="text-slate-500">Strength:</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${formPwStrength.color}`}>
                      {formPwStrength.label} ({formPwStrength.score}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Account Holder Name</label>
                <Input
                  placeholder="e.g. Rohit Sharma / ABC Corp"
                  value={formAccountHolder}
                  onChange={(e) => setFormAccountHolder(e.target.value)}
                  className="h-9 rounded-xl border-slate-300"
                />
              </div>

              {/* Rotation Reminder Frequency */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Rotation Reminder (Days)</label>
                <select
                  value={formRotationDays}
                  onChange={(e) => setFormRotationDays(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-semibold text-slate-800"
                >
                  <option value={30}>Every 30 Days (High Security)</option>
                  <option value={60}>Every 60 Days</option>
                  <option value={90}>Every 90 Days (Standard Recommended)</option>
                  <option value={180}>Every 180 Days</option>
                  <option value={365}>Annual (365 Days)</option>
                </select>
              </div>

              {/* Registered Email */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Registered Email</label>
                <Input
                  type="email"
                  placeholder="accounts@clientcompany.com"
                  value={formRegEmail}
                  onChange={(e) => setFormRegEmail(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 font-mono text-[11px]"
                />
              </div>

              {/* Registered Mobile Number */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Registered Mobile Number</label>
                <Input
                  placeholder="+91 98000 00000"
                  value={formRegMobile}
                  onChange={(e) => setFormRegMobile(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Assigned Employees (Role-based access limitation) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-600" />
                  <span>Assign Employee Access</span>
                </label>
                <span className="text-[10px] text-slate-400 font-normal">
                  Leave empty to allow all authorized team members
                </span>
              </div>
              <EmployeeMultiSelect
                employees={employees}
                selectedEmployeeIds={formAssignedEmpIds}
                onChange={(selectedIds) => setFormAssignedEmpIds(selectedIds)}
                label=""
                placeholder="Search employees by name, designation, or code..."
              />
            </div>

            {/* Notes & Special Instructions */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Notes / Security Instructions</label>
              <Textarea
                placeholder="e.g. Security question hint, secondary auth steps. (Do NOT enter OTPs here)"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="rounded-xl border-slate-300 text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-xl border-slate-300 text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold h-9 gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isSaving ? "Encrypting & Storing..." : editingCred ? "Update Credential" : "Encrypt & Store"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: STANDALONE PASSWORD GENERATOR TOOL                               */}
      {/* ========================================================================= */}
      <Dialog open={isGeneratorModalOpen} onOpenChange={setIsGeneratorModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-slate-300 p-6">
          <DialogHeader className="pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-purple-700">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-[#111827]">
                Strong Password Generator
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Generate non-ambiguous, high-entropy cryptographic passwords.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Generated Password Box */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-extrabold text-purple-950 break-all select-all">
                {generatedPassword}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(generatedPassword);
                  toast.success("Password copied to clipboard!");
                }}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs shrink-0"
                title="Copy Password"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* Length Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Password Length</span>
                <span className="font-mono text-purple-700 font-extrabold text-sm">{genLength} chars</span>
              </div>
              <input
                type="range"
                min={8}
                max={48}
                value={genLength}
                onChange={(e) => {
                  setGenLength(Number(e.target.value));
                  handleRegenerateStandalone();
                }}
                className="w-full accent-purple-600"
              />
            </div>

            {/* Character Set Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genUpper}
                  onChange={(e) => {
                    setGenUpper(e.target.checked);
                    handleRegenerateStandalone();
                  }}
                  className="rounded text-purple-600"
                />
                <span>Uppercase (A-Z)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genLower}
                  onChange={(e) => {
                    setGenLower(e.target.checked);
                    handleRegenerateStandalone();
                  }}
                  className="rounded text-purple-600"
                />
                <span>Lowercase (a-z)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genNums}
                  onChange={(e) => {
                    setGenNums(e.target.checked);
                    handleRegenerateStandalone();
                  }}
                  className="rounded text-purple-600"
                />
                <span>Numbers (0-9)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genSyms}
                  onChange={(e) => {
                    setGenSyms(e.target.checked);
                    handleRegenerateStandalone();
                  }}
                  className="rounded text-purple-600"
                />
                <span>Symbols (!@#$)</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerateStandalone}
              className="rounded-xl border-slate-300 text-xs font-bold gap-1.5 h-9"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Regenerate</span>
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(generatedPassword);
                toast.success("Password copied to clipboard!");
                setIsGeneratorModalOpen(false);
              }}
              className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold h-9 gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>Copy &amp; Done</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PASSWORD ROTATION HISTORY                                        */}
      {/* ========================================================================= */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-slate-300 p-6">
          <DialogHeader className="pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-blue-700">
              <History className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-[#111827]">
                Password Rotation History — {historyTargetCred?.portal_name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Previous passwords stored before updates, with timestamps and author records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 max-h-64 overflow-y-auto text-xs">
            {!historyTargetCred?.password_history || historyTargetCred.password_history.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No previous password history for this credential.</p>
            ) : (
              historyTargetCred.password_history.map((hist, idx) => (
                <div key={hist.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 text-[11px]">
                      Revision #{historyTargetCred.password_history!.length - idx}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(hist.changed_at)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Changed by: <strong>{hist.changed_by_name}</strong></span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const pw = await decryptVaultPassword(hist.password_encrypted);
                          await navigator.clipboard.writeText(pw);
                          toast.success("Historical password copied to clipboard! (Audit logged)");
                        } catch {
                          toast.error("Decryption failed.");
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy Historical PW</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: SECURITY AUDIT TRAIL LOG                                         */}
      {/* ========================================================================= */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-slate-300 p-6">
          <DialogHeader className="pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-blue-700">
              <History className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-[#111827]">
                Vault Security Audit Trail ({auditLogs.length} Events)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Immutable log of every credential reveal, copy, modification, and export event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No audit log entries recorded yet.</p>
            ) : (
              auditLogs.slice(0, 100).map((log) => {
                let badgeClass = "bg-slate-100 text-slate-700";
                if (log.action === "VIEW") badgeClass = "bg-purple-100 text-purple-800";
                if (log.action === "COPY_PASSWORD") badgeClass = "bg-emerald-100 text-emerald-800";
                if (log.action === "CREATE") badgeClass = "bg-blue-100 text-blue-800";
                if (log.action === "UPDATE") badgeClass = "bg-amber-100 text-amber-800";
                if (log.action === "DELETE") badgeClass = "bg-rose-100 text-rose-800";
                if (log.action === "EXPORT") badgeClass = "bg-indigo-100 text-indigo-800";

                return (
                  <div key={log.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-[9px] font-mono font-extrabold px-1.5 py-0 ${badgeClass}`}>
                          {log.action}
                        </Badge>
                        <span className="font-extrabold text-slate-900">{log.portal_name}</span>
                        {log.client_name && (
                          <span className="text-[10px] text-slate-500">({log.client_name})</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">{log.details || "Activity performed"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-800 block text-[11px]">{log.performed_by_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDate(log.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAuditModalOpen(false)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: ADMIN EXPORT CONFIRMATION                                        */}
      {/* ========================================================================= */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-slate-300 p-6">
          <DialogHeader className="pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Confirm Vault Export
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Exporting vault metadata requires Administrator credentials and is logged in the permanent audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2 text-slate-600">
            <p>
              You are about to export {credentials.length} vault entries. For safety, encrypted password hashes are excluded from plain text exports unless decrypted individually.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
              className="rounded-xl border-slate-300 text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExportVault}
              className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold h-9 gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Confirm &amp; Download</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

