import React from "react";

const Avatar = ({ name, size = 40, status }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center bg-gray-300 rounded-full text-gray-800 font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
      {status === "online" && (
        <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
};

export default Avatar;
