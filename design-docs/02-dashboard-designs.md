# Dashboard Designs - URMS

## 📄 Overview
Thiết kế Dashboard cho 5 roles chính: Admin, Lecturer, Dean, Council, Leader

---

## 🎯 Common Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (Fixed Left)    │    MAIN CONTENT AREA             │
│                           │                                   │
│  [Logo] URMS             │  ┌─ HEADER ──────────────────┐   │
│                           │  │ Breadcrumb  [Search] [👤] │   │
│  📊 Dashboard            │  └───────────────────────────┘   │
│  📁 Quản lý đề tài       │                                   │
│  👥 Hội đồng             │  ┌─ STATS CARDS ─────────────┐   │
│  📋 Báo cáo              │  │ [Card] [Card] [Card] [Card]│   │
│  ⚙️  Cài đặt             │  └───────────────────────────┘   │
│                           │                                   │
│  [User Profile]          │  ┌─ MAIN CONTENT ────────────┐   │
│  [Đăng xuất]             │  │                            │   │
│                           │  │  Tables / Charts / Forms   │   │
│                           │  │                            │   │
│                           │  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ ADMIN DASHBOARD

### Layout
```tsx
<div className="flex h-screen">
  <Sidebar role="admin" />
  
  <main className="flex-1 overflow-y-auto">
    <Header title="Tổng quan hệ thống" />
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <StatsCard
        title="Tổng đề tài"
        value="156"
        change="+12%"
        icon={FileText}
        trend="up"
      />
      <StatsCard
        title="Đang thực hiện"
        value="45"
        change="+5%"
        icon={Clock}
        trend="up"
      />
      <StatsCard
        title="Chờ duyệt"
        value="23"
        change="-3%"
        icon={AlertCircle}
        trend="down"
      />
      <StatsCard
        title="Đã nghiệm thu"
        value="88"
        change="+8%"
        icon={CheckCircle}
        trend="up"
      />
    </div>
    
    {/* Charts Section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Đề tài theo trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart data={projectsByStatus} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng đăng ký</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={registrationTrend} />
        </CardContent>
      </Card>
    </div>
    
    {/* Recent Activities */}
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={recentActivities} />
        </CardContent>
      </Card>
    </div>
  </main>
</div>
```

### Key Features
- **Stats Overview**: 4 cards hiển thị metrics quan trọng
- **Charts**: Pie chart (trạng thái) + Line chart (xu hướng)
- **Activity Timeline**: Danh sách hoạt động gần đây
- **Quick Actions**: Buttons để tạo đợt đăng ký, thêm hội đồng

### Color Coding
```css
.status-draft { @apply bg-gray-100 text-gray-800; }
.status-pending { @apply bg-blue-100 text-blue-800; }
.status-approved { @apply bg-emerald-100 text-emerald-800; }
.status-in-progress { @apply bg-amber-100 text-amber-800; }
.status-completed { @apply bg-green-100 text-green-800; }
.status-rejected { @apply bg-rose-100 text-rose-800; }
```

---

## 2️⃣ LECTURER DASHBOARD

### Layout
```tsx
<div className="flex h-screen">
  <Sidebar role="lecturer" />
  
  <main className="flex-1 overflow-y-auto">
    <Header title="Dashboard Giảng viên" />
    
    {/* Quick Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      <StatsCard
        title="Đề tài của tôi"
        value="3"
        subtitle="2 đang thực hiện, 1 hoàn thành"
        icon={Briefcase}
      />
      <StatsCard
        title="Báo cáo cần nộp"
        value="2"
        subtitle="Hạn nộp trong 7 ngày"
        icon={FileWarning}
        variant="warning"
      />
      <StatsCard
        title="Kinh phí đã giải ngân"
        value="45M"
        subtitle="Trên tổng 60M"
        icon={DollarSign}
      />
    </div>
    
    {/* My Projects */}
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Đề tài của tôi</CardTitle>
          <Button asChild>
            <Link href="/lecturer/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Đăng ký mới
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ProjectsTable projects={myProjects} />
        </CardContent>
      </Card>
    </div>
    
    {/* Upcoming Deadlines */}
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Deadline sắp tới</CardTitle>
        </CardHeader>
        <CardContent>
          <DeadlineList deadlines={upcomingDeadlines} />
        </CardContent>
      </Card>
    </div>
  </main>
</div>
```

### Key Features
- **My Projects**: Danh sách đề tài đang chủ trì
- **Deadlines**: Nhắc nhở deadline báo cáo
- **Quick Actions**: Đăng ký đề tài mới, nộp báo cáo
- **Progress Tracker**: Timeline tiến độ đề tài

---

## 3️⃣ DEAN DASHBOARD

### Layout
```tsx
<div className="flex h-screen">
  <Sidebar role="dean" />
  
  <main className="flex-1 overflow-y-auto">
    <Header title="Dashboard Trưởng khoa" />
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
      <StatsCard
        title="Chờ duyệt"
        value="8"
        icon={Clock}
        variant="warning"
      />
      <StatsCard
        title="Đề tài khoa"
        value="34"
        icon={FileText}
      />
      <StatsCard
        title="Giảng viên"
        value="25"
        icon={Users}
      />
      <StatsCard
        title="Hội đồng"
        value="5"
        icon={Shield}
      />
    </div>
    
    {/* Pending Approvals */}
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Đề tài chờ duyệt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApprovalQueue projects={pendingProjects} />
        </CardContent>
      </Card>
    </div>
    
    {/* Department Stats */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Thống kê theo loại đề tài</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={projectsByType} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Top giảng viên</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardTable lecturers={topLecturers} />
        </CardContent>
      </Card>
    </div>
  </main>
</div>
```

### Key Features
- **Approval Queue**: Danh sách đề tài cần duyệt (priority)
- **Department Overview**: Thống kê đề tài của khoa
- **Council Management**: Quản lý hội đồng
- **Lecturer Performance**: Bảng xếp hạng giảng viên

---

## 4️⃣ COUNCIL DASHBOARD

### Layout
```tsx
<div className="flex h-screen">
  <Sidebar role="council" />
  
  <main className="flex-1 overflow-y-auto">
    <Header title="Dashboard Hội đồng" />
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      <StatsCard
        title="Đề tài cần đánh giá"
        value="5"
        icon={FileSearch}
        variant="info"
      />
      <StatsCard
        title="Đã đánh giá"
        value="12"
        icon={CheckCircle}
      />
      <StatsCard
        title="Cuộc họp sắp tới"
        value="2"
        icon={Calendar}
      />
    </div>
    
    {/* Assigned Projects */}
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Đề tài được phân công</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Chờ đánh giá</TabsTrigger>
              <TabsTrigger value="completed">Đã đánh giá</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              <EvaluationQueue projects={pendingEvaluations} />
            </TabsContent>
            
            <TabsContent value="completed">
              <EvaluationHistory evaluations={completedEvaluations} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    
    {/* Upcoming Meetings */}
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Lịch họp hội đồng</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingCalendar meetings={upcomingMeetings} />
        </CardContent>
      </Card>
    </div>
  </main>
</div>
```

### Key Features
- **Evaluation Queue**: Đề tài cần chấm điểm
- **Meeting Schedule**: Lịch họp hội đồng
- **Evaluation Forms**: Form đánh giá chi tiết
- **History**: Lịch sử đánh giá

---

## 5️⃣ LEADER DASHBOARD

### Layout
```tsx
<div className="flex h-screen">
  <Sidebar role="leader" />
  
  <main className="flex-1 overflow-y-auto">
    <Header title="Dashboard Ban Giám hiệu" />
    
    {/* Executive Summary */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <StatsCard
        title="Tổng đề tài"
        value="156"
        change="+12% so với năm trước"
        icon={TrendingUp}
      />
      <StatsCard
        title="Tổng kinh phí"
        value="2.5B"
        subtitle="VNĐ"
        icon={DollarSign}
      />
      <StatsCard
        title="Bài báo ISI/Scopus"
        value="45"
        change="+18%"
        icon={BookOpen}
      />
      <StatsCard
        title="Giảng viên tham gia"
        value="78"
        icon={Users}
      />
    </div>
    
    {/* Charts Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Đề tài theo khoa</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={projectsByDepartment} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng 5 năm</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={fiveYearTrend} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Phân bổ kinh phí</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart data={budgetAllocation} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Tỷ lệ hoàn thành</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={completionRate} />
        </CardContent>
      </Card>
    </div>
    
    {/* Export Reports */}
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Báo cáo tổng hợp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Xuất PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </main>
</div>
```

### Key Features
- **Executive Summary**: Tổng quan cấp cao
- **Multi-dimensional Charts**: Nhiều biểu đồ phân tích
- **Export Reports**: Xuất báo cáo Excel/PDF
- **Trend Analysis**: Phân tích xu hướng nhiều năm

---

## 🎨 Shared Components

### StatsCard Component
```tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'warning' | 'info' | 'success';
}

<Card className="hover-lift">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      {title}
    </CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{value}</div>
    {subtitle && (
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    )}
    {change && (
      <p className={cn(
        "text-xs mt-1",
        trend === 'up' && "text-emerald-600",
        trend === 'down' && "text-rose-600"
      )}>
        {change}
      </p>
    )}
  </CardContent>
</Card>
```

### Sidebar Component
```tsx
<aside className="w-64 bg-sidebar text-sidebar-foreground border-r">
  <div className="p-6">
    <div className="flex items-center gap-2">
      <GraduationCap className="h-8 w-8" />
      <span className="text-xl font-bold">URMS</span>
    </div>
  </div>
  
  <nav className="px-3 space-y-1">
    {menuItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg",
          "hover:bg-sidebar-accent transition-colors",
          isActive && "bg-sidebar-accent"
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    ))}
  </nav>
  
  <div className="absolute bottom-0 w-64 p-4 border-t">
    <UserProfile />
  </div>
</aside>
```

---

## 📱 Responsive Behavior

### Mobile (< 768px)
- Sidebar: Collapsible drawer
- Stats cards: Single column
- Charts: Full width, stacked
- Tables: Horizontal scroll

### Tablet (768px - 1024px)
- Sidebar: Collapsible or mini mode
- Stats cards: 2 columns
- Charts: 1-2 columns

### Desktop (> 1024px)
- Sidebar: Fixed, always visible
- Stats cards: 4 columns
- Charts: 2 columns grid
- Tables: Full features

---

## 🎯 Performance Optimization

```tsx
// Lazy load charts
const PieChart = lazy(() => import('@/components/charts/pie-chart'));
const LineChart = lazy(() => import('@/components/charts/line-chart'));

// Suspense wrapper
<Suspense fallback={<Skeleton className="h-[300px]" />}>
  <PieChart data={data} />
</Suspense>
```

---

## ♿ Accessibility

- [ ] Keyboard navigation cho sidebar
- [ ] ARIA labels cho stats cards
- [ ] Screen reader support cho charts
- [ ] Focus management cho modals
- [ ] Color contrast cho all text
