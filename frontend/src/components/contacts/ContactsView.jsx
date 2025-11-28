import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  UserPlus,
  Users,
  Loader2,
  Pencil,
  Trash2,
  X,
  Copy,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} from "../../api/contacts";

// ----- Avatar -----
const Avatar = ({ name }) => {
  if (!name) {
    return (
      <div className="flex items-center justify-center bg-gray-200 text-gray-500 rounded-full w-11 h-11 text-sm">
        ?
      </div>
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-center bg-green-700/15 text-green-700 rounded-full w-11 h-11 font-semibold">
      {initials}
    </div>
  );
};

// ----- Contact Modal -----
const ContactModal = ({
  mode,
  initial,
  onClose,
  onSave,
  loading,
  errorMessage,
}) => {
  const nameRef = useRef(null);

  const [form, setForm] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    notes: initial?.notes || "",
  });

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const [touched, setTouched] = useState(false);

  const handleChange = (field, value) => {
    setTouched(true);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    });
  };

  const nameError =
    touched && !form.name.trim() ? "Name is required" : undefined;
  const phoneError =
    touched && !form.phone.trim() ? "Phone is required" : undefined;

  const disabled =
    loading || !form.name.trim() || !form.phone.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[420px] max-w-[95vw]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === "edit" ? "Edit Contact" : "New Contact"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              ref={nameRef}
              className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none ${
                nameError ? "border-red-400" : ""
              }`}
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              className={`w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none ${
                phoneError ? "border-red-400" : ""
              }`}
              placeholder="+2010..."
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">{phoneError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              placeholder="VIP customer, prefers voice notes, etc."
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="text-sm text-red-500">{errorMessage}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                disabled
                  ? "bg-green-300 cursor-not-allowed text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "edit" ? "Save changes" : "Save contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----- Main View -----
const ContactsView = ({ onSelectContact }) => {
  const searchRef = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [sort, setSort] = useState("recent"); // "recent" | "az"
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingContact, setEditingContact] = useState(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      setError("Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const sortedContacts = useMemo(() => {
    let list = [...contacts];

    if (sort === "az") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [contacts, sort]);

  const filteredContacts = useMemo(() => {
    if (!query.trim()) return sortedContacts;

    const q = query.toLowerCase();
    return sortedContacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [sortedContacts, query]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingContact(null);
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setModalMode("edit");
    setEditingContact(contact);
    setModalError("");
    setShowModal(true);
  };

  const handleSaveContact = async (payload) => {
    try {
      setLoadingAction(true);

      if (modalMode === "create") {
        const c = await createContact(payload);
        setContacts((prev) => [c, ...prev]);
      } else {
        const updated = await updateContact(editingContact._id, payload);
        setContacts((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );
      }

      setShowModal(false);
      setEditingContact(null);
    } catch (err) {
      setModalError("Failed to save contact.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm("Delete this contact?")) return;

    try {
      setLoadingAction(true);
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c._id !== id));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCopy = (phone) => {
    navigator.clipboard.writeText(phone);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* HEADER */}
      <div className="px-6 py-4 bg-white border-b flex items-center justify-between sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>
          <p className="text-xs text-gray-500">
            Manage saved customers and quickly jump into chats.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm text-sm"
        >
          <UserPlus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* SEARCH + SORT */}
      <div className="px-6 pt-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search contacts…"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="relative">
          <select
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Newest</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex justify-center w-full flex-1 px-4">
        <div className="w-full max-w-2xl py-4 flex flex-col h-full">

          {loading && (
            <div className="flex flex-1 items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!loading && filteredContacts.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400 py-16">
              <Users className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium">No contacts found</p>
            </div>
          )}

          {!loading && filteredContacts.length > 0 && (
            <div className="space-y-2 overflow-y-auto pb-4">
              {filteredContacts.map((c) => (
                <div
                  key={c._id}
                  className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 border border-gray-200 hover:shadow-md transition group"
                >
                  <Avatar name={c.name} />

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-gray-600">{c.phone}</div>
                    {c.notes && (
                      <div className="text-[11px] text-gray-400 line-clamp-1">
                        {c.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      className="p-1 hover:bg-green-50 rounded-full"
                      title="Start chat"
                      onClick={() => onSelectContact(c)}
                    >
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </button>

                    <button
                      className="p-1 hover:bg-gray-100 rounded-full"
                      title="Copy number"
                      onClick={() => handleCopy(c.phone)}
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>

                    <button
                      className="p-1 hover:bg-gray-100 rounded-full"
                      onClick={() => openEditModal(c)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>

                    <button
                      className="p-1 hover:bg-red-50 rounded-full"
                      onClick={() => handleDeleteContact(c._id)}
                      disabled={loadingAction}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <ContactModal
          mode={modalMode}
          initial={editingContact}
          onClose={() => {
            if (!loadingAction) {
              setShowModal(false);
              setEditingContact(null);
            }
          }}
          onSave={handleSaveContact}
          loading={loadingAction}
          errorMessage={modalError}
        />
      )}
    </div>
  );
};

export default ContactsView;
