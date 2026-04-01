# Landing Page Design - URMS

## 📄 Overview
Trang chủ công khai của hệ thống URMS, giới thiệu về hệ thống và hướng dẫn đăng nhập.

---

## 🎯 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Fixed)                        │
│  [Logo] URMS                              [Đăng nhập]   │
└─────────────────────────────────────────────────────────┘
│                                                           │
│                    HERO SECTION                          │
│         Hệ Thống Quản Lý Nghiên Cứu Khoa Học            │
│              University Research MS                       │
│                                                           │
│              [Đăng nhập hệ thống] →                      │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                  FEATURES SECTION                        │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│   │  Icon 1  │  │  Icon 2  │  │  Icon 3  │            │
│   │ Feature  │  │ Feature  │  │ Feature  │            │
│   └──────────┘  └──────────┘  └──────────┘            │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                   STATS SECTION                          │
│   [100+ Đề tài]  [50+ Giảng viên]  [20+ Khoa]          │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                    FOOTER                                │
│         © 2026 URMS - All rights reserved               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Component Breakdown

### 1. Header
```tsx
<header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
  <div className="container mx-auto px-4 h-16 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <GraduationCap className="h-8 w-8 text-primary" />
      <span className="text-xl font-bold">URMS</span>
    </div>
    <Button asChild>
      <Link href="/login">Đăng nhập</Link>
    </Button>
  </div>
</header>
```

**Styling:**
- Fixed position với backdrop blur
- Height: 64px (h-16)
- Border bottom: 1px solid border color
- Z-index: 50

---

### 2. Hero Section
```tsx
<section className="pt-32 pb-20 px-4">
  <div className="container mx-auto max-w-4xl text-center">
    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
      Hệ Thống Quản Lý
      <span className="text-primary block">Nghiên Cứu Khoa Học</span>
    </h1>
    
    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
      Giải pháp toàn diện cho việc quản lý đề tài nghiên cứu, 
      từ đăng ký đến nghiệm thu
    </p>
    
    <Button size="lg" asChild className="gap-2">
      <Link href="/login">
        Đăng nhập hệ thống
        <ArrowRight className="h-5 w-5" />
      </Link>
    </Button>
  </div>
</section>
```

**Styling:**
- Padding top: 128px (pt-32) - để tránh fixed header
- Text alignment: center
- Max width: 896px (max-w-4xl)
- Gradient text cho "Nghiên Cứu Khoa Học"

---

### 3. Features Section
```tsx
<section className="py-20 bg-muted/30">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">
      Tính Năng Nổi Bật
    </h2>
    
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {features.map((feature) => (
        <Card key={feature.id} className="text-center hover-lift">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg 
                          flex items-center justify-center mb-4">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

**Features Data:**
```tsx
const features = [
  {
    id: 1,
    icon: FileText,
    title: "Quản Lý Đề Tài",
    description: "Đăng ký, theo dõi và quản lý đề tài nghiên cứu một cách dễ dàng"
  },
  {
    id: 2,
    icon: Users,
    title: "Hội Đồng Đánh Giá",
    description: "Tổ chức và quản lý hội đồng thẩm định chuyên nghiệp"
  },
  {
    id: 3,
    icon: BarChart3,
    title: "Báo Cáo & Thống Kê",
    description: "Theo dõi tiến độ và thống kê toàn diện theo thời gian thực"
  }
];
```

**Styling:**
- Background: muted/30 (light gray)
- Grid: 3 columns trên desktop, 1 column trên mobile
- Card hover effect: lift (shadow + translate)
- Icon container: 48x48px với background primary/10

---

### 4. Stats Section
```tsx
<section className="py-20">
  <div className="container mx-auto px-4">
    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
      {stats.map((stat) => (
        <div key={stat.id} className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {stat.value}
          </div>
          <div className="text-muted-foreground">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Stats Data:**
```tsx
const stats = [
  { id: 1, value: "100+", label: "Đề tài đã hoàn thành" },
  { id: 2, value: "50+", label: "Giảng viên tham gia" },
  { id: 3, value: "20+", label: "Khoa/Bộ môn" }
];
```

---

### 5. Footer
```tsx
<footer className="border-t py-8 bg-muted/20">
  <div className="container mx-auto px-4">
    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-semibold">URMS</span>
      </div>
      
      <p className="text-sm text-muted-foreground">
        © 2026 University Research Management System. All rights reserved.
      </p>
      
      <div className="flex gap-4">
        <Link href="/about" className="text-sm hover:text-primary">
          Về chúng tôi
        </Link>
        <Link href="/contact" className="text-sm hover:text-primary">
          Liên hệ
        </Link>
      </div>
    </div>
  </div>
</footer>
```

---

## 🎨 Color Scheme

```css
/* Hero gradient text */
.hero-gradient {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Feature card hover */
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

---

## 📱 Responsive Behavior

### Mobile (< 768px)
- Hero title: text-4xl
- Features: Single column grid
- Stats: Single column
- Footer: Stacked layout

### Tablet (768px - 1024px)
- Hero title: text-5xl
- Features: 2 columns
- Stats: 3 columns

### Desktop (> 1024px)
- Hero title: text-6xl
- Features: 3 columns
- Stats: 3 columns
- Max container width: 1280px

---

## ⚡ Animations

```tsx
// Fade in on scroll
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Stagger children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

---

## 🔗 Navigation Flow

```
Landing Page
    ↓
[Đăng nhập] → Login Page
    ↓
Dashboard (theo role)
```

---

## 📦 Required Components

- ✅ Button (Shadcn)
- ✅ Card (Shadcn)
- ✅ Badge (Shadcn)
- 🔲 Hero Section (Custom)
- 🔲 Feature Card (Custom)
- 🔲 Stats Counter (Custom)

---

## 🎯 Implementation Priority

1. **Phase 1**: Basic layout với header, hero, footer
2. **Phase 2**: Features section với cards
3. **Phase 3**: Stats section
4. **Phase 4**: Animations và polish
5. **Phase 5**: Responsive optimization

---

## 📝 Content Guidelines

### Hero Section
- **Headline**: Ngắn gọn, rõ ràng (< 10 từ)
- **Subheadline**: Mô tả giá trị cốt lõi (< 20 từ)
- **CTA**: Hành động rõ ràng ("Đăng nhập hệ thống")

### Features
- **Title**: 2-4 từ
- **Description**: 1-2 câu ngắn
- **Icon**: Liên quan trực tiếp đến tính năng

### Stats
- **Number**: Làm tròn, dễ nhớ (100+, 50+)
- **Label**: Mô tả ngắn gọn

---

## 🎨 Visual Hierarchy

1. **Primary**: Hero title + CTA button
2. **Secondary**: Feature cards
3. **Tertiary**: Stats, footer links

---

## ♿ Accessibility Checklist

- [ ] Alt text cho tất cả icons
- [ ] Keyboard navigation cho tất cả links/buttons
- [ ] Focus states rõ ràng
- [ ] Color contrast đạt WCAG AA
- [ ] Semantic HTML (header, main, section, footer)
- [ ] ARIA labels cho interactive elements
