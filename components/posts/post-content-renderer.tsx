'use client';

import { useMemo } from 'react';
import DOMPurify from 'dompurify';

type PostContentRendererProps = {
  content: string;
  className?: string;
};

const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;

export function PostContentRenderer({ content, className }: PostContentRendererProps) {
  const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(content);
  }, [content]);

  if (!htmlTagRegex.test(content)) {
    return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{content}</p>;
  }

  return (
    <div
      className={[
        'prose prose-slate max-w-none text-sm leading-7',
        'prose-headings:mt-5 prose-headings:mb-3',
        'prose-p:my-3 prose-li:my-1',
        'prose-img:my-4 prose-img:max-h-[520px] prose-img:w-auto prose-img:max-w-full prose-img:rounded-lg prose-img:border prose-img:shadow-sm [&_img]:block [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain',
        'prose-a:text-blue-700 prose-a:underline prose-a:italic hover:prose-a:text-blue-800',
        '[&_a.doc-download-link]:inline-flex [&_a.doc-download-link]:items-center [&_a.doc-download-link]:rounded-md [&_a.doc-download-link]:border [&_a.doc-download-link]:border-blue-200 [&_a.doc-download-link]:bg-blue-50 [&_a.doc-download-link]:px-3 [&_a.doc-download-link]:py-1.5 [&_a.doc-download-link]:text-sm [&_a.doc-download-link]:font-medium [&_a.doc-download-link]:text-blue-700 [&_a.doc-download-link]:underline [&_a.doc-download-link]:italic hover:[&_a.doc-download-link]:bg-blue-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
