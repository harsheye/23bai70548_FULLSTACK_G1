import DashboardAnalytics from "./pages/DashboardAnalytics";
import logs from "./data/logs";
import Logs from "./pages/Logs";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardSummary from "./pages/DashboardSummary";
import ProtectedRoute from "./routes/ProtectedRoutes.js";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Header from "./components/Header";
import WaterTracker from "./pages/WaterTracker";

function App() {
  return (
    <BrowserRouter>
      <div style={{ background: '#111', minHeight: '100vh' }}>
        <Header title="Protected Routes" />
        <div style={{ color: 'red', fontSize: 32, textAlign: 'center', margin: '2rem' }}>
          If you see this message, React is rendering!
        </div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardSummary />} />
            <Route path="summary" element={<DashboardSummary />} />
            <Route path="analytics" element={<DashboardAnalytics />} />
            <Route path="logs" element={<Logs logs={logs} />} />
          </Route>
          <Route path="/dashboard/water" element={<ProtectedRoute><WaterTracker /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;