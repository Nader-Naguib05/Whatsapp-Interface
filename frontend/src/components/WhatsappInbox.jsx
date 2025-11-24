import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  BarChart3,
  Settings,
  Search,
  Phone,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  Menu,
  X,
  Radio,
} from 'lucide-react';

// ---------- Utils ----------
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ---------- Mock Data ----------
const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    name: 'John Doe',
    lastMessage: 'Thanks for the information!',
    time: '10:30 AM',
    unread: 2,
    status: 'online',
    phone: '+1234567890',
    messages: [
      { id: 1, text: 'Hi, I need help with my order', sender: 'customer', time: '10:15 AM', status: 'read' },
      { id: 2, text: "Sure, I can help you with that. What's your order number?", sender: 'agent', time: '10:16 AM', status: 'read' },
      { id: 3, text: 'Order #12345', sender: 'customer', time: '10:20 AM', status: 'read' },
      { id: 4, text: 'I found your order. It will be delivered tomorrow.', sender: 'agent', time: '10:25 AM', status: 'read' },
      { id: 5, text: 'Thanks for the information!', sender: 'customer', time: '10:30 AM', status: 'delivered' },
    ],
  },
  {
    id: 2,
    name: 'Sarah Smith',
    lastMessage: 'What are your business hours?',
    time: '9:45 AM',
    unread: 0,
    status: 'offline',
    phone: '+1234567891',
    messages: [
      { id: 1, text: 'What are your business hours?', sender: 'customer', time: '9:45 AM', status: 'read' },
    ],
  },
  {
    id: 3,
    name: 'Mike Johnson',
    lastMessage: 'Can I reschedule my appointment?',
    time: 'Yesterday',
    unread: 1,
    status: 'offline',
    phone: '+1234567892',
    messages: [
      { id: 1, text: 'Can I reschedule my appointment?', sender: 'customer', time: 'Yesterday', status: 'delivered' },
    ],
  },
];

const ANALYTICS_STATS = [
  { label: 'Active Chats', value: '24', icon: MessageSquare, color: 'bg-blue-500' },
  { label: 'Total Contacts', value: '1,234', icon: Users, color: 'bg-green-500' },
  { label: 'Messages Today', value: '456', icon: Send, color: 'bg-purple-500' },
  { label: 'Response Rate', value: '94%', icon: BarChart3, color: 'bg-orange-500' },
];

const MESSAGE_VOLUME = [
  { day: 'Mon', count: 80 },
  { day: 'Tue', count: 120 },
  { day: 'Wed', count: 95 },
  { day: 'Thu', count: 140 },
  { day: 'Fri', count: 160 },
  { day: 'Sat', count: 70 },
  { day: 'Sun', count: 60 },
];

const maxVolume = Math.max(...MESSAGE_VOLUME.map((d) => d.count));

// ---------- UI Primitives ----------
const Avatar = ({ name, size = 40, status }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center bg-gray-300 rounded-full text-gray-800 font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
      {status === 'online' && (
        <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
};

const Button = ({ children, className, icon: Icon, ...props }) => (
  <button
    {...props}
    className={cn(
      'flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className
    )}
  >
    {Icon && <Icon className="w-5 h-5" />}
    {children}
  </button>
);

const Input = ({ icon: Icon, className, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
    )}
    <input
      {...props}
      className={cn(
        'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500',
        Icon && 'pl-10',
        className
      )}
    />
  </div>
);

const Textarea = ({ className, ...props }) => (
  <textarea
    {...props}
    className={cn(
      'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500',
      className
    )}
  />
);

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
    {Icon && <Icon className="w-20 h-20 text-gray-300 mb-4" />}
    <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
    {subtitle && <p className="text-gray-500 mt-2 max-w-md">{subtitle}</p>}
  </div>
);

const StatCard = ({ value, label, icon: Icon, color }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border">
    <div className="flex items-center justify-between mb-3">
      <div className={cn(color, 'p-3 rounded-lg')}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    <p className="text-sm text-gray-600 mt-1">{label}</p>
  </div>
);



// ---------- Main Component ----------
const WhatsAppDashboard = () => {
  const [activeTab, setActiveTab] = useState('chats');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedChatId, setSelectedChatId] = useState(INITIAL_CONVERSATIONS[0]?.id ?? null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const chatBottomRef = useRef(null);

  const selectedChat = useMemo(
    () => conversations.find((c) => c.id === selectedChatId) || null,
    [conversations, selectedChatId]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = Date.now();

    const newMsg = {
      id: msgId,
      text: message,
      sender: 'agent',
      time,
      status: 'sent',
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedChat.id
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: newMsg.text,
              time,
            }
          : c
      )
    );

    setMessage('');

    // Simulate status transitions
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedChat.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId ? { ...m, status: 'delivered' } : m
                ),
              }
            : c
        )
      );
    }, 700);

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedChat.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId ? { ...m, status: 'read' } : m
                ),
              }
            : c
        )
      );
    }, 1500);
  };

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChatId, conversations]);

  // ---------- Chats View ----------
  const renderChatList = () => (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b">
        <Input
          icon={Search}
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No conversations found</div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedChatId(conv.id)}
              className={cn(
                'p-4 border-b cursor-pointer hover:bg-gray-50 transition',
                selectedChatId === conv.id && 'bg-green-50'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar name={conv.name} status={conv.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                    <span className="text-xs text-gray-500">{conv.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 gap-2">
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                    {conv.unread > 0 && (
                      <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderChatWindow = () => {
    if (!selectedChat) {
      return (
        <EmptyState
          icon={MessageSquare}
          title="Select a conversation"
          subtitle="Choose a chat from the left to start messaging your customers."
        />
      );
    }

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={selectedChat.name} status={selectedChat.status} size={40} />
            <div>
              <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
              <p className="text-sm text-gray-500">{selectedChat.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <button className="hover:text-green-600">
              <Phone className="w-5 h-5" />
            </button>
            <button className="hover:text-green-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {selectedChat.messages.map((msg) => {
            const isAgent = msg.sender === 'agent';
            return (
              <div
                key={msg.id}
                className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2 text-sm shadow-sm',
                    isAgent
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-900 border'
                  )}
                >
                  <p>{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span
                      className={cn(
                        'text-xs',
                        isAgent ? 'text-green-100' : 'text-gray-500'
                      )}
                    >
                      {msg.time}
                    </span>
                    {isAgent && (
                      <>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-4 h-4 text-blue-200" />
                        ) : msg.status === 'delivered' ? (
                          <Check className="w-4 h-4 text-green-100" />
                        ) : (
                          <Check className="w-4 h-4 text-green-100 opacity-60" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="text-gray-600 hover:text-green-600">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="text-gray-600 hover:text-green-600">
              <Smile className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              onClick={handleSendMessage}
              className="bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg"
              icon={Send}
            />
          </div>
        </div>
      </div>
    );
  };

  // ---------- Broadcast ----------
  const BroadcastView = () => {
    const [segment, setSegment] = useState('all');
    const [template, setTemplate] = useState('');
    const [content, setContent] = useState('');
    const [attachMedia, setAttachMedia] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('');

    const handleSend = () => {
      if (!content.trim()) return;
      console.log('Broadcast send:', { segment, template, content, attachMedia });
      // Call backend here
      setContent('');
      setTemplate('');
      setAttachMedia(false);
    };

    const handleSchedule = () => {
      if (!content.trim() || !scheduleTime) return;
      console.log('Broadcast schedule:', { segment, template, content, scheduleTime });
      setIsScheduling(false);
      setScheduleTime('');
    };

    return (
      <div className="p-6 bg-white h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Broadcast Messages</h2>

        <div className="max-w-3xl space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Radio className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  Send messages to multiple customers at once
                </h3>
                <p className="text-sm text-green-700">
                  Each broadcast is sent as an individual message. Recipients won&apos;t see
                  each other, just like a normal WhatsApp message.
                </p>
              </div>
            </div>
          </div>

          {/* Recipient Segment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Recipients
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Contacts (1,234)</option>
              <option value="active">Active Customers (856)</option>
              <option value="leads">New Leads (234)</option>
              <option value="vip">VIP Customers (144)</option>
            </select>
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            >
              <option value="">Select a template...</option>
              <option value="welcome">Welcome Message</option>
              <option value="order_confirmation">Order Confirmation</option>
              <option value="promotion">Promotion Announcement</option>
              <option value="custom">Custom Message</option>
            </select>
            <p className="text-xs text-gray-500">
              Templates must be pre-approved in your WhatsApp Business Account.
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <Textarea
              rows={6}
              placeholder="Type your broadcast message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Max 1,024 characters</span>
              <span>{content.length} / 1024</span>
            </div>
          </div>

          {/* Media */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Attach Media (Optional)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={attachMedia}
                  onChange={(e) => setAttachMedia(e.target.checked)}
                />
                Enable attachment
              </label>
            </div>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer',
                attachMedia ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'
              )}
            >
              <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {attachMedia ? 'Drop or select a file (not wired yet)' : 'Enable attachments to upload media'}
              </p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Button
              onClick={handleSend}
              disabled={!content.trim()}
              className="flex-1 bg-green-500 text-white hover:bg-green-600 justify-center py-3"
              icon={Send}
            >
              Send Broadcast
            </Button>
            <Button
              type="button"
              className="px-6 py-3 border border-gray-300 hover:bg-gray-50"
              onClick={() => setIsScheduling(true)}
            >
              Schedule
            </Button>
          </div>

          {/* Simple inline schedule row (no modal to keep it simple) */}
          {isScheduling && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border rounded-lg p-3 bg-gray-50">
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Button
                onClick={handleSchedule}
                disabled={!content.trim() || !scheduleTime}
                className="bg-green-500 text-white hover:bg-green-600 px-4 py-2"
              >
                Confirm Schedule
              </Button>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setIsScheduling(false);
                  setScheduleTime('');
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------- Analytics ----------
  const AnalyticsView = () => {
    return (
      <div className="p-6 bg-gray-50 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics &amp; Reports</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {ANALYTICS_STATS.map((stat, idx) => (
            <StatCard key={idx} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Volume */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Message Volume (Last 7 Days)</h3>
            <div className="space-y-3">
              {MESSAGE_VOLUME.map((d) => (
                <div key={d.day}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{d.day}</span>
                    <span className="font-semibold">{d.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(d.count / maxVolume) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4">Response Time Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-800">Average Response</span>
                <span className="text-lg font-bold text-green-700">2.5 min</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-800">First Response</span>
                <span className="text-lg font-bold text-blue-700">45 sec</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-800">Resolution Time</span>
                <span className="text-lg font-bold text-purple-700">12 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------- Settings ----------
  const SettingsView = () => {
    const [phoneId, setPhoneId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessDesc, setBusinessDesc] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleSaveAPI = () => {
      console.log('Saving API config:', { phoneId, accessToken, webhookUrl });
      // Call backend here
    };

    const handleSaveProfile = () => {
      console.log('Saving business profile:', { businessName, businessDesc });
    };

    return (
      <div className="p-6 bg-white h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

        <div className="max-w-3xl space-y-6">
          {/* API Config */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">WhatsApp Business API</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number ID
                </label>
                <Input
                  placeholder="Enter your phone number ID"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token
                </label>
                <Input
                  type="password"
                  placeholder="Enter your access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Store long-lived tokens securely. Do not expose them in frontend code.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <Input
                  placeholder="https://your-domain.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSaveAPI}
                className="bg-green-500 text-white hover:bg-green-600 mt-2"
              >
                Save Configuration
              </Button>
            </div>
          </div>

          {/* Business Profile */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Business Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <Input
                  placeholder="Your Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Description
                </label>
                <Textarea
                  rows={3}
                  placeholder="Describe your business..."
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                className="bg-green-500 text-white hover:bg-green-600"
              >
                Update Profile
              </Button>
            </div>
          </div>

          {/* Notifications */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Notifications</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Browser Notifications
                </p>
                <p className="text-xs text-gray-500">
                  Get alerted when new messages arrive or SLA is at risk.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 relative transition">
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------- Main Layout ----------
  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex min-w-0">
        {activeTab === 'chats' && (
          <>
            <div className="w-96 border-r hidden md:block">{renderChatList()}</div>
            <div className="flex-1">
              <div className="md:hidden border-b bg-white">
                {/* On mobile, show chat list on top, then chat window */}
                {renderChatList()}
              </div>
              {renderChatWindow()}
            </div>
          </>
        )}

        {activeTab === 'broadcast' && <BroadcastView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
