import React from "react";
import { cn } from "../../utils/cn";

const Input = ({ icon: Icon, className, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
    )}
    <input
      {...props}
      className={cn(
        "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500",
        Icon && "pl-10",
        className
      )}
    />
  </div>
);

export default Input;
