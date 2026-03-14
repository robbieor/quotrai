/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Quotr verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://leojhjynyxhpfyrbcabf.supabase.co/storage/v1/object/public/email-assets/quotr-logo.png"
          width="48"
          height="48"
          alt="Quotr"
          style={logo}
        />
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { borderRadius: '12px', marginBottom: '24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 30px',
  backgroundColor: '#f0fdf4',
  padding: '12px 20px',
  borderRadius: '12px',
  border: '1px solid #00E699',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '30px 0 0' }
