import React, { useState } from 'react';
import { MessageSquare, Send, Users, BarChart3, Settings, Search, Phone, Paperclip, Smile, MoreVertical, Check, CheckCheck, Menu, X, Radio } from 'lucide-react';

const WhatsAppDashboard = () => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for conversations
  const conversations = [
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
        { id: 2, text: 'Sure, I can help you with that. What\'s your order number?', sender: 'agent', time: '10:16 AM', status: 'read' },
        { id: 3, text: 'Order #12345', sender: 'customer', time: '10:20 AM', status: 'read' },
        { id: 4, text: 'I found your order. It will be delivered tomorrow.', sender: 'agent', time: '10:25 AM', status: 'read' },
        { id: 5, text: 'Thanks for the information!', sender: 'customer', time: '10:30 AM', status: 'delivered' }
      ]
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
        { id: 1, text: 'What are your business hours?', sender: 'customer', time: '9:45 AM', status: 'read' }
      ]
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
        { id: 1, text: 'Can I reschedule my appointment?', sender: 'customer', time: 'Yesterday', status: 'delivered' }
      ]
    }
  ];

  const stats = [
    { label: 'Active Chats', value: '24', icon: MessageSquare, color: 'bg-blue-500' },
    { label: 'Total Contacts', value: '1,234', icon: Users, color: 'bg-green-500' },
    { label: 'Messages Today', value: '456', icon: Send, color: 'bg-purple-500' },
    { label: 'Response Rate', value: '94%', icon: BarChart3, color: 'bg-orange-500' }
  ];

  const handleSendMessage = () => {
    if (message.trim() && selectedChat) {
      // Here you would send the message to your backend
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const renderChatList = () => (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setSelectedChat(conv)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
              selectedChat?.id === conv.id ? 'bg-green-50' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center font-semibold text-gray-600">
                  {conv.name.split(' ').map(n => n[0]).join('')}
                </div>
                {conv.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                  <span className="text-xs text-gray-500">{conv.time}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  {conv.unread > 0 && (
                    <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChatWindow = () => {
    if (!selectedChat) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600">Select a conversation</h3>
            <p className="text-gray-500 mt-2">Choose a chat from the list to start messaging</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Chat header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-semibold text-gray-600">
                {selectedChat.name.split(' ').map(n => n[0]).join('')}
              </div>
              {selectedChat.status === 'online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
              <p className="text-sm text-gray-500">{selectedChat.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Phone className="w-5 h-5 text-gray-600 cursor-pointer hover:text-green-600" />
            <MoreVertical className="w-5 h-5 text-gray-600 cursor-pointer hover:text-green-600" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {selectedChat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.sender === 'agent'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-900 border'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className={`text-xs ${msg.sender === 'agent' ? 'text-green-100' : 'text-gray-500'}`}>
                    {msg.time}
                  </span>
                  {msg.sender === 'agent' && (
                    msg.status === 'read' ? (
                      <CheckCheck className="w-4 h-4 text-blue-200" />
                    ) : (
                      <Check className="w-4 h-4 text-green-100" />
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message input */}
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
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBroadcast = () => (
    <div className="p-6 bg-white h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Broadcast Messages</h2>
      <div className="max-w-3xl">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Send to Multiple Contacts</h3>
              <p className="text-sm text-green-700">Broadcast messages are sent individually to each contact. They won't see other recipients.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Recipients</label>
            <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option>All Contacts (1,234)</option>
              <option>Active Customers (856)</option>
              <option>New Leads (234)</option>
              <option>VIP Customers (144)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
            <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2">
              <option>Select a template...</option>
              <option>Welcome Message</option>
              <option>Order Confirmation</option>
              <option>Promotion Announcement</option>
              <option>Custom Message</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
            <textarea
              rows="6"
              placeholder="Type your broadcast message here..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            ></textarea>
            <p className="text-sm text-gray-500 mt-1">Max 1,024 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attach Media (Optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition cursor-pointer">
              <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload image or document</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button className="flex-1 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition">
              Send Broadcast
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition">
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Message Volume (Last 7 Days)</h3>
          <div className="space-y-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <div key={day}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{day}</span>
                  <span className="font-semibold">{Math.floor(Math.random() * 100) + 20}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.random() * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Top Response Times</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Average Response</span>
              <span className="text-lg font-bold text-green-600">2.5 min</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">First Response</span>
              <span className="text-lg font-bold text-blue-600">45 sec</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">Resolution Time</span>
              <span className="text-lg font-bold text-purple-600">12 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 bg-white h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      <div className="max-w-3xl space-y-6">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">WhatsApp Business API</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number ID</label>
              <input
                type="text"
                placeholder="Enter your phone number ID"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
              <input
                type="password"
                placeholder="Enter your access token"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
              <input
                type="text"
                placeholder="https://your-domain.com/webhook"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition">
              Save Configuration
            </button>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Business Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                placeholder="Your Business Name"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
              <textarea
                rows="3"
                placeholder="Describe your business..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              ></textarea>
            </div>
            <button className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition">
              Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-green-600 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-green-500">
          {sidebarOpen && <h1 className="text-xl font-bold">WhatsApp Biz</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-green-700 p-2 rounded">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveTab('chats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
              activeTab === 'chats' ? 'bg-green-700' : 'hover:bg-green-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {sidebarOpen && <span>Chats</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
              activeTab === 'broadcast' ? 'bg-green-700' : 'hover:bg-green-700'
            }`}
          >
            <Radio className="w-5 h-5" />
            {sidebarOpen && <span>Broadcast</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
              activeTab === 'analytics' ? 'bg-green-700' : 'hover:bg-green-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            {sidebarOpen && <span>Analytics</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'settings' ? 'bg-green-700' : 'hover:bg-green-700'
            }`}
          >
            <Settings className="w-5 h-5" />
            {sidebarOpen && <span>Settings</span>}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {activeTab === 'chats' ? (
          <>
            <div className="w-96 border-r">{renderChatList()}</div>
            <div className="flex-1">{renderChatWindow()}</div>
          </>
        ) : activeTab === 'broadcast' ? (
          <div className="flex-1">{renderBroadcast()}</div>
        ) : activeTab === 'analytics' ? (
          <div className="flex-1">{renderAnalytics()}</div>
        ) : (
          <div className="flex-1">{renderSettings()}</div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppDashboard;