import React from "react";
import { Paperclip, Smile, Send } from "lucide-react";
import Button from "../ui/Button";

const MessageInput = ({ message, setMessage, onSend }) => {
  return (
    <div className="bg-white border-t px-6 py-4">
      <div className="flex items-center gap-3">
        <button className="text-gray-600 hover:text-green-600">
          <Paperclip className="w-5 h-5" />
        </button>

        <button className="text-gray-600 hover:text-green-600">
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <Button
          onClick={onSend}
          className="bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg"
          icon={Send}
        />
      </div>
    </div>
  );
};

export default MessageInput;
