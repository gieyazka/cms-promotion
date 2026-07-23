'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Settings, PlusCircle, BookOpen,
  PanelLeftClose, PanelLeftOpen, LogIn, LogOut, History,
} from 'lucide-react';
import { adminSessionStore, logout } from '@/lib/admin-auth';
import { useToast } from '@/components/ui/Toast';

const COLLAPSED_KEY = 'sidebar-collapsed';

/**
 * The collapsed preference lives in localStorage, which the server cannot see. Reading it
 * during render would make the server and client produce different trees, which React 19
 * treats as a hydration error. useSyncExternalStore renders the server snapshot (expanded)
 * through hydration and then swaps to the stored value.
 */
const collapsedStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    collapsedStore.listeners.add(listener);
    return () => {
      collapsedStore.listeners.delete(listener);
    };
  },
  getSnapshot() {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  },
  getServerSnapshot() {
    return false;
  },
  toggle() {
    const next = !collapsedStore.getSnapshot();
    window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    collapsedStore.listeners.forEach((listener) => listener());
  },
};

// Routes that render without the CMS chrome. The sidebar is where the app's navigation and
// the sign-in state live, so it makes no sense on the sign-in page itself — and it is the
// only client component in the shell that knows the pathname, so the decision belongs here
// rather than in the (server) root layout.
const CHROMELESS_ROUTES = ['/login'];

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/promotions/new', label: 'New Promotion', icon: PlusCircle, exact: true },
  { href: '/promotions', label: 'All Promotions', icon: FileText, exact: false },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, exact: false },
  { href: '/activity', label: 'Activity log', icon: History, exact: false },
];

export default function Sidebar() {
  const collapsed = useSyncExternalStore(
    collapsedStore.subscribe,
    collapsedStore.getSnapshot,
    collapsedStore.getServerSnapshot,
  );
  const session = useSyncExternalStore(
    adminSessionStore.subscribe,
    adminSessionStore.getSnapshot,
    adminSessionStore.getServerSnapshot,
  );
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  // After the hooks, never before — an early return above them would change the hook order.
  if (CHROMELESS_ROUTES.includes(pathname)) return null;

  // Clearing the session re-renders every subscriber (this sidebar, the login page), then we
  // leave the CMS for the sign-in page — staying put would look identical to being signed in,
  // since nothing else in the app is gated yet.
  const handleLogout = () => {
    logout();
    showToast('ออกจากระบบแล้ว', 'info');
    router.push('/login');
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <div
      className={`${collapsed ? 'w-16' : 'w-64'} flex-none bg-gray-900 text-white h-screen flex flex-col transition-[width] duration-200`}
    >
      <div className={`flex items-center h-16 border-b border-gray-800 ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!collapsed && <span className="text-lg font-bold truncate">CMS Promotion</span>}
        <button
          type="button"
          onClick={collapsedStore.toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <NavLink key={href} href={href} label={label} collapsed={collapsed} active={isActive(href, exact)}>
            <Icon size={20} />
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-800 space-y-1">
        <NavLink href="/settings" label="Settings" collapsed={collapsed} active={isActive('/settings', false)}>
          <Settings size={20} />
        </NavLink>
        {session ? (
          <button
            type="button"
            onClick={handleLogout}
            title={`ออกจากระบบ (${session.username})`}
            className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="flex-none"><LogOut size={20} /></span>
            {!collapsed && (
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-medium">ออกจากระบบ</span>
                <span className="block truncate text-xs text-gray-500">{session.username}</span>
              </span>
            )}
          </button>
        ) : (
          <NavLink href="/login" label="Login" collapsed={collapsed} active={isActive('/login', false)}>
            <LogIn size={20} />
          </NavLink>
        )}
      </div>
    </div>
  );
}

function NavLink({
  href, label, collapsed, active, children,
}: {
  href: string;
  label: string;
  collapsed: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // The title is the only affordance left once the label is hidden, so it stays on always.
      title={label}
      className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
        collapsed ? 'justify-center' : ''
      } ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
    >
      <span className="flex-none">{children}</span>
      {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
    </Link>
  );
}
