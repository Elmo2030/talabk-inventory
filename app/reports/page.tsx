'use client';

import { useState } from 'react';
import {
  FileText,
  Users,
  Activity,
  AlertOctagon,
  BarChart3,
  Printer,
  Download,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import InventoryReport from '@/components/reports/InventoryReport';
import ItemMovementReport from '@/components/reports/ItemMovementReport';
import LowStockReport from '@/components/reports/LowStockReport';
import RepsPerformanceReport from '@/components/reports/RepsPerformanceReport';
import CustomerAgingReport from '@/components/reports/CustomerAgingReport';

// Code-split the two heavy report tabs — they each pull in the full
// `recharts` bundle (~95 KB gz). Only loaded when the user actually
// opens that tab, so the initial /reports paint stays light.
const chartFallback = (
  <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-6 h-[400px] animate-pulse" />
);
const PurchasesSummaryReport = dynamic(
  () => import('@/components/reports/PurchasesSummaryReport'),
  { ssr: false, loading: () => chartFallback }
);
const AnalyticsReport = dynamic(
  () => import('@/components/reports/AnalyticsReport'),
  { ssr: false, loading: () => chartFallback }
);
import { useMovements, useOrders, usePurchases } from '@/lib/StockContext';
import { exportToCSV } from '@/lib/exportUtils';

type TabId = 'inventory' | 'purchases' | 'movement' | 'lowstock' | 'reps' | 'aging' | 'analytics';

const tabs: { id: TabId; label: string; icon: typeof FileText; color: string }[] = [
  { id: 'inventory', label: 'الجرد الفعلي', icon: FileText, color: 'brand' },
  { id: 'purchases', label: 'ملخص المشتريات', icon: Users, color: 'green' },
  { id: 'movement', label: 'كشف حركة صنف', icon: Activity, color: 'brand' },
  { id: 'lowstock', label: 'الأصناف النافذة', icon: AlertOctagon, color: 'red' },
  { id: 'reps',      label: 'أداء المندوبين', icon: Users, color: 'brand' },
  { id: 'aging',     label: 'أعمار الديون', icon: AlertOctagon, color: 'red' },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3, color: 'brand' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');
  const { currentStock } = useMovements();
  const { salesOrders } = useOrders();
  const { purchaseInvoices } = usePurchases();

  const handleExport = () => {
    if (activeTab === 'inventory') {
      exportToCSV(
        'الجرد-الفعلي',
        ['الكود', 'الصنف', 'التصنيف', 'الوحدة', 'رصيد الافتتاح', 'إجمالي الوارد', 'إجمالي الصادر', 'الرصيد الحالي', 'الحد الأدنى', 'قيمة المخزون', 'الحالة'],
        currentStock.map((s) => [
          s.itemCode, s.itemName, s.category, s.unit,
          s.openingQty, s.totalIn, s.totalOut, s.currentBalance,
          s.minStockLevel, s.stockValue.toFixed(2), s.status,
        ])
      );
    } else if (activeTab === 'purchases') {
      exportToCSV(
        'فواتير-الشراء',
        ['رقم الفاتورة', 'المورد', 'التاريخ', 'الإجمالي', 'الحالة', 'حالة الدفع'],
        purchaseInvoices.map((p) => [
          p.invoiceNumber, p.supplierName, p.invoiceDate,
          p.grandTotal.toFixed(2), p.status, p.paymentStatus,
        ])
      );
    } else if (activeTab === 'lowstock') {
      const lowItems = currentStock.filter(
        (s) => s.status === 'OUT_OF_STOCK' || s.status === 'NEEDS_REORDER' || s.status === 'LOW'
      );
      exportToCSV(
        'الأصناف-النافذة',
        ['الكود', 'الصنف', 'الرصيد الحالي', 'الحد الأدنى', 'مستوى إعادة الطلب', 'الحالة'],
        lowItems.map((s) => [s.itemCode, s.itemName, s.currentBalance, s.minStockLevel, s.reorderLevel, s.status])
      );
    } else if (activeTab === 'analytics') {
      exportToCSV(
        'تحليل-المبيعات',
        ['رقم الطلب', 'العميل', 'المدينة', 'إجمالي المنتجات', 'صافي الربح', 'هامش الربح%', 'الحالة', 'التاريخ'],
        salesOrders.map((o) => [
          o.orderNumber, o.customerName, o.customerCity,
          o.subtotalProducts.toFixed(2), o.netProfit.toFixed(2),
          o.profitMargin.toFixed(1) + '%', o.status,
          new Date(o.createdAt).toLocaleDateString('en-US'),
        ])
      );
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">التقارير والتحليلات</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تقارير تحليلية آلية لمتابعة أداء المخزون واتخاذ القرارات
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {['inventory', 'purchases', 'lowstock', 'analytics'].includes(activeTab) && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E5EA] text-[#6C6C70] text-sm font-medium hover:bg-[#F2F2F7] transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E5EA] text-[#6C6C70] text-sm font-medium hover:bg-[#F2F2F7] transition-colors"
          >
            <Printer className="w-4 h-4" />
            طباعة / PDF
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="relative mb-6">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex gap-1 min-w-max sm:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                    whitespace-nowrap transition-all
                    ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* Scroll hint gradients — mobile only */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-[#18181B] sm:hidden" />
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent dark:from-[#18181B] sm:hidden" />
      </div>

      {/* Active Report */}
      <div>
        {activeTab === 'inventory' && <InventoryReport />}
        {activeTab === 'purchases' && <PurchasesSummaryReport />}
        {activeTab === 'movement' && <ItemMovementReport />}
        {activeTab === 'lowstock' && <LowStockReport />}
        {activeTab === 'reps'      && <RepsPerformanceReport />}
        {activeTab === 'aging'     && <CustomerAgingReport />}
        {activeTab === 'analytics' && <AnalyticsReport />}
      </div>
    </div>
  );
}
