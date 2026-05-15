'use client';

import { useState } from 'react';
import {
  FileText,
  Users,
  Activity,
  AlertOctagon,
  BarChart3,
  Printer,
} from 'lucide-react';
import InventoryReport from '@/components/reports/InventoryReport';
import PurchasesSummaryReport from '@/components/reports/PurchasesSummaryReport';
import ItemMovementReport from '@/components/reports/ItemMovementReport';
import LowStockReport from '@/components/reports/LowStockReport';
import AnalyticsReport from '@/components/reports/AnalyticsReport';

type TabId = 'inventory' | 'purchases' | 'movement' | 'lowstock' | 'analytics';

const tabs: { id: TabId; label: string; icon: typeof FileText; color: string }[] = [
  { id: 'inventory', label: 'الجرد الفعلي', icon: FileText, color: 'brand' },
  { id: 'purchases', label: 'ملخص المشتريات', icon: Users, color: 'green' },
  { id: 'movement', label: 'كشف حركة صنف', icon: Activity, color: 'brand' },
  { id: 'lowstock', label: 'الأصناف النافذة', icon: AlertOctagon, color: 'red' },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3, color: 'brand' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');

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
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E5EA] text-[#6C6C70] text-sm font-medium hover:bg-[#F2F2F7] transition-colors print:hidden"
        >
          <Printer className="w-4 h-4" />
          طباعة / PDF
        </button>
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
        {activeTab === 'analytics' && <AnalyticsReport />}
      </div>
    </div>
  );
}
