import { useState } from 'react'
import { DEMO_OTP } from '@/data'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { OtpInput, PhoneInput } from '@/components/forms/inputs'
import { isValidMobile } from '@/lib/validators'
import { useOtpChallenge } from './use-otp'

interface OtpSignInProps {
  /** Called with the verified mobile number. */
  onVerified: (phone: string) => void
  verifyLabel?: string
  /** Pre-fills the number (change mobile flow). */
  initialPhone?: string
  /** Hidden when the caller already explains what the panel is for. */
  hint?: string
}

/**
 * Mobile number, then the six-digit code. Used by checkout's inline sign-in, the auth
 * screens and "change mobile number" in settings — one flow, one set of messages.
 */
export function OtpSignIn({ onVerified, verifyLabel = 'Verify and continue', initialPhone = '', hint }: OtpSignInProps) {
  const [phone, setPhone] = useState(initialPhone)
  const [otp, setOtp] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const challenge = useOtpChallenge()

  const sendCode = () => {
    if (!isValidMobile(phone)) {
      setPhoneError('Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.')
      return
    }
    setPhoneError(null)
    setOtp('')
    setOtpError(null)
    challenge.send()
  }

  const verify = () => {
    if (otp.trim().length !== 6) {
      setOtpError('Enter the 6-digit code.')
      return
    }
    if (otp.trim() !== DEMO_OTP) {
      setOtpError('That code is not right. Check the digits and try again.')
      return
    }
    setOtpError(null)
    onVerified(phone)
  }

  return (
    <div className="flex flex-col gap-4">
      {hint ? <p className="type-body text-fg-muted">{hint}</p> : null}

      <Field label="Mobile number" error={phoneError} hint={challenge.sent ? undefined : 'We send a 6-digit code to this number.'}>
        {(ids) => (
          <div className="flex flex-wrap items-start gap-2">
            <PhoneInput
              id={ids.id}
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  sendCode()
                }
              }}
              invalid={ids.invalid}
              aria-describedby={ids.describedBy}
              disabled={challenge.sent}
              wrapperClassName="min-w-0 flex-1"
            />
            {challenge.sent ? (
              <Button variant="ghost" onClick={challenge.reset}>
                Change
              </Button>
            ) : (
              <Button onClick={sendCode}>Send code</Button>
            )}
          </div>
        )}
      </Field>

      {challenge.sent ? (
        <Field
          label="6-digit code"
          error={otpError}
          hint={`Demo code: ${DEMO_OTP}. Nothing is actually sent by SMS.`}
          labelAction={
            <Button variant="link" size="sm" disabled={!challenge.canResend} onClick={sendCode}>
              {challenge.resendLabel}
            </Button>
          }
        >
          {(ids) => (
            <OtpInput
              id={ids.id}
              value={otp}
              onChange={setOtp}
              invalid={ids.invalid}
              aria-describedby={ids.describedBy}
              aria-label="6-digit code"
            />
          )}
        </Field>
      ) : null}

      {challenge.sent ? (
        <Button fullWidth onClick={verify}>
          {verifyLabel}
        </Button>
      ) : null}
    </div>
  )
}
