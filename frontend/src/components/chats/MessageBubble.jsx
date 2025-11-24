import React from "react";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "../../utils/cn";

const MessageBubble = ({ msg }) => {
  const isAgent = msg.sender === "agent";

  return (
    <div className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2 text-sm shadow-sm",
          isAgent ? "bg-green-500 text-white" : "bg-white text-gray-900 border"
        )}
      >
        <p>{msg.text}</p>

        <div className="flex items-center justify-end gap-1 mt-1">
          <span
            className={cn("text-xs", isAgent ? "text-green-100" : "text-gray-500")}
          >
            {msg.time}
          </span>

          {isAgent && (
            <>
              {msg.status === "read" ? (
                <CheckCheck className="w-4 h-4 text-blue-200" />
              ) : msg.status === "delivered" ? (
                <Check className="w-4 h-4 text-green-100" />
              ) : (
                <Check className="w-4 h-4 text-green-100 opacity-60" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
