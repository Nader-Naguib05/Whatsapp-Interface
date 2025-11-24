import React from "react";

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
    {Icon && <Icon className="w-20 h-20 text-gray-300 mb-4" />}
    <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
    {subtitle && <p className="text-gray-500 mt-2 max-w-md">{subtitle}</p>}
  </div>
);

export default EmptyState;
