import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requireFinancialAccess }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    // Redirect to login page, saving the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if financial access is required (for Abbas-only pages)
  if (requireFinancialAccess && !user?.can_view_financials) {
    // Redirect to dashboard if user doesn't have financial access
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
