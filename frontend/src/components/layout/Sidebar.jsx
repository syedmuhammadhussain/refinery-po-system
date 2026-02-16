'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, FileText, ShoppingCart, LayoutDashboard } from 'lucide-react';
import useDraftStore from '../../store/draftStore.js';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/catalog', label: 'Catalog', icon: Search },
  { href: '/purchase-orders', label: 'Purchase Orders', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const items = useDraftStore((s) => s.items);
  const poId = useDraftStore((s) => s.poId);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-steel-950 text-white flex flex-col z-40">
      {/* Brand */}
      <div className="p-6 border-b border-steel-800">
        <div className="text-lg font-bold tracking-tight">Refinery PO</div>
        <div className="text-xs text-steel-400 mt-0.5">Procurement System</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-steel-400 hover:bg-steel-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Active draft indicator */}
      {poId && (
        <div className="p-4 border-t border-steel-800">
          <Link
            href="/purchase-orders/new"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-600/20 border border-brand-500/30 hover:bg-brand-600/30 transition-colors"
          >
            <ShoppingCart size={18} className="text-brand-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-brand-300">Active Draft</div>
              <div className="text-xs text-steel-400 truncate">
                {items.length} item{items.length !== 1 ? 's' : ''} in cart
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* User */}
      <div className="p-4 border-t border-steel-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">
          B
        </div>
        <div>
          <div className="text-sm font-medium">Buyer</div>
          <div className="text-xs text-steel-400">Procurement Dept.</div>
        </div>
      </div>
    </aside>
  );
}
