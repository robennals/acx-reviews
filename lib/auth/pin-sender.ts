import type { PinSender } from './pin';
import { postmarkPinSender } from './pin-sender-postmark';
import { resendPinSender } from './pin-sender-resend';

/**
 * Pick the PIN email provider by name. Pure so it can be unit tested;
 * unknown names throw rather than silently falling back, so a typo in
 * EMAIL_PROVIDER fails loudly instead of sending via the wrong service.
 */
export function pinSenderFor(provider: string | undefined): PinSender {
  switch ((provider ?? 'postmark').trim().toLowerCase()) {
    case '':
    case 'postmark':
      return postmarkPinSender;
    case 'resend':
      return resendPinSender;
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
  }
}

/** The provider selected by the EMAIL_PROVIDER env var (default: postmark). */
export function activePinSender(): PinSender {
  return pinSenderFor(process.env.EMAIL_PROVIDER);
}
