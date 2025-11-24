import React from "react";
import { cn } from "../../utils/cn";

const Button = ({ children, icon: Icon, className, ...props }) => (
  <button
    {...props}
    className={cn(
      "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
  >
    {Icon && <Icon className="w-5 h-5" />}
    {children}
  </button>
);

export default Button;
