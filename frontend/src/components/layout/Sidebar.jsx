"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  FileText,
  ShoppingCart,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import useDraftStore from "../../store/draftStore.js";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalog", label: "Catalog", icon: Search },
  { href: "/purchase-orders", label: "Purchase Orders", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const items = useDraftStore((s) => s.items);
  const poId = useDraftStore((s) => s.poId);
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5 lg:p-6 border-b border-steel-800 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold tracking-tight">Refinery PO</div>
          <div className="text-xs text-steel-400 mt-0.5">
            Procurement System
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1 text-steel-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-steel-400 hover:bg-steel-800 hover:text-white"
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
              <div className="text-sm font-semibold text-brand-300">
                Active Draft
              </div>
              <div className="text-xs text-steel-400 truncate">
                {items.length} item{items.length !== 1 ? "s" : ""} in cart
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
    </>
  );

  return (
    <>
      {/* Mobile top bar — hamburger button */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-steel-950 text-white flex items-center px-4 gap-3 z-50 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg hover:bg-steel-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="text-sm font-bold tracking-tight">Refinery PO</div>
        {poId && (
          <Link href="/purchase-orders/new" className="ml-auto">
            <div className="relative">
              <ShoppingCart size={20} className="text-brand-400" />
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-steel-950 text-white flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
