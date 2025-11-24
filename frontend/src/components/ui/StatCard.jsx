import React from "react";
import { cn } from "../../utils/cn";

const StatCard = ({ value, label, icon: Icon, color }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border">
    <div className="flex items-center justify-between mb-3">
      <div className={cn(color, "p-3 rounded-lg")}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    <p className="text-sm text-gray-600 mt-1">{label}</p>
  </div>
);

export default StatCard;
