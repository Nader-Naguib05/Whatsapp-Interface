import React from "react";
import {
  MessageSquare,
  Radio,
  BarChart3,
  Users,
  Settings,
  UserCog,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ألوان مستوحاة من واتساب
const moduleColors = {
  chats: "bg-[#DCFCE7] text-[#16A34A]",
  broadcast: "bg-[#E0F2FE] text-[#0284C7]",
  analytics: "bg-[#EDE9FE] text-[#6D28D9]",
  contacts: "bg-[#FEF9C3] text-[#CA8A04]",
  settings: "bg-[#F3F4F6] text-[#374151]",
  agents: "bg-[#FFE4E6] text-[#E11D48]",
};

// أسماء الوحدات بالعربي
const modules = [
  { 
    id: "chats", 
    label: "المحادثات", 
    desc: "إدارة جميع محادثات العملاء في مكان واحد مع توزيع ذكي على الموظفين ومتابعة فورية للأداء.", 
    icon: MessageSquare 
  },

  { 
    id: "broadcast", 
    label: "البرودكاست", 
    desc: "إرسال الحملات والرسائل الجماعية بدقة عالية مع متابعة نتائج الإرسال.", 
    icon: Radio 
  },

  { 
    id: "analytics", 
    label: "التحليلات", 
    desc: "إحصائيات واضحة لمتابعة الأداء وفهم تفاعل العملاء.", 
    icon: BarChart3 
  },

  { 
    id: "contacts", 
    label: "جهات الاتصال", 
    desc: "تنظيم بيانات العملاء والبحث السريع في الأسماء والأرقام.", 
    icon: Users 
  },

  { 
    id: "agents", 
    label: "الموظفين", 
    desc: "إدارة حسابات الموظفين وضبط الصلاحيات ومتابعة النشاط.", 
    icon: UserCog 
  },

  { 
    id: "settings", 
    label: "الإعدادات", 
    desc: "التحكم الكامل في إعدادات النظام وتخصيص بيئة العمل.", 
    icon: Settings 
  },
];


export default function ModulesHome({ onSelectModule }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const goToModule = (id) => {
    if (onSelectModule) onSelectModule(id);
    navigate(`/modules/${id}`);
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F3F5] flex flex-col" dir="rtl">

      {/* Header */}
      <div className="px-5 py-6 bg-white shadow-sm flex items-center justify-between">

        {/* User Info */}
        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold">
            {user?.name?.[0] || "م"}
          </div>

          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.name || "اسم المستخدم"}
            </h2>
            <p className="text-sm text-gray-500">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="text-red-600 text-sm font-medium hover:text-red-700 hover:underline transition"
        >
          تسجيل الخروج
        </button>
      </div>

      {/* Modules Title */}
      <div className="px-5 pt-6 pb-4 text-gray-900 font-semibold text-lg tracking-tight">
        الوحدات
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 pt-0">
        {modules.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => goToModule(id)}
            className="
              group w-full flex items-center gap-4 p-5
              bg-white border border-gray-200 rounded-2xl
              hover:shadow-lg hover:border-gray-300
              active:scale-[0.99] transition-all
            "
          >
            <div
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center
                text-2xl font-bold shadow-sm
                ${moduleColors[id]}
              `}
            >
              <Icon size={26} className="opacity-90" />
            </div>

            <div className="flex flex-col text-right">
              <span className="text-lg font-semibold text-gray-900">
                {label}
              </span>
              <span className="text-xs text-gray-500">
                {desc}
              </span>
            </div>

          </button>
        ))}
      </div>
    </div>
  );
}
