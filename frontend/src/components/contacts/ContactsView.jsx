import React, { useEffect, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { getContacts, createContact } from "../../api/contacts";

const Avatar = ({ name }) => {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <div className="flex items-center justify-center bg-green-700/20 text-green-700 rounded-full w-11 h-11 font-semibold">
            {initials}
        </div>
    );
};

const ContactsView = ({ onSelectContact }) => {
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        notes: "",
    });

    // useEffect(() => {
    //     const load = async () => {
    //         try {
    //             const data = await getContacts();
    //             setContacts(data);
    //         } catch (err) {
    //             console.log("Using fallback empty contacts");
    //         }
    //     };
    //     load();
    // }, []);

    useEffect(() => {
        // 🔥 TEMPORARY MOCK DATA FOR UI PREVIEW
        const mock = [
            {
                _id: "1",
                name: "John Doe",
                phone: "+201234567890",
                createdAt: new Date(),
            },
            {
                _id: "2",
                name: "Sarah Smith",
                phone: "+201500000000",
                createdAt: new Date(),
            },
            {
                _id: "3",
                name: "Ahmed Hassan",
                phone: "+201110000000",
                createdAt: new Date(),
            },
            {
                _id: "4",
                name: "Mohamed Ali",
                phone: "+201020202020",
                createdAt: new Date(),
            },
            {
                _id: "5",
                name: "Isabella Martinez",
                phone: "+13475551234",
                createdAt: new Date(),
            },
            {
                _id: "6",
                name: "Laura Johnson",
                phone: "+16125553636",
                createdAt: new Date(),
            },
        ];

        setContacts(mock);
    }, []);

    const filtered = contacts.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.includes(search)
    );

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* HEADER */}
            <div className="px-6 py-4 bg-white border-b flex items-center justify-between sticky top-0 z-20">
                <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>

                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                >
                    <UserPlus className="w-5 h-5" />
                    Add Contact
                </button>
            </div>

            {/* CONTENT CONTAINER */}
            <div className="flex justify-center w-full flex-1 px-4">
                <div className="w-full max-w-2xl py-6">
                    {/* SEARCH */}
                    <div className="mb-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search contacts…"
                                className="w-full pl-11 pr-4 py-2 rounded-lg bg-white shadow-sm border focus:ring-2 focus:ring-green-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* EMPTY STATE */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-28 text-gray-400">
                            <Users className="w-14 h-14 text-gray-300 mb-3" />
                            <p className="text-lg">No contacts found</p>
                        </div>
                    )}

                    {/* CONTACT LIST */}
                    <div className="space-y-3">
                        {filtered.map((c) => (
                            <div
                                key={c._id}
                                onClick={() => onSelectContact(c)}
                                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border border-gray-200 hover:shadow-md hover:border-green-300 cursor-pointer transition"
                            >
                                <Avatar name={c.name} />

                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 text-[15px] leading-tight">
                                        {c.name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {c.phone}
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 pr-1">
                                    {c.createdAt
                                        ? new Date(
                                              c.createdAt
                                          ).toLocaleDateString()
                                        : ""}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ADD CONTACT MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl w-[420px] p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            New Contact
                        </h3>

                        <div className="space-y-4">
                            <input
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                placeholder="Full name"
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                            />

                            <input
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                placeholder="Phone number"
                                value={form.phone}
                                onChange={(e) =>
                                    setForm({ ...form, phone: e.target.value })
                                }
                            />

                            <textarea
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                placeholder="Notes (optional)"
                                rows="3"
                                value={form.notes}
                                onChange={(e) =>
                                    setForm({ ...form, notes: e.target.value })
                                }
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={async () => {
                                        const newContact = await createContact(
                                            form
                                        );
                                        setContacts((prev) => [
                                            ...prev,
                                            newContact,
                                        ]);
                                        setShowModal(false);
                                        setForm({
                                            name: "",
                                            phone: "",
                                            notes: "",
                                        });
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Save Contact
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsView;
