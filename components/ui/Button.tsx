import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] border border-[#E5E5EA]',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost:     'bg-transparent text-[#1C1C1E] hover:bg-[#F2F2F7]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-600
        focus-visible:ring-2 focus-visible:ring-[#E5302A] focus-visible:ring-offset-2
        ${loading ? 'opacity-70 cursor-wait' : ''}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
