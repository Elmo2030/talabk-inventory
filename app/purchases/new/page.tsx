'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PurchaseInvoiceForm from '@/components/forms/PurchaseInvoiceForm';

export default function NewPurchasePage() {
  const router = useRouter();

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6C6C70]">
        <Link href="/purchases" className="hover:text-[#1C1C1E] transition-colors">
          فواتير المشتريات
        </Link>
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="text-[#1C1C1E] font-medium">فاتورة جديدة</span>
      </div>
      <PurchaseInvoiceForm
        onSuccess={() => router.push('/purchases')}
        onCancel={() => router.push('/purchases')}
      />
    </div>
  );
}
