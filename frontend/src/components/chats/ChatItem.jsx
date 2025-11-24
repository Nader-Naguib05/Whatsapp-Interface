import React from "react";
import Avatar from "../ui/Avatar";
import { cn } from "../../utils/cn";

const ChatItem = ({ conv, selected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(conv.id)}
      className={cn(
        "p-4 border-b cursor-pointer hover:bg-gray-50 transition",
        selected && "bg-green-50"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={conv.name} status={conv.status} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
            <span className="text-xs text-gray-500">{conv.time}</span>
          </div>

          <div className="flex justify-between items-center mt-1 gap-2">
            <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>

            {conv.unread > 0 && (
              <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {conv.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
