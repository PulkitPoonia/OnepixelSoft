import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import CompactLayout from '../layout/MainLayout/index';
import { authRoutes, routes } from './RouteList';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 Route Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', maxWidth: '600px' }}>
          <h3>Component Error</h3>
          <p>{this.state.error?.message}</p>
          <details style={{ marginTop: '10px' }}>
            <summary>Stack Trace</summary>
            <pre style={{ fontSize: '12px', color: '#666', overflow: 'auto' }}>
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

const IndexRoute = () => {
  return (
    <Suspense
      fallback={
        <div className="preloader-it">
          <div className="loader-pendulums" />
        </div>
      }
    >
      <CompactLayout>
        <ErrorBoundary>
          <Routes>

            {/* ================= DYNAMIC ROUTES ================= */}
            {routes.map((obj, i) => {
              if (!obj.component || !obj.path) return null;

              const Component = obj.component;

              return (
                <Route
                  key={i}
                  path={obj.path}
                  element={<Component />}
                />
              );
            })}

            {/* ================= AUTH ROUTES ================= */}
            {authRoutes.map((obj, i) => {
              if (!obj.component || !obj.path) return null;

              const Component = obj.component;

              return (
                <Route
                  key={`auth-${i}`}
                  path={obj.path}
                  element={<Component />}
                />
              );
            })}

            {/* ================= SAFE 404 ================= */}
            <Route path="*" element={<div>404 - Page Not Found</div>} />

          </Routes>
        </ErrorBoundary>
      </CompactLayout>
    </Suspense>
  );
};

export default IndexRoute;
