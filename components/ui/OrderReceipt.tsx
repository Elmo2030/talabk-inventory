'use client';

import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { SalesOrder } from '@/lib/types';

interface OrderReceiptProps {
  order: SalesOrder;
  storeName?: string;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function OrderReceipt({ order, storeName: storeNameProp }: OrderReceiptProps) {
  const [resolvedStoreName, setResolvedStoreName] = useState(storeNameProp ?? '');
  const receiptRef = useRef<HTMLDivElement>(null);

  // Read storeName from localStorage if not passed as prop
  useEffect(() => {
    if (!storeNameProp) {
      try {
        const raw = localStorage.getItem('talabk_store_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.storeName) setResolvedStoreName(parsed.storeName);
        }
      } catch {
        // ignore
      }
    }
  }, [storeNameProp]);

  function handlePrint() {
    window.print();
  }

  const showVat = !!(order.vatAmount && order.vatAmount > 0);
  const showDiscount = !!(order.discountAmount && order.discountAmount > 0);
  const showCoupon = !!order.couponCode;

  return (
    <>
      {/* ── Trigger button — visible on screen only ─────────────────────── */}
      <button
        onClick={handlePrint}
        className="print:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg transition-colors"
        title="طباعة الفاتورة"
        aria-label="طباعة فاتورة الطلب"
      >
        <Printer className="w-3.5 h-3.5" />
        طباعة
      </button>

      {/* ── Receipt — hidden on screen, visible on print ─────────────────── */}
      <div
        ref={receiptRef}
        className="hidden print:block"
        style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          direction: 'rtl',
          width: '80mm',
          maxWidth: '80mm',
          margin: '0 auto',
          padding: '8px 10px',
          fontSize: '11px',
          color: '#000',
          backgroundColor: '#fff',
        }}
      >
        {/* Store name & title */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          {resolvedStoreName && (
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '2px' }}>
              {resolvedStoreName}
            </div>
          )}
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>فاتورة بيع</div>
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#333' }}>
            <span>رقم: {order.orderNumber}</span>
            <span style={{ margin: '0 6px' }}>|</span>
            <span>التاريخ: {formatDate(order.createdAt)}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

        {/* Customer info */}
        <div style={{ marginBottom: '6px', lineHeight: '1.7' }}>
          <div><strong>العميل:</strong> {order.customerName}</div>
          {order.customerPhone && (
            <div><strong>الهاتف:</strong> {order.customerPhone}</div>
          )}
          {order.customerCity && (
            <div><strong>المدينة:</strong> {order.customerCity}</div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'right', paddingBottom: '3px', fontWeight: 'bold', width: '40%' }}>الصنف</th>
              <th style={{ textAlign: 'center', paddingBottom: '3px', fontWeight: 'bold', width: '15%' }}>الكمية</th>
              <th style={{ textAlign: 'center', paddingBottom: '3px', fontWeight: 'bold', width: '20%' }}>السعر</th>
              <th style={{ textAlign: 'left', paddingBottom: '3px', fontWeight: 'bold', width: '25%' }}>المجموع</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px dotted #eee' }}>
                <td style={{ padding: '3px 0', verticalAlign: 'top' }}>
                  <div>{item.itemName}</div>
                  {item.variantLabel && (
                    <div style={{ fontSize: '9px', color: '#555' }}>{item.variantLabel}</div>
                  )}
                  {item.itemCode && (
                    <div style={{ fontSize: '9px', color: '#777' }}>{item.itemCode}</div>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '3px 0', verticalAlign: 'top' }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: 'center', padding: '3px 0', verticalAlign: 'top' }}>
                  {fmt(item.sellingPrice)}
                </td>
                <td style={{ textAlign: 'left', padding: '3px 0', verticalAlign: 'top' }}>
                  {fmt(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

        {/* Totals */}
        <table style={{ width: '100%', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2px 0' }}>المجموع:</td>
              <td style={{ textAlign: 'left', padding: '2px 0' }}>{fmt(order.subtotalProducts)} د.ل</td>
            </tr>
            {order.shippingCost > 0 && (
              <tr>
                <td style={{ padding: '2px 0' }}>الشحن:</td>
                <td style={{ textAlign: 'left', padding: '2px 0' }}>{fmt(order.shippingCost)} د.ل</td>
              </tr>
            )}
            {order.packagingCost > 0 && !order.packagingOnStore && (
              <tr>
                <td style={{ padding: '2px 0' }}>التغليف:</td>
                <td style={{ textAlign: 'left', padding: '2px 0' }}>{fmt(order.packagingCost)} د.ل</td>
              </tr>
            )}
            {showDiscount && (
              <tr>
                <td style={{ padding: '2px 0' }}>
                  الخصم:{showCoupon ? ` (${order.couponCode})` : ''}
                </td>
                <td style={{ textAlign: 'left', padding: '2px 0', color: '#c00' }}>
                  -{fmt(order.discountAmount!)} د.ل
                </td>
              </tr>
            )}
            {showVat && (
              <tr>
                <td style={{ padding: '2px 0' }}>
                  ضريبة VAT{order.vatRate ? ` (${order.vatRate}%)` : ''}:
                </td>
                <td style={{ textAlign: 'left', padding: '2px 0' }}>{fmt(order.vatAmount!)} د.ل</td>
              </tr>
            )}
            <tr style={{ borderTop: '1px solid #333', fontWeight: 'bold', fontSize: '13px' }}>
              <td style={{ paddingTop: '4px' }}>الإجمالي:</td>
              <td style={{ textAlign: 'left', paddingTop: '4px' }}>{fmt(order.customerTotal)} د.ل</td>
            </tr>
          </tbody>
        </table>

        {/* Payment status */}
        {order.customerPaymentStatus && (
          <>
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ fontSize: '10px', color: '#333' }}>
              <span>
                حالة الدفع:{' '}
                {order.customerPaymentStatus === 'paid'
                  ? 'مدفوع بالكامل'
                  : order.customerPaymentStatus === 'partial'
                  ? `مدفوع جزئياً (${fmt(order.customerPaidAmount ?? 0)} د.ل)`
                  : 'غير مدفوع'}
              </span>
            </div>
          </>
        )}

        {/* Notes */}
        {order.notes && (
          <>
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ fontSize: '10px', color: '#555' }}>
              <strong>ملاحظات:</strong> {order.notes}
            </div>
          </>
        )}

        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#333' }}>
          شكراً لتعاملكم معنا
        </div>
      </div>

      {/* Print-specific global styles injected via a style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible !important;
          }
          .print\\:block {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 80mm !important;
            margin: 0 auto !important;
          }
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
        }
      `}</style>
    </>
  );
}
