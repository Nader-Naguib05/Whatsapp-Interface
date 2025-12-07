import React from "react";

const StatCard = ({ value, label, helperText, icon: Icon, tone = "primary" }) => {
  const colors = {
    primary: "bg-emerald-500",
    success: "bg-blue-500",
    accent: "bg-purple-500",
    warning: "bg-orange-500",
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border text-right" dir="rtl">
      {/* Header (reversed flex for RTL) */}
      <div className="flex items-center justify-between mb-3 flex-row-reverse">
        <div className={`${colors[tone]} p-3 rounded-lg`}>
          {Icon && <Icon className="w-6 h-6 text-white" />}
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600 mt-1">{label}</p>

      {helperText && (
        <p className="text-xs text-gray-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default StatCard;
