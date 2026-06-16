import { Routes, Route } from "react-router-dom";
import { st } from "./lib/st.js";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Upload from "./components/Upload.jsx";
import Result from "./components/Result.jsx";
import Cases from "./components/Cases.jsx";
import ContextScreen from "./components/ContextScreen.jsx";
import Handoff from "./components/Handoff.jsx";
import AnalyzingOverlay from "./components/AnalyzingOverlay.jsx";
import AddContextModal from "./components/AddContextModal.jsx";

export default function App() {
  return (
    <div id="root-shell" style={st("display:flex;height:100vh;width:100%;overflow:hidden;background:#eef2f0;")}>
      <Sidebar />
      <div style={st("flex:1;display:flex;flex-direction:column;min-width:0;")}>
        <Topbar />
        <main className="main-scroll" style={st("flex:1;overflow-y:auto;padding:26px;")}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/result" element={<Result />} />
            <Route path="/result/:id" element={<Result />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/context" element={<ContextScreen />} />
            <Route path="/handoff" element={<Handoff />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
          <AnalyzingOverlay />
          <AddContextModal />
        </main>
      </div>
    </div>
  );
}
