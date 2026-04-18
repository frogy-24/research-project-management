'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Bot, Printer } from 'lucide-react';

export function ExportButtons() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAiReport = async () => {
    try {
      setIsGenerating(true);

      const response = await fetch('/api/admin/statistics/ai-report', {
        method: 'GET',
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        toast.error(payload.error || 'Khong the tao bao cao AI');
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] || `BaoCaoThongKe_AI_URMS_${new Date().toISOString().slice(0, 10)}.md`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Da tao bao cao AI va tai xuong thanh cong');
    } catch {
      toast.error('Khong the tao bao cao AI. Vui long thu lai.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2">
      <Button onClick={generateAiReport} size="sm" className="gap-2" disabled={isGenerating}>
        <Bot className="h-4 w-4" />
        {isGenerating ? 'Dang tao bao cao AI...' : 'Tao bao cao AI (MCP + LLM)'}
      </Button>
      <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
        <Printer className="h-4 w-4" />
        In báo cáo
      </Button>
    </div>
  );
}
