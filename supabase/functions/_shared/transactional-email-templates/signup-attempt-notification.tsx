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

interface SignupAttemptProps {
  email?: string
  fullName?: string
  timestamp?: string
  metadata?: Record<string, any>
}

const SignupAttemptEmail = ({
  email,
  fullName,
  timestamp,
  metadata,
}: SignupAttemptProps) => {
  const metaJson = metadata ? JSON.stringify(metadata, null, 2) : ''
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </Head>
      <Preview>New signup attempt: {email || 'unknown'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🟡 New signup attempt</Heading>
          <Text style={subtext}>
            Someone just submitted the signup form on revamo.ai. They have not
            yet verified their email.
          </Text>

          <Section style={card}>
            <Text style={row}><strong>Email:</strong> {email || '—'}</Text>
            <Text style={row}><strong>Name:</strong> {fullName || '—'}</Text>
            <Text style={row}><strong>Time:</strong> {timestamp || new Date().toISOString()}</Text>
          </Section>

          {metaJson && (
            <>
              <Text style={metaLabel}>Full metadata</Text>
              <pre style={pre}>{metaJson}</pre>
            </>
          )}

          <Text style={footer}>
            Sent automatically by revamo. You'll get a follow-up when (and if)
            they verify their email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SignupAttemptEmail,
  subject: (data: Record<string, any>) =>
    `🟡 Signup attempt: ${data?.email || 'unknown'}`,
  to: 'rorourke@revamo.ai',
  displayName: 'Signup attempt notification',
  previewData: {
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    timestamp: new Date().toISOString(),
    metadata: { source: 'web', ref: 'launch' },
  },
} satisfies TemplateEntry

export default SignupAttemptEmail

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
