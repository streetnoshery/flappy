import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USR,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  generateOtp(length: number = 6): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpEmailTemplate(otp: string): string {
    return `<div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
      <div style="max-width:500px; margin:0 auto; background:#ffffff; border-radius:12px; padding:30px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        <h2 style="margin:0; color:#222; text-align:center;">🔐 Flappy Login Verification</h2>
        <p style="text-align:center; color:#666; font-size:14px;">Secure access to your account</p>
        <div style="margin:30px 0; text-align:center;">
          <p style="font-size:16px; color:#333;">Your One-Time Password (OTP)</p>
          <div style="display:inline-block; padding:14px 24px; font-size:28px; letter-spacing:6px; font-weight:bold; color:#ffffff; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:10px;">
            ${otp.split('').join(' ')}
          </div>
          <p style="margin-top:10px; font-size:13px; color:#888;">This OTP is valid for <b>5 minutes</b></p>
        </div>
        <p style="font-size:14px; color:#444; line-height:1.6;">Use this OTP to complete your login to <b>Flappy</b>. Do not share this code with anyone for security reasons.</p>
        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
        <p style="font-size:12px; color:#999; text-align:center;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:12px; color:#bbb; text-align:center;">© ${new Date().getFullYear()} Flappy. All rights reserved.</p>
      </div>
    </div>`;
  }

  async sendOtpViaEmail(userEmail: string): Promise<string> {
    const otp = this.generateOtp();
    console.log("Sending otp start")

    const mailOptions = {
      from: `"Flappy" <${process.env.EMAIL_USR}>`,
      to: userEmail,
      subject: `Your Flappy OTP is ${otp} (Valid for 5 mins)`,
      headers: {
        'Message-ID': `${crypto.randomUUID()}@flappy.com`,
        'X-Entity-Ref-ID': `${Date.now()}`,
      },
      html: this.getOtpEmailTemplate(otp),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${userEmail}: ${info.response}`);
      return otp;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${userEmail}`, error);
      throw new Error('Failed to send OTP email');
    }
  }
}
