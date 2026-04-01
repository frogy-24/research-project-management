# URMS Design System Documentation

## 🎨 Design Philosophy

**Institutional Minimalist** - Thiết kế tối giản học thuật, chuyên nghiệp, tập trung vào nội dung và hiệu suất.

### Core Principles
1. **Clarity First** - Thông tin rõ ràng, dễ hiểu
2. **Consistency** - Nhất quán trong toàn bộ hệ thống
3. **Accessibility** - Dễ tiếp cận cho mọi người dùng
4. **Performance** - Tối ưu tốc độ và trải nghiệm

---

## 🎨 Color Palette

### Primary Colors
```css
/* Primary - Blue (Chủ đạo) */
--primary: oklch(0.534 0.19 258.34)           /* #4F46E5 - Indigo 600 */
--primary-foreground: oklch(0.985 0.004 247.86) /* White text on primary */

/* Sidebar - Dark Slate */
--sidebar: oklch(0.223 0.03 257.18)           /* #1E293B - Slate 800 */
--sidebar-foreground: oklch(0.97 0.005 247.86) /* Light text */
```

### Status Colors
```css
/* Success - Emerald */
.status-approved { @apply bg-emerald-500 text-white; }

/* Warning - Amber */
.status-in-progress { @apply bg-amber-500 text-white; }

/* Danger - Rose */
.status-rejected { @apply bg-rose-500 text-white; }

/* Info - Blue */
.status-pending { @apply bg-blue-500 text-white; }

/* Neutral - Gray */
.status-draft { @apply bg-gray-400 text-white; }
```

### Background & Surface
```css
--background: oklch(0.985 0.004 247.86)       /* #F8FAFC - Gray 50 */
--card: oklch(0.996 0.002 247.86)             /* #FFFFFF - White */
--muted: oklch(0.955 0.01 247.86)             /* #F1F5F9 - Gray 100 */
```

---

## 📝 Typography

### Font Families
```css
--font-sans: 'Roboto', sans-serif;            /* Body text */
--font-geist-sans: 'Geist', sans-serif;       /* Headings (optional) */
--font-geist-mono: 'Geist Mono', monospace;   /* Code */
```

### Font Scale
```css
/* Headings */
.text-h1 { @apply text-4xl font-bold tracking-tight; }      /* 36px */
.text-h2 { @apply text-3xl font-bold tracking-tight; }      /* 30px */
.text-h3 { @apply text-2xl font-semibold; }                 /* 24px */
.text-h4 { @apply text-xl font-semibold; }                  /* 20px */
.text-h5 { @apply text-lg font-medium; }                    /* 18px */

/* Body */
.text-body { @apply text-base; }                            /* 16px */
.text-small { @apply text-sm; }                             /* 14px */
.text-xs { @apply text-xs; }                                /* 12px */
```

---

## 📏 Spacing System

### Base Unit: 4px (0.25rem)

```css
/* Spacing Scale */
space-1  = 4px   (0.25rem)
space-2  = 8px   (0.5rem)
space-3  = 12px  (0.75rem)
space-4  = 16px  (1rem)
space-6  = 24px  (1.5rem)
space-8  = 32px  (2rem)
space-12 = 48px  (3rem)
space-16 = 64px  (4rem)
```

### Component Spacing
```css
/* Card Padding */
.card-padding { @apply p-6; }                 /* 24px */

/* Section Spacing */
.section-spacing { @apply space-y-6; }        /* 24px vertical */

/* Form Field Spacing */
.form-spacing { @apply space-y-4; }           /* 16px vertical */
```

---

## 🔲 Border Radius

```css
--radius: 0.625rem;                           /* 10px - Base radius */

/* Radius Scale */
.rounded-sm  { border-radius: calc(var(--radius) * 0.6); }  /* 6px */
.rounded-md  { border-radius: calc(var(--radius) * 0.8); }  /* 8px */
.rounded-lg  { border-radius: var(--radius); }              /* 10px */
.rounded-xl  { border-radius: calc(var(--radius) * 1.4); }  /* 14px */
.rounded-2xl { border-radius: calc(var(--radius) * 1.8); }  /* 18px */
```

---

## 🎭 Shadows

```css
/* Elevation System */
.shadow-sm   { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.shadow      { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
.shadow-md   { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
.shadow-lg   { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
.shadow-xl   { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
```

---

## 🎬 Animations & Transitions

### Standard Transitions
```css
/* Default transition */
.transition-default { @apply transition-all duration-200 ease-in-out; }

/* Hover effects */
.hover-lift { @apply hover:shadow-md hover:-translate-y-0.5 transition-all; }
.hover-scale { @apply hover:scale-102 transition-transform; }
```

### Loading States
```css
/* Skeleton loading */
.skeleton { @apply animate-pulse bg-muted rounded; }

/* Spinner */
.spinner { @apply animate-spin rounded-full border-2 border-primary; }
```

---

## 📱 Responsive Breakpoints

```css
/* Tailwind default breakpoints */
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

### Layout Guidelines
- **Mobile First**: Thiết kế cho mobile trước, sau đó mở rộng
- **Sidebar**: Collapsible trên mobile, fixed trên desktop
- **Tables**: Horizontal scroll trên mobile, full width trên desktop
- **Forms**: Single column trên mobile, multi-column trên desktop

---

## ♿ Accessibility

### Focus States
```css
/* Focus ring */
.focus-visible { @apply outline-ring/50 outline-2 outline-offset-2; }
```

### Color Contrast
- Tất cả text phải đạt WCAG AA (4.5:1 cho text thường, 3:1 cho text lớn)
- Interactive elements phải có contrast ratio tối thiểu 3:1

### Keyboard Navigation
- Tất cả interactive elements phải accessible qua keyboard
- Focus states phải rõ ràng và dễ nhìn
- Tab order phải logic và tuần tự

---

## 🎯 Component Patterns

### Card Pattern
```tsx
<Card className="hover-lift">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Status Badge Pattern
```tsx
<Badge variant={status === 'approved' ? 'success' : 'warning'}>
  {statusText}
</Badge>
```

### Data Table Pattern
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50">
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 📦 Component Library

### Available Shadcn Components
- ✅ Alert
- ✅ Avatar
- ✅ Badge
- ✅ Breadcrumb
- ✅ Button
- ✅ Card
- ✅ Checkbox
- ✅ Dialog
- ✅ Dropdown Menu
- ✅ Input
- ✅ Label
- ✅ Pagination
- ✅ Scroll Area
- ✅ Select
- ✅ Separator
- ✅ Sheet
- ✅ Sidebar
- ✅ Skeleton
- ✅ Table
- ✅ Textarea
- ✅ Tooltip

### Custom Components Needed
- [ ] Multi-step Form
- [ ] File Upload with Preview
- [ ] Rich Text Editor (Tiptap)
- [ ] Date Range Picker
- [ ] Command Menu (CMD+K)
- [ ] Data Table with Filters
- [ ] Timeline Component
- [ ] Stats Card
- [ ] Progress Tracker

---

## 🎨 Design Tokens Export

```json
{
  "colors": {
    "primary": "#4F46E5",
    "sidebar": "#1E293B",
    "background": "#F8FAFC",
    "success": "#10B981",
    "warning": "#F59E0B",
    "danger": "#EF4444"
  },
  "spacing": {
    "unit": "4px",
    "card": "24px",
    "section": "24px"
  },
  "typography": {
    "fontFamily": "Roboto, sans-serif",
    "scale": {
      "h1": "36px",
      "h2": "30px",
      "h3": "24px",
      "body": "16px"
    }
  },
  "borderRadius": {
    "base": "10px"
  }
}
```

---

## 📚 Resources

- [Shadcn UI Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Color Tool](https://material.io/resources/color/)
