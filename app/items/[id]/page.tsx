'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Printer,
  Tag,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useItems, useMovements } from '@/lib/StockContext';
import Badge from '@/components/ui/Badge';
import { formatNumber } from '@/lib/format';

function MiniBarChart({
  data,
  color,
  label,
}: {
  data: { date: string; value: number }[];
  color: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className="flex items-end gap-px h-16">
        {data.map((d, i) => {
          const height = Math.round((d.value / max) * 100);
          return (
            <div
              key={i}
              className="flex-1 group relative"
              style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
            >
              <div
                className={`w-full rounded-sm transition-opacity ${color} ${d.value === 0 ? 'opacity-10' : 'opacity-80 group-hover:opacity-100'}`}
                style={{ height: `${Math.max(height, d.value > 0 ? 4 : 0)}%` }}
                title={`${d.date}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400">{data[0]?.date?.slice(5)}</span>
        <span className="text-[10px] text-slate-400">{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { items } = useItems();
  const { currentStock, stockIn, stockOut } = useMovements();

  const itemId = params.id as string;
  const item = items.find((i) => i.id === itemId);
  const stock = currentStock.find((s) => s.itemId === itemId);

  const itemMovementsIn = useMemo(
    () => stockIn.filter((m) => m.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date)),
    [stockIn, itemId]
  );

  const itemMovementsOut = useMemo(
    () => stockOut.filter((m) => m.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date)),
    [stockOut, itemId]
  );

  const last30Days = useMemo(() => {
    const days: { date: string; in: number; out: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const inQty = itemMovementsIn.filter((m) => m.date === dateStr).reduce((s, m) => s + m.quantity, 0);
      const outQty = itemMovementsOut.filter((m) => m.date === dateStr).reduce((s, m) => s + m.quantity, 0);
      days.push({ date: dateStr, in: inQty, out: outQty });
    }
    return days;
  }, [itemMovementsIn, itemMovementsOut]);

  const handlePrint = () => window.print();

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Package className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">الصنف غير موجود</p>
        <Link href="/items" className="text-brand-600 hover:underline text-sm">
          العودة لقائمة الأصناف
        </Link>
      </div>
    );
  }

  const statusVariant =
    stock?.status === 'OUT_OF_STOCK'
      ? 'danger'
      : stock?.status === 'NEEDS_REORDER' || stock?.status === 'LOW'
      ? 'warning'
      : 'success';

  const statusLabel =
    stock?.status === 'OUT_OF_STOCK'
      ? 'نافد'
      : stock?.status === 'NEEDS_REORDER'
      ? 'يحتاج إعادة طلب'
      : stock?.status === 'LOW'
      ? 'منخفض'
      : 'متوفر';

  return (
    <div className="print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{item.name}</h1>
              <Badge variant={item.status === 'ACTIVE' ? 'success' : 'danger'}>
                {item.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 font-mono">{item.code}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          طباعة البطاقة
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <p className="text-sm text-slate-600 font-mono">{item.code}</p>
      </div>

      {/* Stock Alert */}
      {stock && (stock.status === 'OUT_OF_STOCK' || stock.status === 'NEEDS_REORDER') && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl mb-6 print:hidden ${
            stock.status === 'OUT_OF_STOCK'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
          }`}
        >
          {stock.status === 'OUT_OF_STOCK' ? (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium text-sm">
            {stock.status === 'OUT_OF_STOCK'
              ? 'الرصيد نافد — يرجى إصدار أمر شراء عاجل'
              : `الرصيد منخفض (${stock.currentBalance}) — يقترب من الحد الأدنى (${stock.minStockLevel})`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Item Details */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            بيانات الصنف
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">الكود</dt>
              <dd className="font-mono font-semibold text-slate-900">{item.code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                التصنيف
              </dt>
              <dd className="text-slate-800">{item.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">وحدة القياس</dt>
              <dd className="text-slate-800">{item.unit}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                موقع التخزين
              </dt>
              <dd className="text-slate-800">{item.location}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">المورد</dt>
              <dd className="text-slate-800 text-left">{item.supplierName || '—'}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                سعر الشراء
              </dt>
              <dd className="font-mono font-semibold text-slate-900">{item.purchasePrice.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                سعر البيع
              </dt>
              <dd className="font-mono font-semibold text-green-700">{item.sellingPrice.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">هامش الربح</dt>
              <dd className="font-mono text-slate-700">
                {item.purchasePrice > 0
                  ? `${(((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(1)}%`
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Stock Metrics */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">الرصيد الحالي</p>
              <p
                className={`text-2xl font-bold mt-1 font-mono ${
                  stock?.status === 'OUT_OF_STOCK'
                    ? 'text-red-600'
                    : stock?.status === 'NEEDS_REORDER' || stock?.status === 'LOW'
                    ? 'text-amber-600'
                    : 'text-slate-900'
                }`}
              >
                {stock?.currentBalance ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">{item.unit}</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <p className="text-xs text-green-700">إجمالي الوارد</p>
              <p className="text-2xl font-bold text-green-700 mt-1 font-mono">
                +{stock?.totalIn ?? 0}
              </p>
              <p className="text-xs text-green-600 mt-1">{itemMovementsIn.length} حركة</p>
            </div>
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
              <p className="text-xs text-orange-700">إجمالي الصادر</p>
              <p className="text-2xl font-bold text-orange-700 mt-1 font-mono">
                -{stock?.totalOut ?? 0}
              </p>
              <p className="text-xs text-orange-600 mt-1">{itemMovementsOut.length} حركة</p>
            </div>
            <div className="bg-brand-50 rounded-xl border border-brand-200 p-4">
              <p className="text-xs text-brand-700">قيمة المخزون</p>
              <p className="text-xl font-bold text-brand-700 mt-1 font-mono">
                {formatNumber((stock?.stockValue ?? 0))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">الحد الأدنى / مستوى إعادة الطلب</p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {item.minStockLevel}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-lg font-bold text-amber-600 font-mono">
                  {item.reorderLevel}
                </span>
              </div>
              <div className="mt-2">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">الافتتاحي</p>
              <p className="text-lg font-bold text-slate-900 font-mono">{item.openingQty}</p>
              <p className="text-xs text-slate-400 mt-1">
                {item.status === 'ACTIVE' ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" /> نشط في التداول
                  </span>
                ) : (
                  <span className="text-red-600">موقوف عن التداول</span>
                )}
              </p>
            </div>
          </div>

          {/* 30-Day Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              حركة الصنف — آخر 30 يوماً
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <MiniBarChart
                data={last30Days.map((d) => ({ date: d.date, value: d.in }))}
                color="bg-green-400"
                label="الوارد اليومي"
              />
              <MiniBarChart
                data={last30Days.map((d) => ({ date: d.date, value: d.out }))}
                color="bg-orange-400"
                label="الصادر اليومي"
              />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                وارد 30 يوم:{' '}
                <strong className="text-green-700 mr-1">
                  {last30Days.reduce((s, d) => s + d.in, 0)}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-orange-500" />
                صادر 30 يوم:{' '}
                <strong className="text-orange-700 mr-1">
                  {last30Days.reduce((s, d) => s + d.out, 0)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Movements Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last 10 Stock-In */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-green-50 flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-green-800">آخر 10 حركات وارد</h3>
          </div>
          {itemMovementsIn.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">لا توجد حركات وارد</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">التاريخ</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">رقم الفاتورة</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الكمية</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">سعر الوحدة</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemMovementsIn.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-600">{m.date}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{m.invoiceNo}</td>
                    <td className="px-3 py-2 font-mono font-bold text-green-600">+{m.quantity}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{m.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-600">{m.responsibleEmployee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Last 10 Stock-Out */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-orange-50 flex items-center gap-2">
            <ArrowUpFromLine className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-orange-800">آخر 10 حركات صادر</h3>
          </div>
          {itemMovementsOut.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">لا توجد حركات صادر</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">التاريخ</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الجهة المستفيدة</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الكمية</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">السبب</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemMovementsOut.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-600">{m.date}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate">{m.recipientDept}</td>
                    <td className="px-3 py-2 font-mono font-bold text-orange-600">-{m.quantity}</td>
                    <td className="px-3 py-2 text-slate-600">{m.reason}</td>
                    <td className="px-3 py-2 text-slate-600">{m.responsibleEmployee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
