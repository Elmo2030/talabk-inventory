'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Package, AlertTriangle, ExternalLink, Download, Upload } from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { Item } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Badge from '@/components/ui/Badge';
import ItemForm from '@/components/forms/ItemForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { usePermissions } from '@/lib/usePermissions';
import { AnimatedList, AnimatedRow } from '@/components/ui/AnimatedList';

const PAGE_SIZE = 15;

export default function ItemsPage() {
  const { items, suppliers, currentStock, addItem, updateItem, deleteItem } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { can } = usePermissions();
  const canSeePurchasePrices = can('purchase_prices:read');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditingItem(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getBalance = (itemId: string) =>
    currentStock.find((s) => s.itemId === itemId)?.currentBalance ?? 0;

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Item, 'id' | 'supplierName'>) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, data);
        toast.success('تم تعديل الصنف بنجاح');
      } else {
        await addItem(data);
        toast.success('تم إضافة الصنف بنجاح');
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  // ── CSV export / import ───────────────────────────────────────────────────
  const exportItemsCsv = () => {
    if (items.length === 0) return;
    const headers = ['code', 'name', 'category', 'unit', 'purchase_price', 'selling_price', 'opening_qty', 'min_stock_level', 'reorder_level', 'location'];
    const rows = items.map(i => [
      i.code, i.name, i.category, i.unit ?? '',
      i.purchasePrice ?? 0, i.sellingPrice ?? 0, i.openingQty ?? 0,
      i.minStockLevel ?? 0, i.reorderLevel ?? 0, i.location ?? '',
    ]);
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
    // UTF-8 BOM for Excel to render Arabic correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `items-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${items.length} صنف`);
  };

  const onImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-selecting same file works
    if (!file) return;
    const text = await file.text();
    // Strip BOM, split on LF/CRLF
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      toast.error('الملف فارغ أو لا يحتوي بيانات');
      return;
    }
    // very small CSV parser — handles "..."-quoted cells with commas
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') inQuote = false;
          else cur += ch;
        } else {
          if (ch === ',') { out.push(cur); cur = ''; }
          else if (ch === '"') inQuote = true;
          else cur += ch;
        }
      }
      out.push(cur);
      return out;
    };
    const headers = parseLine(lines[0]).map(h => h.trim());
    const required = ['code', 'name', 'category'];
    if (!required.every(r => headers.includes(r))) {
      toast.error(`الأعمدة المطلوبة: ${required.join(', ')}`);
      return;
    }
    // CSV import is the slowest operation in the app — N row inserts run
    // serially (each goes through optimistic addItem with rollback). For
    // a 500-row file this can take 30+ seconds. Wrap in toast.promise so
    // the user sees "جاري استيراد X صف..." while it runs.
    const importJob = async (): Promise<{ success: number; failed: number }> => {
      let success = 0, failed = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = parseLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim(); });
        if (!row.code || !row.name || !row.category) { failed++; continue; }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (addItem as any)({
            code:           row.code,
            name:           row.name,
            category:       row.category,
            unit:           row.unit || 'قطعة',
            supplierId:     row.supplier_id || '',
            purchasePrice:  Number(row.purchase_price)  || 0,
            sellingPrice:   Number(row.selling_price)   || 0,
            openingQty:     Number(row.opening_qty)     || 0,
            minStockLevel:  Number(row.min_stock_level) || 0,
            reorderLevel:   Number(row.reorder_level)   || 0,
            location:       row.location  || '',
            status:         'ACTIVE',
          });
          success++;
        } catch {
          failed++;
        }
      }
      return { success, failed };
    };
    try {
      await toast.promise(importJob(), {
        loading: `جاري استيراد ${lines.length - 1} صف...`,
        success: ({ success, failed }) =>
          failed > 0 ? `نجح ${success}، فشل ${failed} صف` : `تم استيراد ${success} صنف`,
        error:   (e) => `فشل الاستيراد: ${e.message}`,
      });
    } catch {
      // toast already surfaced the error
    }
  };

  // ── Bulk selection helpers ───────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (paginatedItems.every(i => selectedIds.has(i.id))) {
      // Currently all selected on this page — deselect them
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      // Select all on this page
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title:        `حذف ${selectedIds.size} صنف؟`,
      description:  `سيتم حذف ${selectedIds.size} صنف وكل بياناتهم. لا يمكن التراجع.`,
      confirmLabel: 'حذف الكل',
      cancelLabel:  'إلغاء',
      variant:      'danger',
    });
    if (!ok) return;
    let success = 0, failed = 0;
    for (const id of selectedIds) {
      try { await deleteItem(id); success++; } catch { failed++; }
    }
    clearSelection();
    if (failed > 0) toast.error(`نجح ${success}، فشل ${failed}`);
    else toast.success(`تم حذف ${success} صنف`);
  };

  const handleDelete = async (item: Item) => {
    const confirmed = await confirm({
      title: 'حذف الصنف',
      description: `هل أنت متأكد من حذف "${item.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`,
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteItem(item.id);
      toast.success('تم حذف الصنف بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            الأصناف
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">السجل الرئيسي لجميع أصناف المخزون</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportItemsCsv}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-slate-700 dark:text-[#E4E4E7] hover:bg-slate-50 dark:hover:bg-[#27272A]/40 disabled:opacity-40 disabled:cursor-not-allowed"
            title="تنزيل الأصناف كملف CSV"
          >
            <Download className="w-4 h-4" /> تصدير CSV
          </button>
          <label
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-slate-700 dark:text-[#E4E4E7] hover:bg-slate-50 dark:hover:bg-[#27272A]/40 cursor-pointer"
            title="استيراد أصناف من ملف CSV"
          >
            <Upload className="w-4 h-4" /> استيراد CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onImportCsv}
            />
          </label>
          <Button
            onClick={openAddModal}
            icon={<Plus className="w-4 h-4" />}
            aria-label="إضافة صنف جديد"
          >
            إضافة صنف جديد
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بالاسم أو الكود أو التصنيف..."
          aria-label="بحث في الأصناف"
        />
        <div className="text-sm text-slate-500 dark:text-[#71717A]">
          إجمالي: <span className="font-bold text-slate-900 dark:text-[#F4F4F5]">{filteredItems.length}</span>
        </div>
      </div>

      {/* Bulk-action bar — appears only when there's a selection */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-[#E5302A]/5 border border-[#E5302A]/20">
          <p className="text-sm font-semibold text-[#E5302A]">
            تم اختيار {selectedIds.size} صنف
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-50 dark:hover:bg-[#27272A]/40"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف المحدد
            </button>
          </div>
        </div>
      )}

      <div
        className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden card-hover"
        role="region"
        aria-label="قائمة الأصناف"
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="لا توجد أصناف"
            description="ابدأ بإضافة الأصناف إلى المخزون"
            action={
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + إضافة صنف
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile cards — sm and below */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-[#27272A]/50">
             <AnimatedList>
              {paginatedItems.map((item) => {
                const balance = getBalance(item.id);
                const isBelowMin = balance <= item.minStockLevel;
                const isSuspended = item.status === 'SUSPENDED';
                return (
                  <AnimatedRow
                    key={item.id}
                    rowKey={item.id}
                    as="div"
                    className={`bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-4 space-y-2 m-3 ${isSuspended ? 'bg-red-50/60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 dark:text-[#52525B] font-mono">{item.code}</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F4F4F5] truncate">{item.name}</p>
                      </div>
                      {item.status === 'ACTIVE' ? (
                        <Badge variant="success">نشط</Badge>
                      ) : (
                        <Badge variant="danger">موقوف</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA] text-xs font-medium">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-[#52525B]">الرصيد</p>
                        <p className={`text-2xl font-bold ${isBelowMin ? 'text-amber-600' : 'text-slate-900 dark:text-[#F4F4F5]'}`}>
                          {balance}
                          {isBelowMin && <AlertTriangle className="inline w-4 h-4 text-amber-500 mr-1 mb-0.5" />}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-400 dark:text-[#52525B]">سعر البيع</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-[#E4E4E7]">{item.sellingPrice.toFixed(2)} د.ل</p>
                        {canSeePurchasePrices && (
                          <p className="text-xs text-slate-400 dark:text-[#52525B] mt-0.5">
                            شراء: {item.purchasePrice.toFixed(2)} د.ل
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-[#27272A]/50">
                      <Link
                        href={`/items/${item.id}`}
                        className="p-1.5 text-slate-500 dark:text-[#71717A] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </AnimatedRow>
                );
              })}
             </AnimatedList>
            </div>

            {/* Desktop table — md and above */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                  <tr>
                    <th className="px-3 py-3 text-right w-10">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
                        aria-label="تحديد الكل"
                      />
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الكود</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">اسم الصنف</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">التصنيف</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المورد</th>
                    {canSeePurchasePrices && (
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">سعر الشراء</th>
                    )}
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">سعر البيع</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الرصيد الحالي</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحد الأدنى</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                  {paginatedItems.map((item) => {
                    const balance = getBalance(item.id);
                    const isBelowMin = balance <= item.minStockLevel;
                    const isSuspended = item.status === 'SUSPENDED';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          selectedIds.has(item.id) ? 'bg-[#E5302A]/5' :
                          isSuspended ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50 dark:hover:bg-[#27272A]/40'
                        }`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
                            aria-label={`تحديد ${item.name}`}
                          />
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">{item.code}</td>
                        <td className="px-3 py-3 font-medium text-slate-900 dark:text-[#F4F4F5]">{item.name}</td>
                        <td className="px-3 py-3 text-slate-600 dark:text-[#A1A1AA]">{item.category}</td>
                        <td className="px-3 py-3 text-slate-600 dark:text-[#A1A1AA] text-xs">{item.supplierName}</td>
                        {canSeePurchasePrices && (
                          <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">
                            {item.purchasePrice.toFixed(2)}
                          </td>
                        )}
                        <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">
                          {item.sellingPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold">
                          <span className={isBelowMin ? 'text-amber-600' : 'text-slate-900 dark:text-[#F4F4F5]'}>
                            {balance}
                          </span>
                          {isBelowMin && (
                            <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 mr-1" />
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-500 dark:text-[#71717A]">{item.minStockLevel}</td>
                        <td className="px-3 py-3">
                          {item.status === 'ACTIVE' ? (
                            <Badge variant="success">نشط</Badge>
                          ) : (
                            <Badge variant="danger">موقوف</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/items/${item.id}`}
                              className="p-1.5 text-slate-500 dark:text-[#71717A] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-lg transition-colors"
                              title="عرض التفاصيل"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={filteredItems.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? `تعديل الصنف — ${editingItem.code}` : 'إضافة صنف جديد'}
        size="lg"
      >
        <ItemForm
          initialData={editingItem ?? undefined}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
