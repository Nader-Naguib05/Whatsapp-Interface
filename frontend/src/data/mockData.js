// Conversations, analytics stats, message volume

export const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    name: "John Doe",
    lastMessage: "Thanks for the information!",
    time: "10:30 AM",
    unread: 2,
    status: "online",
    phone: "+1234567890",
    messages: [
      {
        id: 1,
        text: "Hi, I need help with my order",
        sender: "customer",
        time: "10:15 AM",
        status: "read",
      },
      {
        id: 2,
        text: "Sure, I can help you with that. What's your order number?",
        sender: "agent",
        time: "10:16 AM",
        status: "read",
      },
      {
        id: 3,
        text: "Order #12345",
        sender: "customer",
        time: "10:20 AM",
        status: "read",
      },
      {
        id: 4,
        text: "I found your order. It will be delivered tomorrow.",
        sender: "agent",
        time: "10:25 AM",
        status: "read",
      },
      {
        id: 5,
        text: "Thanks for the information!",
        sender: "customer",
        time: "10:30 AM",
        status: "delivered",
      },
    ],
  },
  {
    id: 2,
    name: "Sarah Smith",
    lastMessage: "What are your business hours?",
    time: "9:45 AM",
    unread: 0,
    status: "offline",
    phone: "+1234567891",
    messages: [
      {
        id: 1,
        text: "What are your business hours?",
        sender: "customer",
        time: "9:45 AM",
        status: "read",
      },
    ],
  },
  {
    id: 3,
    name: "Mike Johnson",
    lastMessage: "Can I reschedule my appointment?",
    time: "Yesterday",
    unread: 1,
    status: "offline",
    phone: "+1234567892",
    messages: [
      {
        id: 1,
        text: "Can I reschedule my appointment?",
        sender: "customer",
        time: "Yesterday",
        status: "delivered",
      },
    ],
  },
];

export const ANALYTICS_STATS = [
  { label: "Active Chats", value: "24", icon: null, color: "bg-blue-500" },
  { label: "Total Contacts", value: "1,234", icon: null, color: "bg-green-500" },
  { label: "Messages Today", value: "456", icon: null, color: "bg-purple-500" },
  { label: "Response Rate", value: "94%", icon: null, color: "bg-orange-500" },
];

export const MESSAGE_VOLUME = [
  { day: "Mon", count: 80 },
  { day: "Tue", count: 120 },
  { day: "Wed", count: 95 },
  { day: "Thu", count: 140 },
  { day: "Fri", count: 160 },
  { day: "Sat", count: 70 },
  { day: "Sun", count: 60 },
];

export const maxVolume = Math.max(...MESSAGE_VOLUME.map((d) => d.count));
