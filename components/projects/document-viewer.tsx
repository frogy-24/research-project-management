// components/projects/document-viewer.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink } from "lucide-react";

type DocumentViewerProps = {
  fileUrl: string;
  fileName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DocumentViewer({ fileUrl, fileName, open, onOpenChange }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Xác định loại file từ URL hoặc extension
  const getFileType = (url: string): "pdf" | "doc" | "unknown" => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith(".pdf")) return "pdf";
    if (lowerUrl.endsWith(".doc") || lowerUrl.endsWith(".docx")) return "doc";
    return "unknown";
  };

  const fileType = getFileType(fileUrl);
  
  // URL để xem file trực tiếp
  const getViewUrl = (url: string, type: "pdf" | "doc" | "unknown"): string => {
    if (type === "pdf") {
      // PDF có thể xem trực tiếp trong iframe
      return url;
    } else if (type === "doc") {
      // DOCX cần dùng Google Docs Viewer hoặc Office Online
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const viewUrl = getViewUrl(fileUrl, fileType);

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: mở trong tab mới
      window.open(fileUrl, "_blank");
    }
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0" showCloseButton={true}>
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {fileName || "Xem tài liệu"}
          </DialogTitle>
        </DialogHeader>

        {/* Document Viewer Area */}
        <div className="flex-1 relative bg-muted/30 overflow-hidden">
          {fileType === "unknown" ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Không thể xem trước loại file này trong trình duyệt.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleDownload} variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  Tải xuống
                </Button>
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Mở trong tab mới
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang tải tài liệu...</p>
                  </div>
                </div>
              )}
              <iframe
                src={viewUrl}
                className="w-full h-full border-0"
                title="Document Viewer"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 pt-3 border-t flex-row justify-between items-center bg-background">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {fileType === "pdf" && <span>PDF Document</span>}
            {fileType === "doc" && <span>Word Document</span>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="default" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Tải xuống
            </Button>
            <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Mở tab mới
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
