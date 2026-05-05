/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface SecurityAlertProps {
  eventType?: string
  email?: string
  ip?: string
  country?: string
  userAgent?: string
  details?: Record<string, any>
  occurredAt?: string
}

const EVENT_TITLES: Record<string, string> = {
  concurrent_sessions: '🚨 Concurrent sessions detected',
  suspicious_signup: '⚠️ Suspicious signup pattern',
  multi_company_attempt: '⚠️ Multi-company signup attempt',
}

const SecurityAlertEmail = ({
  eventType,
  email,
  ip,
  country,
  userAgent,
  details,
  occurredAt,
}: SecurityAlertProps) => {
  const title = EVENT_TITLES[eventType || ''] || `Security event: ${eventType}`
  const detailsJson = details ? JSON.stringify(details, null, 2) : ''
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light only" />
      </Head>
      <Preview>{title} — {email || 'unknown'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={subtext}>
            Revamo detected something worth a look. Details below.
          </Text>

          <Section style={card}>
            <Text style={row}><strong>Event:</strong> {eventType || '—'}</Text>
            <Text style={row}><strong>Account:</strong> {email || '—'}</Text>
            <Text style={row}><strong>IP:</strong> {ip || '—'}</Text>
            <Text style={row}><strong>Country:</strong> {country || '—'}</Text>
            <Text style={row}><strong>User agent:</strong> {userAgent || '—'}</Text>
            <Text style={row}><strong>Time:</strong> {occurredAt || new Date().toISOString()}</Text>
          </Section>

          {detailsJson && detailsJson !== '{}' && (
            <>
              <Text style={metaLabel}>Details</Text>
              <pre style={pre}>{detailsJson}</pre>
            </>
          )}

          <Text style={footer}>
            Automated alert from Revamo security monitoring.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SecurityAlertEmail,
  subject: (data: Record<string, any>) => {
    const title = EVENT_TITLES[data?.eventType || ''] || `Security event: ${data?.eventType || 'unknown'}`
    return `${title} — ${data?.email || 'unknown'}`
  },
  to: 'rorourke@revamo.ai',
  displayName: 'Security alert',
  previewData: {
    eventType: 'concurrent_sessions',
    email: 'user@example.com',
    ip: '203.0.113.42',
    country: 'IE',
    userAgent: 'Mozilla/5.0',
    details: { otherSessions: 2 },
    occurredAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

export default SecurityAlertEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 8px' }
const subtext = { fontSize: '14px', color: '#64748b', margin: '0 0 20px', lineHeight: '1.5' }
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px 18px',
  margin: '0 0 20px',
  backgroundColor: '#f8fafc',
}
const row = { fontSize: '14px', color: '#0f172a', margin: '4px 0', lineHeight: '1.5' }
const metaLabel = { fontSize: '12px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 6px' }
const pre = {
  fontSize: '12px',
  color: '#0f172a',
  backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '12px',
  overflow: 'auto',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  margin: '0 0 20px',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '20px 0 0', textAlign: 'center' as const }
