import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MasterDashboard from "./pages/MasterDashboard";
import StateMinisterDashboard from "./pages/StateMinisterDashboard";
import HigherOfficialDashboard from "./pages/HigherOfficialDashboard";
import PersonalPlanManagement from "./pages/PersonalPlanManagement";
import ChangeStatusPage from "./pages/ChangeStatusPage";
import AssignedPage from "./pages/AssignedPage";
import ProgressPage from "./pages/ProgressPage";
import TeamLeaderDashboard from "./pages/TeamLeaderDashboard";
import LeadExecutiveDashboard from "./pages/LeadExecutiveDashboard";
import MinisterDashboard from "./pages/StateMinisterDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function AppWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Check authentication status
  const checkAuth = () => {
    const user = localStorage.getItem("redmine_user");
    const loggedIn = !!user;
    setIsLoggedIn(loggedIn);
    setIsLoading(false);
    
    // If not logged in and not on login page, redirect to login
    if (!loggedIn && location.pathname !== "/" && location.pathname !== "/login") {
      navigate("/login");
    }
    
    // If logged in and on login page, redirect to dashboard
    
  };

  useEffect(() => {
    // Initial auth check
    checkAuth();
    
    // Listen for storage changes (like when login happens)
    const handleStorageChange = (e) => {
      if (e.key === "redmine_user") {
        checkAuth();
      }
    };
    
    // Listen for custom login event (triggered from Login page)
    const handleLoginSuccess = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginSuccess', handleLoginSuccess);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginSuccess', handleLoginSuccess);
    };
  }, [location.pathname, navigate]);

  // Listen for route changes
  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      
      // Auto-collapse on tablet/mobile
      if (width <= 991) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
      
      // Close mobile menu on larger screens
      if (width > 767) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLoginPage = location.pathname === "/" || location.pathname === "/login";
  const showSidebarAndHeader = !isLoginPage && isLoggedIn;

  // Calculate main content margin
  const getMainContentMargin = () => {
    if (!showSidebarAndHeader) return "0px";
    
    // Mobile
    if (screenWidth <= 767) {
      if (isMobileMenuOpen) {
        return screenWidth <= 575 ? "85vw" : "200px";
      }
      return screenWidth <= 575 ? "0px" : "60px";
    }
    
    // Tablet
    if (screenWidth <= 991) {
      return sidebarCollapsed ? "70px" : "220px";
    }
    
    // Desktop
    return sidebarCollapsed ? "80px" : "260px";
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${isLoginPage ? 'login-page' : ''}`}>
      {/* Header - only show when logged in and not on login page */}
      {showSidebarAndHeader && <Header />}

      <div className="main-content-wrapper">
        {/* Sidebar - only show when logged in and not on login page */}
        {showSidebarAndHeader && (
          <Sidebar 
            onCollapsedChange={setSidebarCollapsed}
            onMobileMenuChange={setIsMobileMenuOpen}
            collapsed={sidebarCollapsed}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        )}

        {/* Main content area */}
        <main 
          className="main-content"
          style={{ 
            marginLeft: getMainContentMargin(),
            transition: "margin-left 0.3s ease",
            paddingTop: showSidebarAndHeader ? "0" : "0"
          }}
        >
          <div className="content-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Login onLoginSuccess={checkAuth} />} />
              <Route path="/login" element={<Login onLoginSuccess={checkAuth} />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/master-dashboard" element={
                <ProtectedRoute>
                  <MasterDashboard />
                </ProtectedRoute>
              } />
              <Route path="/minister-dashboard" element={
                <ProtectedRoute>
                  <MinisterDashboard />
                </ProtectedRoute>
              } />
              <Route path="/state-minister-dashboard" element={
                <ProtectedRoute>
                  <StateMinisterDashboard />
                </ProtectedRoute>
              } />

              <Route path="/higherofficial-dashboard" element={
                <ProtectedRoute>
                  <HigherOfficialDashboard />
                </ProtectedRoute>
              } />

              <Route path="/teamleader-dashboard" element={
                <ProtectedRoute>
                  <TeamLeaderDashboard />
                </ProtectedRoute>
              } />

              <Route path="/lead-executive-dashboard" element={
                <ProtectedRoute>
                  <LeadExecutiveDashboard />
                </ProtectedRoute>
              } />

              <Route path="/personal-plan-management" element={
                <ProtectedRoute>
                  <PersonalPlanManagement />
                </ProtectedRoute>
              } />

              <Route path="/change-status" element={
                <ProtectedRoute>
                  <ChangeStatusPage />
                </ProtectedRoute>
              } />

              <Route path="/assigned-page" element={
                <ProtectedRoute>
                  <AssignedPage />
                </ProtectedRoute>
              } />

              <Route path="/progress-page" element={
                <ProtectedRoute>
                  <ProgressPage />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<p>Page Not Found</p>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}