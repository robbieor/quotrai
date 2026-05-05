/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://leojhjynyxhpfyrbcabf.supabase.co/storage/v1/object/public/email-assets/revamo-logo.png'
const APP_URL = 'https://revamo.ai'

interface WelcomeEmailProps {
  variant?: 'self_signup' | 'team_invite'
  name?: string
  teamName?: string
  inviterName?: string
  role?: string
}

const WelcomeEmail = ({
  variant = 'self_signup',
  name,
  teamName,
  inviterName,
  role,
}: WelcomeEmailProps) => {
  const isInvite = variant === 'team_invite'
  const greetingName = name && name.trim().length > 0 ? name.split(' ')[0] : null
  const heroTitle = isInvite
    ? `Welcome to ${teamName || 'the team'}`
    : greetingName
      ? `Welcome to revamo, ${greetingName}`
      : 'Welcome to revamo'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isInvite
          ? `You've joined ${teamName || 'the team'} on revamo`
          : 'Your AI Operating System for field service is ready'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={header}>
            <Img src={LOGO_URL} width="48" height="48" alt="revamo" style={logo} />
            <Text style={brandName}>revamo</Text>
          </div>

          <Heading style={h1}>{heroTitle}</Heading>
          <Text style={positioning}>
            The AI Operating System for field service.
          </Text>

          {isInvite && inviterName && (
            <Text style={inviteLine}>
              {inviterName} added you{role ? ` as ${role}` : ''}. You're all set
              — jump in below.
            </Text>
          )}

          <Section style={cardsWrap}>
            <div style={card}>
              <Text style={cardNumber}>1</Text>
              <div>
                <Text style={cardTitle}>Add your first job</Text>
                <Text style={cardCopy}>
                  Schedule work, assign the crew, track it from quote to paid.
                </Text>
              </div>
            </div>
            <div style={card}>
              <Text style={cardNumber}>2</Text>
              <div>
                <Text style={cardTitle}>Send your first quote</Text>
                <Text style={cardCopy}>
                  Branded, professional, and ready in under a minute.
                </Text>
              </div>
            </div>
            <div style={card}>
              <Text style={cardNumber}>3</Text>
              <div>
                <Text style={cardTitle}>Meet George, your AI foreman</Text>
                <Text style={cardCopy}>
                  Ask him anything. He'll run the admin so you can run the job.
                </Text>
              </div>
            </div>
          </Section>

          <div style={ctaWrap}>
            <Button style={button} href={`${APP_URL}/dashboard`}>
              Open your dashboard
            </Button>
          </div>

          <Text style={support}>
            Questions? Hit reply or email{' '}
            <Link href="mailto:support@foreman.ie" style={link}>
              support@foreman.ie
            </Link>
            . We answer fast.
          </Text>

          <Text style={closing}>We're glad to have you on the tools.</Text>
          <Text style={signoff}>— The revamo team</Text>

          <Text style={footerBrand}>© revamo · revamo.ai</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: (data: Record<string, any>) =>
    data?.variant === 'team_invite'
      ? `Welcome to ${data?.teamName || 'the team'} on revamo`
      : 'Welcome to revamo',
  displayName: 'Welcome',
  previewData: {
    variant: 'self_signup',
    name: 'Jane Doe',
  },
} satisfies TemplateEntry

export default WelcomeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '520px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '32px' }
const logo = { borderRadius: '12px', margin: '0 auto' }
const brandName = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '12px 0 0',
  letterSpacing: '-0.03em',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 8px',
  letterSpacing: '-0.02em',
  lineHeight: '1.2',
}
const positioning = {
  fontSize: '15px',
  color: '#64748b',
  margin: '0 0 24px',
  lineHeight: '1.5',
}
const inviteLine = {
  fontSize: '14px',
  color: '#0f172a',
  backgroundColor: '#f1f5f9',
  padding: '12px 16px',
  borderRadius: '8px',
  margin: '0 0 24px',
  lineHeight: '1.5',
}
const cardsWrap = { margin: '8px 0 28px' }
const card = {
  display: 'flex',
  alignItems: 'flex-start' as const,
  gap: '14px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  marginBottom: '10px',
}
const cardNumber = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  backgroundColor: '#00E6A0',
  width: '24px',
  height: '24px',
  minWidth: '24px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  lineHeight: '24px',
  margin: '0',
}
const cardTitle = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 2px',
}
const cardCopy = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0',
  lineHeight: '1.5',
}
const ctaWrap = { textAlign: 'center' as const, margin: '8px 0 28px' }
const button = {
  backgroundColor: '#00E6A0',
  color: '#0f172a',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const support = {
  fontSize: '14px',
  color: '#475569',
  margin: '0 0 24px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
}
const link = { color: '#0f172a', textDecoration: 'underline' }
const closing = {
  fontSize: '15px',
  color: '#0f172a',
  margin: '24px 0 4px',
  fontWeight: '600' as const,
}
const signoff = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 32px',
}
const footerBrand = {
  fontSize: '12px',
  color: '#cbd5e1',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}
