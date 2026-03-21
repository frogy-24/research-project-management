import prisma from "@/lib/prisma";
import { NotificationType } from "@/prisma/generated/prisma";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
) {
  try {
    return await prisma.notification.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error("Error creating notifications:", error);
    throw error;
  }
}

/**
 * Notify about project status change
 */
export async function notifyProjectStatusChange(
  projectId: string,
  oldStatus: string,
  newStatus: string,
  project: any
) {
  const notifications: CreateNotificationParams[] = [];
  
  // Notify project leader
  notifications.push({
    userId: project.leaderId,
    type: "PROJECT_STATUS_CHANGE",
    title: "Project Status Updated",
    message: `Your project "${project.title}" status changed from ${oldStatus} to ${newStatus}`,
    link: `/lecturer/projects`,
    metadata: { projectId, oldStatus, newStatus },
  });

  // If there's an instructor, notify them too
  if (project.instructorId) {
    notifications.push({
      userId: project.instructorId,
      type: "PROJECT_STATUS_CHANGE",
      title: "Project Status Updated",
      message: `Project "${project.title}" status changed from ${oldStatus} to ${newStatus}`,
      link: `/lecturer/guidance`,
      metadata: { projectId, oldStatus, newStatus },
    });
  }

  // If dean reviewer is assigned, notify them
  if (project.deanReviewerId && newStatus === "SUBMITTED") {
    notifications.push({
      userId: project.deanReviewerId,
      type: "DEAN_REVIEW_ASSIGNED",
      title: "New Project for Review",
      message: `Project "${project.title}" has been submitted and requires your review`,
      link: `/dean/approvals`,
      metadata: { projectId },
    });
  }

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }
}

/**
 * Notify about registration status change
 */
export async function notifyRegistrationStatusChange(
  registrationId: string,
  oldStatus: string,
  newStatus: string,
  registration: any
) {
  const notifications: CreateNotificationParams[] = [];

  // Notify the student
  notifications.push({
    userId: registration.userId,
    type: "REGISTRATION_STATUS_CHANGE",
    title: "Registration Status Updated",
    message: `Your project registration "${registration.title}" status changed to ${newStatus}`,
    link: `/student/projects`,
    metadata: { registrationId, oldStatus, newStatus },
  });

  // If instructor is assigned, notify them
  if (registration.instructorId && newStatus === "APPROVED") {
    notifications.push({
      userId: registration.instructorId,
      type: "INSTRUCTOR_ASSIGNED",
      title: "New Project Guidance Assignment",
      message: `You have been assigned to guide the project "${registration.title}"`,
      link: `/lecturer/guidance`,
      metadata: { registrationId },
    });
  }

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }
}

/**
 * Notify about progress report submission
 */
export async function notifyProgressReportSubmitted(
  reportId: string,
  projectId: string,
  project: any,
  periodLabel: string
) {
  const notifications: CreateNotificationParams[] = [];

  // Notify instructor
  if (project.instructorId) {
    notifications.push({
      userId: project.instructorId,
      type: "PROGRESS_REPORT_SUBMITTED",
      title: "New Progress Report",
      message: `A progress report for "${project.title}" (${periodLabel}) has been submitted`,
      link: `/lecturer/review-progress`,
      metadata: { reportId, projectId, periodLabel },
    });
  }

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }
}

/**
 * Notify about progress report review
 */
export async function notifyProgressReportReviewed(
  reportId: string,
  projectId: string,
  project: any,
  periodLabel: string,
  score?: number
) {
  // Notify project leader
  await createNotification({
    userId: project.leaderId,
    type: "PROGRESS_REPORT_REVIEWED",
    title: "Progress Report Reviewed",
    message: `Your progress report for "${project.title}" (${periodLabel}) has been reviewed${score ? ` - Score: ${score}` : ""}`,
    link: `/lecturer/progress`,
    metadata: { reportId, projectId, periodLabel, score },
  });
}

/**
 * Notify about extension request
 */
export async function notifyExtensionRequest(
  requestId: string,
  projectId: string,
  project: any,
  requestedMonths: number
) {
  const notifications: CreateNotificationParams[] = [];

  // Notify dean/admin about the extension request
  // This would need to fetch appropriate users based on role
  // For now, just notify project members about status changes

  if (notifications.length > 0) {
    await createNotifications(notifications);
  }
}

/**
 * Notify about call round approval
 */
export async function notifyCallRoundApproval(
  callRoundId: string,
  callRound: any,
  approved: boolean
) {
  if (callRound.createdById) {
    await createNotification({
      userId: callRound.createdById,
      type: approved ? "CALL_ROUND_APPROVED" : "CALL_ROUND_REJECTED",
      title: approved ? "Call Round Approved" : "Call Round Rejected",
      message: approved
        ? `Your call round "${callRound.name}" has been approved`
        : `Your call round "${callRound.name}" has been rejected`,
      link: `/dean/call-rounds`,
      metadata: { callRoundId, approvalNote: callRound.approvalNote },
    });
  }
}
