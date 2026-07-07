import { Injectable, Logger } from '@nestjs/common';

interface DeniedEvent {
  actorId: string;
  resource: string;
  resourceId: string;
  action: string;
  timestamp: string;
  ip?: string;
}

/**
 * SecurityAuditService — centralised logging for denied access attempts.
 *
 * Rules:
 * - Never log PII (email, card data, passwords).
 * - Log actorId (JWT userId), resourceId, action, timestamp, and IP.
 * - Track repeated 403s per actor for enumeration detection.
 */
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger('SECURITY_AUDIT');

  /** In-memory 403 counter per actor for enumeration detection (use Redis in prod) */
  private readonly denialCounter = new Map<string, { count: number; windowStart: number }>();
  private readonly WINDOW_MS = 60_000;      // 1-minute window
  private readonly ALERT_THRESHOLD = 10;    // alert after 10 denials in window

  logDenied(event: DeniedEvent): void {
    this.logger.warn(
      `ACCESS_DENIED actor=${event.actorId} resource=${event.resource} ` +
      `id=${event.resourceId} action=${event.action} ` +
      `ip=${event.ip ?? 'unknown'} ts=${event.timestamp}`,
    );

    this.trackEnumeration(event.actorId);
  }

  private trackEnumeration(actorId: string): void {
    const now = Date.now();
    const record = this.denialCounter.get(actorId);

    if (!record || now - record.windowStart > this.WINDOW_MS) {
      this.denialCounter.set(actorId, { count: 1, windowStart: now });
      return;
    }

    record.count++;

    if (record.count === this.ALERT_THRESHOLD) {
      this.logger.error(
        `ENUMERATION_ALERT actor=${actorId} reached ${this.ALERT_THRESHOLD} ` +
        `denials within ${this.WINDOW_MS / 1000}s — possible resource enumeration`,
      );
    }
  }
}
