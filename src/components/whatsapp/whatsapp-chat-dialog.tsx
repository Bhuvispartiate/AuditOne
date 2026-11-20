import React, { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Send,
  ExternalLink,
  User,
  Phone,
  Sparkles,
  CheckCheck,
  Building2,
  Calendar,
  Briefcase,
  AlertCircle,
  Clock,
  ChevronDown,
  Users,
  Check,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { whatsappClient } from "@/lib/whatsapp-client";
import { formatDate } from "@/lib/utils";
import { Client, Project, Task, TaskCategory, TaskSubCategory, WhatsAppTemplate, WorkflowTemplate } from "@/types";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { toast } from "sonner";

interface WhatsAppChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType?: "task" | "subtask" | "workflow" | "category" | "sub-category" | "client" | "general";
  task?: Task | null;
  client?: Client | null;
  project?: Project | null;
  workflow?: WorkflowTemplate | null;
  category?: TaskCategory | null;
  subCategory?: TaskSubCategory | null;
  customInitialMessage?: string;
}

export function WhatsAppChatDialog({
  open,
  onOpenChange,
  contextType = "task",
  task,
  client: directClient,
  project: directProject,
  workflow,
  category,
  subCategory,
  customInitialMessage,
}: WhatsAppChatDialogProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    return pmsStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const allClients = pmsStore.getClients();
  const allProjects = pmsStore.getProjects();
  const allEmployees = pmsStore.getEmployees();
  const templates = pmsStore.getWhatsAppTemplates();

  // Always resolve the live, enriched task object from store
  const liveTask = useMemo(() => {
    if (!task) return null;
    return (task.id ? pmsStore.getTaskById(task.id) : null) || task;
  }, [task]);

  // Resolve associated project & client from context
  const resolvedProject = useMemo(() => {
    if (directProject) return directProject;
    const t = liveTask;
    if (t?.project_id) {
      const match = allProjects.find((p) => p.id === t.project_id);
      if (match) return match;
    }
    if (t?.project_name) {
      const match = allProjects.find(
        (p) => p.project_name.trim().toLowerCase() === t.project_name!.trim().toLowerCase()
      );
      if (match) return match;
    }
    return null;
  }, [directProject, liveTask?.project_id, liveTask?.project_name, allProjects]);

  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const resolvedClient = useMemo(() => {
    if (selectedClientId) {
      const match = allClients.find((c) => c.id === selectedClientId || c.client_code === selectedClientId);
      if (match) return match;
    }
    if (directClient) return directClient;
    const t = liveTask || task;

    // 1. Direct match from task client_id
    if (t?.client_id) {
      const match = allClients.find((c) => c.id === t.client_id || c.client_code === t.client_id);
      if (match) return match;
    }
    // 2. Direct match from task client_name (case/whitespace insensitive + nickname/legal name + substring)
    if (t?.client_name) {
      const cleanName = t.client_name.trim().toLowerCase();
      const match = allClients.find(
        (c) =>
          c.client_name?.trim().toLowerCase() === cleanName ||
          c.nick_name?.trim().toLowerCase() === cleanName ||
          c.legal_name?.trim().toLowerCase() === cleanName ||
          (cleanName.length >= 3 && (c.client_name?.trim().toLowerCase().includes(cleanName) || cleanName.includes(c.client_name?.trim().toLowerCase())))
      );
      if (match) return match;
    }

    // 3. Match from associated project client_id
    if (resolvedProject?.client_id) {
      const match = allClients.find((c) => c.id === resolvedProject.client_id || c.client_code === resolvedProject.client_id);
      if (match) return match;
    }
    // 4. Match from associated project client_name
    if (resolvedProject?.client_name) {
      const cleanProjClient = resolvedProject.client_name.trim().toLowerCase();
      const match = allClients.find(
        (c) =>
          c.client_name?.trim().toLowerCase() === cleanProjClient ||
          c.nick_name?.trim().toLowerCase() === cleanProjClient ||
          c.legal_name?.trim().toLowerCase() === cleanProjClient ||
          (cleanProjClient.length >= 3 && (c.client_name?.trim().toLowerCase().includes(cleanProjClient) || cleanProjClient.includes(c.client_name?.trim().toLowerCase())))
      );
      if (match) return match;
    }

    // 5. Match from project_name prefix (e.g. "ROHTI — Client Delivery Project" or "ROHTI - Client Delivery Project")
    const pName = t?.project_name || resolvedProject?.project_name;
    if (pName) {
      const prefix = pName.split(/[-—–]/)[0].trim().toLowerCase();
      if (prefix) {
        const match = allClients.find(
          (c) =>
            c.client_name?.trim().toLowerCase() === prefix ||
            c.nick_name?.trim().toLowerCase() === prefix ||
            c.legal_name?.trim().toLowerCase() === prefix ||
            prefix.includes(c.client_name?.trim().toLowerCase()) ||
            c.client_name?.trim().toLowerCase().includes(prefix)
        );
        if (match) return match;
      }
    }

    // 6. Match from task title containing client name
    if (t?.title) {
      const titleLower = t.title.toLowerCase();
      const match = allClients.find(
        (c) => c.client_name && titleLower.includes(c.client_name.trim().toLowerCase())
      );
      if (match) return match;
    }

    return null;
  }, [selectedClientId, directClient, liveTask, task, resolvedProject, allClients]);

  const assignedEmployee = useMemo(() => {
    const t = liveTask;
    if (t?.assigned_employee_id) {
      return allEmployees.find((e) => e.id === t.assigned_employee_id) || null;
    }
    if (t?.assigned_employee_ids && t.assigned_employee_ids.length > 0) {
      return allEmployees.find((e) => t.assigned_employee_ids!.includes(e.id)) || null;
    }
    return null;
  }, [liveTask, allEmployees]);

  // Check if context is Category or Sub-category
  const isCategoryOrSubCategory = Boolean(
    contextType === "category" ||
    contextType === "sub-category" ||
    (category && !task) ||
    (subCategory && !task)
  );

  interface AllocatedClientItem {
    client: Client;
    taskCount: number;
    clientTasks: Task[];
  }

  // Fetch only clients allocated to this particular category or sub-category
  const allocatedClients = useMemo<AllocatedClientItem[]>(() => {
    if (!isCategoryOrSubCategory) return [];

    const allTasks = pmsStore.getTasks();

    let matchingTasks: Task[] = [];
    if (subCategory) {
      matchingTasks = allTasks.filter((t) => t.sub_category_id === subCategory.id);
    } else if (category) {
      matchingTasks = allTasks.filter((t) => t.category_id === category.id);
    }

    const clientMap = new Map<string, AllocatedClientItem>();

    matchingTasks.forEach((t) => {
      const proj = allProjects.find((p) => p.id === t.project_id);
      const clientId = (t as any).client_id || proj?.client_id;
      let cl: Client | undefined;

      if (clientId) {
        cl = allClients.find((c) => c.id === clientId);
      }
      if (!cl && (proj?.client_name || (t as any).client_name)) {
        const nameToMatch = (proj?.client_name || (t as any).client_name || "").trim().toLowerCase();
        cl = allClients.find((c) => c.client_name?.trim().toLowerCase() === nameToMatch);
      }

      if (cl) {
        const existing = clientMap.get(cl.id);
        if (existing) {
          existing.taskCount += 1;
          existing.clientTasks.push(t);
        } else {
          clientMap.set(cl.id, {
            client: cl,
            taskCount: 1,
            clientTasks: [t],
          });
        }
      }
    });

    return Array.from(clientMap.values()).sort((a, b) =>
      a.client.client_name.localeCompare(b.client.client_name)
    );
  }, [isCategoryOrSubCategory, subCategory, category, allProjects, allClients]);

  // Recipient selection state
  const [recipientType, setRecipientType] = useState<"client" | "assignee" | "custom">("client");
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [engineConnected, setEngineConnected] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const hasInitializedRef = React.useRef(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Active allocated client item
  const activeAllocatedItem = useMemo(() => {
    if (!selectedClientId) return allocatedClients[0] || null;
    return allocatedClients.find((it) => it.client.id === selectedClientId) || allocatedClients[0] || null;
  }, [selectedClientId, allocatedClients]);

  // Check WhatsApp engine connection status
  useEffect(() => {
    let isMounted = true;
    if (open) {
      whatsappClient.getStatus().then((st) => {
        if (isMounted) setEngineConnected(Boolean(st.connected));
      }).catch(() => {
        if (isMounted) setEngineConnected(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Clean phone number helper (removes +, spaces, dashes)
  const sanitizePhone = (phoneStr: string) => {
    return phoneStr.replace(/[^0-9]/g, "");
  };

  const getClientPhone = (cl?: Client | null) => {
    if (!cl) return "";
    if (cl.contact?.mobile_number) return sanitizePhone(cl.contact.mobile_number);
    if (cl.contacts && cl.contacts.length > 0) {
      const primary = cl.contacts.find((c) => c.is_primary) || cl.contacts[0];
      if (primary?.mobile_number) return sanitizePhone(primary.mobile_number);
    }
    if ((cl as any).mobile_number) return sanitizePhone((cl as any).mobile_number);
    if ((cl as any).phone) return sanitizePhone((cl as any).phone);
    if ((cl as any).mobile) return sanitizePhone((cl as any).mobile);
    return "";
  };

  const getClientContactPerson = (cl?: Client | null) => {
    if (!cl) return "Client";
    return (
      cl.contact?.contact_person ||
      cl.contacts?.find((c) => c.is_primary)?.contact_person ||
      cl.contacts?.[0]?.contact_person ||
      cl.legal_name ||
      cl.client_name
    );
  };

  // Determine Client Phone Number from Client 360 profile
  const clientPhone = useMemo(() => {
    return getClientPhone(resolvedClient);
  }, [resolvedClient]);

  const clientContactPerson = useMemo(() => {
    return getClientContactPerson(resolvedClient);
  }, [resolvedClient]);

  // Template placeholder substitution
  const applyTemplate = (
    tpl: WhatsAppTemplate,
    targetName?: string,
    targetTask?: Task | null,
    targetClient?: Client | null
  ) => {
    let text = tpl.content;
    const curClient = targetClient || activeAllocatedItem?.client || resolvedClient;
    const clientNameVal =
      targetName ||
      recipientName ||
      (curClient ? getClientContactPerson(curClient) : "Valued Client");
    const curTask = targetTask || activeAllocatedItem?.clientTasks?.[0] || liveTask || task;
    const taskTitleVal =
      curTask?.title ||
      subCategory?.name ||
      category?.name ||
      workflow?.workflow_name ||
      "Compliance Deliverable";
    const taskCodeVal = curTask?.task_code || workflow?.workflow_code || "TSK-001";
    const projectNameVal =
      curTask?.project_name ||
      resolvedProject?.project_name ||
      workflow?.service_name ||
      category?.name ||
      "Compliance Engagement";
    const dueDateVal = curTask?.due_date ? formatDate(curTask.due_date) : "Upcoming";
    const statusVal = curTask?.status || (workflow?.is_active ? "Active" : "In Progress");

    text = text.replace(/\{client_name\}/g, clientNameVal);
    text = text.replace(/\{task_title\}/g, taskTitleVal);
    text = text.replace(/\{task_code\}/g, taskCodeVal);
    text = text.replace(/\{project_name\}/g, projectNameVal);
    text = text.replace(/\{due_date\}/g, dueDateVal);
    text = text.replace(/\{status\}/g, statusVal);

    setMessage(text);
  };

  // Auto-initialize recipient and message ONCE when modal opens
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      setSelectedClientId("");
      setIsBatchSending(false);
      setBatchProgress(null);
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;

      if (isCategoryOrSubCategory && allocatedClients.length > 0) {
        const firstItem = allocatedClients[0];
        setSelectedClientId(firstItem.client.id);
        const contactPerson = getClientContactPerson(firstItem.client);
        const phone = getClientPhone(firstItem.client);
        setRecipientType("client");
        setRecipientName(contactPerson);
        setPhoneNumber(phone);

        const defaultTpl = templates[0];
        if (defaultTpl) {
          setSelectedTemplateId(defaultTpl.id);
          applyTemplate(defaultTpl, contactPerson, firstItem.clientTasks[0], firstItem.client);
        } else {
          setMessage(
            `👋 Hello ${contactPerson},\n\nUpdate regarding ${
              subCategory ? `sub-group "${subCategory.name}"` : `practice category "${category?.name || "Tasks"}"`
            }. Please let us know if you need any assistance.`
          );
        }
      } else if (resolvedClient) {
        setRecipientType("client");
        setRecipientName(clientContactPerson || resolvedClient.client_name);
        setPhoneNumber(clientPhone || "");

        if (customInitialMessage) {
          setMessage(customInitialMessage);
        } else {
          const defaultTpl = templates[0];
          if (defaultTpl) {
            setSelectedTemplateId(defaultTpl.id);
            applyTemplate(defaultTpl, clientContactPerson || resolvedClient.client_name, liveTask || task, resolvedClient);
          } else {
            setMessage(
              `👋 Hello ${clientContactPerson || resolvedClient.client_name},\n\nUpdate regarding ${
                liveTask?.title || task?.title || workflow?.workflow_name || "your compliance engagement"
              }. Please let us know if you need any assistance.`
            );
          }
        }
      } else if (assignedEmployee?.mobile_number) {
        setRecipientType("assignee");
        setRecipientName(assignedEmployee.full_name);
        setPhoneNumber(sanitizePhone(assignedEmployee.mobile_number));
      } else {
        setRecipientType("custom");
        setRecipientName(clientContactPerson || "Recipient");
        setPhoneNumber("");
      }
    }
  }, [
    open,
    isCategoryOrSubCategory,
    allocatedClients,
    task?.id,
    directClient?.id,
    workflow?.id,
    category?.id,
    subCategory?.id,
  ]);

  // When resolvedClient changes or becomes available while open, ensure client details are populated
  useEffect(() => {
    if (!open) return;
    if (resolvedClient && recipientType !== "client") {
      setRecipientType("client");
      setRecipientName(clientContactPerson || resolvedClient.client_name);
      if (clientPhone) setPhoneNumber(clientPhone);
      const defaultTpl = templates[0];
      if (defaultTpl) {
        setSelectedTemplateId(defaultTpl.id);
        applyTemplate(defaultTpl, clientContactPerson || resolvedClient.client_name, liveTask || task, resolvedClient);
      }
    }
  }, [open, resolvedClient, clientContactPerson, clientPhone]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const item = allocatedClients.find((it) => it.client.id === clientId);
    if (!item) return;

    const contactPerson = getClientContactPerson(item.client);
    const phone = getClientPhone(item.client);
    setRecipientName(contactPerson);
    setPhoneNumber(phone);

    const tpl = templates.find((t: WhatsAppTemplate) => t.id === selectedTemplateId);
    if (tpl) {
      applyTemplate(tpl, contactPerson, item.clientTasks[0], item.client);
    } else {
      setMessage(
        `👋 Hello ${contactPerson},\n\nUpdate regarding ${
          subCategory ? `sub-group "${subCategory.name}"` : `practice category "${category?.name || "Tasks"}"`
        }. Please let us know if you need any assistance.`
      );
    }
  };

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === "custom") {
      setMessage("");
      return;
    }
    const tpl = templates.find((t: WhatsAppTemplate) => t.id === tplId);
    if (tpl) {
      applyTemplate(
        tpl,
        recipientName,
        activeAllocatedItem?.clientTasks?.[0] || task,
        activeAllocatedItem?.client || resolvedClient
      );
    }
  };

  // Direct WhatsApp Web Link
  const webWhatsAppUrl = useMemo(() => {
    const clean = sanitizePhone(phoneNumber);
    if (!clean) return "";
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  }, [phoneNumber, message]);

  // Dispatches via WhatsApp Automation Backend
  const handleSendViaEngine = async () => {
    toast.error("WhatsApp Automation is closed on the Free Trial Version. Upgrade to Access.");
    setUpgradeModalOpen(true);
    return;
  };

  const handleOpenWhatsAppWeb = () => {
    const clean = sanitizePhone(phoneNumber);
    if (!clean || clean.length < 10) {
      toast.error("Please enter a valid phone number with country code (e.g. 919876543210).");
      return;
    }
    if (!message.trim()) {
      toast.error("Message body cannot be empty.");
      return;
    }

    pmsStore.addActivityLog(
      `Opened WhatsApp Web message draft for ${recipientName} (+${clean})`,
      contextType === "task" ? "task" : contextType === "workflow" ? "workflow" : "client",
      task?.id || workflow?.id || resolvedClient?.id
    );
    window.open(webWhatsAppUrl, "_blank", "noopener,noreferrer");
    toast.success(`Opened WhatsApp conversation with ${recipientName || clean}.`);
    onOpenChange(false);
  };

  // Dispatches to all allocated clients in this category or sub-category
  const handleBatchSendViaEngine = async () => {
    toast.error("WhatsApp Automation is closed on the Free Trial Version. Upgrade to Access.");
    setUpgradeModalOpen(true);
    return;
  };

  const contextTitle =
    task?.title ||
    workflow?.workflow_name ||
    subCategory?.name ||
    category?.name ||
    resolvedClient?.client_name ||
    "Practice Deliverable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-[#111827] flex items-center gap-2">
                  <span>WhatsApp Client Chat &amp; Dispatch</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] rounded-full px-2 py-0.5 font-bold ${
                      engineConnected
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-slate-100 text-slate-600 border-slate-300"
                    }`}
                  >
                    {engineConnected ? "● Engine Online" : "○ Web/API Ready"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  {isCategoryOrSubCategory ? (
                    <span>
                      {allocatedClients.length > 0 ? (
                        <>
                          Showing{" "}
                          <strong className="text-emerald-800">
                            {allocatedClients.length} allocated client{allocatedClients.length > 1 ? "s" : ""}
                          </strong>{" "}
                          for {subCategory ? "sub-group" : "category"}{" "}
                          <strong className="text-slate-900">{contextTitle}</strong>.
                        </>
                      ) : (
                        <>
                          No clients are currently allocated to {subCategory ? "sub-group" : "category"}{" "}
                          <strong className="text-slate-900">{contextTitle}</strong>.
                        </>
                      )}
                    </span>
                  ) : (
                    <span>
                      Compose custom message or select a saved firm template for{" "}
                      <strong className="text-slate-900">{contextTitle}</strong>.
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-3">
          {/* LEFT COLUMN: RECIPIENT & TEMPLATE SELECTION (5 COLS) */}
          <div className="md:col-span-5 space-y-4">
            {/* Category / Sub-category Allocated Clients Section */}
            {isCategoryOrSubCategory && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-extrabold text-emerald-950">
                      Allocated Clients ({allocatedClients.length})
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white border-emerald-300 text-emerald-800 font-bold px-2 py-0.5"
                  >
                    {subCategory ? `Sub-group: ${subCategory.name}` : `Category: ${category?.name || "Tasks"}`}
                  </Badge>
                </div>

                {allocatedClients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>No Client Currently Allotted</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Select a client below to allot to the tasks in this {subCategory ? "sub-group" : "category"} and dispatch:
                    </p>
                    <select
                      value=""
                      onChange={async (e) => {
                        const newCId = e.target.value;
                        if (!newCId) return;
                        try {
                          if (subCategory) {
                            await pmsStore.allotClientToSubCategory(subCategory.id, newCId);
                          } else if (category) {
                            await pmsStore.allotClientToCategory(category.id, newCId);
                          }
                          const cl = allClients.find((c) => c.id === newCId);
                          if (cl) {
                            const person = getClientContactPerson(cl);
                            const phone = getClientPhone(cl);
                            setRecipientName(person);
                            setPhoneNumber(phone);
                            setSelectedClientId(cl.id);
                            const tpl = templates.find((t) => t.id === selectedTemplateId);
                            if (tpl) {
                              applyTemplate(tpl, person, null, cl);
                            }
                          }
                          toast.success(`Client allotted successfully!`);
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to allot client");
                        }
                      }}
                      className="w-full h-9 rounded-xl border border-amber-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">-- Choose Client to Allot &amp; Dispatch --</option>
                      {allClients.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.client_name} ({cl.client_code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Select Allocated Client:
                      </label>
                      <select
                        value={activeAllocatedItem?.client?.id || ""}
                        onChange={(e) => handleSelectClient(e.target.value)}
                        className="w-full h-9 rounded-xl border border-emerald-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {allocatedClients.map(({ client, taskCount }) => (
                          <option key={client.id} value={client.id}>
                            {client.client_name} · ({taskCount} task{taskCount > 1 ? "s" : ""})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick switch chips if multiple allocated clients */}
                    {allocatedClients.length > 1 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Quick Switch:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {allocatedClients.map(({ client, taskCount }) => {
                            const isSelected = activeAllocatedItem?.client?.id === client.id;
                            return (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => handleSelectClient(client.id)}
                                className={`text-[11px] px-2.5 py-1 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                    : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                                }`}
                              >
                                <span className="truncate max-w-[130px]">{client.client_name}</span>
                                <span
                                  className={`text-[9px] px-1 rounded-md font-mono ${
                                    isSelected ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {taskCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Client Allotment for Task if not yet allotted */}
            {!isCategoryOrSubCategory && task && !resolvedClient && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>No Client Allotted to this Task Yet</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Select a client below to allot to this task and auto-fill contact details:
                </p>
                <select
                  value=""
                  onChange={async (e) => {
                    const newCId = e.target.value;
                    if (!newCId || !task) return;
                    setSelectedClientId(newCId);
                    try {
                      await pmsStore.allotClientToTask(task.id, newCId);
                      const cl = allClients.find((c) => c.id === newCId);
                      if (cl) {
                        const person = getClientContactPerson(cl);
                        const phone = getClientPhone(cl);
                        setRecipientType("client");
                        setRecipientName(person);
                        setPhoneNumber(phone);
                        const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
                        if (tpl) {
                          applyTemplate(tpl, person, liveTask || task, cl);
                        }
                      }
                      toast.success("Client allotted to task successfully!");
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to allot client");
                    }
                  }}
                  className="w-full h-9 rounded-xl border border-amber-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">-- Choose Client to Allot &amp; Message --</option>
                  {allClients.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.client_name} ({cl.client_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* When client IS allotted, display client verification card */}
            {!isCategoryOrSubCategory && resolvedClient && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                    <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Allotted Client: <strong className="text-emerald-900">{resolvedClient.client_name}</strong></span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white border-emerald-300 text-emerald-800 font-bold px-2 py-0.5">
                    {resolvedClient.client_code || "Allotted"}
                  </Badge>
                </div>
                <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-0.5">
                  <span>
                    Contact: <strong className="text-emerald-950">{clientContactPerson || resolvedClient.client_name}</strong>
                  </span>
                  {clientPhone ? (
                    <span className="font-mono text-emerald-700 font-bold">+{clientPhone}</span>
                  ) : (
                    <span className="text-amber-700 font-semibold text-[10px]">(Phone not on file - enter below)</span>
                  )}
                </div>
              </div>
            )}

            {/* Recipient Details */}
            <div className="rounded-2xl border border-slate-300 bg-white p-3.5 space-y-3">
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Contact Person Name</label>
                  <Input
                    placeholder="e.g. Rajesh Kumar"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="h-9 rounded-xl border-slate-300 text-xs bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Mobile Number (with Country Code) *</span>
                    {clientPhone && (
                      <span className="text-[10px] text-emerald-700 font-extrabold">Fetched from Client 360</span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="e.g. 919876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-8 h-9 rounded-xl border-slate-300 text-xs font-mono font-medium bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Include country code without &lsquo;+&rsquo; (India: 91XXXXXXXXXX).
                  </p>
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div className="rounded-2xl border border-slate-300 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Message Template
                </label>
                <span className="text-[10px] font-bold text-violet-700">
                  {templates.length} Saved in Settings
                </span>
              </div>

              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800"
              >
                <option value="custom">-- Custom Message (No Template) --</option>
                {templates.map((tpl: WhatsAppTemplate) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.category}] {tpl.title}
                  </option>
                ))}
              </select>

              {/* Template pills */}
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {templates.map((tpl: WhatsAppTemplate) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleTemplateSelect(tpl.id)}
                    className={`w-full text-left p-2 rounded-xl border text-[11px] transition-all flex flex-col gap-0.5 ${
                      selectedTemplateId === tpl.id
                        ? "bg-emerald-50/70 border-emerald-400 text-emerald-950 font-bold"
                        : "bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold truncate">{tpl.title}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white border border-slate-200 text-slate-600">
                        {tpl.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{tpl.content}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CHAT BOX & LIVE PREVIEW (7 COLS) */}
          <div className="md:col-span-7 space-y-3">
            {/* Live WhatsApp Bubble Preview */}
            <div
              onClick={() => textareaRef.current?.focus()}
              className="rounded-2xl border border-emerald-200 bg-[#e5ddd5] p-3 shadow-inner relative overflow-hidden cursor-pointer group"
              title="Click to edit message in composer below"
            >
              <div className="text-[10px] font-extrabold text-slate-600 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>WhatsApp Message Preview (Live)</span>
                </span>
                <span className="font-mono text-slate-500">
                  To: +{sanitizePhone(phoneNumber) || "XXXXXXXXXX"}
                </span>
              </div>

              {/* WhatsApp Message Bubble */}
              <div className="max-w-[90%] ml-auto bg-[#dcf8c6] rounded-2xl rounded-tr-xs p-3.5 shadow-xs border border-emerald-300/40 text-slate-900 text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans transition-all group-hover:ring-1 group-hover:ring-emerald-400">
                <div>{message || "Type a message or select a template to preview..."}</div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 font-medium">
                  <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <CheckCheck className="h-3.5 w-3.5 text-sky-600" />
                </div>
              </div>
            </div>

            {/* Editable Composer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Message Body (Editable)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {message.length} chars · {message.trim() ? message.trim().split(/\s+/).length : 0} words
                </span>
              </div>

              <Textarea
                ref={textareaRef}
                placeholder="Type your WhatsApp notification or message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="text-xs rounded-xl border-slate-300 bg-white font-medium focus-visible:ring-emerald-500 focus-visible:border-emerald-500 leading-relaxed text-slate-900 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Encrypted WhatsApp Notification Dispatch</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-300 text-xs font-bold h-9"
            >
              Cancel
            </Button>

            {isCategoryOrSubCategory && allocatedClients.length > 1 && (
              <Button
                type="button"
                variant="outline"
                disabled={isBatchSending || isSending || !message.trim()}
                onClick={handleBatchSendViaEngine}
                className="rounded-xl border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 text-xs font-bold h-9 gap-1.5 shadow-xs"
                title={`Send this message via WhatsApp Automation to all ${allocatedClients.length} allocated clients`}
              >
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {isBatchSending
                    ? `Sending (${batchProgress?.current}/${batchProgress?.total})...`
                    : `Dispatch to All (${allocatedClients.length})`}
                </span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleOpenWhatsAppWeb}
              className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold h-9 gap-1.5 shadow-xs"
              title="Open chat directly in WhatsApp Web browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
              <span>WhatsApp Web</span>
            </Button>

            <Button
              type="button"
              disabled={isSending || !phoneNumber.trim() || !message.trim()}
              onClick={handleSendViaEngine}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 gap-1.5 shadow-xs disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? "Sending..." : "Dispatch Message"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature="whatsapp"
      />
    </Dialog>
  );
}

