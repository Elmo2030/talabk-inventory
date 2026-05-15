'use client';
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({ icon: Icon, title, description, action, size = 'md' }: EmptyStateProps) {
  const sizeMap = {
    sm: { wrapper: 'py-8', icon: 'w-10 h-10', iconBox: 'w-14 h-14', titleSize: 'text-sm', descSize: 'text-xs' },
    md: { wrapper: 'py-14', icon: 'w-12 h-12', iconBox: 'w-20 h-20', titleSize: 'text-base', descSize: 'text-sm' },
    lg: { wrapper: 'py-20', icon: 'w-14 h-14', iconBox: 'w-24 h-24', titleSize: 'text-lg', descSize: 'text-sm' },
  };
  const s = sizeMap[size];
  return (
    <div className={`flex flex-col items-center justify-center ${s.wrapper} px-4`}>
      <div className={`${s.iconBox} rounded-2xl bg-[#F2F2F7] dark:bg-[#27272A] flex items-center justify-center mb-4`}>
        <Icon className={`${s.icon} text-[#C7C7CC] dark:text-[#48484A]`} />
      </div>
      <p className={`${s.titleSize} font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1`}>{title}</p>
      {description && (
        <p className={`${s.descSize} text-[#6C6C70] dark:text-[#A1A1AA] text-center max-w-xs mt-1 leading-relaxed`}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
