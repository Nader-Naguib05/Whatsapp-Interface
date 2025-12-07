import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AgentsList({ agents, refresh }) {
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { user, token } = useAuth();
    console.log(user);
  // Retrieve current logged-in user info
  const currentUserId = user._id;
  const currentUserRole = user.role;
  const isAdmin = currentUserRole === "admin";

  if (!agents || !agents.length) {
    return (
      <p className="text-gray-500 mt-10 text-center text-sm">
        لا يوجد وكلاء حتى الآن.
      </p>
    );
  }

  const getArabicRole = (role) => {
    if (role === "admin") return "مشرف (Admin)";
    if (role === "agent") return "وكيل";
    return role || "غير محدَّد";
  };

  const getStatusLabel = (status) => {
    if (status === "active") return "نشِط";
    if (status === "disabled") return "موقوف";
    return "غير معروف";
  };

  const handleToggleStatus = async (agent) => {
    const currentStatus = (agent.status || "").toLowerCase();
    const newStatus = currentStatus === "active" ? "disabled" : "active";

    if (!agent._id) return;
    setActionLoadingId(agent._id);

    try {
      const res = await fetch(
  `${import.meta.env.VITE_API_URL}/agents/${agent._id}/status`,
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ status: newStatus }),
  }
);


      if (!res.ok) {
        throw new Error("فشل في تحديث حالة الوكيل.");
      }

      if (typeof refresh === "function") {
        await refresh();
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تحديث حالة الوكيل.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (agent) => {
    if (!agent._id) return;

    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف الوكيل: ${agent.name || "بدون اسم"} ؟\nلن يمكنك التراجع عن هذه العملية.`
    );

    if (!confirmDelete) return;

    setActionLoadingId(agent._id);
    try {
      const res = await fetch(
  `${import.meta.env.VITE_API_URL}/agents/${agent._id}`,
  {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  }
);


      if (!res.ok) {
        throw new Error("فشل في حذف الوكيل.");
      }

      if (typeof refresh === "function") {
        await refresh();
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حذف الوكيل.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="grid gap-3">
      {agents.map((agent) => {
        const isLoading = actionLoadingId === agent._id;
        const status = (agent.status || "").toLowerCase();
        const isActive = status === "active";

        // Is the row representing the current logged-in user?
        const isSelf = currentUserId === agent._id;

        return (
          <div
            key={agent._id}
            className="
              p-4 bg-white rounded-xl border shadow-sm
              flex flex-col md:flex-row md:items-center md:justify-between
              gap-3 hover:shadow-md transition
            "
          >
            {/* Info */}
            <div className="flex items-start gap-3">
              <div
                className="
                  w-10 h-10 rounded-full flex items-center justify-center
                  bg-gradient-to-br from-green-100 to-green-200
                  text-green-700 font-semibold text-sm shrink-0
                "
              >
                {(agent.name || "?").charAt(0)}
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-gray-900">
                  {agent.name || "بدون اسم"}
                </h2>

                {agent.email && (
                  <p className="text-xs text-gray-500 break-all">
                    {agent.email}
                  </p>
                )}

                {agent.phone && (
                  <p className="text-xs text-gray-500">
                    رقم الهاتف:{" "}
                    <span className="font-medium text-gray-700">
                      {agent.phone}
                    </span>
                  </p>
                )}

                <p className="text-xs text-gray-500">
                  الدور:{" "}
                  <span className="font-medium text-gray-700">
                    {getArabicRole(agent.role)}
                  </span>
                </p>

                {isSelf && (
                  <p className="text-[11px] text-gray-400">
                    هذا حسابك الشخصي — لا يمكنك حذفه أو إيقافه.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:flex-row flex-row-reverse">
              {/* Status badge */}
              <span
                className={`px-3 py-1 text-xs rounded-full border ${
                  isActive
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
              >
                {getStatusLabel(agent.status)}
              </span>

              {/* Buttons: only admin AND not self */}
              {isAdmin && !isSelf && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    disabled={isLoading}
                    className={`
                      px-3 py-1.5 text-xs rounded-lg border
                      transition flex items-center justify-center
                      ${
                        isActive
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }
                      disabled:opacity-60 disabled:cursor-not-allowed
                    `}
                  >
                    {isLoading
                      ? "جارٍ المعالجة..."
                      : isActive
                      ? "إيقاف الحساب"
                      : "تفعيل الحساب"}
                  </button>

                  <button
                    onClick={() => handleDelete(agent)}
                    disabled={isLoading}
                    className="
                      px-3 py-1.5 text-xs rounded-lg border border-gray-200
                      text-gray-600 hover:bg-gray-50
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                  >
                    {isLoading ? "..." : "حذف"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
