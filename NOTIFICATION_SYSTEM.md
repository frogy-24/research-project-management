# Notification System Documentation

## Overview
The notification system provides real-time alerts to users about important events in the research project management system, such as project status changes, registration approvals, progress report submissions and reviews.

## Features
- **Real-time notifications** with 30-second polling
- **Bell icon** in the header with unread count badge
- **Notification types** including:
  - Project status changes
  - Registration status changes
  - Progress report submissions and reviews
  - Extension requests
  - Call round approvals
  - Instructor and reviewer assignments
  - Council evaluations
  - Funding disbursements

## Architecture

### Database Schema
```prisma
model Notification {
  id           String           @id @default(cuid())
  userId       String
  type         NotificationType
  title        String
  message      String
  link         String?          // URL to navigate to when clicked
  isRead       Boolean          @default(false)
  metadata     Json?            // Additional data like projectId, registrationId, etc.
  createdAt    DateTime         @default(now())
  readAt       DateTime?
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

### API Endpoints

#### GET /api/notifications
Fetch notifications for the authenticated user.

**Query Parameters:**
- `unreadOnly` (boolean): Only return unread notifications
- `limit` (number): Number of notifications to return (default: 50)
- `offset` (number): Offset for pagination (default: 0)

**Response:**
```json
{
  "notifications": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "unreadCount": 5
}
```

#### PATCH /api/notifications
Mark all notifications as read for the authenticated user.

**Response:**
```json
{
  "success": true,
  "updatedCount": 5
}
```

#### PATCH /api/notifications/:id
Mark a single notification as read.

**Response:**
```json
{
  "id": "...",
  "isRead": true,
  "readAt": "2026-03-21T09:00:00.000Z",
  ...
}
```

#### DELETE /api/notifications/:id
Delete a notification.

**Response:**
```json
{
  "success": true
}
```

### Frontend Components

#### NotificationBell Component
Located at: `components/layout/notification-bell.tsx`

Features:
- Bell icon with unread count badge
- Dropdown menu with notification list
- Click to mark as read and navigate to related page
- Delete individual notifications
- Mark all as read button
- Auto-refresh every 30 seconds

Usage:
```tsx
import { NotificationBell } from "@/components/layout/notification-bell";

<NotificationBell />
```

#### Hooks

**useNotifications**
```tsx
const { data, isLoading } = useNotifications({
  unreadOnly: false,
  limit: 20,
  pollingInterval: 30000
});
```

**useMarkNotificationAsRead**
```tsx
const markAsRead = useMarkNotificationAsRead();
markAsRead.mutate(notificationId);
```

**useMarkAllNotificationsAsRead**
```tsx
const markAllAsRead = useMarkAllNotificationsAsRead();
markAllAsRead.mutate();
```

**useDeleteNotification**
```tsx
const deleteNotification = useDeleteNotification();
deleteNotification.mutate(notificationId);
```

### Notification Service

Located at: `lib/notification-service.ts`

Helper functions for creating notifications:
- `createNotification()` - Create a single notification
- `createNotifications()` - Create multiple notifications
- `notifyProjectStatusChange()` - Notify about project status changes
- `notifyRegistrationStatusChange()` - Notify about registration status changes
- `notifyProgressReportSubmitted()` - Notify about progress report submission
- `notifyProgressReportReviewed()` - Notify about progress report review
- `notifyExtensionRequest()` - Notify about extension requests
- `notifyCallRoundApproval()` - Notify about call round approvals

Example usage:
```typescript
import { notifyProjectStatusChange } from "@/lib/notification-service";

// In your API route after updating project status
await notifyProjectStatusChange(
  projectId,
  oldStatus,
  newStatus,
  project
);
```

## Integration Points

Notifications are automatically triggered in the following API routes:

1. **app/api/projects/[id]/route.ts** - Project status changes
2. **app/api/progress-reports/[id]/route.ts** - Progress report reviews

## How to Add New Notification Triggers

1. Import the notification service:
```typescript
import { createNotification } from "@/lib/notification-service";
```

2. Call the appropriate notification function after your database operation:
```typescript
try {
  await createNotification({
    userId: targetUserId,
    type: "PROJECT_STATUS_CHANGE",
    title: "Your notification title",
    message: "Your notification message",
    link: "/path/to/related/page",
    metadata: { /* optional additional data */ }
  });
} catch (error) {
  console.error("Failed to send notification:", error);
  // Don't fail the request if notification fails
}
```

## Testing

To test the notification system:

1. Start the development server
2. Log in as a user
3. Trigger an action that creates a notification (e.g., change project status)
4. Check the notification bell icon in the header
5. Click the bell to see notifications
6. Click a notification to mark it as read and navigate to the link
7. Test "Mark all as read" functionality
8. Test deleting individual notifications

## Future Enhancements

- WebSocket/Server-Sent Events for real-time push notifications
- Email notifications for critical events
- In-app notification preferences
- Notification categories and filtering
- Sound alerts
- Push notifications for mobile devices
- Notification history and archive
