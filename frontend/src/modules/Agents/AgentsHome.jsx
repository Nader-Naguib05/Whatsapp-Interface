// src/components/Agents/AgentsHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  UsersRound,
  ShieldCheck,
  UserX,
  Filter,
  ArrowUpDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import AgentsList from "./AgentsList";
import AddAgentModal from "./AddAgentModal";
import { useAuth } from "../../context/AuthContext";

export default function AgentsHome() {
  const [agents, setAgents] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | disabled
  const [sortBy, setSortBy] = useState("name"); // name | role | status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { token, ready, user } = useAuth();

  const fetchAgents = async () => {
    setLoading(true);
    setError("");

    try {
      if (!token) {
        throw new Error("لم يتم العثور على التوكن — قم بتسجيل الدخول.");
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/agents`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("فشل في تحميل قائمة الوكلاء.");
      }

      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "حدث خطأ غير متوقع أثناء تحميل البيانات.");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Fetch agents when auth is ready and token exists
  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setAgents([]);
      setError("الرجاء تسجيل الدخول للوصول إلى الوكلاء.");
      return;
    }

    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const disabledCount = agents.filter((a) => a.status === "disabled").length;
  const adminsCount = agents.filter((a) => a.role === "admin").length;

  const filteredAndSortedAgents = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = agents.filter((ag) => {
      const name = (ag.fullname || "").toLowerCase();
      const email = (ag.email || "").toLowerCase();
      const role = (ag.role || "").toLowerCase();
      const phone = (ag.phone || "").toLowerCase();
      const matchesQuery =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        phone.includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : (ag.status || "").toLowerCase() === statusFilter;

      return matchesQuery && matchesStatus;
    });

    list.sort((a, b) => {
      const nameA = (a.fullname || "").toLowerCase();
      const nameB = (b.fullname || "").toLowerCase();
      const roleA = (a.role || "").toLowerCase();
      const roleB = (b.role || "").toLowerCase();
      const statusA = (a.status || "").toLowerCase();
      const statusB = (b.status || "").toLowerCase();

      if (sortBy === "name") {
        return nameA.localeCompare(nameB, "ar");
      }
      if (sortBy === "role") {
        return roleA.localeCompare(roleB, "ar");
      }
      if (sortBy === "status") {
        return statusA.localeCompare(statusB, "ar");
      }
      return 0;
    });

    return list;
  }, [agents, query, statusFilter, sortBy]);

  const hasAgents = agents && agents.length > 0;

  // Optional: simple guard for non-logged users
  if (ready && !token) {
    return (
      <div
        dir="rtl"
        className="flex items-center justify-center min-h-screen bg-[#F4F5F7]"
      >
        <div className="bg-white border rounded-xl px-6 py-4 shadow-sm text-center">
          <p className="text-sm text-gray-600">
            تحتاج إلى تسجيل الدخول للوصول إلى إدارة الوكلاء.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col w-full min-h-screen bg-[#F4F5F7]">
      {/* ---------------------- HEADER ---------------------- */}
      <header className="bg-white border-b shadow-sm px-8 py-6 sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            إدارة الوكلاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تحكّم في المشغلين، الأدوار، وصلاحيات الوصول داخل النظام من مكان
            واحد.
          </p>
          {hasAgents && (
            <p className="text-xs text-gray-400 mt-1">
              إجمالي الوكلاء:{" "}
              <span className="font-semibold text-gray-600">
                {agents.length}
              </span>
            </p>
          )}
        </div>

        <button
          onClick={() => setOpenAddModal(true)}
          className="
            flex items-center gap-2 px-4 py-2
            bg-green-600 text-white rounded-lg
            hover:bg-green-700
            transition-all active:scale-[0.98]
          "
        >
          <Plus size={18} />
          إضافة وكيل جديد
        </button>
      </header>

      {/* ---------------------- STATS CARDS ---------------------- */}
      <section className="px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Agents */}
        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="bg-green-100 text-green-600 p-3 rounded-xl">
            <UsersRound size={26} />
          </div>
          <div>
            <p className="text-sm text-gray-500">الوكلاء النشِطون</p>
            <h3 className="text-xl font-semibold">{activeCount}</h3>
            <p className="text-xs text-gray-400 mt-1">
              الحسابات المصرَّح لها بالوصول حالياً.
            </p>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
            <ShieldCheck size={26} />
          </div>
          <div>
            <p className="text-sm text-gray-500">المشرفون (Admin)</p>
            <h3 className="text-xl font-semibold">{adminsCount}</h3>
            <p className="text-xs text-gray-400 mt-1">
              حسابات بصلاحيات إدارية موسَّعة.
            </p>
          </div>
        </div>

        {/* Disabled */}
        <div className="bg-white border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="bg-red-100 text-red-600 p-3 rounded-xl">
            <UserX size={26} />
          </div>
          <div>
            <p className="text-sm text-gray-500">الحسابات الموقوفة</p>
            <h3 className="text-xl font-semibold">{disabledCount}</h3>
            <p className="text-xs text-gray-400 mt-1">
              حسابات تم إيقافها مؤقتاً أو بشكل دائم.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------- ERROR STATE ---------------------- */}
      {error && !loading && (
        <section className="px-8 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={fetchAgents}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200"
            >
              <RefreshCw size={14} />
              إعادة المحاولة
            </button>
          </div>
        </section>
      )}

      {/* ---------------------- SEARCH + FILTER BAR ---------------------- */}
      <section className="px-8 mb-4">
        <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="ابحث عن وكيل بالاسم، البريد، الهاتف أو الدور..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="
                w-full pr-10 pl-4 py-2 rounded-lg border
                focus:ring-2 focus:ring-green-400 focus:border-green-400
                transition text-gray-700 text-sm
              "
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 md:w-auto">
            {/* Status filter */}
            <div className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
              <Filter size={16} className="text-gray-400" />
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2 py-1 text-xs rounded-md ${
                  statusFilter === "all"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-2 py-1 text-xs rounded-md ${
                  statusFilter === "active"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                نشِط
              </button>
              <button
                onClick={() => setStatusFilter("disabled")}
                className={`px-2 py-1 text-xs rounded-md ${
                  statusFilter === "disabled"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                موقوف
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
              <ArrowUpDown size={16} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-gray-700 focus:outline-none"
              >
                <option value="name">ترتيب بالاسم</option>
                <option value="role">ترتيب بالدور</option>
                <option value="status">ترتيب بالحالة</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------- AGENTS LIST / LOADING ---------------------- */}
      <main className="px-8 pb-10">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-xl border shadow-sm animate-pulse flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div>
                    <div className="h-3 w-28 bg-gray-200 rounded mb-2" />
                    <div className="h-2 w-40 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <AgentsList agents={filteredAndSortedAgents} refresh={fetchAgents} />
        )}
      </main>

      {/* ---------------------- MODAL ---------------------- */}
      {openAddModal && (
        <AddAgentModal
          close={() => setOpenAddModal(false)}
          refresh={fetchAgents}
        />
      )}
    </div>
  );
}
