'use client';

import Input from './Input';

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          label="من تاريخ"
          type="date"
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div className="flex-1">
        <Input
          label="إلى تاريخ"
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
    </div>
  );
}
