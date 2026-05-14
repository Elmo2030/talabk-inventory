'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import SearchBar from '@/components/ui/SearchBar';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import { StockStatus } from '@/lib/types';

export default function CurrentStockPage() {
  const { currentStock } = useStock();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL');

  const filteredStock = useMemo(() => {
    let result = currentStock;

    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.itemCode.toLowerCase().includes(q) ||
          s.itemName.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [currentStock, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const outOfStock = currentStock.filter((s) => s.status === 'OUT_OF_STOCK').length;
    const needsReorder = currentStock.filter((s) => s.status === 'NEEDS_REORDER').length;
    const low = currentStock.filter((s) => s.status === 'LOW').length;
    const available = currentStock.filter((s) => s.status === 'AVAILABLE').length;
    const totalValue = currentStock.reduce((sum, s) => sum + s.stockValue, 0);
    return { outOfStock, needsReorder, low, available, totalValue };
  }, [currentStock]);

  // ========== Status helpers ==========
  const getStatusInfo = (status: StockStatus) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return {
          label: 'نافد',
          rowClass: 'bg-red-50 hover:bg-red-100',
          badgeVariant: 'danger' as const,
          icon: <XCircle className="w-4 h-4 text-red-600" />,
        };
      case 'NEEDS_REORDER':
        return {
          label: 'يحتاج إعادة طلب',
          rowClass: 'bg-yellow-50 hover:bg-yellow-100',
          badgeVariant: 'warning' as const,
          icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
        };
      case 'LOW':
        return {
          label: 'منخفض',
          rowClass: 'bg-orange-50/40 hover:bg-orange-50',
          badgeVariant: 'warning' as const,
          icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
        };
      case 'AVAILABLE':
        return {
          label: 'متوفر',
          rowClass: 'hover:bg-slate-50',
          badgeVariant: 'success' as const,
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
        };
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['كود الصنف', 'اسم الصنف', 'التصنيف', 'الافتتاحي', 'الوارد', 'الصادر', 'الرصيد الحالي', 'الحد الأدنى', 'الحالة', 'قيمة المخزون'];
    const rows = filteredStock.map((s) => [
      s.itemCode,
      s.itemName,
      s.category,
      s.openingQty,
      s.totalIn,
      s.totalOut,
      s.currentBalance,
      s.minStockLevel,
      getStatusInfo(s.status).label,
      s.stockValue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `current-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            الرصيد الحالي
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            حساب آلي للرصيد اللحظي لكل صنف — يتحدث فوراً مع كل حركة
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          تصدير CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">قيمة المخزون</p>
          <p className="text-xl font-bold text-brand-600 mt-1 font-mono">
            {stats.totalValue.toLocaleString()}
          </p>
        </div>
        <div
          className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => setStatusFilter(statusFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}
        >
          <p className="text-xs text-red-700 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            نافد
          </p>
          <p className="text-xl font-bold text-red-700 mt-1">{stats.outOfStock}</p>
        </div>
        <div
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
          onClick={() => setStatusFilter(statusFilter === 'NEEDS_REORDER' ? 'ALL' : 'NEEDS_REORDER')}
        >
          <p className="text-xs text-yellow-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            يحتاج طلب
          </p>
          <p className="text-xl font-bold text-yellow-800 mt-1">{stats.needsReorder}</p>
        </div>
        <div
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={() => setStatusFilter(statusFilter === 'LOW' ? 'ALL' : 'LOW')}
        >
          <p className="text-xs text-orange-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            منخفض
          </p>
          <p className="text-xl font-bold text-orange-800 mt-1">{stats.low}</p>
        </div>
        <div
          className="bg-green-50 border border-green-200 rounded-xl p-4 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
        >
          <p className="text-xs text-green-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            متوفر
          </p>
          <p className="text-xl font-bold text-green-800 mt-1">{stats.available}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بكود الصنف أو الاسم..."
        />
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'ALL')}
            options={[
              { value: 'ALL', label: 'كل الحالات' },
              { value: 'OUT_OF_STOCK', label: 'نافد' },
              { value: 'NEEDS_REORDER', label: 'يحتاج إعادة طلب' },
              { value: 'LOW', label: 'منخفض' },
              { value: 'AVAILABLE', label: 'متوفر' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">كود الصنف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">اسم الصنف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التصنيف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الافتتاحي</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الوارد</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الصادر</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الرصيد الحالي</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الحد الأدنى</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">حالة المخزون</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">قيمة المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                filteredStock.map((s) => {
                  const info = getStatusInfo(s.status);
                  return (
                    <tr key={s.itemId} className={`transition-colors ${info.rowClass}`}>
                      <td className="px-3 py-3 font-mono font-semibold text-slate-700">
                        {s.itemCode}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 max-w-[200px] truncate">
                        {s.itemName}
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs">{s.category}</td>
                      <td className="px-3 py-3 font-mono text-slate-600">{s.openingQty}</td>
                      <td className="px-3 py-3 font-mono text-green-600">+{s.totalIn}</td>
                      <td className="px-3 py-3 font-mono text-orange-600">-{s.totalOut}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`font-mono font-bold text-base ${
                            s.status === 'OUT_OF_STOCK'
                              ? 'text-red-700'
                              : s.status === 'NEEDS_REORDER'
                              ? 'text-yellow-700'
                              : s.status === 'LOW'
                              ? 'text-orange-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {s.currentBalance}
                        </span>
                        <span className="text-xs text-slate-500 mr-1">{s.unit}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-500">{s.minStockLevel}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {info.icon}
                          <Badge variant={info.badgeVariant}>{info.label}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-slate-900">
                        {s.stockValue.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
