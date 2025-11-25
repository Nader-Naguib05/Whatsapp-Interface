import React from "react";
import ChatItem from "./ChatItem";
import Input from "../ui/Input";
import { Search } from "lucide-react";

const ChatList = ({ conversations, filtered, searchQuery, setSearch, selectedChatId, onSelect }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b">
        <Input
          icon={Search}
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No conversations found</div>
        ) : (
          filtered.map((conv) => (
            <ChatItem
              key={conv._id}
              conv={conv}
              selected={selectedChatId === conv._id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
