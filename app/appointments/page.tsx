'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Scissors,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '@/lib/types';
import { appointmentsService } from '@/lib/services/appointmentsService';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  SCHEDULED:  { label: 'مجدول',    bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Clock },
  CONFIRMED:  { label: 'مؤكد',     bg: 'bg-indigo-100', text: 'text-indigo-700', icon: CheckCircle },
  COMPLETED:  { label: 'مكتمل',    bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  CANCELLED:  { label: 'ملغي',     bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle },
  NO_SHOW:    { label: 'لم يحضر',  bg: 'bg-amber-100',  text: 'text-amber-700',  icon: AlertCircle },
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

const DEFAULT_SERVICES = [
  'قص شعر', 'صبغة شعر', 'مانيكير', 'باديكير', 'عناية بالبشرة',
  'مكياج', 'تنظيف بشرة', 'رموش', 'حواجب', 'مساج',
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-LY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Form ──────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelClass = 'block text-xs font-medium text-slate-600 mb-1.5';

interface FormState {
  customerName: string;
  customerPhone: string;
  service: string;
  staffName: string;
  date: string;
  time: string;
  durationMinutes: number;
  notes: string;
  status: AppointmentStatus;
}

const EMPTY_FORM: FormState = {
  customerName: '',
  customerPhone: '',
  service: '',
  staffName: '',
  date: todayStr(),
  time: '10:00',
  durationMinutes: 60,
  notes: '',
  status: 'SCHEDULED',
};

interface AppointmentFormProps {
  initial?: Appointment | null;
  onSave: (data: FormState) => void;
  onClose: () => void;
}

function AppointmentForm({ initial, onSave, onClose }: AppointmentFormProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          customerName: initial.customerName,
          customerPhone: initial.customerPhone,
          service: initial.service,
          staffName: initial.staffName ?? '',
          date: initial.date,
          time: initial.time,
          durationMinutes: initial.durationMinutes,
          notes: initial.notes ?? '',
          status: initial.status,
        }
      : EMPTY_FORM
  );

  const set = (k: keyof FormState, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const valid =
    form.customerName.trim() &&
    form.service.trim() &&
    form.date &&
    form.time;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>اسم العميل *</label>
          <input className={inputClass} value={form.customerName}
            onChange={(e) => set('customerName', e.target.value)} placeholder="اسم العميل" />
        </div>
        <div>
          <label className={labelClass}>رقم الهاتف</label>
          <input className={inputClass} value={form.customerPhone} type="tel"
            onChange={(e) => set('customerPhone', e.target.value)} placeholder="0912345678" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>الخدمة *</label>
          <input className={inputClass} value={form.service} list="services-list"
            onChange={(e) => set('service', e.target.value)} placeholder="نوع الخدمة" />
          <datalist id="services-list">
            {DEFAULT_SERVICES.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>الموظف المسؤول</label>
          <input className={inputClass} value={form.staffName}
            onChange={(e) => set('staffName', e.target.value)} placeholder="اسم الموظف" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>التاريخ *</label>
          <input className={inputClass} type="date" value={form.date}
            onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>الوقت *</label>
          <input className={inputClass} type="time" value={form.time}
            onChange={(e) => set('time', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>المدة</label>
          <select className={inputClass} value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d} دقيقة</option>
            ))}
          </select>
        </div>
      </div>

      {initial && (
        <div>
          <label className={labelClass}>الحالة</label>
          <select className={inputClass} value={form.status}
            onChange={(e) => set('status', e.target.value as AppointmentStatus)}>
            {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>ملاحظات</label>
        <textarea className={inputClass} rows={2} value={form.notes}
          onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظات إضافية..." />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
          إلغاء
        </button>
        <button onClick={() => onSave(form)} disabled={!valid}
          className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
          {initial ? 'حفظ التعديلات' : 'إضافة الموعد'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Load from Supabase on mount
  useEffect(() => {
    appointmentsService.getAll()
      .then((data) => setAppointments(data))
      .catch(() => setAppointments([]));
  }, []);

  const reload = () => {
    appointmentsService.getAll()
      .then((data) => setAppointments(data))
      .catch(() => {});
  };

  const filtered = useMemo(() => {
    const today = todayStr();
    return appointments.filter((a) => {
      if (dateFilter === 'today' && a.date !== today) return false;
      if (dateFilter === 'upcoming' && a.date < today) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.customerName.toLowerCase().includes(q) ||
          a.service.toLowerCase().includes(q) ||
          (a.staffName ?? '').toLowerCase().includes(q) ||
          a.customerPhone.includes(q)
        );
      }
      return true;
    });
  }, [appointments, search, dateFilter, statusFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filtered.forEach((a) => {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = useMemo(() => {
    const today = todayStr();
    return {
      todayCount: appointments.filter((a) => a.date === today && a.status !== 'CANCELLED').length,
      upcomingCount: appointments.filter((a) => a.date > today && a.status === 'SCHEDULED').length,
      completedCount: appointments.filter((a) => a.status === 'COMPLETED').length,
    };
  }, [appointments]);

  const handleSave = async (form: FormState) => {
    try {
      if (editing) {
        await appointmentsService.update(editing.id, form);
        toast.success('تم تحديث الموعد');
      } else {
        await appointmentsService.create({ ...form, durationMinutes: form.durationMinutes });
        toast.success('تم إضافة الموعد');
      }
      reload();
      setIsFormOpen(false);
      setEditing(null);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (apt: Appointment) => {
    const ok = await confirm({
      title: 'حذف الموعد',
      description: `هل تريد حذف موعد ${apt.customerName} في ${apt.date} الساعة ${apt.time}؟`,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await appointmentsService.delete(apt.id);
      reload();
      toast.success('تم حذف الموعد');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleStatusChange = async (apt: Appointment, status: AppointmentStatus) => {
    try {
      await appointmentsService.update(apt.id, { status });
      reload();
      toast.success(`تم تحديث حالة الموعد`);
    } catch {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const openWhatsApp = (apt: Appointment) => {
    const msg = encodeURIComponent(
      `مرحباً ${apt.customerName}، نذكّرك بموعدك لخدمة "${apt.service}" يوم ${formatDate(apt.date)} الساعة ${apt.time}. نتطلع لاستقبالك! 😊`
    );
    const clean = apt.customerPhone.replace(/\D/g, '');
    const intl = clean.startsWith('0') ? '218' + clean.slice(1) : clean;
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-600" />
            إدارة المواعيد
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            حجز وإدارة مواعيد العملاء لخدمات التجميل والرعاية
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              قائمة
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              تقويم شهري
            </button>
          </div>
          <button
            onClick={() => { setEditing(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            موعد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'مواعيد اليوم', value: stats.todayCount, color: 'text-brand-700', bg: 'bg-brand-50 border-brand-200' },
          { label: 'قادمة', value: stats.upcomingCount, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'مكتملة', value: stats.completedCount, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch}
          placeholder="بحث باسم العميل أو الخدمة أو الموظف..."
          className="flex-1" />
        <div className="flex gap-2 flex-wrap">
          {(['upcoming', 'today', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                dateFilter === f ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {f === 'today' ? 'اليوم' : f === 'upcoming' ? 'القادمة' : 'الكل'}
            </button>
          ))}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'ALL')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600"
          >
            <option value="ALL">كل الحالات</option>
            {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <CalendarView
          year={calMonth.year}
          month={calMonth.month}
          appointments={appointments}
          onPrev={() => setCalMonth(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })}
          onNext={() => setCalMonth(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })}
          onToday={() => { const d = new Date(); setCalMonth({ year: d.getFullYear(), month: d.getMonth() }); }}
          onClickAppointment={(a) => { setEditing(a); setIsFormOpen(true); }}
        />
      )}

      {/* List view content */}
      {viewMode === 'list' && (grouped.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="لا توجد مواعيد"
          description={dateFilter === 'today' ? 'لا توجد مواعيد لهذا اليوم' : 'لا توجد مواعيد قادمة'}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, apts]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm font-semibold text-slate-600 bg-white px-3">
                  {date === todayStr() ? '📅 اليوم — ' : ''}{formatDate(date)}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Appointment cards */}
              <div className="space-y-3">
                {apts.map((apt) => {
                  const cfg = STATUS_CONFIG[apt.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <div
                      key={apt.id}
                      className={`bg-white border rounded-2xl p-4 shadow-sm ${
                        apt.status === 'CANCELLED' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        {/* Time + service */}
                        <div className="flex items-start gap-3">
                          <div className="text-center bg-brand-50 rounded-xl px-3 py-2 min-w-[56px]">
                            <p className="text-lg font-bold text-brand-700 leading-tight">{apt.time}</p>
                            <p className="text-[10px] text-brand-500">{apt.durationMinutes}د</p>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{apt.customerName}</p>
                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-0.5">
                              <Scissors className="w-3.5 h-3.5 text-slate-400" />
                              {apt.service}
                            </p>
                            {apt.staffName && (
                              <p className="text-xs text-slate-400 mt-0.5">الموظف: {apt.staffName}</p>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>

                      {apt.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3">
                          {apt.notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {apt.customerPhone && (
                          <a href={`tel:${apt.customerPhone}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                            اتصال
                          </a>
                        )}
                        {apt.customerPhone && (
                          <button onClick={() => openWhatsApp(apt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-xl transition-colors">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            تذكير
                          </button>
                        )}

                        {/* Quick status actions */}
                        {apt.status === 'SCHEDULED' && (
                          <button onClick={() => handleStatusChange(apt, 'CONFIRMED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-xl transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                            تأكيد
                          </button>
                        )}
                        {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                          <button onClick={() => handleStatusChange(apt, 'COMPLETED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                            مكتمل
                          </button>
                        )}
                        {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                          <button onClick={() => handleStatusChange(apt, 'CANCELLED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-xl transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                            إلغاء
                          </button>
                        )}

                        <div className="flex gap-1 mr-auto">
                          <button onClick={() => { setEditing(apt); setIsFormOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(apt)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Form modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditing(null); }}
        title={editing ? 'تعديل الموعد' : 'موعد جديد'}
        size="md"
      >
        <AppointmentForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Monthly calendar — 7×6 grid showing appointment counts per day, with
// click-to-edit on the appointment chips.
// ──────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const WEEKDAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function CalendarView({
  year, month, appointments, onPrev, onNext, onToday, onClickAppointment,
}: {
  year: number;
  month: number;  // 0-indexed
  appointments: Appointment[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onClickAppointment: (a: Appointment) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // JS getDay(): 0=Sun..6=Sat — Arabic week starts Sunday so this is fine.
  const startWeekday = firstDay.getDay();
  const daysInMonth  = lastDay.getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Build 7×6 grid (42 cells)
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  // Leading blank cells from previous month (we just show day number from prev month)
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day:  d,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day:  d,
      inMonth: true,
    });
  }
  // Fill trailing
  let nextDay = 1;
  while (cells.length < 42) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    cells.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`,
      day:  nextDay++,
      inMonth: false,
    });
  }

  // Group appointments by date for fast lookup
  const byDate: Record<string, Appointment[]> = {};
  appointments.forEach(a => { (byDate[a.date] ??= []).push(a); });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-base font-bold text-slate-900">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="الشهر السابق"
          >
            ›
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            اليوم
          </button>
          <button
            onClick={onNext}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="الشهر التالي"
          >
            ‹
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_NAMES.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-slate-500 uppercase py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const apts = byDate[cell.date] ?? [];
          const isToday = cell.date === today;
          return (
            <div
              key={idx}
              className={`min-h-[80px] p-1.5 rounded-lg border text-right ${
                !cell.inMonth ? 'bg-slate-50 border-slate-100' :
                isToday        ? 'bg-brand-50 border-brand-300'
                               : 'bg-white border-slate-100'
              }`}
            >
              <div className={`text-[11px] font-semibold mb-1 ${
                !cell.inMonth ? 'text-slate-300' :
                isToday        ? 'text-brand-700'
                               : 'text-slate-700'
              }`}>
                {cell.day}
              </div>
              <div className="space-y-0.5">
                {apts.slice(0, 3).map(a => {
                  const cfg = STATUS_CONFIG[a.status];
                  return (
                    <button
                      key={a.id}
                      onClick={() => onClickAppointment(a)}
                      className={`block w-full text-right text-[9px] px-1 py-0.5 rounded truncate ${cfg.bg} ${cfg.text}`}
                      title={`${a.time} · ${a.customerName} · ${a.service}`}
                    >
                      <span className="font-mono">{a.time}</span>
                      <span className="mr-1 truncate">{a.customerName}</span>
                    </button>
                  );
                })}
                {apts.length > 3 && (
                  <p className="text-[9px] text-slate-400 px-1">
                    +{apts.length - 3} أخرى
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
