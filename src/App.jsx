import React, { useEffect, useState, Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';

import ScrollToTop from './utils/ScrollToTop';

const AuthRoutes = lazy(() => import('./routes/AuthRoutes'));
const IndexRoute = lazy(() => import('./routes'));
const AdminLogin = lazy(() => import('./views/Admin/Login'));

/* ================= ERROR BOUNDARY ================= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

/* ================= INNER APP ================= */
function AppContent() {
  const location = useLocation();

  /* ================= AUTH (FRESH ON EVERY RENDER) ================= */
  const token = localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
  const role = localStorage.getItem("role");
  const isLoggedIn = !!(token && role);

  /* ================= DEBUG ================= */
  useEffect(() => {
    console.log("📍 Path:", location.pathname);
    console.log("🔑 Token:", token ? "Exists" : "None");
    console.log("👤 Role:", role);
    console.log("✅ Logged In:", isLoggedIn);
  }, [location.pathname, token, role, isLoggedIn]);

  return (
    <ScrollToTop>
      <Suspense fallback={
        <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
          Loading...
        </div>
      }>
        <Routes>

          {/* ROOT */}
          <Route
            path="/"
            element={
              isLoggedIn
                ? role === "admin"
                  ? <Navigate to="/admin/dashboard" replace />
                  : <Navigate to="/dashboard" replace />
                : <Navigate to="/auth/login" replace />
            }
          />

          {/* ADMIN LOGIN */}
          <Route
            path="/admin/login"
            element={
              isLoggedIn && role === "admin"
                ? <Navigate to="/admin/dashboard" replace />
                : <AdminLogin />
            }
          />

          {/* AUTH ROUTES */}
          <Route
            path="/auth/*"
            element={
              isLoggedIn
                ? role === "admin"
                  ? <Navigate to="/admin/dashboard" replace />
                  : <Navigate to="/dashboard" replace />
                : <AuthRoutes />
            }
          />

          {/* MAIN APP (PROTECTED) */}
          <Route
            path="/*"
            element={
              isLoggedIn
                ? <IndexRoute />
                : <Navigate to="/auth/login" replace />
            }
          />

        </Routes>
      </Suspense>
    </ScrollToTop>
  );
}

/* ================= MAIN APP ================= */
function App() {
  return (
  
      <BrowserRouter>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </BrowserRouter>
  
  );
}

export default App;