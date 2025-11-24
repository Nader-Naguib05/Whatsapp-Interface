import React, { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";

const SettingsView = () => {
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSaveAPI = () => {
    console.log("Saving API config:", { phoneId, accessToken, webhookUrl });
  };

  const handleSaveProfile = () => {
    console.log("Saving business profile:", { businessName, businessDesc });
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
                Store long-lived tokens securely. Never expose in frontend code.
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

              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 relative transition">
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
