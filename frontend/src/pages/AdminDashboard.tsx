import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, LogOut, Plus, Pencil, Trash2, Loader2, Banknote, Settings, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { ageGroupApi, adminQuestionApi, answerApi, adminSettingsApi, orderApi } from "@/services/api";
import type { AdminQuestionDTO, CreateQuestionRequest, AgeGroup, OrderAdminDTO } from "@/types/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Tab = "questions" | "ageGroups" | "answers" | "settings" | "orders";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { admin, isLoading: authLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("questions");

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate("/admin");
    }
  }, [authLoading, admin, navigate]);

  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#FFFDF5]">
        <Loader2 size={32} className="animate-spin text-[#E8C547]" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5]">
      <header className="border-b border-[#E8E4DC] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8C547]/15">
              <Shield size={18} className="text-[#E8C547]" />
            </div>
            <h1 className="font-['Fredoka'] text-xl text-[#2D2A26]">{t("dashboard")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B6560]">{admin.username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#6B6560] transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut size={16} />
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex gap-2 border-b border-[#E8E4DC]">
          {(["questions", "ageGroups", "answers", "settings", "orders"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-[#E8C547] text-[#2D2A26]"
                  : "text-[#6B6560] hover:text-[#2D2A26]"
              }`}
            >
              {t(tab === "ageGroups" ? "ageGroups" : tab === "settings" ? "settings" : tab === "orders" ? "orders" : tab)}
            </button>
          ))}
        </div>

        {activeTab === "questions" && <QuestionsTab />}
        {activeTab === "ageGroups" && <AgeGroupsTab />}
        {activeTab === "answers" && <AnswersTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "orders" && <OrdersTab />}
      </div>
    </div>
  );
}

function QuestionsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    ageGroupId: 0,
    title: "",
    description: "",
    isActive: true,
    options: [
      { key: "A", text: "" },
      { key: "B", text: "" },
      { key: "C", text: "" },
      { key: "D", text: "" },
    ] as { key: string; text: string }[],
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin", "questions"],
    queryFn: adminQuestionApi.list,
  });
  const { data: ageGroups } = useQuery({
    queryKey: ["ageGroups"],
    queryFn: ageGroupApi.list,
  });

  const createMutation = useMutation({
    mutationFn: adminQuestionApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: CreateQuestionRequest }) =>
      adminQuestionApi.update(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminQuestionApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ageGroupId: 0, title: "", description: "", isActive: true, options: [
      { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" },
    ] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ageGroupId || !formData.title) return;
    const validOptions = formData.options.filter((o) => o.text.trim());
    if (validOptions.length < 2) return;

    const req: CreateQuestionRequest = {
      ageGroupId: formData.ageGroupId,
      isActive: formData.isActive,
      translations: [
        { languageCode: "en", title: formData.title, description: formData.description },
      ],
      options: validOptions,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, req });
    } else {
      createMutation.mutate(req);
    }
  };

  const startEdit = (q: AdminQuestionDTO) => {
    setEditingId(q.id);
    const opts = q.options && q.options.length > 0 ? q.options : [
      { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" },
    ];
    setFormData({
      ageGroupId: q.ageGroupId,
      title: q.translations[0]?.title || "",
      description: q.translations[0]?.description || "",
      isActive: q.isActive ?? true,
      options: opts,
    });
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#E8C547]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-['Fredoka'] text-lg text-[#2D2A26]">{t("questions")}</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-full bg-[#E8C547] px-4 py-2 text-sm font-medium text-[#2D2A26] transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} />
          {t("createQuestion")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-[#E8E4DC] bg-white p-6">
          <h3 className="mb-4 font-['Fredoka'] text-lg">{editingId ? t("editQuestion") : t("createQuestion")}</h3>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm text-[#6B6560]">{t("ageGroups")}</label>
              <select
                value={formData.ageGroupId}
                onChange={(e) => setFormData({ ...formData, ageGroupId: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm text-[#2D2A26] outline-none focus:border-[#E8C547]"
              >
                <option value={0}>{t("selectAgeGroup", "Select age group...")}</option>
                {ageGroups?.map((ag: AgeGroup) => (
                  <option key={ag.id} value={ag.id}>{ag.name} ({ag.minAge}-{ag.maxAge})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#6B6560]">{t("title")}</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm text-[#2D2A26] outline-none focus:border-[#E8C547]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#6B6560]">{t("description")}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm text-[#2D2A26] outline-none focus:border-[#E8C547]"
                rows={2}
              />
            </div>
            {/* Options A/B/C/D */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#6B6560]">Options (A/B/C/D)</label>
              <div className="grid gap-2">
                {formData.options.map((opt, idx) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8C547]/15 text-xs font-bold text-[#2D2A26]">{opt.key}</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...formData.options];
                        newOpts[idx] = { ...opt, text: e.target.value };
                        setFormData({ ...formData, options: newOpts });
                      }}
                      placeholder={`Option ${opt.key}`}
                      className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm text-[#2D2A26] outline-none focus:border-[#E8C547]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#2D2A26]">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 accent-[#E8C547]"
              />
              {t("active")}
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-full bg-[#E8C547] px-6 py-2.5 text-sm font-medium text-[#2D2A26] transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : t("save")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-[#E8E4DC] px-6 py-2.5 text-sm text-[#6B6560] transition-colors hover:bg-[#E8E4DC]/20"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E8E4DC] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E4DC] bg-[#FFFDF5]">
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">ID</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("title")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("ageGroups")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("status")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {questions?.map((q: AdminQuestionDTO) => (
              <tr key={q.id} className="border-b border-[#E8E4DC]/50 transition-colors hover:bg-[#FFFDF5]/50">
                <td className="px-4 py-3 text-[#6B6560]">{q.id}</td>
                <td className="px-4 py-3 font-medium text-[#2D2A26]">{q.translations[0]?.title || "Untitled"}</td>
                <td className="px-4 py-3 text-[#6B6560]">{q.ageGroupName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${q.isActive ? "bg-[#81B29A]/15 text-[#81B29A]" : "bg-[#E8E4DC]/50 text-[#6B6560]"}`}>
                    {q.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(q)} className="rounded-lg p-1.5 text-[#6B6560] transition-colors hover:bg-[#E8C547]/10 hover:text-[#E8C547]">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => { if (confirm("Delete this question?")) deleteMutation.mutate(q.id); }} className="rounded-lg p-1.5 text-[#6B6560] transition-colors hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!questions || questions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#6B6560]">No questions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgeGroupsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ageGroups, isLoading } = useQuery({
    queryKey: ["ageGroups"],
    queryFn: ageGroupApi.list,
  });

  const currentPrice = ageGroups?.[0]?.price ?? 9.99;
  const [priceInput, setPriceInput] = useState("");

  const setPriceMutation = useMutation({
    mutationFn: (price: number) => ageGroupApi.setUnifiedPrice(price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ageGroups"] });
      toast.success(t("priceSaved", "Price saved"));
    },
    onError: (err: unknown) => {
      const status = err instanceof AxiosError ? err.response?.status : undefined;
      if (status === 401 || status === 403) {
        toast.error(t("priceSaveAuthFailed", "Session expired. Please log in again."));
        navigate("/admin");
        return;
      }
      toast.error(t("priceSaveFailed", "Failed to save price"));
    },
  });

  const handleSavePrice = () => {
    if (!localStorage.getItem("adminToken")) {
      toast.error(t("priceSaveAuthFailed", "Session expired. Please log in again."));
      navigate("/admin");
      return;
    }
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      toast.error(t("invalidPrice", "Please enter a valid price greater than 0"));
      return;
    }
    setPriceMutation.mutate(price);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#E8C547]" /></div>;
  }

  const displayPrice = priceInput !== "" ? priceInput : currentPrice.toFixed(2);

  return (
    <div>
      <div className="mb-6 rounded-xl border border-[#E8E4DC] bg-white p-5">
        <h2 className="mb-1 font-['Fredoka'] text-lg text-[#2D2A26]">{t("unifiedPriceSettings", "Unified Price")}</h2>
        <p className="mb-4 text-sm text-[#6B6560]">{t("unifiedPriceDesc", "One price applies to all age groups.")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-[#6B6560]">{t("priceCny", "Price (CNY)")}</label>
            <div className="flex items-center gap-2">
              <span className="text-lg text-[#6B6560]">¥</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={displayPrice}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-32 rounded-lg border border-[#E8E4DC] px-3 py-2 text-[#2D2A26] outline-none focus:border-[#E8C547]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSavePrice}
            disabled={setPriceMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E8C547] px-5 py-2.5 font-medium text-[#2D2A26] transition-all hover:bg-[#e0bc3f] disabled:opacity-60"
          >
            {setPriceMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Banknote size={18} />
            )}
            {t("savePrice", "Save Price")}
          </button>
        </div>
        <p className="mt-3 text-sm font-medium text-[#E07A5F]">
          {t("currentUnifiedPrice", "Current price")}: ¥{currentPrice.toFixed(2)}
        </p>
      </div>

      <h2 className="mb-4 font-['Fredoka'] text-lg text-[#2D2A26]">{t("ageGroups")}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ageGroups?.map((ag: AgeGroup) => (
          <div key={ag.id} className="rounded-xl border border-[#E8E4DC] bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-['Fredoka'] text-lg text-[#2D2A26]">{ag.name}</h3>
              <span className="text-sm text-[#6B6560]">{ag.minAge}-{ag.maxAge} {t("yearsOld")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
  });
  const [questionCount, setQuestionCount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"" | "mock" | "live">("");
  const [reportPrice, setReportPrice] = useState("");

  const saveMutation = useMutation({
    mutationFn: adminSettingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["publicSettings"] });
      toast.success(t("settingsSaved", "Settings saved"));
    },
    onError: (err: unknown) => {
      const status = err instanceof AxiosError ? err.response?.status : undefined;
      if (status === 401 || status === 403) {
        toast.error(t("priceSaveAuthFailed", "Session expired. Please log in again."));
        navigate("/admin");
        return;
      }
      toast.error(t("settingsSaveFailed", "Failed to save settings"));
    },
  });

  const handleSave = () => {
    if (!localStorage.getItem("adminToken")) {
      toast.error(t("priceSaveAuthFailed", "Session expired. Please log in again."));
      navigate("/admin");
      return;
    }
    const count = parseInt(questionCount || String(settings?.quizQuestionCount ?? 5), 10);
    if (isNaN(count) || count < 1 || count > 20) {
      toast.error(t("invalidQuestionCount", "Question count must be between 1 and 20"));
      return;
    }
    saveMutation.mutate({
      quizQuestionCount: count,
      paymentMode: (paymentMode || settings?.paymentMode || "mock") as "mock" | "live",
      reportPrice: reportPrice || settings?.reportPrice || "29.90",
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#E8C547]" /></div>;
  }

  const displayCount = questionCount !== "" ? questionCount : String(settings?.quizQuestionCount ?? 5);
  const displayMode = paymentMode || settings?.paymentMode || "mock";
  const displayPrice = reportPrice !== "" ? reportPrice : settings?.reportPrice || "29.90";

  return (
    <div>
      <div className="mb-6 rounded-xl border border-[#E8E4DC] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings size={20} className="text-[#E8C547]" />
          <h2 className="font-['Fredoka'] text-lg text-[#2D2A26]">{t("settings", "Settings")}</h2>
        </div>
        <p className="mb-6 text-sm text-[#6B6560]">{t("settingsDesc", "Configure quiz and payment behavior. Stored securely in the database.")}</p>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-[#6B6560]">{t("quizQuestionCount", "Quiz question count")}</label>
            <input
              type="number"
              min={1}
              max={20}
              value={displayCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-[#E8E4DC] px-3 py-2 text-[#2D2A26] outline-none focus:border-[#E8C547]"
            />
            <p className="mt-1 text-xs text-[#6B6560]">{t("quizQuestionCountHelp", "How many questions each user answers (1–20). Enforced on the server.")}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#6B6560]">{t("paymentMode", "Payment mode")}</label>
            <select
              value={displayMode}
              onChange={(e) => setPaymentMode(e.target.value as "mock" | "live")}
              className="w-full max-w-xs rounded-lg border border-[#E8E4DC] px-3 py-2 text-[#2D2A26] outline-none focus:border-[#E8C547]"
            >
              <option value="mock">{t("paymentModeMock", "Mock (auto success + redirect to report)")}</option>
              <option value="live">{t("paymentModeLive", "Live (real gateway — coming soon)")}</option>
            </select>
            <p className="mt-1 text-xs text-[#6B6560]">{t("paymentModeHelp", "Mock mode completes payment on the server and redirects to the partner report page.")}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#6B6560]">{t("reportPrice", "Report price (¥)")}</label>
            <input
              type="text"
              value={displayPrice}
              onChange={(e) => setReportPrice(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-[#E8E4DC] px-3 py-2 text-[#2D2A26] outline-none focus:border-[#E8C547]"
            />
            <p className="mt-1 text-xs text-[#6B6560]">{t("reportPriceHelp", "Price displayed on the report page. E.g. 29.90")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#E8C547] px-5 py-2.5 font-medium text-[#2D2A26] transition-all hover:bg-[#e0bc3f] disabled:opacity-60"
        >
          {saveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Settings size={18} />}
          {t("saveSettings", "Save Settings")}
        </button>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", page],
    queryFn: () => orderApi.adminList(page, 20),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "text-green-600 bg-green-50";
      case "pending": return "text-amber-600 bg-amber-50";
      case "closed": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#E8C547]" /></div>;
  }

  return (
    <div>
      <h2 className="mb-4 font-['Fredoka'] text-lg text-[#2D2A26]">{t("orders")}</h2>
      <div className="overflow-x-auto rounded-xl border border-[#E8E4DC] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E4DC] bg-[#FFFDF5]">
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("orderId")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("email")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("amountYuan")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("channel")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("status")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("tradeNo")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("date")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((o: OrderAdminDTO) => (
              <tr key={o.orderId} className="border-b border-[#E8E4DC]/50 hover:bg-[#FFFDF5]/50">
                <td className="px-4 py-3 font-mono text-xs text-[#6B6560]">{o.orderId}</td>
                <td className="px-4 py-3 text-[#2D2A26]">{o.payerContact || "-"}</td>
                <td className="px-4 py-3 text-[#2D2A26]">¥{o.amountYuan}</td>
                <td className="px-4 py-3 text-[#6B6560]">{o.channel}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(o.status)}`}>{o.status}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#6B6560]">{o.tradeNo || "-"}</td>
                <td className="px-4 py-3 text-xs text-[#6B6560]">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#6B6560]">No orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-[#E8E4DC] px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-[#6B6560]">Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={page * data.pageSize >= data.total} className="rounded-lg border border-[#E8E4DC] px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function AnswersTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "answers", page],
    queryFn: () => answerApi.adminList(page, 20),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#E8C547]" /></div>;
  }

  return (
    <div>
      <h2 className="mb-4 font-['Fredoka'] text-lg text-[#2D2A26]">{t("answers")}</h2>
      <div className="overflow-x-auto rounded-xl border border-[#E8E4DC] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E4DC] bg-[#FFFDF5]">
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">ID</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("questions")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("yourAge")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("selectedOption", "Selected")}</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6560]">{t("date")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((a) => (
              <tr key={a.id} className="border-b border-[#E8E4DC]/50 hover:bg-[#FFFDF5]/50">
                <td className="px-4 py-3 text-[#6B6560]">{a.id}</td>
                <td className="px-4 py-3 text-[#2D2A26]">{a.questionTitle}</td>
                <td className="px-4 py-3 text-[#6B6560]">{a.respondentAge}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8C547]/15 text-sm font-bold text-[#2D2A26]">{a.selectedOption}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[#6B6560]">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#6B6560]">No answers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-[#E8E4DC] px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-[#6B6560]">Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={page * data.pageSize >= data.total} className="rounded-lg border border-[#E8E4DC] px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
