import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

interface OtpRecord {
  hashedOtp: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

export interface PendingSignup {
  email: string;
  phone: string;
  username: string;
  hashedPassword: string;
  expiresAt: number;
}

/** One-time password-reset token record — stored hashed, expires in 15 min */
interface ResetTokenRecord {
  hashedToken: string;
  expiresAt: number;
  used: boolean;
}

@Injectable()
export class OtpStoreService {
  private readonly logger = new Logger(OtpStoreService.name);
  private store = new Map<string, OtpRecord>();
  private rateLimits = new Map<string, RateLimitRecord>();
  private pendingSignups = new Map<string, PendingSignup>();
  private resetTokens = new Map<string, ResetTokenRecord>(); // keyed by email

  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly RATE_LIMIT_MAX = 5; // max OTP requests per window

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Check if user is rate-limited for OTP requests.
   * Returns seconds remaining if limited, 0 otherwise.
   */
  checkRateLimit(email: string): number {
    const key = `rate:${email}`;
    const record = this.rateLimits.get(key);
    const now = Date.now();

    if (!record || now - record.windowStart > this.RATE_LIMIT_WINDOW_MS) {
      return 0;
    }

    if (record.count >= this.RATE_LIMIT_MAX) {
      const remaining = Math.ceil(
        (record.windowStart + this.RATE_LIMIT_WINDOW_MS - now) / 1000,
      );
      return remaining > 0 ? remaining : 0;
    }

    return 0;
  }

  private incrementRateLimit(email: string): void {
    const key = `rate:${email}`;
    const now = Date.now();
    const record = this.rateLimits.get(key);

    if (!record || now - record.windowStart > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(key, { count: 1, windowStart: now });
    } else {
      record.count++;
    }
  }

  /**
   * Store an OTP for a given email. Single-use, time-bound.
   */
  storeOtp(email: string, otp: string): void {
    this.incrementRateLimit(email);
    this.store.set(email, {
      hashedOtp: this.hashOtp(otp),
      expiresAt: Date.now() + this.OTP_TTL_MS,
      attempts: 0,
      createdAt: Date.now(),
    });
    this.logger.log(`OTP stored for ${email}, expires in 5 minutes`);
  }

  /**
   * Verify OTP. Returns true if valid, false otherwise.
   * Handles expiry, single-use, and retry limits.
   */
  verifyOtp(email: string, otp: string): { valid: boolean; message: string } {
    const record = this.store.get(email);

    if (!record) {
      return { valid: false, message: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(email);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.store.delete(email);
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    record.attempts++;

    if (this.hashOtp(otp) === record.hashedOtp) {
      this.store.delete(email); // single-use
      return { valid: true, message: 'OTP verified successfully' };
    }

    return {
      valid: false,
      message: `Invalid OTP. ${this.MAX_ATTEMPTS - record.attempts} attempts remaining.`,
    };
  }

  /**
   * Store pending signup data (user not yet created in DB).
   */
  storePendingSignup(email: string, data: PendingSignup): void {
    this.pendingSignups.set(email, data);
    this.logger.log(`Pending signup stored for ${email}`);
  }

  /**
   * Retrieve and remove pending signup data.
   */
  consumePendingSignup(email: string): PendingSignup | null {
    const data = this.pendingSignups.get(email);
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      this.pendingSignups.delete(email);
      return null;
    }
    this.pendingSignups.delete(email);
    return data;
  }

  // ─── Password-reset tokens ───────────────────────────────────────────────

  /**
   * Store a hashed one-time reset token for an email (15 min TTL).
   * Returns the plain-text token to be returned to the verified caller.
   */
  storeResetToken(email: string, plainToken: string): void {
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    this.resetTokens.set(email, {
      hashedToken,
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
    });
    this.logger.log(`Reset token stored for ${email}`);
  }

  /**
   * Verify and consume a reset token. Single-use.
   * Returns true only if the token matches, is not expired, and has not been used.
   */
  consumeResetToken(email: string, plainToken: string): { valid: boolean; message: string } {
    const record = this.resetTokens.get(email);

    if (!record) {
      return { valid: false, message: 'No reset token found. Please restart the password reset process.' };
    }
    if (record.used) {
      this.resetTokens.delete(email);
      return { valid: false, message: 'Reset token has already been used.' };
    }
    if (Date.now() > record.expiresAt) {
      this.resetTokens.delete(email);
      return { valid: false, message: 'Reset token has expired. Please restart the password reset process.' };
    }

    const hashedInput = crypto.createHash('sha256').update(plainToken).digest('hex');
    if (hashedInput !== record.hashedToken) {
      return { valid: false, message: 'Invalid reset token.' };
    }

    // Consume — mark used then delete
    this.resetTokens.delete(email);
    return { valid: true, message: 'Token verified' };
  }

  /**
   * Remove expired entries periodically (call from a cron or interval).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.expiresAt) this.store.delete(key);
    }
    for (const [key, record] of this.rateLimits.entries()) {
      if (now - record.windowStart > this.RATE_LIMIT_WINDOW_MS) this.rateLimits.delete(key);
    }
    for (const [key, data] of this.pendingSignups.entries()) {
      if (now > data.expiresAt) this.pendingSignups.delete(key);
    }
    for (const [key, record] of this.resetTokens.entries()) {
      if (now > record.expiresAt) this.resetTokens.delete(key);
    }
  }
}
