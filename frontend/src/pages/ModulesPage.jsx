import React from "react";
import {
  MessageSquare,
  Radio,
  BarChart3,
  Users,
  Settings,
  UserCog, // NEW ICON
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// WhatsApp-inspired, premium color palette
const moduleColors = {
  chats: "bg-[#DCFCE7] text-[#16A34A]",
  broadcast: "bg-[#E0F2FE] text-[#0284C7]",
  analytics: "bg-[#EDE9FE] text-[#6D28D9]",
  contacts: "bg-[#FEF9C3] text-[#CA8A04]",
  settings: "bg-[#F3F4F6] text-[#374151]",
  agents: "bg-[#FFE4E6] text-[#E11D48]", // NEW
};

const modules = [
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "broadcast", label: "Broadcast", icon: Radio },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "agents", label: "Agents", icon: UserCog }, // 🔥 NEW MODULE
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ModulesHome({ onSelectModule }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const goToModule = (id) => {
    if (onSelectModule) onSelectModule(id);
    navigate(`/modules/${id}`);
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F3F5] flex flex-col">

      {/* Top Profile Header */}
      <div className="px-5 py-6 bg-white shadow-sm flex items-center justify-between">
        
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold">
            {user?.fullname?.[0] || "U"}
          </div>

          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.fullname || "User Name"}
            </h2>
            <p className="text-sm text-gray-500">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="
            text-red-600 text-sm font-medium
            hover:text-red-700 hover:underline
            transition
          "
        >
          Logout
        </button>
      </div>

      {/* Modules Section */}
      <div className="px-5 pt-6 pb-4 text-gray-900 font-semibold text-lg tracking-tight">
        Modules
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 pt-0">
        {modules.map(({ id, label, icon: Icon }) => (
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

            <div className="flex flex-col text-left">
              <span className="text-lg font-semibold text-gray-900">
                {label}
              </span>
              <span className="text-xs text-gray-500">
                Open {label.toLowerCase()}
              </span>
            </div>

          </button>
        ))}
      </div>
    </div>
  );
}
