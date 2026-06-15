'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Users,
  Phone,
  Mail,
  MapPin,
  Star,
  Package,
  ArrowDownToLine,
  DollarSign,
  Calendar,
  Hash,
} from 'lucide-react';
import { useSuppliers, useItems, useMovements } from '@/lib/StockContext';
import Badge from '@/components/ui/Badge';
import { formatNumber } from '@/lib/format';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { suppliers } = useSuppliers();
  const { items } = useItems();
  const { stockIn } = useMovements();

  const supplierId = params.id as string;
  const supplier = suppliers.find((s) => s.id === supplierId);

  const supplierItems = useMemo(
    () => items.filter((item) => item.supplierId === supplierId),
    [items, supplierId]
  );

  const supplierMovements = useMemo(
    () =>
      stockIn
        .filter((m) => m.supplierId === supplierId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [stockIn, supplierId]
  );

  const stats = useMemo(() => {
    const totalPurchases = supplierMovements.reduce((s, m) => s + m.totalCost, 0);
    const totalQty = supplierMovements.reduce((s, m) => s + m.quantity, 0);
    const lastDate = supplierMovements[0]?.date ?? null;
    return { totalPurchases, totalQty, lastDate, count: supplierMovements.length };
  }, [supplierMovements]);

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Users className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">المورد غير موجود</p>
        <Link href="/suppliers" className="text-brand-600 hover:underline text-sm">
          العودة لقائمة الموردين
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{supplier.name}</h1>
            <Badge variant={supplier.isActive ? 'success' : 'danger'}>
              {supplier.isActive ? 'نشط' : 'غير نشط'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-mono">{supplier.code}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            إجمالي المشتريات
          </p>
          <p className="text-xl font-bold text-brand-700 mt-1 font-mono">
            {formatNumber(stats.totalPurchases)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <ArrowDownToLine className="w-3 h-3" />
            إجمالي الكميات
          </p>
          <p className="text-xl font-bold text-green-700 mt-1 font-mono">{stats.totalQty}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            عدد الفواتير
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{stats.count}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            آخر توريد
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
            {stats.lastDate ?? 'لا يوجد'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Supplier Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            بيانات المورد
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">الكود</dt>
              <dd className="font-mono font-semibold text-slate-900">{supplier.code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">نوع المنتجات</dt>
              <dd>
                <Badge variant="info">{supplier.productType}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                الهاتف
              </dt>
              <dd className="font-mono text-slate-800 text-xs" dir="ltr">{supplier.phone}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                البريد
              </dt>
              <dd className="text-slate-800 text-xs" dir="ltr">{supplier.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">الشخص المسؤول</dt>
              <dd className="text-slate-800">{supplier.contactPerson}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                العنوان
              </dt>
              <dd className="text-slate-800 text-xs text-left max-w-[140px]">{supplier.address}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="text-slate-500">شروط الدفع</dt>
              <dd className="text-slate-800">
                {supplier.paymentTerms === 0 ? 'فوري' : `${supplier.paymentTerms} يوم`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">التقييم</dt>
              <dd>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < supplier.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        {/* Items Supplied */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-brand-50 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-brand-800">
              الأصناف الموردة ({supplierItems.length})
            </h3>
          </div>
          {supplierItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">لا توجد أصناف مرتبطة بهذا المورد</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الكود</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الصنف</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">التصنيف</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">سعر الشراء</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-600">{item.code}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      <Link href={`/items/${item.id}`} className="hover:text-brand-600 hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{item.category}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{item.purchasePrice.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={item.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {item.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* All Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-green-50 flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-800">
            جميع الفواتير ({supplierMovements.length})
          </h3>
        </div>
        {supplierMovements.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">لا توجد فواتير لهذا المورد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">رقم العملية</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">التاريخ</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">رقم الفاتورة</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">الصنف</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">الكمية</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">سعر الوحدة</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">الإجمالي</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-mono font-semibold text-green-700">{m.operationCode}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{m.date}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{m.invoiceNo}</td>
                    <td className="px-3 py-3 text-slate-900 font-medium max-w-[160px] truncate">
                      {m.itemName}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-green-600">{m.quantity}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{m.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-3 font-mono font-bold text-slate-900">
                      {formatNumber(m.totalCost)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{m.responsibleEmployee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
