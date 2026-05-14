'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/AuthContext';
import { storeProfileService, StoreProfile } from '@/lib/store/storeProfileService';
import { Store, Globe, Facebook, Instagram, Twitter, Eye, EyeOff, Save, ShieldCheck } from 'lucide-react';

// TikTok icon (not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.31a8.16 8.16 0 004.77 1.52V7.36a4.85 4.85 0 01-1-.67z" />
    </svg>
  );
}

// Snapchat icon
function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.166.5c3.116 0 5.668 2.58 5.668 5.768v.386c0 .408.028.815.084 1.217l.084.61c.084.554.282 1.065.546 1.518.125.214.083.478-.111.634a1.37 1.37 0 01-.797.255c-.42 0-.84-.13-1.176-.37-.476-.34-1.008-.524-1.54-.524-.35 0-.7.075-1.024.214-.35.154-.63.38-.85.636.35.327.644.685.882 1.066.476.77.714 1.638.714 2.534 0 .204-.014.408-.042.607-.126.922-.77 1.65-1.624 1.845a10.57 10.57 0 01-.923.17c-.378.05-.77.1-1.148.196a1.79 1.79 0 00-.7.368c-.21.19-.378.428-.49.706-.154.38-.546.61-.952.545a.944.944 0 01-.168-.04c-.224-.075-.462-.115-.7-.115-.238 0-.476.04-.7.115a.944.944 0 01-.168.04.919.919 0 01-.952-.545 2.39 2.39 0 00-.49-.706 1.79 1.79 0 00-.7-.368c-.378-.097-.77-.147-1.148-.196a10.57 10.57 0 01-.923-.17c-.854-.196-1.498-.923-1.624-1.845a4.3 4.3 0 01-.042-.607c0-.896.238-1.764.714-2.534.238-.381.532-.74.882-1.066a3.228 3.228 0 00-.85-.636 2.64 2.64 0 00-1.024-.214c-.532 0-1.064.184-1.54.524a1.967 1.967 0 01-1.176.37 1.37 1.37 0 01-.797-.255.506.506 0 01-.111-.634c.264-.453.462-.964.546-1.518l.084-.61c.056-.402.084-.81.084-1.217V6.268C6.166 3.08 8.718.5 11.834.5h.332z" />
    </svg>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2]">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20 ${icon ? 'pr-9 pl-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

export default function StorePage() {
  const toast = useToast();
  const { username, changePassword, changeUsername } = useAuth();

  const [profile, setProfile] = useState<StoreProfile | null>(null);

  // Account security fields
  const [newUsername, setNewUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const p = storeProfileService.getOrCreateProfile();
    setProfile(p);
  }, []);

  const updateField = (field: keyof StoreProfile, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleSaveProfile = () => {
    if (!profile) return;
    storeProfileService.saveProfile(profile);
    toast.success('تم حفظ بيانات المتجر بنجاح');
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      toast.error('يرجى إدخال اسم المستخدم الجديد');
      return;
    }
    if (newUsername.trim().length < 3) {
      toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    setSavingUsername(true);
    try {
      changeUsername(newUsername.trim());
      setNewUsername('');
      toast.success('تم تغيير اسم المستخدم بنجاح');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      toast.error('يرجى ملء جميع حقول كلمة المرور');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }
    setSavingPassword(true);
    try {
      const ok = await changePassword(oldPassword, newPassword);
      if (ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        toast.success('تم تغيير كلمة المرور بنجاح');
      } else {
        toast.error('كلمة المرور الحالية غير صحيحة');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">بيانات المتجر</h1>
          <p className="text-sm text-[#6C6C70] mt-0.5">إدارة معلومات متجرك وإعدادات الحساب</p>
        </div>
        <span className="px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-xl text-sm font-medium text-[#6C6C70]">
          رقم المتجر: {profile.storeId}
        </span>
      </div>

      {/* Card 1 — Basic info */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Store className="w-5 h-5 text-[#E5302A]" />
          <h2 className="text-base font-semibold text-[#1C1C1E]">المعلومات الأساسية</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="اسم المتجر"
            value={profile.name}
            onChange={(v) => updateField('name', v)}
            placeholder="أدخل اسم المتجر"
          />
          <InputField
            label="رقم الهاتف"
            value={profile.phone}
            onChange={(v) => updateField('phone', v)}
            placeholder="05xxxxxxxx"
            type="tel"
          />
          <InputField
            label="رقم الواتساب"
            value={profile.whatsapp}
            onChange={(v) => updateField('whatsapp', v)}
            placeholder="05xxxxxxxx"
            type="tel"
          />
          <InputField
            label="البريد الإلكتروني"
            value={profile.email}
            onChange={(v) => updateField('email', v)}
            placeholder="example@domain.com"
            type="email"
          />
          <div className="md:col-span-2">
            <InputField
              label="العنوان"
              value={profile.address}
              onChange={(v) => updateField('address', v)}
              placeholder="المدينة، الحي، الشارع"
            />
          </div>
        </div>
      </div>

      {/* Card 2 — Social media */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-5 h-5 text-[#E5302A]" />
          <h2 className="text-base font-semibold text-[#1C1C1E]">روابط التواصل الاجتماعي</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="فيسبوك"
            value={profile.facebook}
            onChange={(v) => updateField('facebook', v)}
            placeholder="https://facebook.com/yourpage"
            icon={<Facebook className="w-4 h-4" />}
          />
          <InputField
            label="انستغرام"
            value={profile.instagram}
            onChange={(v) => updateField('instagram', v)}
            placeholder="https://instagram.com/yourpage"
            icon={<Instagram className="w-4 h-4" />}
          />
          <InputField
            label="تويتر / X"
            value={profile.twitter}
            onChange={(v) => updateField('twitter', v)}
            placeholder="https://twitter.com/yourpage"
            icon={<Twitter className="w-4 h-4" />}
          />
          <InputField
            label="تيك توك"
            value={profile.tiktok}
            onChange={(v) => updateField('tiktok', v)}
            placeholder="https://tiktok.com/@yourpage"
            icon={<TikTokIcon className="w-4 h-4" />}
          />
          <InputField
            label="سناب شات"
            value={profile.snapchat}
            onChange={(v) => updateField('snapchat', v)}
            placeholder="https://snapchat.com/add/yourpage"
            icon={<SnapchatIcon className="w-4 h-4" />}
          />
          <InputField
            label="الموقع الإلكتروني"
            value={profile.website}
            onChange={(v) => updateField('website', v)}
            placeholder="https://yourwebsite.com"
            icon={<Globe className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Save profile button */}
      <div className="flex justify-start">
        <button
          onClick={handleSaveProfile}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] active:bg-[#B02520] text-white font-semibold text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          حفظ التغييرات
        </button>
      </div>

      {/* Card 3 — Account security */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-5 h-5 text-[#E5302A]" />
          <h2 className="text-base font-semibold text-[#1C1C1E]">أمان الحساب</h2>
        </div>

        {/* Change username */}
        <div className="pb-6 border-b border-[#F2F2F7]">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-1">تغيير اسم المستخدم</h3>
          <p className="text-xs text-[#AEAEB2] mb-3">
            اسم المستخدم الحالي: <span className="font-medium text-[#6C6C70]">{username ?? '—'}</span>
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="اسم المستخدم الجديد"
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
            />
            <button
              onClick={handleChangeUsername}
              disabled={savingUsername}
              className="px-5 py-2.5 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white font-medium text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {savingUsername ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="pt-6">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-3">تغيير كلمة المرور</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6C6C70] transition-colors"
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6C6C70] transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6C6C70] transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-start pt-1">
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="px-5 py-2.5 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                {savingPassword ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
