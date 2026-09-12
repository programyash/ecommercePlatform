import { useEffect, useState } from 'react'

export interface OtpChallenge {
  /** Has a code been sent yet? */
  sent: boolean
  secondsLeft: number
  canResend: boolean
  /** "Resend code" once the cooldown is over, a countdown before that. */
  resendLabel: string
  send: () => void
  reset: () => void
}

/**
 * The mock OTP challenge every sign-in shares: send a code, wait out a 30-second
 * cooldown, resend. The code itself is always `DEMO_OTP`.
 */
export function useOtpChallenge(cooldownSeconds = 30): OtpChallenge {
  const [sent, setSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const running = secondsLeft > 0

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  return {
    sent,
    secondsLeft,
    canResend: sent && secondsLeft === 0,
    resendLabel: secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code',
    send: () => {
      setSent(true)
      setSecondsLeft(cooldownSeconds)
    },
    reset: () => {
      setSent(false)
      setSecondsLeft(0)
    },
  }
}
