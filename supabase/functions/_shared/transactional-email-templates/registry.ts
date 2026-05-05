/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as signupAttemptNotification } from './signup-attempt-notification.tsx'
import { template as signupCompletionNotification } from './signup-completion-notification.tsx'
import { template as securityAlert } from './security-alert.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome,
  'signup-attempt-notification': signupAttemptNotification,
  'signup-completion-notification': signupCompletionNotification,
  'security-alert': securityAlert,
}
