// ============================================
// Export & Print Utilities
// ============================================

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printReport(elementId: string, title: string) {
  const printContent = document.getElementById(elementId);
  if (!printContent) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { font-family: 'Cairo', sans-serif; box-sizing: border-box; }
          body { padding: 20px; color: #1e293b; }
          .print-header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
          .print-header h1 { color: #1e40af; margin: 0; font-size: 24px; }
          .print-header p { color: #64748b; margin: 4px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #1e40af; color: white; padding: 10px 8px; text-align: right; font-weight: 600; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          tr:nth-child(even) td { background: #f8fafc; }
          .summary { background: #f0f9ff; padding: 12px; border-right: 4px solid #1e40af; margin-bottom: 15px; border-radius: 4px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title}</h1>
          <p>نظام إدارة المخازن 2026 — تاريخ الطباعة: ${new Date().toLocaleDateString('ar-LY')}</p>
        </div>
        ${printContent.innerHTML}
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatCurrency(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
