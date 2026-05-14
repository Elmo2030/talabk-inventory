'use client';

import { ReactNode } from 'react';
import { useStock } from '@/lib/StockContext';
import { Loader2, AlertCircle, RefreshCw, Database } from 'lucide-react';

export default function LoadingGate({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = useStock();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-600 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">جاري الاتصال بقاعدة البيانات...</h2>
          <p className="text-sm text-slate-500 mt-2">يتم تحميل البيانات من Supabase</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">فشل الاتصال بقاعدة البيانات</h2>
              <p className="text-xs text-slate-500">تحقق من إعدادات Supabase</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700 font-mono break-all">{error}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              خطوات التشخيص:
            </h3>
            <ol className="text-xs text-amber-800 space-y-1.5 list-decimal mr-4">
              <li>تأكد من وجود ملف .env.local في جذر المشروع</li>
              <li>تحقق من صحة NEXT_PUBLIC_SUPABASE_URL</li>
              <li>تحقق من صحة NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              <li>تأكد من تشغيل migration.sql في Supabase SQL Editor</li>
              <li>أعد تشغيل خادم التطوير بعد تعديل .env.local</li>
            </ol>
          </div>

          <button
            onClick={refresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
