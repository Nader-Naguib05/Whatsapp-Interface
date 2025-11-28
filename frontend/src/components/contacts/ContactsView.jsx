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
  MoreHorizontal,
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
    <div className="flex items-center justify-center rounded-full w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 font-semibold text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
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
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-[420px] max-w-[95vw] border border-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            {mode === "edit" ? "Edit contact" : "New contact"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 text-sm">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Full name
            </label>
            <input
              className={`w-full px-3 py-2 rounded-lg bg-slate-50 border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                nameError ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            {nameError && (
              <p className="text-[11px] text-red-500 mt-0.5">{nameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Phone number
            </label>
            <input
              className={`w-full px-3 py-2 rounded-lg bg-slate-50 border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                phoneError ? "border-red-300" : "border-slate-200"
              }`}
              placeholder="+2010..."
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
            {phoneError && (
              <p className="text-[11px] text-red-500 mt-0.5">
                {phoneError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Notes{" "}
              <span className="text-slate-400 text-[11px]">(optional)</span>
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
              placeholder="VIP customer, context, preferences…"
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition ${
                disabled
                  ? "bg-emerald-300 text-white cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === "edit" ? "Save changes" : "Create contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------
// Details drawer (SaaS minimal)
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
    <div className="fixed inset-y-0 right-0 w-[360px] max-w-[100vw] bg-white/95 backdrop-blur-sm border-l border-slate-200 shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Contact details
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5 overflow-y-auto flex-1 text-sm">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar name={contact.name || contact.phone || "?"} />
          <div className="min-w-0 space-y-0.5">
            <div className="font-semibold text-slate-900 truncate text-sm">
              {contact.name || "Unknown"}
            </div>
            <div className="text-[11px] text-slate-500 break-all">
              {contact.phone || "No phone"}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 shadow-sm transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Open chat
          </button>
          <button
            type="button"
            onClick={onCall}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium hover:bg-slate-200 border border-slate-200 transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Call
          </button>
        </div>

        {/* Overview */}
        <section className="space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Overview
          </div>
          <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-800">
                {formatDate(createdAt) || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Last activity</span>
              <span className="text-slate-800">
                {lastActivity ? formatDate(lastActivity) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Activity level</span>
              <span
                className={
                  activityLabel === "High"
                    ? "text-emerald-600 font-medium"
                    : activityLabel === "Medium"
                    ? "text-amber-600 font-medium"
                    : "text-slate-500"
                }
              >
                {activityLabel}
              </span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Notes
            </div>
            <button
              type="button"
              onClick={onCopyPhone}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <CopyIcon className="w-3 h-3" />
              Copy phone
            </button>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 min-h-[54px] text-[12px] text-slate-800 whitespace-pre-wrap">
            {contact.notes || "No notes added yet."}
          </div>
        </section>

        {/* System info + last message */}
        <section className="space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            System
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>ID</span>
              <span className="font-mono text-[10px] text-slate-500 max-w-[200px] truncate">
                {contact._id || "—"}
              </span>
            </div>
            {contact.lastMessage && (
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <div className="font-medium text-slate-600 text-[11px]">
                  Last message
                </div>
                <div className="text-[11px] text-slate-700 line-clamp-2">
                  {contact.lastMessage}
                </div>
                <div className="text-[10px] text-slate-400">
                  {formatExactDateTime(
                    contact.lastMessageAt ||
                      contact.updatedAt ||
                      contact.createdAt
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// -----------------------------
// Duplicate banner (minimal)
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
      <div className="bg-white/95 backdrop-blur-sm border border-amber-200 shadow-lg rounded-2xl p-3.5 flex items-start gap-3">
        <div className="mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        </div>
        <div className="flex-1 text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">
            Possible duplicate contacts
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
            <div className="text-[11px] text-slate-500 mt-0.5">
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
            className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Keep first
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onMergeKeepSecond}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Keep second
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onDismiss}
            className="text-[10px] text-slate-500 hover:text-slate-800"
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
const ContactsView = ({ onSelectContact, onContactsChange }) => {
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
  const [openMenuId, setOpenMenuId] = useState(null);

  // sync helper
  const syncContacts = (next) => {
    setContacts(next);
    onContactsChange?.(next);
  };

  const loadContacts = async (q = "") => {
    try {
      setLoading(true);
      setError("");
      const data = await getContacts(q);
      syncContacts(data || []);
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

  // Search logic
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
      if (aFav !== bFav) return aFav ? -1 : 1;

      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
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
        const next = [created, ...contacts];
        syncContacts(next);

        const maybeDup = findDuplicateForContact(created, contacts);
        if (maybeDup) {
          setDuplicateInfo(maybeDup);
        }
      } else if (modalMode === "edit" && editingContact) {
        const updated = await updateContact(editingContact._id, payload);
        const next = contacts.map((c) =>
          c._id === updated._id ? updated : c
        );
        syncContacts(next);

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
      const next = contacts.filter((c) => c._id !== contactId);
      syncContacts(next);

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

      const mergedNotes = [keepInState.notes, removeInState.notes]
        .filter(Boolean)
        .join("\n");

      const payload = {
        name: keepInState.name,
        phone: keepInState.phone,
        notes: mergedNotes,
      };

      const updated = await updateContact(keepInState._id, payload);
      await deleteContact(removeInState._id);

      const next = contacts
        .filter((c) => c._id !== removeInState._id)
        .map((c) => (c._id === updated._id ? updated : c));
      syncContacts(next);

      if (favorites.includes(removeInState._id)) {
        const nextFav = favorites.filter((id) => id !== removeInState._id);
        persistFavorites(nextFav);
      }

      setDuplicateInfo(null);
    } catch (err) {
      console.error("Merge contacts failed:", err);
      alert("Failed to merge contacts. You can still edit them manually.");
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleCardClick = (c) => {
    if (onSelectContact) onSelectContact(c);
  };

  const handleMenuToggle = (id) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-50/70">
      {/* HEADER */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Contacts
            </h2>
            <p className="text-[11px] text-slate-500">
              Lightweight CRM for your WhatsApp customers.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span>{contacts.length} saved</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="max-w-2xl mx-auto pt-4 flex flex-col h-full">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, phone, or notes…"
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-1 items-center justify-center py-16 text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Loading contacts…</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && sortedContacts.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400 py-20">
              <div className="mb-4 rounded-full bg-white shadow-sm border border-slate-100 w-14 h-14 flex items-center justify-center">
                <Users className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                No contacts yet
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Create your first contact to start building your customer list.
              </p>
            </div>
          )}

          {/* List */}
          {!loading && sortedContacts.length > 0 && (
            <div className="space-y-2.5">
              {sortedContacts.map((c) => {
                const isFav = favorites.includes(c._id);
                const createdLabel = formatDate(c.createdAt);

                return (
                  <div
                    key={c._id}
                    className="relative group rounded-2xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.12)] hover:border-emerald-100 transition-all duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => handleCardClick(c)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={c.name || c.phone || "?"} />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {c.name || "Unknown"}
                            </p>
                            {isFav && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                Favorite
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 break-all">
                            {c.phone}
                          </p>
                          {c.notes && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {c.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <span className="hidden sm:inline-block text-[10px] text-slate-400">
                          {createdLabel}
                        </span>

                        {/* Favorite toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(c._id);
                          }}
                          className="p-1.5 rounded-full hover:bg-amber-50 transition-colors"
                          title={isFav ? "Remove from favorites" : "Favorite"}
                        >
                          {isFav ? (
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <StarOff className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {/* Menu toggle */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuToggle(c._id);
                            }}
                            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-slate-500" />
                          </button>

                          {openMenuId === c._id && (
                            <div
                              className="absolute right-0 mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-lg text-[11px] text-slate-700 z-20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  handleCardClick(c);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Open chat
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCall(c.phone);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                              >
                                <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                                Call
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopyPhone(c.phone);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                              >
                                <CopyIcon className="w-3.5 h-3.5 text-slate-500" />
                                Copy phone
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  openDetails(c);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                              >
                                <Info className="w-3.5 h-3.5 text-slate-500" />
                                View details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  openEditModal(c);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={loadingAction}
                                onClick={() => {
                                  handleDeleteContact(c._id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating "New contact" button */}
      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-medium shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition"
      >
        <UserPlus className="w-4 h-4" />
        New contact
      </button>

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
        <div className="fixed bottom-5 right-5 z-30 px-3 py-2 rounded-full bg-slate-900/90 text-white text-[11px] shadow-lg">
          {copyToast}
        </div>
      )}
    </div>
  );
};

export default ContactsView;
