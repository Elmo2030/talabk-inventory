'use client';

import { useState, useEffect, useRef } from 'react';
import { settingsService, SettingKey, SystemSettings } from '@/lib/settingsService';
import { useTenant } from '@/lib/TenantContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  Settings,
  Users,
  Building2,
  AlertCircle,
  Tag,
  MapPin,
  Ruler,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';

// ============================================
// صفحة إعدادات النظام
// ============================================

type TabId = SettingKey;

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'employees',
    label: 'الموظفون',
    icon: <Users className="w-4 h-4" />,
    description: 'قائمة الموظفين المسؤولين عن حركات المخزون',
  },
  {
    id: 'departments',
    label: 'الأقسام',
    icon: <Building2 className="w-4 h-4" />,
    description: 'الأقسام والجهات المستلِمة في حركات الصادر',
  },
  {
    id: 'issueReasons',
    label: 'أسباب الصرف',
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'أسباب صرف الأصناف من المخزون',
  },
  {
    id: 'categories',
    label: 'التصنيفات',
    icon: <Tag className="w-4 h-4" />,
    description: 'تصنيفات الأصناف في النظام',
  },
  {
    id: 'storageLocations',
    label: 'مواقع التخزين',
    icon: <MapPin className="w-4 h-4" />,
    description: 'مستودعات ومواقع تخزين الأصناف',
  },
  {
    id: 'measurementUnits',
    label: 'وحدات القياس',
    icon: <Ruler className="w-4 h-4" />,
    description: 'وحدات قياس الأصناف',
  },
];

// مكون إدارة قائمة واحدة
function ListEditor({
  listKey,
  items,
  onSave,
  isSaving,
}: {
  listKey: TabId;
  items: string[];
  onSave: (key: TabId, items: string[]) => Promise<void>;
  isSaving: boolean;
}) {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [newItem, setNewItem] = useState('');
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (localItems.includes(trimmed)) {
      toast.warning('هذا العنصر موجود بالفعل في القائمة');
      return;
    }
    setLocalItems((prev) => [...prev, trimmed]);
    setNewItem('');
    inputRef.current?.focus();
  };

  const removeItem = (index: number) => {
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSave(listKey, localItems);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges = JSON.stringify(localItems) !== JSON.stringify(items);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="أضف عنصراً جديداً..."
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 text-right"
        />
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={addItem}
        >
          إضافة
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {localItems.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            لا توجد عناصر في القائمة
          </div>
        ) : (
          localItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">{item}</span>
              <button
                onClick={() => removeItem(index)}
                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{localItems.length} عنصر</span>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الحفظ
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('employees');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingFromCloud, setLoadingFromCloud] = useState(false);
  const [syncedWithCloud, setSyncedWithCloud] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { confirm } = useConfirm();
  const { tenantId } = useTenant();
  const supabase = getSupabaseClient();

  // Load: show from cache immediately, then fetch from Supabase
  useEffect(() => {
    // Instant render from localStorage
    setSettings(settingsService.getAll());

    // Then load authoritative copy from Supabase (if we have a tenant)
    if (!tenantId) return;

    setLoadingFromCloud(true);
    settingsService.load(supabase, tenantId)
      .then((fresh) => {
        setSettings(fresh);
        setSyncedWithCloud(true);
      })
      .catch(() => {
        // Cloud unreachable — localStorage cache is still shown
        setSyncedWithCloud(false);
      })
      .finally(() => setLoadingFromCloud(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleSaveList = async (key: TabId, items: string[]) => {
    if (!tenantId) {
      // No tenant — fall back to localStorage-only save (dev / super_admin)
      const current = settingsService.getAll();
      const updated = { ...current, [key]: items };
      localStorage.setItem('inventory_system_settings', JSON.stringify(updated));
      setSettings({ ...updated });
      toast.success('تم الحفظ محلياً');
      return;
    }
    setSavingList(true);
    try {
      const ok = await settingsService.saveList(supabase, tenantId, key, items);
      setSettings(settingsService.getAll());
      if (ok) {
        toast.success('تم الحفظ والمزامنة مع السحابة ☁️');
      } else {
        toast.warning('تم الحفظ محلياً — لم نتمكن من المزامنة مع السحابة');
      }
    } finally {
      setSavingList(false);
    }
  };

  const handleExport = () => {
    const json = settingsService.exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      if (!tenantId) {
        toast.error('لا يمكن الاستيراد بدون tenant');
        return;
      }
      const result = await settingsService.importSettings(supabase, tenantId, content);
      if (result.success) {
        setSettings(settingsService.getAll());
        toast.success('تم استيراد الإعدادات وحفظها في السحابة');
      } else {
        toast.error(`فشل الاستيراد: ${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'إعادة تعيين الإعدادات',
      description: 'هل أنت متأكد من إعادة تعيين جميع القوائم إلى الإعدادات الافتراضية؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'نعم، أعد التعيين',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;

    if (tenantId) {
      await settingsService.resetToDefaults(supabase, tenantId);
    } else {
      localStorage.removeItem('inventory_system_settings');
    }
    setSettings(settingsService.getAll());
    toast.success('تم إعادة تعيين الإعدادات للقيم الافتراضية');
  };

  const activeTabInfo = tabs.find((t) => t.id === activeTab)!;

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">إعدادات النظام</h1>
            <p className="text-xs sm:text-sm text-slate-500">إدارة القوائم والبيانات المرجعية</p>
          </div>
        </div>

        {/* Cloud sync indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {loadingFromCloud ? (
            <span className="flex items-center gap-1 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              مزامنة...
            </span>
          ) : syncedWithCloud ? (
            <span className="flex items-center gap-1 text-green-600">
              <Cloud className="w-3.5 h-3.5" />
              متزامن مع السحابة
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400">
              <CloudOff className="w-3.5 h-3.5" />
              محلي فقط
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* القائمة الجانبية للتبويبات */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                القوائم المرجعية
              </p>
            </div>
            <nav className="p-2 space-y-1 overflow-x-auto lg:overflow-x-visible">
              <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-right transition-colors whitespace-nowrap lg:w-full ${
                    activeTab === tab.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`mr-auto text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-brand-50 text-brand-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {settings[tab.id].length}
                  </span>
                </button>
              ))}
              </div>
            </nav>
          </div>
        </div>

        {/* محتوى التبويب النشط */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                {activeTabInfo.icon}
                <h2 className="text-base font-semibold text-slate-900">
                  {activeTabInfo.label}
                </h2>
              </div>
              <p className="text-sm text-slate-500">{activeTabInfo.description}</p>
            </div>

            <ListEditor
              key={activeTab}
              listKey={activeTab}
              items={settings[activeTab]}
              onSave={handleSaveList}
              isSaving={savingList}
            />
          </div>

          {/* قسم النسخ الاحتياطي */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              النسخ الاحتياطي والاستعادة
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-brand-600" />
                  <h3 className="text-sm font-medium text-slate-900">تصدير الإعدادات</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  حفظ جميع القوائم المرجعية كملف JSON
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                >
                  تصدير JSON
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-medium text-slate-900">استيراد الإعدادات</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  استعادة القوائم من ملف JSON محفوظ
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  استيراد JSON
                </Button>
              </div>
            </div>
          </div>

          {/* منطقة الخطر */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-base font-semibold text-red-700 mb-1">منطقة الخطر</h2>
            <p className="text-sm text-slate-500 mb-4">
              هذه الإجراءات لا يمكن التراجع عنها. تأكد قبل المتابعة.
            </p>

            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  إعادة تعيين القوائم للافتراضي
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  سيتم حذف جميع التخصيصات والعودة للإعدادات الأصلية
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleReset}
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
