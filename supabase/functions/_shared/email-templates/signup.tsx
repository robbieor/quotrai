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
  Hr,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://foreman.world/foreman-logo.png'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Foreman — verify your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="Foreman" width="140" style={logoImg} />
        </Section>
        <Section style={content}>
          <Heading style={h1}>Welcome to Foreman 🎉</Heading>
          <Text style={text}>
            You're one step away from running your trade business smarter. Verify your email to unlock your{' '}
            <strong>30-day Pro trial</strong> — no credit card needed.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify & Get Started
          </Button>

          <Hr style={divider} />

          <Heading as="h2" style={h2}>Here's what to do first</Heading>

          <Text style={stepText}>
            <strong>1. Create your first quote</strong><br />
            Generate a professional quote in seconds. Foreman handles formatting, pricing, and delivery.
          </Text>
          <Text style={stepText}>
            <strong>2. Add your customers</strong><br />
            Import or add customers so Foreman can track jobs, invoices, and communications for you.
          </Text>
          <Text style={stepText}>
            <strong>3. Meet George AI</strong><br />
            Your AI assistant that creates quotes, chases invoices, and handles admin — just tell him what you need.
          </Text>

          <Hr style={divider} />

          <Text style={trustText}>
            ✅ 30-day full Pro trial &nbsp;·&nbsp; ✅ No credit card required &nbsp;·&nbsp; ✅ Cancel anytime
          </Text>

          <Text style={footer}>
            If you didn't create a Foreman account, you can safely ignore this email.
          </Text>
          <Text style={footer}>
            Need help?{' '}
            <Link href="mailto:support@foreman.ie" style={link}>
              support@foreman.ie
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
const container = { margin: '0 auto', maxWidth: '600px' }
const header = { backgroundColor: '#0f172a', padding: '30px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoImg = { display: 'block' as const, margin: '0 auto' }
const content = { padding: '30px 25px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' }
const stepText = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const trustText = { fontSize: '13px', color: '#0f172a', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const link = { color: '#00E6A0', textDecoration: 'underline' }
const button = { backgroundColor: '#00E6A0', color: '#0f172a', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' as const }
const divider = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }
