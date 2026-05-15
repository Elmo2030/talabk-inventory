import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export const metadata = { title: 'غير مصرح — طلبك' };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
      <div className="text-center">
        <ShieldOff className="w-16 h-16 text-[#AEAEB2] mx-auto mb-5" />
        <h1 className="text-2xl font-bold text-[#1C1C1E] mb-2">403 — غير مصرح</h1>
        <p className="text-sm text-[#6C6C70] mb-6">
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-[#E5302A] text-white font-semibold text-sm hover:bg-[#C42B24] transition-colors"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
