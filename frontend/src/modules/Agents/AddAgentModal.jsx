import React, { useState } from "react";

export default function AddAgentModal({ close, refresh }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "agent",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(`${import.meta.env.VITE_API_URL}/agents`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      refresh();
      close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">

        <h2 className="text-xl font-bold mb-4 text-right">إضافة موظف جديد</h2>

        <div className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="الاسم الكامل"
            onChange={handleChange}
            className="border rounded-lg px-4 py-2 text-right"
          />
          <input
            name="email"
            placeholder="البريد الإلكتروني"
            onChange={handleChange}
            className="border rounded-lg px-4 py-2 text-right"
          />
          <input
            name="phone"
            placeholder="رقم الهاتف"
            onChange={handleChange}
            className="border rounded-lg px-4 py-2 text-right"
          />

          <select
            name="role"
            onChange={handleChange}
            className="border rounded-lg px-4 py-2 text-right"
          >
            <option value="agent">موظف</option>
            <option value="admin">مسؤول</option>
          </select>

          <input
            name="password"
            placeholder="كلمة المرور"
            type="password"
            onChange={handleChange}
            className="border rounded-lg px-4 py-2 text-right"
          />
        </div>

        <div className="flex items-center justify-end mt-6 gap-3">
          <button
            onClick={close}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            إلغاء
          </button>

          <button
            onClick={submit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            إنشاء
          </button>
        </div>
      </div>
    </div>
  );
}
