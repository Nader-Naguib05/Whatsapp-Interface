import React from "react";
import {
  MessageSquare,
  Radio,
  BarChart3,
  Settings,
  Menu,
  X,
  Users,
} from "lucide-react";
import { cn } from "../../utils/cn";

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab }) => {
  const navItems = [
    { id: "chats", label: "Chats", icon: MessageSquare },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "broadcast", label: "Broadcast", icon: Radio },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div
      className={cn(
        `
        flex flex-col border-r border-gray-200 bg-white
        shadow-sm transition-all duration-300
        z-50 relative
        lg:static
      `,

        // Desktop widths
        sidebarOpen ? "lg:w-64 w-60" : "lg:w-20 w-0",

        // Mobile slide-over
        sidebarOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0",

        "fixed lg:relative top-0 left-0 h-full"
      )}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
        {sidebarOpen && (
          <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">
            WhatsApp Biz
          </h1>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl hover:bg-gray-100 transition"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-gray-700" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                `
                flex items-center w-full px-4 h-[48px]
                text-[15px] font-medium transition rounded-xl
              `,
                active
                  ? "bg-[#25D366]/20 text-[#25D366] font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <div
                className={cn(
                  `
                w-10 h-10 flex items-center justify-center rounded-full
                transition
              `,
                  active ? "bg-[#25D366]/10" : "bg-gray-100"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition",
                    active ? "text-[#25D366]" : "text-gray-500"
                  )}
                />
              </div>

              {sidebarOpen && (
                <span className="ml-3 text-gray-800">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-4">
        {sidebarOpen ? (
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-full h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[14px] font-medium transition"
          >
            Collapse sidebar
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-full h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium transition"
          >
            Expand
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
