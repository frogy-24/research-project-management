import type { Metadata } from 'next';
import { Geist, Geist_Mono, Roboto } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

const roboto = Roboto({
    variable: '--font-roboto',
    subsets: ['latin', 'vietnamese'],
    weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
    title: 'URMS - University Research Management System',
    description: 'Hệ thống quản lý nghiên cứu khoa học đại học',
};

import { QueryProvider } from '@/components/providers/query-provider';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} antialiased`}>
                <QueryProvider>
                    <TooltipProvider>
                        <AppShell>{children}</AppShell>
                    </TooltipProvider>
                    <Toaster />
                </QueryProvider>
            </body>
        </html>
    );
}
