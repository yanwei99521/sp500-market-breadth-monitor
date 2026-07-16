import { Route, Routes } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import DetailPage from "./pages/DetailPage";
import ResearchPage from "./pages/ResearchPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppHeader />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/indicator/:indicatorId" element={<DetailPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}
