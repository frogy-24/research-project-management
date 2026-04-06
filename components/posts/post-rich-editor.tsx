'use client';

import { useEffect, useRef, useState, useMemo, type ChangeEvent } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Strikethrough,
  ImagePlus,
  Paperclip,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadApi } from '@/api/upload';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type PostRichEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
};

type UploadTarget = 'image' | 'file';

const QUICK_TEXT_COLORS = [
  '#111827',
  '#000000',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#be185d',
] as const;

const FONT_SIZE_OPTIONS = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'] as const;

const DEFAULT_IMAGE_WIDTH = 'min(100%,560px)';
const IMAGE_MAX_HEIGHT = '420px';

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
      },
    };
  },
});

function normalizeImageWidthInput(rawWidth: string): string | null {
  const normalized = rawWidth.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+(\.\d+)?(px|%)$/i.test(normalized)) {
    return normalized;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return `${normalized}px`;
  }

  return null;
}

function buildImageStyle(width: string | null): string {
  const resolvedWidth = width ?? DEFAULT_IMAGE_WIDTH;
  return `display:block;width:${resolvedWidth};max-width:100%;height:auto;max-height:${IMAGE_MAX_HEIGHT};object-fit:contain;margin:12px auto;`;
}

function normalizeToHexColor(color: string): string {
  const normalized = color.trim().toLowerCase();
  if (normalized.startsWith('#')) {
    if (normalized.length === 4) {
      return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
    }
    return normalized;
  }

  const rgbMatch = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!rgbMatch) {
    return '#111827';
  }

  const toHex = (value: string) => Number(value).toString(16).padStart(2, '0');
  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}

function isImageLikeFile(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function MenuBar({
  editor,
  disabled,
  isUploading,
  onInsertImage,
  onInsertFile,
}: {
  editor: Editor;
  disabled: boolean;
  isUploading: boolean;
  onInsertImage: () => void;
  onInsertFile: () => void;
}) {
  const [currentColor, setCurrentColor] = useState<string>('#111827');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>('inherit');
  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('https://');
  const [linkTextInput, setLinkTextInput] = useState('');
  const [linkNeedsTextInput, setLinkNeedsTextInput] = useState(false);
  const normalizedCurrentColor = useMemo(() => normalizeToHexColor(currentColor), [currentColor]);

  useEffect(() => {
    const syncToolbarState = () => {
      const textStyleAttrs = editor.getAttributes('textStyle');
      setCurrentColor(textStyleAttrs.color || '#111827');
      setCurrentFontFamily(textStyleAttrs.fontFamily || 'inherit');
      setCurrentFontSize(textStyleAttrs.fontSize || '16px');
    };

    syncToolbarState();
    editor.on('selectionUpdate', syncToolbarState);
    editor.on('transaction', syncToolbarState);

    return () => {
      editor.off('selectionUpdate', syncToolbarState);
      editor.off('transaction', syncToolbarState);
    };
  }, [editor]);

  const handleFontFamilyChange = (nextFontFamily: string) => {
    if (nextFontFamily === 'inherit') {
      editor.chain().focus().unsetFontFamily().run();
      return;
    }

    editor.chain().focus().setFontFamily(nextFontFamily).run();
  };

  const handleColorChange = (nextColor: string) => {
    editor.chain().focus().setColor(nextColor).run();
  };

  const handleFontSizeChange = (nextFontSize: string) => {
    if (nextFontSize === '16px') {
      editor.chain().focus().unsetFontSize().run();
      return;
    }

    editor.chain().focus().setFontSize(nextFontSize).run();
  };

  const handleSetLink = () => {
    const existingHref = editor.getAttributes('link').href as string | undefined;
    const selection = editor.state.selection;
    const hasSelection = selection.from !== selection.to;

    setLinkNeedsTextInput(!hasSelection);
    setLinkUrlInput(existingHref ?? 'https://');
    setLinkTextInput('tại đây');
    setIsLinkDialogOpen(true);
  };

  const handleApplyLink = () => {
    const normalizedUrl = linkUrlInput.trim();
    if (!normalizedUrl) {
      toast.error('Vui lòng nhập đường dẫn');
      return;
    }

    if (!linkNeedsTextInput) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalizedUrl }).run();
      setIsLinkDialogOpen(false);
      return;
    }

    const linkText = linkTextInput.trim();
    if (!linkText) {
      toast.error('Vui lòng nhập nội dung hiển thị cho liên kết');
      return;
    }

    const safeText = escapeHtml(linkText);
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`)
      .run();

    setIsLinkDialogOpen(false);
  };

  const handleUnsetLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 p-1">
      <select
        value={currentFontFamily}
        onChange={(event) => handleFontFamilyChange(event.target.value)}
        disabled={disabled || isUploading}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label="Chọn font chữ"
      >
        <option value="inherit">Font mặc định</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="'Times New Roman', serif">Times New Roman</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="'Courier New', monospace">Courier New</option>
      </select>

      <select
        value={currentFontSize}
        onChange={(event) => handleFontSizeChange(event.target.value)}
        disabled={disabled || isUploading}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label="Chọn cỡ chữ"
      >
        {FONT_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <div className="flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs">
        <span>Màu</span>
        <div className="flex items-center gap-1">
          {QUICK_TEXT_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => handleColorChange(hex)}
              disabled={disabled || isUploading}
              className="h-4 w-4 rounded-sm border border-black/15"
              style={{ backgroundColor: hex }}
              aria-label={`Chọn màu ${hex}`}
              title={hex}
            />
          ))}
        </div>
      </div>

      <select
        value={normalizedCurrentColor}
        onChange={(event) => handleColorChange(event.target.value)}
        disabled={disabled || isUploading}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label="Danh sách màu chữ"
      >
        {QUICK_TEXT_COLORS.map((hex) => (
          <option key={hex} value={hex}>
            {hex.toUpperCase()}
          </option>
        ))}
      </select>

      <div className="mx-1 h-6 w-px bg-border" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
        aria-label="Căn trái"
        disabled={disabled || isUploading}
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
        aria-label="Căn giữa"
        disabled={disabled || isUploading}
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
        aria-label="Căn phải"
        disabled={disabled || isUploading}
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <div className="mx-1 h-6 w-px bg-border" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="In đậm"
        disabled={disabled || isUploading}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="In nghiêng"
        disabled={disabled || isUploading}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Gạch ngang"
        disabled={disabled || isUploading}
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <div className="mx-1 h-6 w-px bg-border" />
      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Danh sách chấm"
        disabled={disabled || isUploading}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Danh sách số 1,2,3"
        disabled={disabled || isUploading}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSetLink}
        disabled={disabled || isUploading}
        className="h-8 px-2"
      >
        <Link2 className="mr-1 h-4 w-4" />
        Gắn link
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleUnsetLink}
        disabled={disabled || isUploading || !editor.isActive('link')}
        className="h-8 px-2"
      >
        <Unlink className="mr-1 h-4 w-4" />
        Bỏ link
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onInsertImage}
        disabled={disabled || isUploading}
        className="h-8 px-2"
      >
        <ImagePlus className="mr-1 h-4 w-4" />
        Chèn ảnh
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onInsertFile}
        disabled={disabled || isUploading}
        className="h-8 px-2"
      >
        <Paperclip className="mr-1 h-4 w-4" />
        Chèn tài liệu
      </Button>

      {isUploading && (
        <span className="ml-auto flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Đang tải tệp...
        </span>
      )}

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gắn liên kết</DialogTitle>
            <DialogDescription>Nhập URL để áp dụng cho đoạn đã chọn hoặc chèn liên kết mới.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Đường dẫn</p>
              <Input
                value={linkUrlInput}
                onChange={(event) => setLinkUrlInput(event.target.value)}
                placeholder="https://..."
              />
            </div>
            {linkNeedsTextInput && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Nội dung hiển thị</p>
                <Input
                  value={linkTextInput}
                  onChange={(event) => setLinkTextInput(event.target.value)}
                  placeholder="tại đây"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Hủy
            </Button>
            <Button type="button" onClick={handleApplyLink}>
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PostRichEditor({
  value,
  onChange,
  disabled = false,
  onEditorReady,
}: PostRichEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>('image');
  const [isResizeDialogOpen, setIsResizeDialogOpen] = useState(false);
  const [resizingImagePos, setResizingImagePos] = useState<number | null>(null);
  const [resizeWidthInput, setResizeWidthInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastEditorHtmlRef = useRef<string>(value || '<p></p>');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      ResizableImage,
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor: currentEditor }) {
      const html = currentEditor.getHTML();
      lastEditorHtmlRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class:
            'min-h-[220px] p-4 focus:outline-none prose prose-sm sm:prose-base max-w-none prose-img:my-4 prose-img:max-w-full prose-img:h-auto prose-img:max-h-[520px] prose-img:rounded-lg prose-img:border prose-img:shadow-sm prose-a:text-blue-700 prose-a:underline prose-a:italic hover:prose-a:text-blue-800 [&_img]:block [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:border [&_img]:shadow-sm [&_a.doc-download-link]:text-blue-700 [&_a.doc-download-link]:underline [&_a.doc-download-link]:italic',
      },
      handleClick(view, pos, event) {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) {
          return false;
        }

        const node = view.state.doc.nodeAt(pos);
        if (!node || node.type.name !== 'image') {
          return false;
        }

        const currentStyle = String(node.attrs.style ?? '');
        const currentWidth = currentStyle.match(/width\s*:\s*([^;]+)/i)?.[1]?.trim() ?? '';

        setResizingImagePos(pos);
        setResizeWidthInput(currentWidth.startsWith('min(') ? '' : currentWidth);
        setIsResizeDialogOpen(true);
        return true;
      },
    },
    immediatelyRender: false,
  });

  const applyImageResize = () => {
    if (!editor || resizingImagePos === null) {
      return;
    }

    const parsedWidth = normalizeImageWidthInput(resizeWidthInput);
    if (resizeWidthInput.trim() && !parsedWidth) {
      toast.error('Kích thước không hợp lệ. Dùng dạng 60% hoặc 480px.');
      return;
    }

    const node = editor.state.doc.nodeAt(resizingImagePos);
    if (!node || node.type.name !== 'image') {
      toast.error('Không tìm thấy ảnh để cập nhật kích thước.');
      setIsResizeDialogOpen(false);
      setResizingImagePos(null);
      return;
    }

    const transaction = editor.state.tr.setNodeMarkup(resizingImagePos, undefined, {
      ...node.attrs,
      style: buildImageStyle(parsedWidth),
    });
    editor.view.dispatch(transaction);
    setIsResizeDialogOpen(false);
    setResizingImagePos(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onEditorReady?.(editor ?? null);

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (value === lastEditorHtmlRef.current) {
      return;
    }

    const currentHtml = editor.getHTML();
    if (currentHtml !== value) {
      lastEditorHtmlRef.current = value || '<p></p>';
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [editor, value]);

  const openUploadDialog = (target: UploadTarget) => {
    setUploadTarget(target);
    inputRef.current?.click();
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';

    if (!file || !editor) {
      return;
    }

    const imageLike = isImageLikeFile(file);

    if (uploadTarget === 'image' && !imageLike) {
      toast.error('Vui lòng chọn tệp ảnh');
      return;
    }

    setIsUploading(true);

    try {
      const upload = await uploadApi.file(file);
      const fileName = escapeHtml(file.name || 'Tài liệu đính kèm');

      // Always render image files as images, even if user opened the document picker.
      if (imageLike) {
        const imageHtml = `<p><img src="${upload.url}" alt="${fileName}" title="${fileName}" style="${buildImageStyle(null)}" /></p><p></p>`;
        editor.chain().focus().insertContent(imageHtml).run();
      } else {
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
          const selectedText = escapeHtml(editor.state.doc.textBetween(from, to, ' ').trim() || fileName);
          const linkButtonHtml = `<a class="doc-download-link" href="${upload.url}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`;
          editor.chain().focus().insertContentAt({ from, to }, linkButtonHtml).run();
        } else {
          const linkHtml = `<a class="doc-download-link" href="${upload.url}" target="_blank" rel="noopener noreferrer"><span>${fileName}</span></a>`;
          editor.chain().focus().insertContent(linkHtml).run();
        }
      }

      const latestHtml = editor.getHTML();
      lastEditorHtmlRef.current = latestHtml;
      onChange(latestHtml);

      toast.success('Đã chèn tệp vào bài viết');
    } catch {
      toast.error('Tải tệp thất bại, vui lòng thử lại');
    } finally {
      setIsUploading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-[220px] animate-pulse rounded-md border bg-muted/10" />;
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={uploadTarget === 'image' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'}
        onChange={handleUpload}
        disabled={disabled || isUploading}
      />

      <MenuBar
        editor={editor}
        disabled={disabled}
        isUploading={isUploading}
        onInsertImage={() => openUploadDialog('image')}
        onInsertFile={() => openUploadDialog('file')}
      />
      <EditorContent editor={editor} />
      <p className="border-t bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        Mẹo: đặt con trỏ tại vị trí mong muốn rồi bấm chèn ảnh/tài liệu. Bạn có thể bấm vào ảnh để chỉnh lại kích thước.
      </p>

      <Dialog open={isResizeDialogOpen} onOpenChange={setIsResizeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh kích thước ảnh</DialogTitle>
            <DialogDescription>Nhập dạng 60% hoặc 480px. Để trống để dùng kích thước mặc định.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <p className="text-sm font-medium">Kích thước</p>
            <Input
              value={resizeWidthInput}
              onChange={(event) => setResizeWidthInput(event.target.value)}
              placeholder="60% hoặc 480px"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResizeDialogOpen(false)}>
              Hủy
            </Button>
            <Button type="button" onClick={applyImageResize}>
              Áp dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
