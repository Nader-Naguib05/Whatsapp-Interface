import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  UserPlus,
  Phone,
  Edit,
  CheckSquare,
  Square,
  Clock,
  MessageCircle,
  Paperclip,
} from "lucide-react";

const ACCENT = "text-[#25D366]";

// -------------------------
// AVATAR (optimized)
// -------------------------
const Avatar = React.memo(function Avatar({ name, size = 48 }) {
  const letters = useMemo(() => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }, [name]);

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #25D366 0%, #1EBE5E 100%)",
        fontSize: size * 0.4,
      }}
    >
      {letters}
    </div>
  );
});

// -------------------------
// STATUS (Arabic)
// -------------------------
const STATUS_OPTIONS = [
  { id: "lead", label: "مهتم", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "customer", label: "عميل", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "vip", label: "عميل مميز", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const getStatusStyle = (status) =>
  STATUS_OPTIONS.find((s) => s.id === status)?.color ||
  "bg-gray-50 text-gray-700 border-gray-200";

// -------------------------
// TIME FORMAT (Arabic)
// -------------------------
const formatTime = (ts) => {
  if (!ts) return "لا يوجد تواصل";
  const diff = Date.now() - ts;

  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `${min} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} يوم`;
  return new Date(ts).toLocaleDateString("ar-EG");
};

const ContactsPage = ({ onOpenConversation }) => {
  const [contacts, setContacts] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const [notesDraft, setNotesDraft] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());

  // -------------------------
  // Mock data — remove when connecting to API
  // -------------------------
  useEffect(() => {
    const now = Date.now();
    const fake = [
      {
        _id: "1",
        name: "أحمد السيد",
        phone: "+201015557788",
        status: "customer",
        tags: ["مميز"],
        notes: "يتواصل غالباً صباحاً.",
        lastContact: now - 1000 * 60 * 40,
        createdAt: now - 1000 * 60 * 60 * 24 * 10,
        lastMessagePreview: "شكراً جداً ❤️",
        activity: [
          {
            id: "x1",
            type: "message",
            label: "تم تحديد موعد للتواصل.",
            timestamp: now - 1000 * 60 * 50,
          },
        ],
        attachments: [],
      },
    ];
    setContacts(fake);
    setActiveId(fake[0]._id);
    setNotesDraft(fake[0].notes);
  }, []);

  // -------------------------
  // Active contact
  // -------------------------
  const active = useMemo(
    () => contacts.find((c) => c._id === activeId),
    [contacts, activeId]
  );

  // -------------------------
  // Bulk selection
  // -------------------------
  const toggleBulk = useCallback((id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  }, []);

  // -------------------------
  // Filtering + Sorting (optimized)
  // -------------------------
  const filtered = useMemo(() => {
    let list = contacts;

    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    if (sortBy === "recent") {
      sorted.sort((a, b) => (b.lastContact || 0) - (a.lastContact || 0));
    } else if (sortBy === "alpha") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [contacts, search, statusFilter, sortBy]);

  // -------------------------
  // MAIN RENDER
  // -------------------------
  return (
    <div className="flex h-full bg-[#F7F8FA]">

      {/* LEFT SIDE */}
      <div className="w-[380px] border-r border-gray-200 bg-white flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-semibold text-gray-900">جهات الاتصال</h2>
              <p className="text-[13px] text-gray-500">{contacts.length} إجمالي</p>
            </div>

            <button className="flex items-center gap-2 px-4 h-[40px] rounded-xl bg-[#25D366] text-white font-medium shadow-sm hover:bg-[#1EBE5E] transition">
              <UserPlus className="w-4 h-4" /> جديد
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، الرقم، أو الوسم"
              className="w-full h-[42px] pl-10 pr-3 rounded-xl bg-gray-100 border border-gray-300 text-[15px]"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => {
            const selected = selectedIds.has(c._id);
            const isActive = c._id === activeId;

            return (
              <div
                key={c._id}
                className={`px-5 py-4 border-b border-gray-100 cursor-pointer transition
                ${isActive ? "bg-gray-100" : "hover:bg-gray-50"}
              `}
                onClick={() => {
                  setActiveId(c._id);
                  setNotesDraft(c.notes);
                  setIsEditingNotes(false);
                }}
              >
                <div className="flex items-start gap-4">

                  <div onClick={(e) => { e.stopPropagation(); toggleBulk(c._id); }}>
                    {selected ? (
                      <CheckSquare className="w-5 h-5 text-[#25D366]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <Avatar name={c.name} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 text-[15px] truncate">{c.name}</h3>
                      <span className="text-[12px] text-gray-400">{formatTime(c.lastContact)}</span>
                    </div>

                    <p className="text-[14px] text-gray-600 truncate mt-0.5">
                      {c.lastMessagePreview || c.phone}
                    </p>

                    <div className="flex gap-2 mt-2">
                      {(c.tags || []).map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 rounded-full bg-gray-100 text-[12px] text-gray-700 border border-gray-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-gray-400 text-center py-10">لا يوجد نتائج.</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 p-8 overflow-y-auto">

        {!active ? (
          <div className="text-center text-gray-500">اختر جهة اتصال</div>
        ) : (
          <div className="space-y-8">

            {/* Header */}
            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-5">
                  <Avatar name={active.name} size={72} />
                  <div>
                    <h2 className="text-[22px] font-semibold text-gray-900">{active.name}</h2>
                    <p className="text-[15px] text-gray-600 flex items-center gap-1">
                      <Phone className="w-4 h-4 text-[#25D366]" />
                      {active.phone}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full border text-[13px] ${getStatusStyle(active.status)}`}>
                      {STATUS_OPTIONS.find((s) => s.id === active.status)?.label}
                    </span>

                    <select
                      value={active.status}
                      onChange={(e) =>
                        setContacts((prev) =>
                          prev.map((c) =>
                            c._id === active._id ? { ...c, status: e.target.value } : c
                          )
                        )
                      }
                      className="text-[13px] bg-white border border-gray-300 rounded-xl px-3 py-2"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => onOpenConversation?.(active)}
                    className="flex items-center gap-2 px-4 h-[44px] bg-[#25D366] text-white rounded-xl font-medium shadow-sm hover:bg-[#1EBE5E] transition"
                  >
                    <MessageCircle className="w-5 h-5" />
                    فتح المحادثة
                  </button>
                </div>

              </div>
            </div>

            {/* Tags + Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Tags */}
              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                <p className="text-[12px] text-gray-500 mb-3">الوسوم</p>
                <div className="flex flex-wrap gap-3">
                  {(active.tags || []).map((t) => (
                    <span key={t} className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-[14px]">
                      {t}
                    </span>
                  ))}

                  <button className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 text-[14px]">
                    + إضافة وسم
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="lg:col-span-2 p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] text-gray-500">الملاحظات</p>

                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="flex items-center gap-1 text-[#25D366] text-[14px]"
                    >
                      <Edit className="w-4 h-4" />
                      تعديل
                    </button>
                  )}
                </div>

                {!isEditingNotes ? (
                  <p className="text-[15px] text-gray-700 min-h-[80px] whitespace-pre-wrap">
                    {active.notes || "لا توجد ملاحظات بعد."}
                  </p>
                ) : (
                  <>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full min-h-[100px] rounded-xl border-gray-300 bg-white p-4 text-[15px] text-gray-700 focus:outline-none"
                    />
                    <div className="flex justify-end gap-3 mt-3">
                      <button
                        onClick={() => {
                          setNotesDraft(active.notes);
                          setIsEditingNotes(false);
                        }}
                        className="h-[40px] px-4 border border-gray-300 rounded-xl"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => {
                          setContacts((prev) =>
                            prev.map((c) =>
                              c._id === active._id ? { ...c, notes: notesDraft } : c
                            )
                          );
                          setIsEditingNotes(false);
                        }}
                        className="h-[40px] px-5 bg-[#25D366] text-white rounded-xl shadow-sm"
                      >
                        حفظ
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Activity + Attachments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Activity */}
              <div className="lg:col-span-2 p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                <p className="text-[12px] text-gray-500 mb-4">النشاط</p>
                {(active.activity || []).length === 0 ? (
                  <p className="text-gray-500 text-[14px]">لا يوجد نشاط.</p>
                ) : (
                  <div className="space-y-4">
                    {active.activity.map((a) => (
                      <div key={a.id} className="flex gap-4">
                        <div className="w-[40px] h-[40px] rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                          <Clock className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-[15px] text-gray-800">{a.label}</p>
                          <p className="text-[12px] text-gray-500">{formatTime(a.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                <p className="text-[12px] text-gray-500 mb-4">الملفات المرفقة</p>

                {(active.attachments || []).length === 0 ? (
                  <p className="text-[14px] text-gray-500">لا توجد ملفات.</p>
                ) : (
                  <ul className="space-y-2 text-[14px]">
                    {active.attachments.map((f) => (
                      <li key={f.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span>{f.name}</span>
                        <span className="text-gray-400 text-[12px]">
                          {new Date(f.timestamp).toLocaleDateString("ar-EG")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button className="mt-4 w-full h-[44px] border border-gray-300 rounded-xl text-[14px] hover:bg-gray-100">
                  <Paperclip className="w-4 h-4 inline mr-1" />
                  إرفاق ملف
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
