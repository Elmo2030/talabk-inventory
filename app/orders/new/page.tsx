'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SalesOrderForm from '@/components/forms/SalesOrderForm';

export default function NewOrderPage() {
  const router = useRouter();
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-[#6C6C70]">
        <Link href="/orders" className="hover:text-[#1C1C1E]">الطلبات</Link>
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="text-[#1C1C1E] font-medium">طلب جديد</span>
      </div>
      <SalesOrderForm onSuccess={() => router.push('/orders')} onCancel={() => router.push('/orders')} />
    </div>
  );
}
