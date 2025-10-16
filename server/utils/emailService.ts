/**
 * Email service for sending notifications via Gmail SMTP
 * 
 * This service handles sending email notifications for various events
 * in the task management system using Gmail's SMTP service.
 */

import nodemailer from 'nodemailer'
import type { NotificationDB } from '~/types'

// Gmail SMTP configuration
const GMAIL_CONFIG = {
  user: process.env.GMAIL_USER,
  appPassword: process.env.GMAIL_APP_PASSWORD,
  service: 'gmail'
}

// Validate required environment variables
if (!GMAIL_CONFIG.user || !GMAIL_CONFIG.appPassword) {
  throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required')
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: GMAIL_CONFIG.service,
  auth: {
    user: GMAIL_CONFIG.user,
    pass: GMAIL_CONFIG.appPassword
  }
})

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailRecipient {
  email: string
  name: string
}

// Common email template styles
const COMMON_STYLES = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
  .content { padding: 30px; }
  .task-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
  .project-info { color: #6b7280; margin-bottom: 20px; }
  .cta-button { display: inline-block; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
  .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 14px; }
`

const COMMON_FOOTER = `
  <div class="footer">
    <p>This is an automated notification from your Task Management System.</p>
    <p>Please do not reply to this email.</p>
  </div>
`

const COMMON_TEXT_FOOTER = `
---
This is an automated notification from your Task Management System.
Please do not reply to this email.
`

/**
 * Extract changes from notification message
 */
export function extractChangesFromMessage(message: string): string {
  if (message.includes('has been updated:')) {
    const changesStart = message.indexOf('has been updated:') + 17
    const extractedChanges = message.substring(changesStart).trim()
    if (extractedChanges) {
      return extractedChanges
    }
  } else if (message.includes(':')) {
    // Fallback to colon-based extraction
    const colonIndex = message.lastIndexOf(':')
    if (colonIndex > 0) {
      const extractedChanges = message.substring(colonIndex + 1).trim()
      if (extractedChanges) {
        return extractedChanges
      }
    }
  }
  return 'Task details have been updated'
}

/**
 * Generate email template for task assignment notification
 */
export function generateTaskAssignmentEmail(
  taskTitle: string,
  projectName: string | null,
  assignerName: string,
  taskUrl: string
): EmailTemplate {
  const subject = `New Task Assignment: ${taskTitle}`
  const projectText = projectName ? ` in Project: "${projectName}"` : ''
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Assignment</title>
      <style>
        ${COMMON_STYLES}
        .header { background: #3b82f6; }
        .task-title { color: #1e40af; }
        .assigner-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .cta-button { background: #3b82f6 !important; color: white !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Task Assignment</h1>
        </div>
        <div class="content">
          <div class="task-title">${taskTitle}</div>
          ${projectName ? `<div class="project-info">📁 Project: ${projectName}</div>` : ''}
          
          <p>Hello!</p>
          <p>You have been assigned a new task by <strong>${assignerName}</strong>.</p>
          
          <div class="assigner-info">
            <strong>Task:</strong> ${taskTitle}${projectText}
          </div>
          
          <p>Please review the task details and start working on it as soon as possible.</p>
          
          <a href="${taskUrl}" class="cta-button" style="color: white !important;">View Task Details</a>
          
          <p>If you have any questions about this task, please contact the assigner or your project manager.</p>
        </div>
        ${COMMON_FOOTER}
      </div>
    </body>
    </html>
  `
  
  const text = `
New Task Assignment: ${taskTitle}

Hello!

You have been assigned a new task by ${assignerName}.

Task: ${taskTitle}${projectText}
Assigned by: ${assignerName}

Please review the task details and start working on it as soon as possible.

View Task: ${taskUrl}

If you have any questions about this task, please contact the assigner or your project manager.
${COMMON_TEXT_FOOTER}
  `
  
  return { subject, html, text }
}

/**
 * Generate email template for task update notification
 */
export function generateTaskUpdateEmail(
  taskTitle: string,
  projectName: string | null,
  updaterName: string,
  changes: string,
  taskUrl: string
): EmailTemplate {
  const subject = `Task Updated: ${taskTitle}`
  const projectText = projectName ? ` in Project: ${projectName}` : ''
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Updated</title>
      <style>
        ${COMMON_STYLES}
        .header { background: #f59e0b; }
        .task-title { color: #d97706; }
        .changes-info { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .updater-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .cta-button { background: #f59e0b !important; color: white !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✏️ Task Updated</h1>
        </div>
        <div class="content">
          <div class="task-title">${taskTitle}</div>
          ${projectName ? `<div class="project-info">📁 Project: ${projectName}</div>` : ''}
          
          <p>Hello!</p>
          <p>The task you're assigned to has been updated by <strong>${updaterName}</strong>.</p>
          
          <div class="updater-info">
            <strong>Task:</strong> ${taskTitle}${projectText}
          </div>
          
          <div class="changes-info">
            <strong>📝 Changes made:</strong><br>
            <div style="margin-top: 10px; padding-left: 10px; border-left: 3px solid #f59e0b;">
              ${changes.split('\n').map(change => 
                change.trim() ? `<div style="margin: 5px 0;">• ${change.trim()}</div>` : ''
              ).join('')}
            </div>
          </div>
          
          <p>Please review the changes and update your work accordingly.</p>
          
          <a href="${taskUrl}" class="cta-button" style="color: white !important;">View Updated Task</a>
          
          <p>If you have any questions about these changes, please contact the updater or your project manager.</p>
        </div>
        ${COMMON_FOOTER}
      </div>
    </body>
    </html>
  `
  
  const text = `
Task Updated: ${taskTitle}

Hello!

The task you're assigned to has been updated by ${updaterName}.

Task: ${taskTitle}${projectText}

📝 Changes made:
${changes.split('\n').map(change => 
  change.trim() ? `• ${change.trim()}` : ''
).filter(change => change).join('\n')}

Please review the changes and update your work accordingly.

View Task: ${taskUrl}

If you have any questions about these changes, please contact the updater or your project manager.
${COMMON_TEXT_FOOTER}
  `
  
  return { subject, html, text }
}

/**
 * Generate email template for deadline reminder notification
 */
export function generateDeadlineReminderEmail(
  taskTitle: string,
  projectName: string | null,
  dueDate: string,
  priority: number,
  taskUrl: string
): EmailTemplate {
  const subject = `Task Due Soon: ${taskTitle}`
  const projectText = projectName ? ` in Project: ${projectName}` : ''
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const priorityEmoji = priority >= 8 ? '🔴' : priority >= 5 ? '🟡' : '🟢'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Due Soon</title>
      <style>
        ${COMMON_STYLES}
        .header { background: #dc2626; }
        .task-title { color: #b91c1c; }
        .deadline-info { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .priority-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .cta-button { background: #dc2626 !important; color: white !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Task Due Soon</h1>
        </div>
        <div class="content">
          <div class="task-title">${taskTitle}</div>
          ${projectName ? `<div class="project-info">📁 Project: ${projectName}</div>` : ''}
          
          <p>Hello!</p>
          <p>This is a reminder that you have a task due tomorrow.</p>
          
          <div class="deadline-info">
            <strong>⏰ Due Date:</strong> ${formattedDueDate}
          </div>
          
          <div class="priority-info">
            <strong>Priority:</strong> ${priorityEmoji} Level ${priority}
          </div>
          
          <p>Please prioritise this task and ensure it's completed on time.</p>
          
          <a href="${taskUrl}" class="cta-button" style="color: white !important;">View Task Details</a>
          
          <p>If you need more time or have any blockers, please contact your project manager immediately.</p>
        </div>
        ${COMMON_FOOTER}
      </div>
    </body>
    </html>
  `
  
  const text = `
Task Due Soon: ${taskTitle}

Hello!

This is a reminder that you have a task due within 24 hours.

Task: ${taskTitle}${projectText}
Due Date: ${formattedDueDate}
Priority: Level ${priority}

Please prioritize this task and ensure it's completed on time.

View Task: ${taskUrl}

If you need more time or have any blockers, please contact your project manager immediately.
${COMMON_TEXT_FOOTER}
  `
  
  return { subject, html, text }
}

/**
 * Generate email template for new comment notification
 */
export function generateCommentEmail(
  taskTitle: string,
  projectName: string | null,
  commenterName: string,
  commentMessage: string,
  taskUrl: string
): EmailTemplate {
  const subject = `New Comment: ${taskTitle}`
  const projectText = projectName ? ` in Project: ${projectName}` : ''
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Comment</title>
      <style>
        ${COMMON_STYLES}
        .header { background: #8b5cf6; }
        .task-title { color: #7c3aed; }
        .comment-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #8b5cf6; }
        .cta-button { background: #8b5cf6 !important; color: white !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 New Comment</h1>
        </div>
        <div class="content">
          <div class="task-title">${taskTitle}</div>
          ${projectName ? `<div class="project-info">📁 Project: ${projectName}</div>` : ''}
          
          <p>Hello!</p>
          <p>A new comment has been added to this task by <strong>${commenterName}</strong>.</p>
          
          <div class="comment-box">
            <strong>Comment:</strong><br>
            ${commentMessage}
          </div>
          
          <p>A new comment has been added to this task. Check it out!</p>
          
          <a href="${taskUrl}" class="cta-button" style="color: white !important;">View Task & Comment</a>
          
          <p>If you have any questions about this comment, please contact the commenter or your project manager.</p>
        </div>
        ${COMMON_FOOTER}
      </div>
    </body>
    </html>
  `
  
  const text = `
New Comment: ${taskTitle}

Hello!

A new comment has been added to this task by ${commenterName}.

Task: ${taskTitle}${projectText}
Comment by: ${commenterName}

Comment: ${commentMessage}

A new comment has been added to this task. Check it out!

View Task: ${taskUrl}

If you have any questions about this comment, please contact the commenter or your project manager.
${COMMON_TEXT_FOOTER}
  `
  
  return { subject, html, text }
}

/**
 * Generate email template for task deletion notification
 */
export function generateTaskDeletionEmail(
  taskTitle: string,
  projectName: string | null,
  deleterName: string,
  taskUrl: string
): EmailTemplate {
  const subject = `🗑️ Task Deleted: ${taskTitle}`
  const projectText = projectName ? ` in Project: ${projectName}` : ''
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Deleted</title>
      <style>
        ${COMMON_STYLES}
        .header { background: #6b7280; }
        .task-title { color: #4b5563; }
        .deletion-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗑️ Task Deleted</h1>
        </div>
        <div class="content">
          <div class="task-title">${taskTitle}</div>
          ${projectName ? `<div class="project-info">📁 Project: ${projectName}</div>` : ''}
          
          <p>Hello!</p>
          <p>The task you were assigned to has been deleted by <strong>${deleterName}</strong>.</p>
          
          <div class="deletion-info">
            <strong>Task:</strong> ${taskTitle}${projectText}
          </div>
          
          <p>You no longer need to work on this task. If you have any questions about this deletion, please contact your project manager.</p>
        </div>
        ${COMMON_FOOTER}
      </div>
    </body>
    </html>
  `
  
  const text = `
Task Deleted: ${taskTitle}

Hello!

The task you were assigned to has been deleted by ${deleterName}.

Task: ${taskTitle}${projectText}

You no longer need to work on this task. If you have any questions about this deletion, please contact your project manager.
${COMMON_TEXT_FOOTER}
  `
  
  return { subject, html, text }
}

/**
 * Core email sending function (SMTP engine)
 */
export async function sendEmail(
  recipient: EmailRecipient,
  template: EmailTemplate
): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"Task Management System" <${GMAIL_CONFIG.user}>`,
      to: recipient.email,
      subject: template.subject,
      text: template.text,
      html: template.html
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

/**
 * Get staff email address from staff ID
 */
export async function getStaffEmail(
  supabase: any,
  staffId: number
): Promise<string | null> {
  try {
    // First get the user_id from staff table
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('user_id')
      .eq('id', staffId)
      .single()

    if (staffError || !staffData) {
      console.error('Failed to fetch staff user_id:', staffError)
      return null
    }

    // Then get the email from auth users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(staffData.user_id)
    
    if (userError || !userData?.user) {
      console.error('Failed to fetch user email:', userError)
      return null
    }

    return userData.user.email
  } catch (error) {
    console.error('Error fetching staff email:', error)
    return null
  }
}

/**
 * Get staff full name from staff ID
 */
export async function getStaffFullName(
  supabase: any,
  staffId: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('fullname')
      .eq('id', staffId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch staff full name:', error)
      return null
    }

    return data.fullname
  } catch (error) {
    console.error('Error fetching staff full name:', error)
    return null
  }
}

/**
 * Generate task URL for email links
 */
export function generateTaskUrl(taskId: number, baseUrl: string = 'http://localhost:3000'): string {
  return `${baseUrl}/task/${taskId}`
}

/**
 * Send email from database notification record
 */
export async function sendNotificationEmail(
  supabase: any,
  notification: NotificationDB
): Promise<boolean> {
  try {
    // Get recipient email and name
    const recipientEmail = await getStaffEmail(supabase, notification.staff_id)
    if (!recipientEmail) {
      console.error('No email found for staff ID:', notification.staff_id)
      return false
    }

    const recipientName = await getStaffFullName(supabase, notification.staff_id)
    const recipient: EmailRecipient = {
      email: recipientEmail,
      name: recipientName || 'User'
    }

    // Get task details if it's a task-related notification
    let taskUrl = ''
    let taskTitle = ''
    let projectName = null

    if (notification.related_task_id) {
      taskUrl = generateTaskUrl(notification.related_task_id)
      
      const { data: taskData } = await supabase
        .from('tasks')
        .select(`
          title,
          project_id,
          project:project_id (name)
        `)
        .eq('id', notification.related_task_id)
        .single()

      if (taskData) {
        taskTitle = taskData.title
        projectName = taskData.project?.name
      }
    }

    // Generate appropriate email template based on notification type
    let template: EmailTemplate

    switch (notification.type) {
      case 'task_assigned':
        const assignerName = notification.triggered_by_staff_id 
          ? await getStaffFullName(supabase, notification.triggered_by_staff_id) || 'Unknown'
          : 'System'
        template = generateTaskAssignmentEmail(taskTitle, projectName, assignerName, taskUrl)
        break

      case 'task_updated':
        const updaterName = notification.triggered_by_staff_id 
          ? await getStaffFullName(supabase, notification.triggered_by_staff_id) || 'Unknown'
          : 'System'
        
        // Extract changes from notification message
        const changes = extractChangesFromMessage(notification.message)
        
        template = generateTaskUpdateEmail(taskTitle, projectName, updaterName, changes, taskUrl)
        break

      case 'deadline_reminder':
        // Get task details for deadline reminder
        const { data: deadlineTaskData } = await supabase
          .from('tasks')
          .select('due_date, priority')
          .eq('id', notification.related_task_id)
          .single()
        
        const dueDate = deadlineTaskData?.due_date || ''
        const priority = deadlineTaskData?.priority || 'medium'
        template = generateDeadlineReminderEmail(taskTitle, projectName, dueDate, priority, taskUrl)
        break

      case 'task_deleted':
        const deleterName = notification.triggered_by_staff_id 
          ? await getStaffFullName(supabase, notification.triggered_by_staff_id) || 'Unknown'
          : 'System'
        template = generateTaskDeletionEmail(taskTitle, projectName, deleterName, taskUrl)
        break

      case 'comment_added':
        const commenterName = notification.triggered_by_staff_id 
          ? await getStaffFullName(supabase, notification.triggered_by_staff_id) || 'Unknown'
          : 'System'
        
        // Extract comment message from notification
        let commentMessage = 'A comment was added to this task'
        if (notification.message.includes('": "')) {
          const commentStart = notification.message.indexOf('": "') + 4
          const commentEnd = notification.message.lastIndexOf('"')
          if (commentEnd > commentStart) {
            commentMessage = notification.message.substring(commentStart, commentEnd)
          }
        }
        
        template = generateCommentEmail(taskTitle, projectName, commenterName, commentMessage, taskUrl)
        break

      default:
        // Generic notification email
        template = {
          subject: notification.title,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>${notification.title}</title>
              <style>
                ${COMMON_STYLES}
                .header { background: #3b82f6; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📢 ${notification.title}</h1>
                </div>
                <div class="content">
                  <p>${notification.message}</p>
                  ${taskUrl ? `<a href="${taskUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">View Details</a>` : ''}
                </div>
                ${COMMON_FOOTER}
              </div>
            </body>
            </html>
          `,
          text: `${notification.title}\n\n${notification.message}${taskUrl ? `\n\nView Details: ${taskUrl}` : ''}${COMMON_TEXT_FOOTER}`
        }
        break
    }

    // Send the email
    const success = await sendEmail(recipient, template)
    
    if (success) {
      // Update notification to mark email as sent
      await supabase
        .from('notifications')
        .update({ is_email_sent: true })
        .eq('id', notification.id)
    }

    return success
  } catch (error) {
    console.error('Error sending notification email:', error)
    return false
  }
}
