import React from "react";
import { Routes, Route } from "react-router-dom";
import { st } from "./lib/st.js";
import { useApp } from "./store.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Upload from "./components/Upload.jsx";
import Result from "./components/Result.jsx";
import Cases from "./components/Cases.jsx";
import ContextScreen from "./components/ContextScreen.jsx";
import Monitoring from "./components/Monitoring.jsx";
import Handoff from "./components/Handoff.jsx";
import Analytics from "./components/Analytics.jsx";
import UserManagement from "./components/UserManagement.jsx";
import AnalyzingOverlay from "./components/AnalyzingOverlay.jsx";
import AddContextModal from "./components/AddContextModal.jsx";
import Login from "./components/Login.jsx";

export default function App() {
  const { state } = useApp();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // While we verify the session, show a minimal splash to avoid a flash of login.
  if (!state.authChecked) {
    return (
      <div style={st("min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#eef2f0;")}>
        <div style={st("width:42px;height:42px;border-radius:11px;border:3px solid #d8e6de;border-top-color:#2f9e6a;animation:spin 1s linear infinite;")}></div>
      </div>
    );
  }

  if (!state.user) return <Login />;

  return (
    <div id="root-shell" style={st("display:flex;flex-direction:column;height:100vh;width:100%;overflow:hidden;background:#eef2f0;")}>
      {/* Backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={st("position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99;")}
        />
      )}
      {/* Drawer */}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar onMenuToggle={() => setMenuOpen((v) => !v)} />
      <main className="main-scroll" style={st("flex:1;overflow-y:auto;padding:26px;")}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/result" element={<Result />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/context" element={<ContextScreen />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/handoff" element={<Handoff />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
        <AnalyzingOverlay />
        <AddContextModal />
      </main>
    </div>
  );
}
