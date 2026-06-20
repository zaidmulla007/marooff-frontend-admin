import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/',           label: 'Dashboard',  end: true },
  { to: '/sales',      label: 'Sales' },
  { to: '/orders',     label: 'Orders' },
  { to: '/categories', label: 'Categories' },
  { to: '/products',   label: 'Products' },
  { to: '/combos',     label: 'Combo bundles' },
  { to: '/banners',    label: 'Banners' },
  { to: '/coupons',    label: 'Coupons' },
  { to: '/newsletter', label: 'Newsletter' },
  { to: '/enquiries',  label: 'Enquiries' },
  { to: '/settings',   label: 'Settings' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="flex min-h-full">
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-ink-100 print:!hidden">
        <div className="px-6 py-5 border-b border-ink-100">
          <div className="text-2xl font-bold text-brand-600">Maroof</div>
          <div className="text-xs text-ink-500 mt-0.5">Admin CMS</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                'block rounded-md px-3 py-2 text-sm font-medium ' +
                (isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-ink-100">
          <div className="text-sm font-medium text-ink-900">{user?.name || 'Admin'}</div>
          <div className="text-xs text-ink-500 truncate">{user?.email}</div>
          <button
            className="mt-2 text-xs text-brand-600 hover:underline"
            onClick={() => { logout(); nav('/login', { replace: true }); }}
          >Sign out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <header className="md:hidden bg-white border-b border-ink-100 px-4 py-3 flex items-center justify-between print:hidden">
          <div className="font-bold text-brand-600">Maroof Admin</div>
          <button className="text-xs text-brand-600" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
