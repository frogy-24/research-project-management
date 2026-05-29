'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    GraduationCap,
    Home,
    LogIn,
    LogOut,
    User,
    FolderKanban,
    Activity,
    ClipboardCheck,
    Link2,
    FileText,
    Building2,
    BookOpen,
    School,
    Users,
    UserCog,
    UserRound,
    UsersRound,
    Mail,
    CalendarClock,
    DoorOpen,
    Newspaper,
    BarChart3,
    DollarSign,
    ChevronRight,
    FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthSession, useLogout } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/lib/role-routes';
import { NotificationBell } from '@/components/layout/notification-bell';
import { useMyTeamInvitations } from '@/hooks/useMyTeamInvitations';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarProvider,
    SidebarTrigger,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AuthSession } from '@/types/auth.schema';

const roleLabelMap: Record<string, string> = {
    STUDENT: 'Sinh viên',
    LECTURER: 'Giảng viên',
    DEAN: 'Trưởng khoa',
    ADMIN: 'Phòng QLKH',
    COUNCIL: 'Hội đồng',
    LEADER: 'Ban giám hiệu',
};

export function AppShell({ children }: { children: React.ReactNode }) {
    const { data: session, isLoading } = useAuthSession();

    if (isLoading) return <div className="h-screen w-screen bg-background" />;

    // If not logged in, show minimalist layout (header-only or pure auth)
    if (!session) {
        return (
            <div className="min-h-screen bg-linear-to-b from-background via-background to-accent/20 flex flex-col">
                <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
                            <GraduationCap className="h-6 w-6" />
                            <span className="text-xl tracking-tight">URMS</span>
                        </Link>
                        <Button asChild size="sm" className="rounded-full px-6">
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" />
                                Đăng nhập
                            </Link>
                        </Button>
                    </div>
                </header>
                <main className="flex-1">{children}</main>
                <footer className="border-t bg-card/50">
                    <div className="container mx-auto flex flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                        <p>© {new Date().getFullYear()} URMS · Tối giản học thuật</p>
                    </div>
                </footer>
            </div>
        );
    }

    // Dashboard / Portal layout
    return (
        <SidebarProvider>
            <TooltipProvider>
                <div className="flex min-h-screen w-full bg-background selection:bg-primary/20">
                    <AppSidebar session={session} />
                    <div className="flex flex-1 flex-col overflow-hidden w-full">
                        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 supports-backdrop-filter:bg-background/60">
                            <div className="flex items-center gap-3 w-full">
                                <SidebarTrigger />
                                <Separator orientation="vertical" className="h-6 mx-2" />
                                <div className="font-medium text-sm text-muted-foreground flex-1">
                                    {roleLabelMap[session.role] || 'Dashboard'}
                                </div>
                                <NotificationBell />
                                <UserMenu session={session} />
                            </div>
                        </header>
                        <main className="flex-1 overflow-auto bg-muted/20">
                            <div className="animate-in fade-in duration-500 h-full">{children}</div>
                        </main>
                    </div>
                </div>
            </TooltipProvider>
        </SidebarProvider>
    );
}

function UserMenu({ session }: { session: AuthSession }) {
    const router = useRouter();
    const logoutMutation = useLogout();
    const username = 'Người dùng';
    const initial = username.charAt(0).toUpperCase();

    const handleLogout = () => {
        logoutMutation.mutate(undefined, {
            onSuccess: () => {
                router.replace('/login');
                router.refresh(); // Force Next.js to re-render and clear client state
            },
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">{initial}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{username}</p>
                        <p className="text-xs leading-none text-muted-foreground">{roleLabelMap[session.role]}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(session.role === 'STUDENT' || session.role === 'LECTURER') && (
                    <DropdownMenuItem asChild>
                        <Link href={`/${session.role.toLowerCase()}/profile`} className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Hồ sơ cá nhân</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Type definitions for navigation
type NavItem = {
    title: string;
    url?: string;
    icon: any;
    badgeCount?: number;
    items?: Array<{ title: string; url: string }>;
};

function AppSidebar({ session }: { session: AuthSession }) {
    const pathname = usePathname();
    const isPortal = session.role === 'STUDENT' || session.role === 'LECTURER';
    const portalPrefix = `/${session.role.toLowerCase()}`;
    const { data: teamInvitations = [] } = useMyTeamInvitations({ enabled: session.role === 'STUDENT' });
    const pendingInvitationCount =
        session.role === 'STUDENT'
            ? teamInvitations.filter((invitation) => invitation.invitationStatus === 'PENDING').length
            : 0;

    let navItems: NavItem[] = isPortal
        ? [
              { title: 'Hồ sơ cá nhân', url: `${portalPrefix}/profile`, icon: User },
              {
                  title: 'Quản lý đề tài',
                  url: `${portalPrefix}/projects`,
                  icon: FolderKanban,
              },
              {
                  title: session.role === 'LECTURER' ? 'Báo cáo cá nhân' : 'Báo cáo tiến độ',
                  url: `${portalPrefix}/progress`,
                  icon: Activity,
              },
          ]
        : [
              {
                  title: 'Hệ thống tổng quan',
                  url: getDashboardRoute(session.role),
                  icon: Home,
              },
          ];

    if (session.role === 'LECTURER' || session.role === 'COUNCIL') {
        navItems.push(
            {
                title: 'Lời mời tham gia',
                url: '/lecturer/call-round-invitations',
                icon: Mail,
            },
            {
                title: 'Duyệt hướng dẫn',
                url: '/lecturer/guidance',
                icon: GraduationCap,
            },
            {
                title: 'Báo cáo sinh viên',
                url: '/lecturer/review-progress',
                icon: ClipboardCheck,
            },
            {
                title: 'Hội đồng',
                url: '/lecturer/councils',
                icon: UsersRound,
            },
            {
                title: 'Chấm điểm đề tài',
                url: '/lecturer/council-scoring',
                icon: ClipboardCheck,
            },
        );

        if (session.role === 'LECTURER') {
            navItems.push({
                title: 'Nghiệm thu đề tài',
                url: '/lecturer/project-closings',
                icon: FileText,
            });
        }
    } else if (session.role === 'STUDENT') {
        navItems.push({
            title: 'Xem hội đồng',
            url: '/student/councils',
            icon: UsersRound,
        });

        navItems.push({
            title: 'Lời mời nhóm',
            url: '/student/team-invitations',
            icon: Mail,
            badgeCount: pendingInvitationCount,
        });
    } else if (session.role === 'DEAN') {
        navItems.push(
            {
                title: 'Quản lý Đề tài',
                icon: FolderKanban,
                items: [
                    { title: 'Duyệt đề tài Khoa', url: '/dean/approvals' },
                    { title: 'Gán đề tài hội đồng', url: '/dean/council-projects' },
                    { title: 'Xem điểm hội đồng', url: '/dean/council-evaluations' },
                    { title: 'Nghiệm thu đề tài', url: '/dean/project-closings' },
                ],
            },
            {
                title: 'Đợt Đăng Ký',
                url: '/dean/call-rounds',
                icon: Activity,
            },
            {
                title: 'Giải ngân',
                url: '/dean/disbursements',
                icon: DollarSign,
            },
            {
                title: 'Quản lý Biểu mẫu',
                url: '/dean/templates',
                icon: FileText,
            },
            {
                title: 'Quản lý Người dùng',
                icon: Users,
                items: [
                    { title: 'Quản lý Lớp', url: '/dean/classes' },
                    { title: 'Quản lý Giảng viên', url: '/dean/lecturers' },
                    { title: 'Quản lý Sinh viên', url: '/dean/students' },
                ],
            },
            {
                title: 'Quản lý Hội đồng',
                url: '/dean/councils',
                icon: UsersRound,
            },
            {
                title: 'Quản lý Phòng họp',
                url: '/dean/rooms',
                icon: DoorOpen,
            },
            {
                title: 'Báo cáo',
                url: '/dean/reports',
                icon: BarChart3,
            },
        );
    } else if (session.role === 'ADMIN') {
        navItems.push(
            {
                title: 'Tổ chức',
                icon: Building2,
                items: [
                    { title: 'Quản lý Khoa', url: '/admin/departments' },
                    { title: 'Quản lý Ngành', url: '/admin/majors' },
                    { title: 'Quản lý Lớp', url: '/admin/classes' },
                ],
            },
            {
                title: 'Quản lý Người dùng',
                url: '/admin/users',
                icon: Users,
            },
            {
                title: 'Quản lý Biểu mẫu',
                url: '/admin/templates',
                icon: FileText,
            },
            {
                title: 'Đợt Đăng Ký',
                url: '/admin/call-rounds',
                icon: Activity,
            },
            {
                title: 'Giải ngân',
                icon: DollarSign,
                items: [
                    { title: 'Quản lý giải ngân', url: '/admin/disbursements' },
                    { title: 'Phê duyệt giải ngân', url: '/admin/disbursements/approvals' },
                ],
            },
            {
                title: 'Thống kê',
                url: '/admin/statistics',
                icon: BarChart3,
            },
            {
                title: 'Đề tài NCKH toàn khoa',
                url: '/admin/projects-overview',
                icon: FolderOpen,
            },
        );
    }

    navItems.push({
        title: 'Bài viết',
        url: `/${session.role.toLowerCase()}/posts`,
        icon: Newspaper,
    });

    navItems.push({
        title: 'Xem lịch hẹn',
        url: `/${session.role.toLowerCase()}/meetings`,
        icon: CalendarClock,
    });

    return (
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="border-b h-16 items-center px-4 flex-row flex">
                <div className="flex items-center gap-2 text-primary font-bold overflow-hidden w-full">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="truncate group-data-[collapsible=icon]:hidden text-xl tracking-tight">URMS</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu chính</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                // Check if item has submenu
                                if (item.items && item.items.length > 0) {
                                    // eslint-disable-next-line react-hooks/rules-of-hooks
                                    const isAnySubItemActive = item.items.some(subItem => pathname === subItem.url);
                                    // eslint-disable-next-line react-hooks/rules-of-hooks
                                    const [isOpen, setIsOpen] = React.useState(false);
                                    
                                    // Auto-open if any subitem is active
                                    // eslint-disable-next-line react-hooks/rules-of-hooks
                                    React.useEffect(() => {
                                        if (isAnySubItemActive) {
                                            setIsOpen(true);
                                        }
                                    }, [isAnySubItemActive]);
                                    
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                onClick={() => setIsOpen(!isOpen)}
                                                tooltip={item.title}
                                                isActive={isAnySubItemActive}
                                                className="cursor-pointer"
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                                <ChevronRight 
                                                    className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
                                                />
                                            </SidebarMenuButton>
                                            {isOpen && (
                                                <SidebarMenuSub>
                                                    {item.items.map((subItem) => {
                                                        const isSubActive = pathname === subItem.url;
                                                        return (
                                                            <SidebarMenuSubItem key={subItem.url}>
                                                                <SidebarMenuSubButton asChild isActive={isSubActive}>
                                                                    <Link href={subItem.url}>
                                                                        <span>{subItem.title}</span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        );
                                                    })}
                                                </SidebarMenuSub>
                                            )}
                                        </SidebarMenuItem>
                                    );
                                }
                                
                                // Regular menu item without submenu
                                const isActive = pathname === item.url;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                            <Link href={item.url!}>
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                                {item.badgeCount && item.badgeCount > 0 && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="ml-auto h-5 min-w-5 px-1.5 text-[10px] leading-none group-data-[collapsible=icon]:hidden"
                                                    >
                                                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                                    </Badge>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold shrink-0 ring-1 ring-border">
                        {roleLabelMap[session.role]?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium leading-none">Hệ thống URMS</span>
                        <span className="text-xs text-muted-foreground mt-1">{roleLabelMap[session.role]}</span>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
