import React from "react";
import { cn } from "../../utils/cn";

const Textarea = ({ className, ...props }) => (
  <textarea
    {...props}
    className={cn(
      "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500",
      className
    )}
  />
);

export default Textarea;
