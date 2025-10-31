// stable, exported enum of error codes the frontend can act on
export enum SupabaseAuthErrorCode {
  InvalidCredentials = 'invalid_credentials',
  InvalidEmail = 'invalid_email',
  InvalidPassword = 'invalid_password',
  EmailAlreadyExists = 'email_already_exists',
  UserAlreadyExists = 'user_already_exists',
  EmailNotConfirmed = 'email_not_confirmed',
  AccountDisabled = 'account_disabled',
  RateLimited = 'rate_limited',
  EmailSendFailed = 'email_send_failed',
  ServerError = 'server_error',
  Unknown = 'unknown'
}

export interface SupabaseAuthErrorPayload {
  /** machine code for client branching */
  code: SupabaseAuthErrorCode;
  /** short user message key for i18n (frontend resolves this) */
  messageKey?: string;
  /** fallback english text if client has no localization available */
  message?: string;
  /** optional HTTP status override */
  status?: number;
  /** optional meta for non-sensitive hints (retry seconds, provider, field) */
  meta?: { retryAfterSecs?: number; provider?: string; field?: string };
}