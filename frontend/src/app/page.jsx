"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { procurementApi } from "../lib/api.js";
import {
  FileText,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ChevronRight,
} from "lucide-react";

const statusConfig = {
  DRAFT: { icon: FileText, color: "text-steel-500", bg: "bg-steel-100" },
  SUBMITTED: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  APPROVED: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  REJECTED: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  FULFILLED: { icon: Package, color: "text-brand-600", bg: "bg-brand-50" },
};

export default function DashboardPage() {
  const { data: posData } = useQuery({
    queryKey: ["pos-dashboard"],
    queryFn: () => procurementApi.listPOs({ limit: 100 }),
  });

  const pos = posData?.purchaseOrders || [];

  const counts = {};
  for (const s of Object.keys(statusConfig)) counts[s] = 0;
  for (const po of pos) counts[po.status] = (counts[po.status] || 0) + 1;

  const recentPOs = pos.slice(0, 5);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <p className="text-steel-500 mt-1 text-sm sm:text-base">
          Overview of your procurement activity
        </p>
      </div>

      {/* Status cards — responsive: 2 cols on mobile, scrollable row or 5 cols on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {Object.entries(statusConfig).map(
          ([status, { icon: Icon, color, bg }]) => (
            <div key={status} className={`card p-4 sm:p-5 ${bg}`}>
              <div className="flex items-center justify-between">
                <Icon size={18} className={color} />
                <span className="text-xl sm:text-2xl font-bold">
                  {counts[status]}
                </span>
              </div>
              <div
                className={`text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 ${color}`}
              >
                {status}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link
          href="/catalog"
          className="card p-4 sm:p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <Search size={20} className="text-brand-600 sm:hidden" />
              <Search size={24} className="text-brand-600 hidden sm:block" />
            </div>
            <div>
              <div className="font-semibold text-sm sm:text-base group-hover:text-brand-600 transition-colors">
                Browse Catalog
              </div>
              <div className="text-xs sm:text-sm text-steel-500">
                Search equipment and add to order
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/purchase-orders/new"
          className="card p-4 sm:p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <ShoppingCart size={20} className="text-emerald-600 sm:hidden" />
              <ShoppingCart
                size={24}
                className="text-emerald-600 hidden sm:block"
              />
            </div>
            <div>
              <div className="font-semibold text-sm sm:text-base group-hover:text-emerald-600 transition-colors">
                Create PO
              </div>
              <div className="text-xs sm:text-sm text-steel-500">
                Start a new purchase order
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent POs */}
      <div className="card">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-steel-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm sm:text-base">
            Recent Purchase Orders
          </h2>
          <Link
            href="/purchase-orders"
            className="text-xs sm:text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            View all
          </Link>
        </div>
        {recentPOs.length === 0 ? (
          <div className="p-8 text-center text-steel-400 text-sm">
            No purchase orders yet
          </div>
        ) : (
          <div className="divide-y divide-steel-100">
            {recentPOs.map((po) => (
              <Link
                key={po.id}
                href={`/purchase-orders/${po.id}`}
                className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-steel-50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span
                    className={`badge status-${po.status} text-[10px] sm:text-xs shrink-0`}
                  >
                    {po.status}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {po.po_number || "Draft"}
                    </div>
                    <div className="text-xs text-steel-400 truncate">
                      {po.supplier_name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-semibold">
                    ${parseFloat(po.total_amount).toLocaleString()}
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-steel-300 hidden sm:block"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
