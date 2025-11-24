import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  UserPlus,
  Phone,
  Tag,
  MessageSquare,
  Calendar,
  Edit,
  Trash2,
  Download,
  Upload,
  Paperclip,
  CheckSquare,
  Square,
  Clock,
  Filter,
  MessageCircle,
} from "lucide-react";

// Accent color
const ACCENT = "text-[#25D366]";
const ACCENT_BG = "bg-[#25D366]";

const Avatar = ({ name, size = 48 }) => {
  const letters = name.split(" ").map((n) => n[0]).join("").toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, #25D366 0%, #1EBE5E 100%)",
        fontSize: size * 0.4,
      }}
    >
      {letters}
    </div>
  );
};

const STATUS_OPTIONS = [
  { id: "lead", label: "Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "customer", label: "Customer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "vip", label: "VIP", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const getStatusStyle = (status) =>
  STATUS_OPTIONS.find((s) => s.id === status)?.color ||
  "bg-gray-50 text-gray-700 border-gray-200";

const formatTime = (ts) => {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} days ago`;
  return new Date(ts).toLocaleDateString();
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

  // Mock Data
  useEffect(() => {
    const now = Date.now();
    const fake = [
      {
        _id: "1",
        name: "John Doe",
        phone: "+201234567890",
        status: "customer",
        tags: ["Returning", "VIP"],
        notes: "Prefers morning delivery.",
        lastContact: now - 20 * 60 * 1000,
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
        lastMessagePreview: "Thanks, that helped a lot!",
        activity: [
          {
            id: "x1",
            type: "message",
            label: "Agent: Confirmed delivery date.",
            timestamp: now - 25 * 60 * 1000,
          },
        ],
        attachments: [
          { id: "a1", name: "invoice-204.pdf", timestamp: now - 3 * 24 * 60 * 60 * 1000 },
        ],
      },
      {
        _id: "2",
        name: "Sarah Smith",
        phone: "+201111223344",
        status: "lead",
        tags: ["New"],
        notes: "",
        lastContact: now - 2 * 60 * 60 * 1000,
        createdAt: now - 5 * 24 * 60 * 60 * 1000,
        lastMessagePreview: "Do you have monthly pricing?",
        activity: [],
        attachments: [],
      },
    ];
    setContacts(fake);
    setActiveId("1");
    setNotesDraft(fake[0].notes);
  }, []);

  const active = useMemo(() => contacts.find((c) => c._id === activeId), [contacts, activeId]);

  // Filtering
  const filtered = useMemo(() => {
    let list = [...contacts];

    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === "recent") {
      list.sort((a, b) => (b.lastContact || 0) - (a.lastContact || 0));
    } else if (sortBy === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [contacts, search, statusFilter, sortBy]);

  const toggleBulk = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  return (
    <div className="flex h-full bg-[#F7F8FA]">

      {/* LEFT SIDE — Contacts List */}
      <div className="w-[380px] border-r border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-semibold text-gray-900">Contacts</h2>
              <p className="text-[13px] text-gray-500">{contacts.length} total</p>
            </div>

            <button className="flex items-center gap-2 px-4 h-[40px] rounded-xl bg-[#25D366] text-white font-medium shadow-sm hover:bg-[#1EBE5E] transition">
              <UserPlus className="w-4 h-4" /> New
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
              placeholder="Search name, phone, or tag"
              className="w-full h-[42px] pl-10 pr-3 rounded-xl bg-gray-100 border border-gray-300 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
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
                      {c.tags.map((t) => (
                        <span key={t} className="px-3 py-1 rounded-full bg-gray-100 text-[12px] text-gray-700 border border-gray-200">
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
            <div className="text-gray-400 text-center py-10">No contacts found.</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE — Contact Detail */}
      <div className="flex-1 p-8 overflow-y-auto">

        {!active ? (
          <div className="text-center text-gray-500">Select a contact</div>
        ) : (
          <div className="space-y-8">

            {/* Header */}
            <div className="p-6 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-sm">
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
                      {active.status.toUpperCase()}
                    </span>

                    <select
                      value={active.status}
                      onChange={(e) =>
                        setContacts((prev) =>
                          prev.map((c) =>
                            c._id === active._id
                              ? { ...c, status: e.target.value }
                              : c
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
                    onClick={() => onOpenConversation && onOpenConversation(active)}
                    className="flex items-center gap-2 px-4 h-[44px] bg-[#25D366] text-white rounded-xl font-medium shadow-sm hover:bg-[#1EBE5E] transition"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Open conversation
                  </button>
                </div>

              </div>
            </div>

            {/* Tags, Notes, Activity, Attachments */}
            {/* ——— Simplified for beauty & clarity ——— */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* TAGS */}
              <div className="p-6 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-sm">
                <p className="text-[12px] uppercase text-gray-500 mb-3">Tags</p>
                <div className="flex flex-wrap gap-3">
                  {active.tags.map((t) => (
                    <span key={t} className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-[14px]">
                      {t}
                    </span>
                  ))}
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 text-[14px]">
                    + Add Tag
                  </button>
                </div>
              </div>

              {/* NOTES */}
              <div className="lg:col-span-2 p-6 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] uppercase text-gray-500">Notes</p>

                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="flex items-center gap-1 text-[#25D366] text-[14px]"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  )}
                </div>

                {!isEditingNotes ? (
                  <p className="text-[15px] text-gray-700 min-h-[80px] whitespace-pre-wrap">
                    {active.notes || "No notes yet."}
                  </p>
                ) : (
                  <>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full min-h-[100px] rounded-xl border-gray-300 bg-white p-4 text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
                    />
                    <div className="flex justify-end gap-3 mt-3">
                      <button
                        onClick={() => {
                          setNotesDraft(active.notes);
                          setIsEditingNotes(false);
                        }}
                        className="h-[40px] px-4 border border-gray-300 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setContacts((prev) =>
                            prev.map((c) =>
                              c._id === active._id
                                ? { ...c, notes: notesDraft }
                                : c
                            )
                          );
                          setIsEditingNotes(false);
                        }}
                        className="h-[40px] px-5 bg-[#25D366] text-white rounded-xl shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom: Activity + Attachments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ACTIVITY */}
              <div className="lg:col-span-2 p-6 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-sm">
                <p className="text-[12px] uppercase text-gray-500 mb-4">Activity</p>
                {active.activity.length === 0 ? (
                  <p className="text-gray-500 text-[14px]">No activity yet.</p>
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

              {/* ATTACHMENTS */}
              <div className="p-6 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-sm">
                <p className="text-[12px] uppercase text-gray-500 mb-4">Attachments</p>
                {active.attachments.length === 0 ? (
                  <p className="text-[14px] text-gray-500">No files attached.</p>
                ) : (
                  <ul className="space-y-2 text-[14px]">
                    {active.attachments.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100"
                      >
                        <span>{f.name}</span>
                        <span className="text-gray-400 text-[12px]">
                          {new Date(f.timestamp).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button className="mt-4 w-full h-[44px] border border-gray-300 rounded-xl text-[14px] hover:bg-gray-100">
                  <Paperclip className="w-4 h-4 inline mr-1" />
                  Attach file
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
