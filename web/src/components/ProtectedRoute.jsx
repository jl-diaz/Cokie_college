import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1956] dark:bg-[#0B0F19]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white dark:border-[#F6BE2F]"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;

  if (profile && profile.role !== 'super_admin' && profile.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
