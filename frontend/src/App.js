import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeContextProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Import Pages
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import StockIntakePage from './pages/StockIntakePage';
import ExpensesPage from './pages/ExpensesPage';
import SalesPage from './pages/SalesPage'; // Unified Sales page with tabs
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import Login from './pages/Login';
import CarCatalog from './pages/CarCatalog';
import ActivityTimeline from './pages/Timeline';

const ProtectedLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

function App() {
  return (
    <ThemeContextProvider>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              element={
                <PrivateRoute>
                  <ProtectedLayout />
                </PrivateRoute>
              }
            >
              {/* All authenticated users can access these */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/stock-intake" element={<StockIntakePage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route
                path="/expenses"
                element={
                  <PrivateRoute requireFinancialAccess>
                    <ExpensesPage />
                  </PrivateRoute>
                }
              />

              {/* Legacy routes */}
              <Route path="/catalog" element={<CarCatalog />} />
              <Route path="/timeline" element={<ActivityTimeline />} />

              {/* Abbas-only routes (require financial access) */}
              <Route
                path="/reports"
                element={
                  <PrivateRoute requireFinancialAccess>
                    <Reports />
                  </PrivateRoute>
                }
              />

            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </ThemeContextProvider>
  );
}

export default App;

