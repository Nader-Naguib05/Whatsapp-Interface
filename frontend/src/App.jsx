// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import ModulesHome from "./pages/ModulesPage";
import LoginPage from "./pages/LoginPage";

import ChatsModule from "./pages/WhatsAppDashboard";
import BroadcastModule from "./modules/BroadcastModule";
import AnalyticsModule from "./modules/AnalyticsModule";
import ContactsModule from "./modules/ContactsModule";
import SettingsModule from "./modules/SettingsModule";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* LOGIN */}
          <Route path="/login" element={<LoginPage />} />

          {/* MODULES HOME */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ModulesHome />
              </ProtectedRoute>
            }
          />

          {/* EACH MODULE ROUTE */}
          <Route
            path="/modules/chats"
            element={
              <ProtectedRoute>
                <ChatsModule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/modules/broadcast"
            element={
              <ProtectedRoute>
                <BroadcastModule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/modules/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsModule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/modules/contacts"
            element={
              <ProtectedRoute>
                <ContactsModule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/modules/settings"
            element={
              <ProtectedRoute>
                <SettingsModule />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
