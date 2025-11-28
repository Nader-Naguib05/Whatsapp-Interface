// src/components/contacts/ContactsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Users,
  Loader2,
  Pencil,
  Trash2,
  X,
  Star,
  StarOff,
  PhoneCall,
  Copy as CopyIcon,
  Info,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} from "../../api/contacts";

const FAVORITES_KEY = "wa_contacts_favorites_v1";

// -----------------------------
// Helpers
// -----------------------------
const normalizePhone = (phone = "") => phone.replace(/\D/g, "");

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
};

const formatExactDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

// -----------------------------
// Avatar
// -----------------------------
const Avatar = ({ name }) => {
  const initials = name ? getInitials(name) : "?";

  return (
    <div className="flex items-center justify-center bg-green-700/15 text-green-700 rounded-full w-11 h-11 font-semibold text-sm">
      {initials}
    </div>
  );
};

// -----------------------------
// Contact Modal (create/edit)
// -----------------------------
const ContactModal = ({
  mode,
  initial,
  onClose,
  onSave,
  loading,
  errorMessage,
}) => {
  const [form, setForm] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    notes: initial?.notes || "",
  });

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

  const disabled = loading || !form.name.trim() || !form.phone.trim();

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

// -----------------------------
// Details drawer (WhatsApp-style)
// -----------------------------
const ContactDetailsDrawer = ({
  contact,
  onClose,
  onOpenChat,
  onCopyPhone,
  onCall,
}) => {
  if (!contact) return null;

  const createdAt = contact.createdAt;
  const lastActivity =
    contact.lastMessageAt || contact.updatedAt || contact.createdAt;

  let activityLabel = "Low";
  if (lastActivity) {
    const diffMs = Date.now() - new Date(lastActivity).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) activityLabel = "High";
    else if (diffDays <= 30) activityLabel = "Medium";
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[340px] max-w-[90vw] bg-white border-l shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-gray-900">Contact details</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        <div className="flex items-center gap-3">
          <Avatar name={contact.name || contact.phone || "?"} />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {contact.name || "Unknown"}
            </div>
            <div className="text-xs text-gray-600 break-all">
              {contact.phone || "No phone"}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs"
          >
            <MessageCircle className="w-3 h-3" />
            Open chat
          </button>
          <button
            type="button"
            onClick={onCall}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs"
          >
            <PhoneCall className="w-3 h-3" />
            Call
          </button>
        </div>

        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-1">
            Overview
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-800">{formatDate(createdAt) || "-"}</span>
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Last activity</span>
            <span className="text-gray-800">
              {lastActivity ? formatDate(lastActivity) : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Activity level</span>
            <span
              className={
                activityLabel === "High"
                  ? "text-green-600"
                  : activityLabel === "Medium"
                  ? "text-yellow-600"
                  : "text-gray-500"
              }
            >
              {activityLabel}
            </span>
          </div>
        </div>

        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500">Notes</span>
            <button
              type="button"
              onClick={onCopyPhone}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
            >
              <CopyIcon className="w-3 h-3" />
              Copy phone
            </button>
          </div>
          <div className="text-xs text-gray-800 whitespace-pre-wrap min-h-[40px]">
            {contact.notes || "No notes yet."}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-1">
            System info
          </div>
          <div className="text-[11px] text-gray-500 space-y-1">
            <div>ID: {contact._id || "—"}</div>
            {contact.lastMessage && (
              <div className="mt-1">
                <div className="font-semibold text-gray-600 text-[11px]">
                  Last message
                </div>
                <div className="line-clamp-2 text-gray-700">
                  {contact.lastMessage}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {formatExactDateTime(
                    contact.lastMessageAt ||
                      contact.updatedAt ||
                      contact.createdAt
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// -----------------------------
// Duplicate banner
// -----------------------------
const DuplicateBanner = ({
  info,
  onMergeKeepFirst,
  onMergeKeepSecond,
  onDismiss,
  loading,
}) => {
  if (!info) return null;

  const { first, second } = info;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4">
      <div className="bg-white border border-yellow-200 shadow-lg rounded-lg p-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        <div className="flex-1 text-xs text-gray-700">
          <div className="font-semibold mb-1">
            Possible duplicate contacts detected
          </div>
          <div className="space-y-0.5">
            <div>
              <span className="font-medium">
                {first.name || "Unnamed"} ({first.phone})
              </span>
            </div>
            <div>
              <span className="font-medium">
                {second.name || "Unnamed"} ({second.phone})
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              They share the same normalized phone. Choose one to keep or
              ignore.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 ml-2">
          <button
            type="button"
            disabled={loading}
            onClick={onMergeKeepFirst}
            className="text-[11px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Keep first
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onMergeKeepSecond}
            className="text-[11px] px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-900"
          >
            Keep second
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onDismiss}
            className="text-[10px] text-gray-500 hover:text-gray-800"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------
// Main Contacts View
// -----------------------------
const ContactsView = ({ onSelectContact }) => {
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingContact, setEditingContact] = useState(null);

  const [favorites, setFavorites] = useState([]);
  const [detailsContact, setDetailsContact] = useState(null);

  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const [copyToast, setCopyToast] = useState("");

  // Load contacts
  const loadContacts = async (q = "") => {
    try {
      setLoading(true);
      setError("");
      const data = await getContacts(q);
      setContacts(data || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
      setError("Failed to load contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const persistFavorites = (next) => {
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Search
  const filteredContacts = useMemo(() => {
    if (!query.trim()) return contacts;

    const q = query.toLowerCase();
    const numericQ = query.replace(/\D/g, "");

    return contacts.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const notes = (c.notes || "").toLowerCase();
      const initials = getInitials(c.name || "").toLowerCase();
      const normPhone = normalizePhone(c.phone || "");

      return (
        name.includes(q) ||
        phone.includes(q) ||
        notes.includes(q) ||
        initials.includes(q) ||
        (!!numericQ && normPhone.includes(numericQ))
      );
    });
  }, [contacts, query]);

  const sortedContacts = useMemo(() => {
    if (!filteredContacts.length) return filteredContacts;
    const favSet = new Set(favorites);
    const arr = [...filteredContacts];

    arr.sort((a, b) => {
      const aFav = favSet.has(a._id);
      const bFav = favSet.has(b._id);
      if (aFav !== bFav) return aFav ? -1 : 1; // favorites first

      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime; // newest first
    });

    return arr;
  }, [filteredContacts, favorites]);

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

  const findDuplicateForContact = (contact, list) => {
    const norm = normalizePhone(contact.phone || "");
    if (!norm) return null;
    const other = list.find(
      (c) =>
        c._id !== contact._id &&
        normalizePhone(c.phone || "") === norm
    );
    if (!other) return null;
    return { first: contact, second: other };
  };

  const handleSaveContact = async (payload) => {
    try {
      setLoadingAction(true);
      setModalError("");

      if (modalMode === "create") {
        const created = await createContact(payload);
        setContacts((prev) => [created, ...prev]);

        // Duplicate detection (based on normalized phone)
        const maybeDup = findDuplicateForContact(created, contacts);
        if (maybeDup) {
          setDuplicateInfo(maybeDup);
        }
      } else if (modalMode === "edit" && editingContact) {
        const updated = await updateContact(editingContact._id, payload);
        setContacts((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );

        const maybeDup = findDuplicateForContact(
          updated,
          contacts.filter((c) => c._id !== updated._id)
        );
        if (maybeDup) {
          setDuplicateInfo(maybeDup);
        }
      }

      setShowModal(false);
      setEditingContact(null);
    } catch (err) {
      console.error("Save contact failed:", err);
      setModalError(
        err?.response?.data?.error || "Failed to save contact. Try again."
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    const confirmed = window.confirm("Delete this contact?");
    if (!confirmed) return;

    try {
      setLoadingAction(true);
      await deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));

      // also remove from favorites if present
      if (favorites.includes(contactId)) {
        const nextFav = favorites.filter((id) => id !== contactId);
        persistFavorites(nextFav);
      }
    } catch (err) {
      console.error("Delete contact failed:", err);
      alert("Failed to delete contact.");
    } finally {
      setLoadingAction(false);
    }
  };

  const toggleFavorite = (contactId) => {
    const isFav = favorites.includes(contactId);
    const next = isFav
      ? favorites.filter((id) => id !== contactId)
      : [contactId, ...favorites];
    persistFavorites(next);
  };

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(phone);
      }
      setCopyToast(`Copied ${phone}`);
      setTimeout(() => {
        setCopyToast("");
      }, 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCall = (phone) => {
    if (!phone) return;
    window.open(`tel:${phone}`, "_self");
  };

  const openDetails = (contact) => {
    setDetailsContact(contact);
  };

  const closeDetails = () => {
    setDetailsContact(null);
  };

  const handleMerge = async (keep, remove) => {
    if (!keep || !remove) return;
    try {
      setDuplicateLoading(true);

      const keepInState =
        contacts.find((c) => c._id === keep._id) || keep;
      const removeInState =
        contacts.find((c) => c._id === remove._id) || remove;

      const mergedNotes = [
        keepInState.notes,
        removeInState.notes,
      ]
        .filter(Boolean)
        .join("\n");

      const payload = {
        name: keepInState.name,
        phone: keepInState.phone,
        notes: mergedNotes,
      };

      const updated = await updateContact(keepInState._id, payload);
      await deleteContact(removeInState._id);

      setContacts((prev) =>
        prev
          .filter((c) => c._id !== removeInState._id)
          .map((c) => (c._id === updated._id ? updated : c))
      );

      // Remove deleted from favorites
      if (favorites.includes(removeInState._id)) {
        const nextFav = favorites.filter((id) => id !== removeInState._id);
        persistFavorites(nextFav);
      }

      setDuplicateInfo(null);
    } catch (err) {
      console.error("Merge contacts failed:", err);
      alert(
        "Failed to merge contacts. You can still edit them manually."
      );
    } finally {
      setDuplicateLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
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
          New contact
        </button>
      </div>

      {/* SEARCH + CONTENT */}
      <div className="flex justify-center w-full flex-1 px-4">
        <div className="w-full max-w-2xl py-4 flex flex-col h-full">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, phone, or notes…"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white shadow-sm border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-1 items-center justify-center py-12 text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Loading contacts…</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && sortedContacts.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400 py-16">
              <Users className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium">No contacts found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search or create a new contact.
              </p>
            </div>
          )}

          {/* List */}
          {!loading && sortedContacts.length > 0 && (
            <div className="space-y-2 overflow-y-auto pb-4">
              {sortedContacts.map((c) => {
                const isFav = favorites.includes(c._id);
                const createdLabel = formatDate(c.createdAt);

                return (
                  <div
                    key={c._id}
                    className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 border border-gray-200 hover:shadow-md hover:border-green-300 transition group"
                  >
                    {/* MAIN CLICK AREA – still opens chat to NOT break behavior */}
                    <button
                      type="button"
                      onClick={() =>
                        onSelectContact && onSelectContact(c)
                      }
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <Avatar name={c.name || c.phone || "?"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {c.name || "Unknown"}
                          </div>
                          {isFav && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              Favorite
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {c.phone}
                        </div>
                        {c.notes && (
                          <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                            {c.notes}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Right meta + actions */}
                    <div className="flex flex-col items-end justify-between gap-1 ml-2">
                      <div className="text-[10px] text-gray-400">
                        {createdLabel}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {/* Favorite */}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(c._id)}
                          className="p-1 rounded-full hover:bg-yellow-50"
                          title={
                            isFav ? "Remove from favorites" : "Favorite"
                          }
                        >
                          {isFav ? (
                            <Star className="w-3 h-3 text-yellow-500" />
                          ) : (
                            <StarOff className="w-3 h-3 text-gray-400" />
                          )}
                        </button>

                        {/* Call */}
                        <button
                          type="button"
                          onClick={() => handleCall(c.phone)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="Call"
                        >
                          <PhoneCall className="w-3 h-3 text-gray-500" />
                        </button>

                        {/* Copy phone */}
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(c.phone)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="Copy phone"
                        >
                          <CopyIcon className="w-3 h-3 text-gray-500" />
                        </button>

                        {/* Open chat (explicit button, in addition to card click) */}
                        <button
                          type="button"
                          onClick={() =>
                            onSelectContact && onSelectContact(c)
                          }
                          className="p-1 rounded-full hover:bg-green-50"
                          title="Open chat"
                        >
                          <MessageCircle className="w-3 h-3 text-green-600" />
                        </button>

                        {/* Details */}
                        <button
                          type="button"
                          onClick={() => openDetails(c)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="View details"
                        >
                          <Info className="w-3 h-3 text-gray-500" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="Edit contact"
                        >
                          <Pencil className="w-3 h-3 text-gray-500" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(c._id)}
                          className="p-1 rounded-full hover:bg-red-50"
                          title="Delete contact"
                          disabled={loadingAction}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
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

      {/* Details drawer */}
      {detailsContact && (
        <ContactDetailsDrawer
          contact={detailsContact}
          onClose={closeDetails}
          onOpenChat={() => {
            if (onSelectContact) {
              onSelectContact(detailsContact);
            }
            closeDetails();
          }}
          onCopyPhone={() => handleCopyPhone(detailsContact.phone)}
          onCall={() => handleCall(detailsContact.phone)}
        />
      )}

      {/* Duplicate banner */}
      <DuplicateBanner
        info={duplicateInfo}
        loading={duplicateLoading}
        onMergeKeepFirst={() =>
          duplicateInfo &&
          handleMerge(duplicateInfo.first, duplicateInfo.second)
        }
        onMergeKeepSecond={() =>
          duplicateInfo &&
          handleMerge(duplicateInfo.second, duplicateInfo.first)
        }
        onDismiss={() => setDuplicateInfo(null)}
      />

      {/* copy toast */}
      {copyToast && (
        <div className="fixed bottom-4 right-4 z-30 px-3 py-2 rounded-lg bg-black/80 text-white text-xs">
          {copyToast}
        </div>
      )}
    </div>
  );
};

export default ContactsView;
