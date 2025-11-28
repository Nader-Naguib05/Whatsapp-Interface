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
  Phone,
  ArrowLeft,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from "lucide-react";

import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} from "../../api/contacts";

// -----------------------------------------------------------------------------
// FIXED AVATAR
// -----------------------------------------------------------------------------
const Avatar = ({ name }) => {
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex items-center justify-center bg-green-600/10 text-green-700 font-semibold rounded-full w-12 h-12 text-base">
      {initials}
    </div>
  );
};

// -----------------------------------------------------------------------------
// CONTACT DETAILS SIDE PANEL
// -----------------------------------------------------------------------------
const ContactDetails = ({
  contact,
  onClose,
  onEdit,
  onDelete,
  onStartChat,
}) => {
  if (!contact) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[340px] bg-white shadow-xl border-l z-40 p-5 flex flex-col animate-slide-left">
      <div className="flex items-center justify-between mb-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-lg">{contact.name}</h2>
        <div className="w-5" />
      </div>

      <div className="flex justify-center mb-4">
        <Avatar name={contact.name} />
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-1">Phone</p>
          <p className="font-medium">{contact.phone}</p>

          <div className="flex items-center gap-2 mt-2">
            <button
              className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 flex items-center gap-2"
              onClick={() => onStartChat(contact)}
            >
              <MessageCircle className="w-4 h-4" />
              Start Chat
            </button>

            <a
              href={`tel:${contact.phone}`}
              className="px-3 py-1.5 bg-gray-100 rounded-md text-xs flex items-center gap-2 hover:bg-gray-200"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>

            <button
              onClick={() => navigator.clipboard.writeText(contact.phone)}
              className="px-3 py-1.5 bg-gray-100 rounded-md text-xs flex items-center gap-2 hover:bg-gray-200"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        </div>

        {contact.notes && (
          <div>
            <p className="text-gray-500 text-xs mb-1">Notes</p>
            <p className="text-gray-700 text-sm">{contact.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-auto flex justify-between pt-6">
        <button
          onClick={() => onEdit(contact)}
          className="px-4 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200 flex items-center gap-2"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>

        <button
          onClick={() => onDelete(contact._id)}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// CONTACT MODAL (same as before but fixed autofocus)
// -----------------------------------------------------------------------------
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    });
  };

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
          <input
            ref={nameRef}
            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <textarea
            className="w-full px-3 py-2 border rounded-lg bg-gray-50 resize-none"
            rows={3}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {errorMessage && (
            <div className="text-sm text-red-500">{errorMessage}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >
              {loading ? "Saving…" : mode === "edit" ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// MAIN CONTACTS VIEW
// -----------------------------------------------------------------------------
export default function ContactsView({ onSelectContact }) {
  const searchRef = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [details, setDetails] = useState(null);

  // LOAD CONTACTS
  useEffect(() => {
    loadContacts();
    searchRef.current?.focus();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const data = await getContacts();
    setContacts(data);
    setLoading(false);
  };

  // SORTING
  const sortedContacts = useMemo(() => {
    let list = [...contacts];

    if (sort === "az") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [contacts, sort]);

  // SEARCH
  const filteredContacts = useMemo(() => {
    if (!query.trim()) return sortedContacts;

    const q = query.toLowerCase();
    return sortedContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [sortedContacts, query]);

  // HANDLERS
  const handleSave = async (payload) => {
    if (!editingContact) {
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
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contact?")) return;
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c._id !== id));
    setDetails(null);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* HEADER */}
      <div className="px-6 py-4 bg-white border-b flex items-center justify-between sticky top-0 z-20">
        <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>

        <button
          onClick={() => {
            setEditingContact(null);
            setShowModal(true);
          }}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <UserPlus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* SEARCH + SORT */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search contacts…"
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          className="p-2 bg-white border rounded-lg hover:bg-gray-100"
          onClick={() => setSort(sort === "recent" ? "az" : "recent")}
        >
          {sort === "recent" ? (
            <ArrowDownWideNarrow className="w-4 h-4" />
          ) : (
            <ArrowUpWideNarrow className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* CONTACT LIST */}
      <div className="px-4 pb-4 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No contacts found</p>
            <button
              onClick={() => {
                setEditingContact(null);
                setShowModal(true);
              }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Add your first contact
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((c) => (
              <div
                key={c._id}
                className="bg-white border rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => setDetails(c)}
              >
                <Avatar name={c.name} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-gray-600">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING ADD BUTTON (mobile-like) */}
      <button
        onClick={() => {
          setEditingContact(null);
          setShowModal(true);
        }}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-green-700"
      >
        <UserPlus className="w-6 h-6" />
      </button>

      {/* MODAL */}
      {showModal && (
        <ContactModal
          mode={editingContact ? "edit" : "create"}
          initial={editingContact}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingContact(null);
          }}
        />
      )}

      {/* DETAILS PANEL */}
      {details && (
        <ContactDetails
          contact={details}
          onClose={() => setDetails(null)}
          onEdit={(c) => {
            setEditingContact(c);
            setShowModal(true);
          }}
          onDelete={handleDelete}
          onStartChat={onSelectContact}
        />
      )}
    </div>
  );
}
