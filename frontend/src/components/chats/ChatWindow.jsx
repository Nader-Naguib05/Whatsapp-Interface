import React, { useRef, useEffect } from "react";
import Avatar from "../ui/Avatar";
import EmptyState from "../ui/EmptyState";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { MessageSquare, Phone, MoreVertical } from "lucide-react";
import { cn } from "../../utils/cn";

const ChatWindow = ({ chat, message, setMessage, onSend }) => {
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, message]);

  if (!chat) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Select a conversation"
        subtitle="Choose a chat from the left to start messaging your customers."
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={chat.name} status={chat.status} size={40} />
          <div>
            <h3 className="font-semibold text-gray-900">{chat.name}</h3>
            <p className="text-sm text-gray-500">{chat.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-600">
          <button className="hover:text-green-600">
            <Phone className="w-5 h-5" />
          </button>
          <button className="hover:text-green-600">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chat.messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <MessageInput message={message} setMessage={setMessage} onSend={onSend} />
    </div>
  );
};

export default ChatWindow;
