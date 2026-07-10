// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

// Base Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import SellProperty from "./pages/SellProperty";
import UserProfile from "./pages/UserProfile";
import AuctionView from "./pages/AuctionView";
import AuctionAgreement from "./pages/AuctionAgreement";

// Admin
import AdminDashboard from "./pages/AdminDashboard";

// Buyer Sub-pages
import DashboardPage from "./pages/buyer/DashboardPage";
import MarketplacePage from "./pages/buyer/MarketplacePage";
import ListingsPage from "./pages/buyer/ListingsPage";
import BidsPage from "./pages/buyer/BidsPage";
import HistoryPage from "./pages/buyer/HistoryPage";
import SavedPage from "./pages/buyer/SavedPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Main App Layout (User & Admin shared structure) */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* User Specific Routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/sell-property" element={<SellProperty />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/bids" element={<BidsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/watchlist" element={<SavedPage />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/auction/:id" element={<AuctionView />} />
            <Route path="/agreement/:id" element={<AuctionAgreement />} />
            
            {/* Admin Specific Routes (also inside AppLayout) */}
            <Route path="/admin-dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            
            {/* Redirects */}
            <Route path="/user-dashboard" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

