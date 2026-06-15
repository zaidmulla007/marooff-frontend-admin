import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import AppShell from './layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryEditPage from './pages/CategoryEditPage';
import ProductsPage from './pages/ProductsPage';
import ProductEditPage from './pages/ProductEditPage';
import CombosPage from './pages/CombosPage';
import ComboEditPage from './pages/ComboEditPage';
import BannersPage from './pages/BannersPage';
import EnquiriesPage from './pages/EnquiriesPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import SalesPage from './pages/SalesPage';
import CouponsPage from './pages/CouponsPage';
import NewsletterPage from './pages/NewsletterPage';
import SettingsPage from './pages/SettingsPage';

function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-8 text-ink-500">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categories/new" element={<CategoryEditPage />} />
            <Route path="categories/:id" element={<CategoryEditPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductEditPage />} />
            <Route path="products/:id" element={<ProductEditPage />} />
            <Route path="combos" element={<CombosPage />} />
            <Route path="combos/new" element={<ComboEditPage />} />
            <Route path="combos/:id" element={<ComboEditPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="newsletter" element={<NewsletterPage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
