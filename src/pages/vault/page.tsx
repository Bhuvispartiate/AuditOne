import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  ArrowLeft,
  ChevronRight,
  Receipt,
  Briefcase,
  Landmark,
  Folder,
  Layers,
  FolderPlus,
  List,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted, isSuperAdmin } from "@/lib/access";
import {
  VaultCredential,
  VaultCategory,
  VaultCategoryItem,
  VaultAuditLog,
  VaultAuditAction,
  VaultPasswordHistoryEntry,
  Client,
  Employee,
} from "@/types";
import {
  encryptVaultPassword,
  decryptVaultPassword,
  calculatePasswordStrength,
} from "@/lib/vault-crypto";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { EmployeeMultiSelect } from "@/components/tasks/employee-multi-select";

function getCategoryColorTheme(color?: string) {
  switch (color) {
    case "violet":
      return {
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        iconBg: "bg-violet-100 text-violet-700",
        border: "hover:border-violet-400",
        accent: "text-violet-700",
        bar: "bg-violet-600",
        cardBg: "bg-violet-50/20",
      };
    case "sky":
      return {
        badge: "bg-sky-50 text-sky-700 border-sky-200",
        iconBg: "bg-sky-100 text-sky-700",
        border: "hover:border-sky-400",
        accent: "text-sky-700",
        bar: "bg-sky-600",
        cardBg: "bg-sky-50/20",
      };
    case "emerald":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-700",
        border: "hover:border-emerald-400",
        accent: "text-emerald-700",
        bar: "bg-emerald-600",
        cardBg: "bg-emerald-50/20",
      };
    case "amber":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        iconBg: "bg-amber-100 text-amber-700",
        border: "hover:border-amber-400",
        accent: "text-amber-700",
        bar: "bg-amber-600",
        cardBg: "bg-amber-50/20",
      };
    case "rose":
      return {
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        iconBg: "bg-rose-100 text-rose-700",
        border: "hover:border-rose-400",
        accent: "text-rose-700",
        bar: "bg-rose-600",
        cardBg: "bg-rose-50/20",
      };
    case "indigo":
      return {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        iconBg: "bg-indigo-100 text-indigo-700",
        border: "hover:border-indigo-400",
        accent: "text-indigo-700",
        bar: "bg-indigo-600",
        cardBg: "bg-indigo-50/20",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-300",
        iconBg: "bg-slate-200 text-slate-700",
        border: "hover:border-slate-400",
        accent: "text-slate-800",
        bar: "bg-slate-600",
        cardBg: "bg-slate-50/40",
      };
  }
}

function getCategoryIcon(nameOrIcon?: string) {
  const lower = (nameOrIcon || "").toLowerCase();
  if (lower.includes("tax") || lower.includes("gst") || lower.includes("itr") || lower.includes("receipt")) return Receipt;
  if (lower.includes("mca") || lower.includes("corp") || lower.includes("roc") || lower.includes("building")) return Building2;
  if (lower.includes("bank") || lower.includes("fin") || lower.includes("landmark")) return Landmark;
  if (lower.includes("pay") || lower.includes("labour") || lower.includes("epf") || lower.includes("users")) return Users;
  if (lower.includes("gov") || lower.includes("dgft") || lower.includes("custom") || lower.includes("shield")) return ShieldCheck;
  if (lower.includes("cloud") || lower.includes("soft") || lower.includes("it") || lower.includes("folder")) return Folder;
  if (lower.includes("briefcase")) return Briefcase;
  return KeyRound;
}

const PORTAL_PRESETS = [
  { name: "GST Portal", url: "https://www.gst.gov.in", category: "Taxation" },
  { name: "Income Tax e-Filing", url: "https://www.incometax.gov.in", category: "Taxation" },
  { name: "TRACES TDS Portal", url: "https://contents.tdscpc.gov.in", category: "Taxation" },
  { name: "MCA21 V3 Portal", url: "https://www.mca.gov.in", category: "Corporate / MCA" },
  { name: "EPFO Unified Portal", url: "https://unifiedportal-emp.epfindia.gov.in", category: "Payroll & Labour" },
  { name: "ESIC Portal", url: "https://www.esic.in", category: "Payroll & Labour" },
  { name: "DGFT Portal", url: "https://www.dgft.gov.in", category: "Government & DGFT" },
  { name: "Icegate Customs", url: "https://www.icegate.gov.in", category: "Government & DGFT" },
  { name: "HDFC NetBanking", url: "https://netbanking.hdfcbank.com", category: "Banking & Finance" },
  { name: "ICICI Corporate", url: "https://cibnext.icicibank.com", category: "Banking & Finance" },
  { name: "SBI Corporate", url: "https://corp.onlinesbi.sbi", category: "Banking & Finance" },
];

export default function VaultPage() {
  const [, setTick] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

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
  const categories = pmsStore.getVaultCategories();

  // Drilldown Navigation states:
  // Level 1: selectedCategoryId === null (Shows all Categories)
  // Level 2: selectedCategoryId !== null && selectedClientKey === null (Shows Clients inside selected Category)
  // Level 3: selectedCategoryId !== null && selectedClientKey !== null (Shows Logins for selected Client in Category)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(searchParams.get("category") || null);
  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(searchParams.get("client") || null);
  const [viewMode, setViewMode] = useState<"drilldown" | "table">("drilldown");
  const [categoryViewMode, setCategoryViewMode] = useState<"list" | "grid">("list");
  const [categoriesViewMode, setCategoriesViewMode] = useState<"grid" | "list">("grid");

  // Manage Client Password Access Modal State (Admin only)
  const [isClientAccessModalOpen, setIsClientAccessModalOpen] = useState(false);
  const [accessTargetClient, setAccessTargetClient] = useState<{ id?: string; name: string; code?: string } | null>(null);
  const [clientAssignedEmpIds, setClientAssignedEmpIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // Keep URL in sync
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (selectedCategoryId) nextParams.set("category", selectedCategoryId);
    else nextParams.delete("category");
    if (selectedClientKey) nextParams.set("client", selectedClientKey);
    else nextParams.delete("client");
    setSearchParams(nextParams, { replace: true });
  }, [selectedCategoryId, selectedClientKey]);

  // Search state
  const [search, setSearch] = useState("");

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

  // Category Modal State (Create / Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VaultCategoryItem | null>(null);
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catColor, setCatColor] = useState("violet");

  // Add Client to Category Modal State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");
  // Optional initial login fields inside Add Client modal
  const [addClientPortal, setAddClientPortal] = useState("");
  const [addClientUrl, setAddClientUrl] = useState("");
  const [addClientUsername, setAddClientUsername] = useState("");
  const [addClientPassword, setAddClientPassword] = useState("");

  // Credential Modal State (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<VaultCredential | null>(null);

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
  const [formCategory, setFormCategory] = useState<string>("Taxation");
  const [formClientId, setFormClientId] = useState("");
  const [formCustomClientName, setFormCustomClientName] = useState("");
  const [formAssignedEmpIds, setFormAssignedEmpIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if current user has permission to access a specific credential
  const canAccessCredential = (cred: VaultCredential): boolean => {
    if (isAdmin) return true;
    if (!currentUser?.id) return false;
    // Ordinary employees can only see passwords if an admin has explicitly granted access to them
    if (!cred.assigned_employee_ids || cred.assigned_employee_ids.length === 0) return false;
    return cred.assigned_employee_ids.includes(currentUser.id);
  };

  // Category matching helper
  const isCredInCategory = (cred: VaultCredential, cat: VaultCategoryItem) => {
    const catName = cat.name.trim().toLowerCase();
    const credCat = (cred.category || "").trim().toLowerCase();
    return credCat === catName || credCat === cat.id.toLowerCase() || credCat === cat.code.toLowerCase();
  };

  // Selected Category Object
  const currentCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c.id === selectedCategoryId || c.name === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Clients inside current category
  const clientsInCategory = useMemo(() => {
    if (!currentCategory) return [];

    const catCreds = credentials.filter((cred) => {
      if (!isAdmin && !canAccessCredential(cred)) return false;
      return isCredInCategory(cred, currentCategory);
    });

    const clientMap = new Map<
      string,
      {
        key: string;
        client_id?: string;
        client_name: string;
        client_code?: string;
        folder_name?: string;
        credentials: VaultCredential[];
        portals: string[];
      }
    >();

    catCreds.forEach((cred) => {
      const registeredClient = cred.client_id ? clients.find((c) => c.id === cred.client_id) : undefined;
      const clientName = registeredClient?.client_name || cred.client_name || "General Client / Miscellaneous";
      const key = registeredClient?.id || clientName.toLowerCase().trim();

      const existing = clientMap.get(key) || {
        key,
        client_id: registeredClient?.id,
        client_name: clientName,
        client_code: registeredClient?.client_code,
        folder_name:
          registeredClient?.folder_name ||
          (registeredClient?.nick_name ? `${registeredClient.nick_name} ${registeredClient.client_code}` : undefined),
        credentials: [],
        portals: [],
      };

      existing.credentials.push(cred);
      if (!existing.portals.includes(cred.portal_name)) {
        existing.portals.push(cred.portal_name);
      }

      clientMap.set(key, existing);
    });

    // Also include currently selected client if it was created/added but has no credentials yet
    if (selectedClientKey && !clientMap.has(selectedClientKey)) {
      const reg = clients.find((c) => c.id === selectedClientKey);
      clientMap.set(selectedClientKey, {
        key: selectedClientKey,
        client_id: reg?.id,
        client_name: reg?.client_name || selectedClientKey,
        client_code: reg?.client_code,
        folder_name: reg?.folder_name,
        credentials: [],
        portals: [],
      });
    }

    const list = Array.from(clientMap.values());

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return list.filter(
        (cl) =>
          cl.client_name.toLowerCase().includes(q) ||
          (cl.client_code && cl.client_code.toLowerCase().includes(q)) ||
          (cl.folder_name && cl.folder_name.toLowerCase().includes(q)) ||
          cl.portals.some((p) => p.toLowerCase().includes(q))
      );
    }

    return list;
  }, [currentCategory, credentials, clients, search, isAdmin, selectedClientKey]);

  // Selected Client Object
  const currentClient = useMemo(() => {
    if (!selectedClientKey) return null;
    return clientsInCategory.find((c) => c.key === selectedClientKey) || {
      key: selectedClientKey,
      client_name: selectedClientKey,
      credentials: [],
      portals: [],
    };
  }, [clientsInCategory, selectedClientKey]);

  // Credentials for selected Client in current Category
  const clientCredentials = useMemo(() => {
    if (!currentCategory || !selectedClientKey) return [];
    return credentials.filter((cred) => {
      if (!isAdmin && !canAccessCredential(cred)) return false;
      if (!isCredInCategory(cred, currentCategory)) return false;

      const registeredClient = cred.client_id ? clients.find((c) => c.id === cred.client_id) : undefined;
      const key = registeredClient?.id || (cred.client_name || "General Client / Miscellaneous").toLowerCase().trim();
      if (key !== selectedClientKey) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          cred.portal_name.toLowerCase().includes(q) ||
          cred.username.toLowerCase().includes(q) ||
          (cred.account_holder_name && cred.account_holder_name.toLowerCase().includes(q)) ||
          (cred.registered_email && cred.registered_email.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [currentCategory, selectedClientKey, credentials, clients, search, isAdmin]);

  // Filtered credentials list for full Table View
  const allFilteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      if (!isAdmin && !canAccessCredential(cred)) return false;

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

      return matchesSearch;
    });
  }, [credentials, search, isAdmin]);

  // Open Create Category Modal
  const handleOpenCreateCategoryModal = () => {
    setEditingCategory(null);
    setCatName("");
    setCatCode("");
    setCatDesc("");
    setCatColor("violet");
    setIsCategoryModalOpen(true);
  };

  // Open Edit Category Modal
  const handleOpenEditCategoryModal = (cat: VaultCategoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatCode(cat.code);
    setCatDesc(cat.description || "");
    setCatColor(cat.color || "violet");
    setIsCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    try {
      if (editingCategory) {
        await pmsStore.updateVaultCategory(editingCategory.id, {
          name: catName.trim(),
          code: catCode.trim() || catName.slice(0, 4).toUpperCase(),
          description: catDesc.trim(),
          color: catColor,
        });
        toast.success(`Updated category "${catName}".`);
      } else {
        await pmsStore.addVaultCategory({
          name: catName.trim(),
          code: catCode.trim() || catName.slice(0, 4).toUpperCase(),
          description: catDesc.trim(),
          color: catColor,
          icon: "KeyRound",
        });
        toast.success(`Created category "${catName}".`);
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save category.");
    }
  };

  // Delete Category (Admins can delete any category, including default ones)
  const handleDeleteCategory = async (cat: VaultCategoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast.error("Only administrators can delete categories.");
      return;
    }
    if (confirm(`Delete category "${cat.name}"? Credentials in this category will remain preserved.`)) {
      await pmsStore.deleteVaultCategory(cat.id);
      if (selectedCategoryId === cat.id || selectedCategoryId === cat.name) {
        setSelectedCategoryId(null);
        setSelectedClientKey(null);
      }
      toast.success(`Removed category "${cat.name}".`);
    }
  };

  // Open Manage Client Password Access Modal
  const handleOpenClientAccessModal = (clientId?: string, clientName?: string, clientCode?: string) => {
    if (!isAdmin) return;
    const name = clientName || "General Client";
    const matchedClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
    const targetCode = clientCode || matchedClient?.client_code;
    setAccessTargetClient({ id: clientId, name, code: targetCode });

    // Collect currently assigned employee IDs across credentials for this client
    const targetCreds = credentials.filter((c) => {
      if (clientId && c.client_id === clientId) return true;
      return (c.client_name || "").toLowerCase().trim() === name.toLowerCase().trim();
    });

    const commonAssigned = new Set<string>();
    targetCreds.forEach((c) => {
      c.assigned_employee_ids?.forEach((id) => commonAssigned.add(id));
    });

    setClientAssignedEmpIds(Array.from(commonAssigned));
    setIsClientAccessModalOpen(true);
  };

  // Submit Client Password Access (Applies to all credentials under this client)
  const handleSaveClientAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessTargetClient) return;

    setIsSavingAccess(true);
    try {
      const targetCreds = credentials.filter((c) => {
        if (accessTargetClient.id && c.client_id === accessTargetClient.id) return true;
        return (c.client_name || "").toLowerCase().trim() === accessTargetClient.name.toLowerCase().trim();
      });

      const assignedNames = employees
        .filter((emp) => clientAssignedEmpIds.includes(emp.id))
        .map((emp) => emp.full_name)
        .join(", ");

      for (const cred of targetCreds) {
        await pmsStore.updateVaultCredential(cred.id, {
          assigned_employee_ids: clientAssignedEmpIds,
          assigned_employee_names: assignedNames || undefined,
        });
      }

      toast.success(
        `Updated password access for "${accessTargetClient.name}" (${clientAssignedEmpIds.length} employee(s) authorized).`
      );
      setIsClientAccessModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password access.");
    } finally {
      setIsSavingAccess(false);
    }
  };

  // Open Add Client to Category Modal
  const handleOpenAddClientModal = () => {
    setSelectedExistingClientId(clients[0]?.id || "");
    setAddClientPortal("");
    setAddClientUrl("");
    setAddClientUsername("");
    setAddClientPassword("");
    setIsAddClientModalOpen(true);
  };

  // Submit Add Client to Category
  const handleSaveClientToCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory) {
      toast.error("No category selected.");
      return;
    }

    const matched = clients.find((c) => c.id === selectedExistingClientId);
    if (!matched) {
      toast.error("Please select a registered client.");
      return;
    }
    const targetClientId = matched.id;
    const targetClientName = matched.client_name;

    // If initial login fields were provided, create credential immediately
    if (addClientPortal.trim() && addClientUsername.trim() && addClientPassword.trim()) {
      try {
        const encrypted = await encryptVaultPassword(addClientPassword.trim());
        await pmsStore.addVaultCredential({
          portal_name: addClientPortal.trim(),
          login_url: addClientUrl.trim() || "",
          username: addClientUsername.trim(),
          password_encrypted: encrypted,
          category: currentCategory.name,
          client_id: targetClientId,
          client_name: targetClientName,
          last_password_changed_at: new Date().toISOString(),
          rotation_reminder_days: 90,
        });
        toast.success(`Created initial login for "${targetClientName}" in ${currentCategory.name}.`);
      } catch (err: any) {
        toast.error(`Password encryption error: ${err.message}`);
      }
    } else {
      toast.success(`Added client "${targetClientName}" to ${currentCategory.name}.`);
    }

    setIsAddClientModalOpen(false);
    setSelectedClientKey(targetClientId || targetClientName.toLowerCase().trim());
  };

  // Open Create Credential Modal (Optionally pre-filled with category and client)
  const handleOpenCreateModal = (prefillClientId?: string, prefillClientName?: string) => {
    setEditingCred(null);
    setFormPortalName("");
    setFormLoginUrl("");
    setFormUsername("");
    setFormPasswordPlaintext("");
    setFormRegEmail("");
    setFormRegMobile("");
    setFormAccountHolder("");
    setFormCategory(currentCategory ? currentCategory.name : "Taxation");

    if (prefillClientId) {
      setFormClientId(prefillClientId);
      setFormCustomClientName("");
    } else if (prefillClientName) {
      setFormClientId("");
      setFormCustomClientName(prefillClientName);
    } else if (currentClient?.client_id) {
      setFormClientId(currentClient.client_id);
      setFormCustomClientName("");
    } else if (currentClient?.client_name) {
      setFormClientId("");
      setFormCustomClientName(currentClient.client_name);
    } else {
      setFormClientId("");
      setFormCustomClientName("");
    }

    setFormAssignedEmpIds([]);
    setFormNotes("");
    setFormShowPassword(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Credential Modal
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
    setFormCustomClientName(cred.client_name || "");
    setFormAssignedEmpIds(cred.assigned_employee_ids || []);
    setFormNotes(cred.notes || "");
    setFormShowPassword(false);

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
      const encrypted = await encryptVaultPassword(formPasswordPlaintext.trim());
      const chosenClient = clients.find((c) => c.id === formClientId);
      const effectiveClientName = chosenClient?.client_name || formCustomClientName.trim() || undefined;

      const assignedNames = formAssignedEmpIds
        .map((id) => employees.find((e) => e.id === id)?.full_name)
        .filter(Boolean)
        .join(", ");

      if (editingCred) {
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
          client_name: effectiveClientName,
          assigned_employee_ids: formAssignedEmpIds,
          assigned_employee_names: assignedNames || undefined,
          notes: formNotes.trim() || undefined,
          rotation_reminder_days: 90,
        });
        toast.success(`Updated "${formPortalName}" with AES-256-GCM encryption.`);
      } else {
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
          client_name: effectiveClientName,
          assigned_employee_ids: formAssignedEmpIds,
          assigned_employee_names: assignedNames || undefined,
          notes: formNotes.trim() || undefined,
          last_password_changed_at: new Date().toISOString(),
          rotation_reminder_days: 90,
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

    if (decryptedCache[cred.id]) {
      setDecryptedCache((prev) => {
        const next = { ...prev };
        delete next[cred.id];
        return next;
      });
      return;
    }

    setDecryptingId(cred.id);
    try {
      const plaintext = await decryptVaultPassword(cred.password_encrypted);
      const expiryMs = Date.now() + 30 * 1000;
      setDecryptedCache((prev) => ({
        ...prev,
        [cred.id]: { plaintext, expiryMs },
      }));

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

  // Delete Credential
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

  // Export Vault (Admin only, Excel format with dedicated sheet per category)
  const handleExportVault = async () => {
    if (!isAdmin) {
      toast.error("Security policy: Only Super Admins / Practice Admins can export Vault data.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const formatCredentialRow = async (c: VaultCredential) => {
        let plainPw = "••••••••";
        try {
          plainPw = await decryptVaultPassword(c.password_encrypted);
        } catch {
          plainPw = "[Encrypted]";
        }
        const regClient = c.client_id ? clients.find((cl) => cl.id === c.client_id) : undefined;
        return {
          "Client Code": regClient?.client_code || "—",
          "Client Name": c.client_name || regClient?.client_name || "—",
          "Portal Name": c.portal_name,
          "Category": c.category || "General",
          "Login URL": c.login_url || "—",
          "Username / Login ID": c.username,
          "Password": plainPw,
          "Registered Email": c.registered_email || "—",
          "Registered Mobile (OTP)": c.registered_mobile || "—",
          "Account Holder": c.account_holder_name || "—",
          "Authorized Employees": c.assigned_employee_names || (c.assigned_employee_ids?.length ? `${c.assigned_employee_ids.length} employee(s)` : "Admin Only"),
          "Notes": c.notes || "",
          "Last Changed": c.last_password_changed_at ? new Date(c.last_password_changed_at).toLocaleDateString() : "—",
        };
      };

      const defaultColWidths = [
        { wch: 18 },
        { wch: 30 },
        { wch: 25 },
        { wch: 20 },
        { wch: 35 },
        { wch: 25 },
        { wch: 25 },
        { wch: 30 },
        { wch: 22 },
        { wch: 24 },
        { wch: 28 },
        { wch: 30 },
        { wch: 16 },
      ];

      // 1. MASTER SUMMARY SHEET: All Credentials
      const allRows = await Promise.all(credentials.map((c) => formatCredentialRow(c)));
      const masterWs = XLSX.utils.json_to_sheet(allRows);
      masterWs["!cols"] = defaultColWidths;
      XLSX.utils.book_append_sheet(wb, masterWs, "All Credentials");

      // 2. CATEGORY SHEETS: One page/tab per category with all client credentials
      const usedSheetNames = new Set<string>(["All Credentials"]);

      for (const cat of categories) {
        const catCreds = credentials.filter((c) => isCredInCategory(c, cat));
        if (catCreds.length === 0) continue;

        const catRows = await Promise.all(catCreds.map((c) => formatCredentialRow(c)));
        const catWs = XLSX.utils.json_to_sheet(catRows);
        catWs["!cols"] = defaultColWidths;

        // Clean & truncate sheet name (Excel maximum is 31 chars and disallows: \ / ? * [ ])
        let sheetName = cat.name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 30) || cat.code || "Category";
        if (usedSheetNames.has(sheetName)) {
          sheetName = `${cat.code || "CAT"}_${sheetName}`.slice(0, 30);
        }
        usedSheetNames.add(sheetName);

        XLSX.utils.book_append_sheet(wb, catWs, sheetName);
      }

      XLSX.writeFile(wb, `Linear_Audit_Vault_Categorized_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${credentials.length} credentials across category pages to Excel.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate Excel export.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Credential Vault
                </h1>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 font-semibold">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  AES-256-GCM
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize client logins by category and manage portal credentials securely.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                setViewMode("drilldown");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "drilldown" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Category View</span>
            </button>
            <button
              onClick={() => {
                setViewMode("table");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>All Credentials</span>
            </button>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuditModalOpen(true)}
              className="rounded-2xl gap-1 text-xs border-slate-300"
            >
              <History className="h-3.5 w-3.5 text-blue-600" />
              <span>Audit Log</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              onClick={handleOpenCreateCategoryModal}
              variant="outline"
              size="sm"
              className="rounded-2xl gap-1.5 text-xs font-bold border-slate-300 hover:border-slate-800"
            >
              <FolderPlus className="h-3.5 w-3.5 text-violet-600" />
              <span>+ Create Category</span>
            </Button>
          )}

          <Button
            onClick={() => handleOpenCreateModal()}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white rounded-2xl gap-1.5 text-xs font-bold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Credential</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Categories</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{categories.length}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Folder className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Logins</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{credentials.length}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <KeyRound className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Active Clients</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                {new Set(credentials.map((c) => c.client_name || c.client_id).filter(Boolean)).size}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: FULL CREDENTIALS TABLE VIEW */}
      {/* ===================================================================== */}
      {viewMode === "table" ? (
        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="search"
                placeholder="Search portal, username, client, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportVault}
                  className="h-8 text-xs rounded-xl gap-1 border-slate-300"
                >
                  <Download className="h-3 w-3 text-emerald-600" />
                  <span>Export to Excel</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Portal / URL</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFilteredCredentials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No credentials matching your search filter.
                      </td>
                    </tr>
                  ) : (
                    allFilteredCredentials.map((cred) => {
                      const isRevealed = Boolean(decryptedCache[cred.id]);

                      return (
                        <tr key={cred.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{cred.portal_name}</div>
                            {cred.login_url && (
                              <a
                                href={cred.login_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>{cred.login_url.replace(/^https?:\/\//, "").slice(0, 30)}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900">{cred.client_name || "—"}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">
                              {cred.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-medium text-slate-800">{cred.username}</span>
                              <button
                                onClick={() => handleCopyUsername(cred)}
                                className="text-slate-400 hover:text-slate-700 p-1"
                                title="Copy username"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-900">
                                {isRevealed ? decryptedCache[cred.id]?.plaintext : "••••••••••••"}
                              </span>
                              <button
                                onClick={() => handleToggleReveal(cred)}
                                className="text-slate-400 hover:text-slate-700 p-1"
                                title={isRevealed ? "Hide password" : "Show password (30s)"}
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyPassword(cred)}
                                className="text-slate-400 hover:text-slate-700 p-1"
                                title="Copy password"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {cred.password_history && cred.password_history.length > 0 && (
                                <button
                                  onClick={() => {
                                    setHistoryTargetCred(cred);
                                    setIsHistoryModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                                  title="Password History"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditModal(cred)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteCredential(cred)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: CATEGORY & CLIENT 2-LEVEL DRILLDOWN */
        /* ===================================================================== */
        <div className="space-y-6">
          {/* LEVEL 1: ALL CATEGORIES VIEW */}
          {!selectedCategoryId && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search categories by name, code, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-2xl border-slate-300"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-500 font-medium">
                    {categories.length} {categories.length === 1 ? "Category" : "Categories"}
                  </span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCategoriesViewMode("list")}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        categoriesViewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoriesViewMode("grid")}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        categoriesViewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                  {isAdmin && (
                    <Button
                      onClick={handleOpenCreateCategoryModal}
                      size="sm"
                      className="bg-neutral-900 hover:bg-black text-white rounded-xl gap-1.5 text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Category</span>
                    </Button>
                  )}
                </div>
              </div>

              {categoriesViewMode === "list" ? (
                /* Category List View (Structured Table) */
                <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Category Name</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4 text-center">Clients</th>
                          <th className="py-3 px-4 text-center">Logins</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categories
                          .filter((cat) => {
                            if (!search.trim()) return true;
                            const q = search.trim().toLowerCase();
                            return (
                              cat.name.toLowerCase().includes(q) ||
                              cat.code.toLowerCase().includes(q) ||
                              (cat.description && cat.description.toLowerCase().includes(q))
                            );
                          })
                          .map((cat) => {
                            const theme = getCategoryColorTheme(cat.color);
                            const credsInCat = credentials.filter((c) => isCredInCategory(c, cat));
                            const clientCount = new Set(credsInCat.map((c) => c.client_name || c.client_id).filter(Boolean)).size;

                            return (
                              <tr
                                key={cat.id}
                                onClick={() => {
                                  setSelectedCategoryId(cat.id);
                                  setSelectedClientKey(null);
                                }}
                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                              >
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className={`text-[10px] font-mono font-bold ${theme.badge}`}>
                                    {cat.code}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block text-sm">
                                    {cat.name}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-slate-500 text-xs line-clamp-1 max-w-md">
                                    {cat.description || "—"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="font-semibold text-slate-700">
                                    {clientCount}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge variant="secondary" className="text-[10px] font-bold">
                                    {credsInCat.length}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedCategoryId(cat.id);
                                        setSelectedClientKey(null);
                                      }}
                                      className="h-7 text-xs rounded-xl text-slate-700 hover:text-blue-600"
                                    >
                                      Open
                                    </Button>
                                    {isAdmin && (
                                      <>
                                        <button
                                          onClick={(e) => handleOpenEditCategoryModal(cat, e)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                          title="Edit category"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteCategory(cat, e)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                          title="Delete category"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                /* Category Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categories
                    .filter((cat) => {
                      if (!search.trim()) return true;
                      const q = search.trim().toLowerCase();
                      return (
                        cat.name.toLowerCase().includes(q) ||
                        cat.code.toLowerCase().includes(q) ||
                        (cat.description && cat.description.toLowerCase().includes(q))
                      );
                    })
                    .map((cat) => {
                      const theme = getCategoryColorTheme(cat.color);
                      const IconComponent = getCategoryIcon(cat.icon || cat.name);

                      // Count credentials & clients in this category
                      const credsInCat = credentials.filter((c) => isCredInCategory(c, cat));
                      const clientCount = new Set(credsInCat.map((c) => c.client_name || c.client_id).filter(Boolean)).size;

                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setSelectedClientKey(null);
                          }}
                          className={`rounded-2xl border-[1.5px] border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group ${theme.border}`}
                        >
                          <div>
                            {/* Top Row: Icon, Code Badge, Actions */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold ${theme.iconBg}`}>
                                  <IconComponent className="h-5 w-5" />
                                </div>
                                <div>
                                  <Badge variant="outline" className={`text-[10px] font-mono font-bold ${theme.badge}`}>
                                    {cat.code}
                                  </Badge>
                                </div>
                              </div>

                              {/* Category Edit / Delete Actions (Admins can edit/delete ANY category) */}
                              {isAdmin && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => handleOpenEditCategoryModal(cat, e)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                    title="Edit category"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteCategory(cat, e)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete category"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Category Title & Description */}
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {cat.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {cat.description || "Secure portals and client logins"}
                            </p>
                          </div>

                          {/* Bottom Stats Footer */}
                          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-slate-700">
                                {clientCount} {clientCount === 1 ? "Client" : "Clients"}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-medium">
                                {credsInCat.length} {credsInCat.length === 1 ? "Login" : "Logins"}
                              </span>
                            </div>

                            <div className="flex items-center text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 2: CLIENTS INSIDE SELECTED CATEGORY VIEW */}
          {selectedCategoryId && !selectedClientKey && currentCategory && (
            <div className="space-y-5">
              {/* Breadcrumb Navigation Bar */}
              <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setSelectedClientKey(null);
                    }}
                    className="h-8 px-2 text-slate-600 hover:text-slate-900 gap-1 rounded-xl"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Categories</span>
                  </Button>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    {currentCategory.name} ({currentCategory.code})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleOpenAddClientModal}
                    size="sm"
                    className="bg-neutral-900 hover:bg-black text-white rounded-xl gap-1.5 text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Client to Category</span>
                  </Button>
                </div>
              </div>

              {/* Category Header Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 !text-white text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20">
                      {currentCategory.code}
                    </Badge>
                    <h2 className="text-xl font-bold !text-white text-white">{currentCategory.name}</h2>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {currentCategory.description || "Manage all client credentials stored under this category."}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Clients</span>
                    <span className="text-base font-bold text-white">{clientsInCategory.length}</span>
                  </div>
                  <div className="h-7 w-[1px] bg-white/20" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Logins</span>
                    <span className="text-base font-bold text-white">
                      {credentials.filter((c) => isCredInCategory(c, currentCategory)).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Clients Bar & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="search"
                    placeholder={`Search clients in ${currentCategory.name}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-2xl border-slate-300"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-500 font-medium">
                    {clientsInCategory.length} {clientsInCategory.length === 1 ? "Client" : "Clients"} found
                  </span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCategoryViewMode("list")}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        categoryViewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryViewMode("grid")}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        categoryViewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Clients Inside Category (List View & Grid View) */}
              {clientsInCategory.length === 0 ? (
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <CardContent className="py-16 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">No clients added to {currentCategory.name} yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click below to link a registered client inside this category.
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={handleOpenAddClientModal}
                        size="sm"
                        className="bg-neutral-900 hover:bg-black text-white rounded-xl gap-1.5 text-xs font-bold"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add First Client</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : categoryViewMode === "list" ? (
                /* Category List View */
                <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Client ID / Folder</th>
                          <th className="py-3 px-4">Client Name</th>
                          <th className="py-3 px-4">Configured Portals</th>
                          <th className="py-3 px-4 text-center">Logins</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clientsInCategory.map((cl) => (
                          <tr
                            key={cl.key}
                            onClick={() => setSelectedClientKey(cl.key)}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {cl.client_code && (
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                                    {cl.client_code}
                                  </span>
                                )}
                                {cl.folder_name && (
                                  <span className="font-mono text-slate-600 text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                    {cl.folder_name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors block">
                                {cl.client_name}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {cl.portals.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic">No logins yet</span>
                                ) : (
                                  cl.portals.map((p, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                                    >
                                      {p}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                {cl.credentials.length} {cl.credentials.length === 1 ? "login" : "logins"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenClientAccessModal(cl.client_id, cl.client_name, cl.client_code);
                                    }}
                                    className="h-7 text-xs rounded-xl gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                    title="Manage Password Access"
                                  >
                                    <ShieldCheck className="h-3 w-3" />
                                    <span>Access</span>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCreateModal(cl.client_id, cl.client_name);
                                  }}
                                  className="h-7 text-xs rounded-xl gap-1 text-slate-600 hover:text-slate-900"
                                  title="Add Login"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Add Login</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClientKey(cl.key);
                                  }}
                                  className="h-7 text-xs rounded-xl gap-1 bg-neutral-900 hover:bg-black text-white"
                                >
                                  <span>Open Logins</span>
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                /* Category Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {clientsInCategory.map((cl) => (
                    <div
                      key={cl.key}
                      onClick={() => setSelectedClientKey(cl.key)}
                      className="rounded-2xl border-[1.5px] border-slate-200 bg-white p-5 shadow-xs hover:border-slate-800 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Row: Client Code / Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {cl.client_code && (
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                                {cl.client_code}
                              </span>
                            )}
                            {cl.folder_name && (
                              <span className="font-mono text-slate-600 text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                {cl.folder_name}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {cl.credentials.length} {cl.credentials.length === 1 ? "login" : "logins"}
                          </Badge>
                        </div>

                        {/* Client Name */}
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                          {cl.client_name}
                        </h4>

                        {/* Portals Previews */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {cl.portals.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No logins added yet</span>
                          ) : (
                            cl.portals.slice(0, 3).map((p, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium truncate max-w-[150px]"
                              >
                                {p}
                              </span>
                            ))
                          )}
                          {cl.portals.length > 3 && (
                            <span className="text-[10px] text-slate-400 px-1 py-0.5 font-medium">
                              +{cl.portals.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Secure Logins
                        </span>

                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenClientAccessModal(cl.client_id, cl.client_name, cl.client_code);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                              title="Manage Password Access"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateModal(cl.client_id, cl.client_name);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                            title="Add Login for this client"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: CREDENTIALS FOR SELECTED CLIENT IN CATEGORY */}
          {selectedCategoryId && selectedClientKey && currentCategory && currentClient && (
            <div className="space-y-5">
              {/* Breadcrumb Navigation Bar */}
              <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedClientKey(null)}
                    className="h-8 px-2 text-slate-600 hover:text-slate-900 gap-1 rounded-xl"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to {currentCategory.name}</span>
                  </Button>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">{currentCategory.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900">{currentClient.client_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      onClick={() =>
                        handleOpenClientAccessModal(
                          currentClient.client_id,
                          currentClient.client_name,
                          currentClient.client_code
                        )
                      }
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl gap-1.5 text-xs font-semibold"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Manage Access</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => handleOpenCreateModal(currentClient.client_id, currentClient.client_name)}
                    size="sm"
                    className="bg-neutral-900 hover:bg-black text-white rounded-xl gap-1.5 text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Login for {currentClient.client_name}</span>
                  </Button>
                </div>
              </div>

              {/* Client Info Banner */}
              <Card className="rounded-2xl border-slate-200 shadow-xs">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900">{currentClient.client_name}</h2>
                      {currentClient.client_code && (
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          {currentClient.client_code}
                        </span>
                      )}
                      {currentClient.folder_name && (
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          📁 {currentClient.folder_name}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {currentCategory.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Credentials and secure portal logins under {currentCategory.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="search"
                        placeholder="Search logins..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-8 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credentials Cards List */}
              {clientCredentials.length === 0 ? (
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <CardContent className="py-14 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">No credentials stored yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Add login credentials (portal URL, username, password) for {currentClient.client_name} under {currentCategory.name}.
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={() => handleOpenCreateModal(currentClient.client_id, currentClient.client_name)}
                        size="sm"
                        className="bg-neutral-900 hover:bg-black text-white rounded-xl gap-1.5 text-xs font-bold"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add First Login</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientCredentials.map((cred) => {
                    const isRevealed = Boolean(decryptedCache[cred.id]);

                    return (
                      <Card
                        key={cred.id}
                        className="rounded-2xl border-[1.5px] border-slate-200 hover:border-slate-400 bg-white shadow-xs transition-all"
                      >
                        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-900 truncate">{cred.portal_name}</h4>
                            {cred.login_url && (
                              <a
                                href={cred.login_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate"
                              >
                                <span className="truncate">{cred.login_url.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {cred.password_history && cred.password_history.length > 0 && (
                              <button
                                onClick={() => {
                                  setHistoryTargetCred(cred);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100"
                                title="Password History"
                              >
                                <History className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditModal(cred)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteCredential(cred)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3">
                          {/* Username */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="text-[10px] text-slate-400 block font-semibold">Username / User ID</span>
                              <span className="font-mono font-bold text-slate-900 truncate block mt-0.5">
                                {cred.username}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyUsername(cred)}
                              className="h-7 px-2 text-xs rounded-lg gap-1 border-slate-300"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </Button>
                          </div>

                          {/* Password */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="text-[10px] text-slate-400 block font-semibold">Password</span>
                              <span className="font-mono font-bold text-slate-900 truncate block mt-0.5">
                                {isRevealed ? decryptedCache[cred.id]?.plaintext : "••••••••••••"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleReveal(cred)}
                                className="h-7 w-7 p-0 rounded-lg border-slate-300 text-slate-600"
                                title={isRevealed ? "Hide" : "Reveal (30s)"}
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyPassword(cred)}
                                className="h-7 px-2 text-xs rounded-lg gap-1 border-slate-300"
                              >
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </Button>
                            </div>
                          </div>

                          {/* Extra info (email, mobile, rotation) */}
                          <div className="space-y-1 text-[11px] text-slate-500 pt-1">
                            {cred.registered_email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{cred.registered_email}</span>
                              </div>
                            )}
                            {cred.registered_mobile && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{cred.registered_mobile}</span>
                              </div>
                            )}
                            {cred.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
                                &quot;{cred.notes}&quot;
                              </p>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              Changed {formatDate(cred.last_password_changed_at)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT CATEGORY */}
      {/* ===================================================================== */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCategory ? "Edit Category" : "Create New Vault Category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Categories help group client credentials by practice area, regulatory authority, or domain.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category Name *</label>
              <Input
                placeholder="e.g. Real Estate & RERA, Audit Portals"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category Code (Short)</label>
              <Input
                placeholder="e.g. RERA, AUD"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-xs uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Brief summary of portals and credentials under this category..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Color Theme</label>
              <div className="flex flex-wrap gap-2">
                {["violet", "sky", "emerald", "amber", "rose", "indigo", "slate"].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setCatColor(col)}
                    className={`h-7 px-3 rounded-lg text-xs font-bold capitalize transition-all border ${
                      catColor === col ? "border-slate-900 shadow-xs ring-1 ring-slate-900" : "border-slate-200"
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-neutral-900 text-white">
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: ADD CLIENT TO CATEGORY */}
      {/* ===================================================================== */}
      <Dialog open={isAddClientModalOpen} onOpenChange={setIsAddClientModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Add Client to {currentCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a registered client to link with this category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClientToCategory} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Client *</label>
              <select
                value={selectedExistingClientId}
                onChange={(e) => setSelectedExistingClientId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              >
                <option value="">Select a registered client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name} ({c.client_code}) {c.folder_name ? `• ${c.folder_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Initial Credential Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Initial Login Credential (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Portal Name</label>
                  <Input
                    list="vault-portal-presets"
                    placeholder="e.g. GST Portal, Income Tax"
                    value={addClientPortal}
                    onChange={(e) => {
                      setAddClientPortal(e.target.value);
                      const match = PORTAL_PRESETS.find((p) => p.name.toLowerCase() === e.target.value.toLowerCase());
                      if (match) setAddClientUrl(match.url);
                    }}
                    className="text-xs h-8"
                  />
                  <datalist id="vault-portal-presets">
                    {PORTAL_PRESETS.map((p, idx) => (
                      <option key={idx} value={p.name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Login URL</label>
                  <Input
                    placeholder="https://..."
                    value={addClientUrl}
                    onChange={(e) => setAddClientUrl(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Username / User ID</label>
                  <Input
                    placeholder="e.g. 07AAACH1234F1Z5"
                    value={addClientUsername}
                    onChange={(e) => setAddClientUsername(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Password</label>
                  <Input
                    placeholder="Auto-generated strong password"
                    value={addClientPassword}
                    onChange={(e) => setAddClientPassword(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddClientModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-neutral-900 text-white">
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT CREDENTIAL */}
      {/* ===================================================================== */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCred ? "Edit Vault Credential" : "Store New Portal Credential"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              All passwords are encrypted with military-grade AES-256-GCM before saving to Supabase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCredential} className="space-y-4 py-2 text-xs">
            {/* Category Selection */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Client Selection */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Client</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={formClientId}
                  onChange={(e) => {
                    setFormClientId(e.target.value);
                    if (e.target.value) setFormCustomClientName("");
                  }}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Choose registered client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.client_code})
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Or type custom client name..."
                  value={formCustomClientName}
                  onChange={(e) => {
                    setFormCustomClientName(e.target.value);
                    if (e.target.value) setFormClientId("");
                  }}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Portal Name & URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Portal / Application Name *</label>
                <Input
                  list="portal-name-presets"
                  placeholder="e.g. GST Portal"
                  value={formPortalName}
                  onChange={(e) => {
                    setFormPortalName(e.target.value);
                    const match = PORTAL_PRESETS.find((p) => p.name.toLowerCase() === e.target.value.toLowerCase());
                    if (match) {
                      setFormLoginUrl(match.url);
                    }
                  }}
                  required
                  className="text-xs h-9"
                />
                <datalist id="portal-name-presets">
                  {PORTAL_PRESETS.map((p, idx) => (
                    <option key={idx} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Login URL</label>
                <Input
                  placeholder="https://services.gst.gov.in/..."
                  value={formLoginUrl}
                  onChange={(e) => setFormLoginUrl(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Username / User ID *</label>
                <Input
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  required
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Password *</label>
                <div className="relative">
                  <Input
                    type={formShowPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formPasswordPlaintext}
                    onChange={(e) => setFormPasswordPlaintext(e.target.value)}
                    required
                    className="font-mono text-xs h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {formShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Registered Email & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Registered Email</label>
                <Input
                  type="email"
                  placeholder="director@acme.com"
                  value={formRegEmail}
                  onChange={(e) => setFormRegEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Registered Mobile (OTP)</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={formRegMobile}
                  onChange={(e) => setFormRegMobile(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Access Permissions: Authorized Employees (Admin only) */}
            {isAdmin && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Authorized Employees (Password Access)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Only selected employees can view/copy
                  </span>
                </div>
                <EmployeeMultiSelect
                  employees={employees}
                  selectedEmployeeIds={formAssignedEmpIds}
                  onChange={(ids) => setFormAssignedEmpIds(ids)}
                  label=""
                  placeholder="Select employees who can view this password..."
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Internal Security Notes & Instructions</label>
              <Textarea
                placeholder="Security questions, OTP forwarding instructions, backup codes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-neutral-900 text-white">
                {isSaving ? "Encrypting & Storing..." : editingCred ? "Update Credential" : "Save Credential"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: MANAGE CLIENT PASSWORD ACCESS (ADMIN ONLY) */}
      {/* ===================================================================== */}
      <Dialog open={isClientAccessModalOpen} onOpenChange={setIsClientAccessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Manage Password Access — {accessTargetClient?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select employees who are authorized to view and copy passwords for this client. Other employees cannot see or copy credentials for this client.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClientAccess} className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Authorized Employees</label>
                <span className="text-[10px] text-blue-600 font-bold">
                  {clientAssignedEmpIds.length} employee(s) selected
                </span>
              </div>
              <EmployeeMultiSelect
                employees={employees}
                selectedEmployeeIds={clientAssignedEmpIds}
                onChange={(ids) => setClientAssignedEmpIds(ids)}
                label=""
                placeholder="Choose employees who can see passwords..."
              />
              <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                Admins always retain full access. Ordinary employees can only view or copy client passwords after an administrator explicitly grants them access here.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsClientAccessModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingAccess} className="bg-neutral-900 text-white">
                {isSavingAccess ? "Saving Permissions..." : "Save Password Access"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: PASSWORD HISTORY */}
      {/* ===================================================================== */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Password History — {historyTargetCred?.portal_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit record of previously configured passwords for this portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs max-h-72 overflow-y-auto">
            {historyTargetCred?.password_history && historyTargetCred.password_history.length > 0 ? (
              historyTargetCred.password_history.map((entry, idx) => (
                <div key={entry.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Version #{historyTargetCred.password_history!.length - idx}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(entry.changed_at)}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Changed by: {entry.changed_by_name || "Admin"}</p>
                  <p className="font-mono text-[11px] text-slate-400">Encrypted token: {entry.password_encrypted.slice(0, 24)}...</p>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-400">No historical passwords logged for this record.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: VAULT AUDIT LOG */}
      {/* ===================================================================== */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Vault Security Access & Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs">
              Every reveal, copy, create, update, and delete operation is immutably logged for compliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {auditLogs.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No audit events logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            log.action === "VIEW"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : log.action === "DELETE"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-blue-50 text-blue-800 border-blue-300"
                          }`}
                        >
                          {log.action}
                        </Badge>
                        <span className="font-bold text-slate-900">{log.portal_name}</span>
                        {log.client_name && <span className="text-slate-500">({log.client_name})</span>}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-slate-800 text-[11px] block">{log.performed_by_name}</span>
                      <span className="text-slate-400 text-[10px]">{formatDate(log.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
