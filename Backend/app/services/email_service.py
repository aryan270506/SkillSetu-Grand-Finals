import smtplib
import random
import string
import logging
from typing import Optional, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger("email_service")

# In-memory store for OTPs: { email: {"otp": str, "timestamp": float} }
otp_store = {}


def generate_otp(length: int = 6) -> str:
    """Generate a 6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))


def send_html_email(to_email: str, subject: str, html_body: str, plain_body: str = "") -> Tuple[bool, Optional[str]]:
    """
    Core HTML email delivery using the verified SkillSetu OTP sender.
    Returns (success: bool, error_message: Optional[str]).
    """
    clean_to = to_email.strip() if to_email else ""
    if not clean_to:
        return False, "Recipient email address is required"

    sender_header = f"SkillSetu <{settings.MAIL_FROM}>"

    if not settings.SMTP_PASSWORD:
        logger.info(f"[DEV MODE - NO SMTP PASSWORD CONFIGURED]")
        logger.info(f"From: {sender_header} | To: {clean_to} | Subject: {subject}")
        print(f"\n[DEV MODE - EMAIL SIMULATION]")
        print(f"From: {sender_header}")
        print(f"To: {clean_to}")
        print(f"Subject: {subject}\n")
        return True, None

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = sender_header
        msg['To'] = clean_to
        msg['Subject'] = subject

        if plain_body:
            msg.attach(MIMEText(plain_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email successfully delivered to {clean_to} with subject '{subject}'")
        return True, None
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Error sending email to {clean_to} via SMTP: {err_msg}")
        return False, err_msg


def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends OTP email using SMTP from verified sender.
    If SMTP_PASSWORD is not set, logs the OTP for dev testing.
    """
    subject = "SkillSetu Student Registration - Your Verification Code"
    body = f"""
    Hello,

    Welcome to SkillSetu!

    Your 6-digit email verification code for student sign-up is:

        {otp}

    This OTP is valid for 10 minutes. If you did not request this code, please ignore this email.

    Best regards,
    SkillSetu Team
    """

    if not settings.SMTP_PASSWORD:
        print(f"\n[DEV MODE - NO SMTP PASSWORD CONFIGURED]")
        print(f"From: {settings.MAIL_FROM}")
        print(f"To: {to_email}")
        print(f"OTP: {otp}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = f"SkillSetu <{settings.MAIL_FROM}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Error sending OTP email via SMTP: {e}")
        return False


def _format_status_title(status_str: str) -> str:
    """Formats raw status string to human-friendly display."""
    if not status_str:
        return "Applied"
    s = status_str.replace("_", " ").replace("-", " ").strip().title()
    if s.upper() == "REJECTED":
        return "Not Selected"
    return s


def send_shortlist_email(
    to_email: str,
    student_name: str,
    internship_title: str,
    company_name: str,
    previous_status: str = "Applied",
    location: str = "Hybrid",
    work_mode: str = "Hybrid",
    duration: str = "6 Months",
    stipend: str = "Competitive",
    application_id: str = "",
    next_steps_text: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Sends a professional candidate shortlist email to the student using the canonical verified sender.
    Explicitly begins with 'This is to inform you that...' and explains why they received the email,
    previous status, new status, reason, what it means, and next steps.
    """
    first_name = (student_name or "Candidate").split()[0].title()
    subject = f"Your Application Has Been Shortlisted – {internship_title} at {company_name}"
    prev_status_display = _format_status_title(previous_status)
    new_status_display = "Shortlisted"
    reason_text = "Your application has been reviewed by the recruiting team and you have been shortlisted to proceed to the next stage of the selection process."
    meaning_text = "Your application has been shortlisted and you have been moved to the next stage of the recruitment process."

    if not next_steps_text or not next_steps_text.strip():
        next_steps_formatted = "The recruiting team will contact you through SkillSetu with further instructions regarding the next stage."
    else:
        next_steps_formatted = next_steps_text.strip()

    stipend_display = stipend if stipend and str(stipend).strip() else "As per role terms"
    duration_display = duration if duration and str(duration).strip() else "Standard Cohort"
    app_id_display = application_id if application_id else "APP-DIRECT"

    plain_body = f"""SkillSetu
Verified Skills & Recruitment Platform

Hello {first_name},

This is to inform you that your application for the {internship_title} internship at {company_name} has been shortlisted by the recruiting team.

==================================================
APPLICATION STATUS UPDATE
==================================================

Previous Status:
{prev_status_display}

New Status:
{new_status_display}

Reason for this update:
{reason_text}

What this means:
{meaning_text}

==================================================
INTERNSHIP DETAILS
==================================================

Company: {company_name}
Role: {internship_title}
Location: {location}
Work Mode: {work_mode}
Duration: {duration_display}
Stipend: {stipend_display}
Application ID: {app_id_display}

==================================================
WHAT HAPPENS NEXT?
==================================================

{next_steps_formatted}

You can track the latest status of your application from your SkillSetu account:
http://localhost:8081

Regards,

SkillSetu
Verified Skills & Recruitment Platform
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Shortlisted - SkillSetu</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: #004d40; color: #ffffff; padding: 30px 24px; text-align: center; }}
    .header-logo {{ font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .header-tag {{ color: #ccfbf1; font-size: 13px; font-weight: 500; margin-top: 4px; }}
    .badge {{ display: inline-block; background: #00796b; color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 14px; border: 1px solid rgba(255,255,255,0.2); }}
    .content {{ padding: 32px 24px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .message {{ font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }}
    .status-card {{ background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .status-card-title {{ font-size: 12px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .status-table {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; }}
    .status-table td {{ padding: 6px 0; font-size: 14px; vertical-align: top; }}
    .status-label {{ color: #64748b; font-weight: 600; width: 38%; }}
    .status-val {{ color: #0f172a; font-weight: 700; }}
    .badge-pill {{ display: inline-block; background: #ccfbf1; color: #0f766e; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; }}
    .status-note-box {{ background: #ffffff; border: 1px solid #ccfbf1; border-radius: 8px; padding: 12px 14px; margin-top: 10px; }}
    .status-note-label {{ font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase; margin-bottom: 4px; }}
    .status-note-text {{ font-size: 13px; color: #334155; line-height: 1.5; margin: 0; }}
    .details-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .details-card-title {{ font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .detail-table {{ width: 100%; border-collapse: collapse; }}
    .detail-table td {{ padding: 7px 0; font-size: 14px; vertical-align: top; }}
    .detail-label {{ color: #64748b; font-weight: 500; width: 38%; }}
    .detail-val {{ color: #0f172a; font-weight: 600; text-align: right; width: 62%; }}
    .next-steps-box {{ background: #f8fafc; border-left: 4px solid #004d40; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }}
    .next-steps-title {{ font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
    .next-steps-text {{ font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }}
    .cta-container {{ text-align: center; margin: 32px 0 16px; }}
    .btn {{ display: inline-block; background: #004d40; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; letter-spacing: 0.2px; }}
    .footer {{ background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
    .footer-brand {{ font-weight: 800; color: #334155; margin-bottom: 4px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">SkillSetu</div>
      <div class="header-tag">Verified Skills & Recruitment Platform</div>
      <div><span class="badge">Application Shortlisted</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello {first_name},</div>
      <p class="message">
        This is to inform you that your application for the <strong>{internship_title}</strong> internship at <strong>{company_name}</strong> has been shortlisted by the recruiting team.
      </p>
      
      <!-- Status Change Box -->
      <div class="status-card">
        <div class="status-card-title">Application Status Update</div>
        <table class="status-table">
          <tr>
            <td class="status-label">Previous Status:</td>
            <td class="status-val">{prev_status_display}</td>
          </tr>
          <tr>
            <td class="status-label">New Status:</td>
            <td class="status-val"><span class="badge-pill">✓ Shortlisted</span></td>
          </tr>
        </table>
        <div class="status-note-box">
          <div class="status-note-label">Reason for this update</div>
          <p class="status-note-text">{reason_text}</p>
        </div>
        <div class="status-note-box" style="margin-top: 8px;">
          <div class="status-note-label">What this means</div>
          <p class="status-note-text">{meaning_text}</p>
        </div>
      </div>

      <!-- Internship Details Box -->
      <div class="details-card">
        <div class="details-card-title">Internship Details</div>
        <table class="detail-table">
          <tr>
            <td class="detail-label">Company:</td>
            <td class="detail-val">{company_name}</td>
          </tr>
          <tr>
            <td class="detail-label">Role:</td>
            <td class="detail-val">{internship_title}</td>
          </tr>
          <tr>
            <td class="detail-label">Location:</td>
            <td class="detail-val">{location}</td>
          </tr>
          <tr>
            <td class="detail-label">Work Mode:</td>
            <td class="detail-val">{work_mode}</td>
          </tr>
          <tr>
            <td class="detail-label">Duration:</td>
            <td class="detail-val">{duration_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Stipend:</td>
            <td class="detail-val">{stipend_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Application ID:</td>
            <td class="detail-val">{app_id_display}</td>
          </tr>
        </table>
      </div>

      <!-- What Happens Next Box -->
      <div class="next-steps-box">
        <div class="next-steps-title">What Happens Next?</div>
        <p class="next-steps-text">{next_steps_formatted}</p>
      </div>

      <div class="cta-container">
        <a href="http://localhost:8081" class="btn" style="color:#ffffff;">Track Application on SkillSetu</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-brand">SkillSetu Recruitment Platform</div>
      <p style="margin: 0 0 6px 0;">Verified Skills & Direct Student Hiring</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">This email was sent regarding your application on SkillSetu. Please do not reply directly to this automated notification.</p>
    </div>
  </div>
</body>
</html>
"""

    return send_html_email(to_email=to_email, subject=subject, html_body=html_body, plain_body=plain_body)


def send_unshortlist_email(
    to_email: str,
    student_name: str,
    internship_title: str,
    company_name: str,
    previous_status: str = "Shortlisted",
    new_status: str = "Applied",
    location: str = "Hybrid",
    work_mode: str = "Hybrid",
    duration: str = "6 Months",
    stipend: str = "Competitive",
    application_id: str = ""
) -> Tuple[bool, Optional[str]]:
    """
    Sends a professional application status update email when a candidate is unshortlisted.
    Explicitly begins with 'This is to inform you that...' and explains why they received the email,
    previous status, new status, reason, what it means, and tracking instructions.
    Respectful, professional, and never claims rejection.
    """
    first_name = (student_name or "Candidate").split()[0].title()
    subject = f"Application Status Update – {internship_title} at {company_name}"
    prev_status_display = _format_status_title(previous_status)
    new_status_display = _format_status_title(new_status)
    reason_text = "The recruiting team has updated your application status as part of the ongoing recruitment process. Your application has been moved back from the shortlisted stage to the previous application stage."
    meaning_text = "Your application remains active on SkillSetu and will continue to be evaluated by the hiring team according to the standard recruitment process."
    next_steps_formatted = "You can continue to track the latest status of your application through your SkillSetu account."

    stipend_display = stipend if stipend and str(stipend).strip() else "As per role terms"
    duration_display = duration if duration and str(duration).strip() else "Standard Cohort"
    app_id_display = application_id if application_id else "APP-DIRECT"

    plain_body = f"""SkillSetu
Verified Skills & Recruitment Platform

Hello {first_name},

This is to inform you that there has been an update to the status of your application for the {internship_title} internship at {company_name}.

==================================================
APPLICATION STATUS UPDATE
==================================================

Previous Status:
{prev_status_display}

New Status:
{new_status_display}

Reason for this update:
{reason_text}

What this means:
{meaning_text}

==================================================
INTERNSHIP DETAILS
==================================================

Company: {company_name}
Role: {internship_title}
Location: {location}
Work Mode: {work_mode}
Duration: {duration_display}
Stipend: {stipend_display}
Application ID: {app_id_display}

==================================================
WHAT HAPPENS NEXT?
==================================================

{next_steps_formatted}

You can track the latest status of your application from your SkillSetu account:
http://localhost:8081

Regards,

SkillSetu
Verified Skills & Recruitment Platform
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update - SkillSetu</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: #0f172a; color: #ffffff; padding: 30px 24px; text-align: center; }}
    .header-logo {{ font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .header-tag {{ color: #94a3b8; font-size: 13px; font-weight: 500; margin-top: 4px; }}
    .badge {{ display: inline-block; background: #334155; color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 14px; border: 1px solid rgba(255,255,255,0.2); }}
    .content {{ padding: 32px 24px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .message {{ font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }}
    .status-card {{ background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .status-card-title {{ font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .status-table {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; }}
    .status-table td {{ padding: 6px 0; font-size: 14px; vertical-align: top; }}
    .status-label {{ color: #64748b; font-weight: 600; width: 38%; }}
    .status-val {{ color: #0f172a; font-weight: 700; }}
    .badge-pill {{ display: inline-block; background: #e2e8f0; color: #334155; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; }}
    .status-note-box {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-top: 10px; }}
    .status-note-label {{ font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; }}
    .status-note-text {{ font-size: 13px; color: #334155; line-height: 1.5; margin: 0; }}
    .details-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .details-card-title {{ font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .detail-table {{ width: 100%; border-collapse: collapse; }}
    .detail-table td {{ padding: 7px 0; font-size: 14px; vertical-align: top; }}
    .detail-label {{ color: #64748b; font-weight: 500; width: 38%; }}
    .detail-val {{ color: #0f172a; font-weight: 600; text-align: right; width: 62%; }}
    .next-steps-box {{ background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }}
    .next-steps-title {{ font-size: 13px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
    .next-steps-text {{ font-size: 14px; color: #1e40af; line-height: 1.5; margin: 0; }}
    .cta-container {{ text-align: center; margin: 32px 0 16px; }}
    .btn {{ display: inline-block; background: #004d40; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; letter-spacing: 0.2px; }}
    .footer {{ background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
    .footer-brand {{ font-weight: 800; color: #334155; margin-bottom: 4px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">SkillSetu</div>
      <div class="header-tag">Verified Skills & Recruitment Platform</div>
      <div><span class="badge">Application Status Update</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello {first_name},</div>
      <p class="message">
        This is to inform you that there has been an update to the status of your application for the <strong>{internship_title}</strong> internship at <strong>{company_name}</strong>.
      </p>
      
      <!-- Status Change Box -->
      <div class="status-card">
        <div class="status-card-title">Application Status Update</div>
        <table class="status-table">
          <tr>
            <td class="status-label">Previous Status:</td>
            <td class="status-val">{prev_status_display}</td>
          </tr>
          <tr>
            <td class="status-label">New Status:</td>
            <td class="status-val"><span class="badge-pill">{new_status_display}</span></td>
          </tr>
        </table>
        <div class="status-note-box">
          <div class="status-note-label">Reason for this update</div>
          <p class="status-note-text">{reason_text}</p>
        </div>
        <div class="status-note-box" style="margin-top: 8px;">
          <div class="status-note-label">What this means</div>
          <p class="status-note-text">{meaning_text}</p>
        </div>
      </div>

      <!-- Internship Details Box -->
      <div class="details-card">
        <div class="details-card-title">Internship Details</div>
        <table class="detail-table">
          <tr>
            <td class="detail-label">Company:</td>
            <td class="detail-val">{company_name}</td>
          </tr>
          <tr>
            <td class="detail-label">Role:</td>
            <td class="detail-val">{internship_title}</td>
          </tr>
          <tr>
            <td class="detail-label">Location:</td>
            <td class="detail-val">{location}</td>
          </tr>
          <tr>
            <td class="detail-label">Work Mode:</td>
            <td class="detail-val">{work_mode}</td>
          </tr>
          <tr>
            <td class="detail-label">Duration:</td>
            <td class="detail-val">{duration_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Stipend:</td>
            <td class="detail-val">{stipend_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Application ID:</td>
            <td class="detail-val">{app_id_display}</td>
          </tr>
        </table>
      </div>

      <!-- Next Steps Box -->
      <div class="next-steps-box">
        <div class="next-steps-title">Next Steps</div>
        <p class="next-steps-text">{next_steps_formatted}</p>
      </div>

      <div class="cta-container">
        <a href="http://localhost:8081" class="btn" style="color:#ffffff;">Track Application on SkillSetu</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-brand">SkillSetu Recruitment Platform</div>
      <p style="margin: 0 0 6px 0;">Verified Skills & Direct Student Hiring</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">This email was sent regarding your application on SkillSetu. Please do not reply directly to this automated notification.</p>
    </div>
  </div>
</body>
</html>
"""

    return send_html_email(to_email=to_email, subject=subject, html_body=html_body, plain_body=plain_body)


def send_rejection_email(
    to_email: str,
    student_name: str,
    internship_title: str,
    company_name: str,
    previous_status: str = "Applied",
    location: str = "Hybrid",
    work_mode: str = "Hybrid",
    duration: str = "6 Months",
    stipend: str = "Competitive",
    application_id: str = ""
) -> Tuple[bool, Optional[str]]:
    """
    Sends a respectful, encouraging rejection email when candidate is marked REJECTED.
    Explicitly begins with 'This is to inform you that...' and explains why they received the email,
    previous status, new status (Not Selected), reason, and encourages skill growth.
    """
    first_name = (student_name or "Candidate").split()[0].title()
    subject = f"Application Status Update – {internship_title} at {company_name}"
    prev_status_display = _format_status_title(previous_status)
    new_status_display = "Not Selected"
    reason_text = "The recruiting team has completed its evaluation of your application and has decided not to move your application forward for this internship."
    meaning_text = "This specific application will not be proceeding to further evaluation stages."

    stipend_display = stipend if stipend and str(stipend).strip() else "As per role terms"
    duration_display = duration if duration and str(duration).strip() else "Standard Cohort"
    app_id_display = application_id if application_id else "APP-DIRECT"

    plain_body = f"""SkillSetu
Verified Skills & Recruitment Platform

Hello {first_name},

This is to inform you that your application for the {internship_title} internship at {company_name} has been updated by the recruiting team.

==================================================
APPLICATION STATUS UPDATE
==================================================

Previous Status:
{prev_status_display}

New Status:
{new_status_display}

Reason for this update:
{reason_text}

What this means:
{meaning_text}

==================================================
INTERNSHIP DETAILS
==================================================

Company: {company_name}
Role: {internship_title}
Location: {location}
Work Mode: {work_mode}
Duration: {duration_display}
Stipend: {stipend_display}
Application ID: {app_id_display}

We appreciate your interest and the time you invested in the application process. We encourage you to continue building your verified skills and exploring other opportunities available on SkillSetu.

View Other Opportunities on SkillSetu:
http://localhost:8081

Regards,

SkillSetu
Verified Skills & Recruitment Platform
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update - SkillSetu</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: #1e293b; color: #ffffff; padding: 30px 24px; text-align: center; }}
    .header-logo {{ font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .header-tag {{ color: #94a3b8; font-size: 13px; font-weight: 500; margin-top: 4px; }}
    .badge {{ display: inline-block; background: #475569; color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 14px; border: 1px solid rgba(255,255,255,0.2); }}
    .content {{ padding: 32px 24px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .message {{ font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }}
    .status-card {{ background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .status-card-title {{ font-size: 12px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .status-table {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; }}
    .status-table td {{ padding: 6px 0; font-size: 14px; vertical-align: top; }}
    .status-label {{ color: #64748b; font-weight: 600; width: 38%; }}
    .status-val {{ color: #0f172a; font-weight: 700; }}
    .badge-pill {{ display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; }}
    .status-note-box {{ background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-top: 10px; }}
    .status-note-label {{ font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; margin-bottom: 4px; }}
    .status-note-text {{ font-size: 13px; color: #334155; line-height: 1.5; margin: 0; }}
    .details-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .details-card-title {{ font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .detail-table {{ width: 100%; border-collapse: collapse; }}
    .detail-table td {{ padding: 7px 0; font-size: 14px; vertical-align: top; }}
    .detail-label {{ color: #64748b; font-weight: 500; width: 38%; }}
    .detail-val {{ color: #0f172a; font-weight: 600; text-align: right; width: 62%; }}
    .encourage-box {{ background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }}
    .encourage-text {{ font-size: 14px; color: #166534; line-height: 1.5; margin: 0; }}
    .cta-container {{ text-align: center; margin: 32px 0 16px; }}
    .btn {{ display: inline-block; background: #004d40; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; letter-spacing: 0.2px; }}
    .footer {{ background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
    .footer-brand {{ font-weight: 800; color: #334155; margin-bottom: 4px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">SkillSetu</div>
      <div class="header-tag">Verified Skills & Recruitment Platform</div>
      <div><span class="badge">Application Status Update</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello {first_name},</div>
      <p class="message">
        This is to inform you that your application for the <strong>{internship_title}</strong> internship at <strong>{company_name}</strong> has been updated by the recruiting team.
      </p>
      
      <!-- Status Change Box -->
      <div class="status-card">
        <div class="status-card-title">Application Status Update</div>
        <table class="status-table">
          <tr>
            <td class="status-label">Previous Status:</td>
            <td class="status-val">{prev_status_display}</td>
          </tr>
          <tr>
            <td class="status-label">New Status:</td>
            <td class="status-val"><span class="badge-pill">{new_status_display}</span></td>
          </tr>
        </table>
        <div class="status-note-box">
          <div class="status-note-label">Reason for this update</div>
          <p class="status-note-text">{reason_text}</p>
        </div>
        <div class="status-note-box" style="margin-top: 8px;">
          <div class="status-note-label">What this means</div>
          <p class="status-note-text">{meaning_text}</p>
        </div>
      </div>

      <!-- Internship Details Box -->
      <div class="details-card">
        <div class="details-card-title">Internship Details</div>
        <table class="detail-table">
          <tr>
            <td class="detail-label">Company:</td>
            <td class="detail-val">{company_name}</td>
          </tr>
          <tr>
            <td class="detail-label">Role:</td>
            <td class="detail-val">{internship_title}</td>
          </tr>
          <tr>
            <td class="detail-label">Location:</td>
            <td class="detail-val">{location}</td>
          </tr>
          <tr>
            <td class="detail-label">Work Mode:</td>
            <td class="detail-val">{work_mode}</td>
          </tr>
          <tr>
            <td class="detail-label">Duration:</td>
            <td class="detail-val">{duration_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Stipend:</td>
            <td class="detail-val">{stipend_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Application ID:</td>
            <td class="detail-val">{app_id_display}</td>
          </tr>
        </table>
      </div>

      <!-- Encouragement Box -->
      <div class="encourage-box">
        <p class="encourage-text">
          We appreciate your interest and the time you invested in the application process. We encourage you to continue building your verified skills and exploring other opportunities available on SkillSetu.
        </p>
      </div>

      <div class="cta-container">
        <a href="http://localhost:8081" class="btn" style="color:#ffffff;">View Other Opportunities</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-brand">SkillSetu Recruitment Platform</div>
      <p style="margin: 0 0 6px 0;">Verified Skills & Direct Student Hiring</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">This email was sent regarding your application on SkillSetu. Please do not reply directly to this automated notification.</p>
    </div>
  </div>
</body>
</html>
"""

    return send_html_email(to_email=to_email, subject=subject, html_body=html_body, plain_body=plain_body)


def send_status_update_email(
    to_email: str,
    student_name: str,
    internship_title: str,
    company_name: str,
    previous_status: str,
    new_status: str,
    reason: Optional[str] = None,
    meaning: Optional[str] = None,
    next_steps: Optional[str] = None,
    location: str = "Hybrid",
    work_mode: str = "Hybrid",
    duration: str = "6 Months",
    stipend: str = "Competitive",
    application_id: str = ""
) -> Tuple[bool, Optional[str]]:
    """
    Sends a general status update email for transitions between lifecycle states.
    Explicitly begins with 'This is to inform you that...' and explains why they received the email,
    previous status, new status, reason, what it means, and next steps.
    """
    first_name = (student_name or "Candidate").split()[0].title()
    subject = f"Application Status Update – {internship_title} at {company_name}"
    prev_status_display = _format_status_title(previous_status)
    new_status_display = _format_status_title(new_status)

    if not reason or not reason.strip():
        reason_text = f"The recruiting team has updated your application status to {new_status_display}."
    else:
        reason_text = reason.strip()

    if not meaning or not meaning.strip():
        meaning_text = f"Your application is now officially recorded as {new_status_display} in the recruiter's hiring process."
    else:
        meaning_text = meaning.strip()

    if not next_steps or not next_steps.strip():
        next_steps_formatted = "You can track the latest status of your application directly on SkillSetu."
    else:
        next_steps_formatted = next_steps.strip()

    stipend_display = stipend if stipend and str(stipend).strip() else "As per role terms"
    duration_display = duration if duration and str(duration).strip() else "Standard Cohort"
    app_id_display = application_id if application_id else "APP-DIRECT"

    plain_body = f"""SkillSetu
Verified Skills & Recruitment Platform

Hello {first_name},

This is to inform you that your application for the {internship_title} internship at {company_name} has been updated by the recruiting team.

==================================================
APPLICATION STATUS UPDATE
==================================================

Previous Status:
{prev_status_display}

New Status:
{new_status_display}

Reason for this update:
{reason_text}

What this means:
{meaning_text}

==================================================
INTERNSHIP DETAILS
==================================================

Company: {company_name}
Role: {internship_title}
Location: {location}
Work Mode: {work_mode}
Duration: {duration_display}
Stipend: {stipend_display}
Application ID: {app_id_display}

==================================================
WHAT HAPPENS NEXT?
==================================================

{next_steps_formatted}

You can track the latest status of your application from your SkillSetu account:
http://localhost:8081

Regards,

SkillSetu
Verified Skills & Recruitment Platform
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update - SkillSetu</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: #004d40; color: #ffffff; padding: 30px 24px; text-align: center; }}
    .header-logo {{ font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .header-tag {{ color: #ccfbf1; font-size: 13px; font-weight: 500; margin-top: 4px; }}
    .badge {{ display: inline-block; background: #00796b; color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 14px; border: 1px solid rgba(255,255,255,0.2); }}
    .content {{ padding: 32px 24px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .message {{ font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }}
    .status-card {{ background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .status-card-title {{ font-size: 12px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .status-table {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; }}
    .status-table td {{ padding: 6px 0; font-size: 14px; vertical-align: top; }}
    .status-label {{ color: #64748b; font-weight: 600; width: 38%; }}
    .status-val {{ color: #0f172a; font-weight: 700; }}
    .badge-pill {{ display: inline-block; background: #ccfbf1; color: #0f766e; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; }}
    .status-note-box {{ background: #ffffff; border: 1px solid #ccfbf1; border-radius: 8px; padding: 12px 14px; margin-top: 10px; }}
    .status-note-label {{ font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase; margin-bottom: 4px; }}
    .status-note-text {{ font-size: 13px; color: #334155; line-height: 1.5; margin: 0; }}
    .details-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }}
    .details-card-title {{ font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }}
    .detail-table {{ width: 100%; border-collapse: collapse; }}
    .detail-table td {{ padding: 7px 0; font-size: 14px; vertical-align: top; }}
    .detail-label {{ color: #64748b; font-weight: 500; width: 38%; }}
    .detail-val {{ color: #0f172a; font-weight: 600; text-align: right; width: 62%; }}
    .next-steps-box {{ background: #f8fafc; border-left: 4px solid #004d40; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }}
    .next-steps-title {{ font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
    .next-steps-text {{ font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }}
    .cta-container {{ text-align: center; margin: 32px 0 16px; }}
    .btn {{ display: inline-block; background: #004d40; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; letter-spacing: 0.2px; }}
    .footer {{ background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
    .footer-brand {{ font-weight: 800; color: #334155; margin-bottom: 4px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">SkillSetu</div>
      <div class="header-tag">Verified Skills & Recruitment Platform</div>
      <div><span class="badge">Application Status Update</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello {first_name},</div>
      <p class="message">
        This is to inform you that your application for the <strong>{internship_title}</strong> internship at <strong>{company_name}</strong> has been updated by the recruiting team.
      </p>
      
      <!-- Status Change Box -->
      <div class="status-card">
        <div class="status-card-title">Application Status Update</div>
        <table class="status-table">
          <tr>
            <td class="status-label">Previous Status:</td>
            <td class="status-val">{prev_status_display}</td>
          </tr>
          <tr>
            <td class="status-label">New Status:</td>
            <td class="status-val"><span class="badge-pill">{new_status_display}</span></td>
          </tr>
        </table>
        <div class="status-note-box">
          <div class="status-note-label">Reason for this update</div>
          <p class="status-note-text">{reason_text}</p>
        </div>
        <div class="status-note-box" style="margin-top: 8px;">
          <div class="status-note-label">What this means</div>
          <p class="status-note-text">{meaning_text}</p>
        </div>
      </div>

      <!-- Internship Details Box -->
      <div class="details-card">
        <div class="details-card-title">Internship Details</div>
        <table class="detail-table">
          <tr>
            <td class="detail-label">Company:</td>
            <td class="detail-val">{company_name}</td>
          </tr>
          <tr>
            <td class="detail-label">Role:</td>
            <td class="detail-val">{internship_title}</td>
          </tr>
          <tr>
            <td class="detail-label">Location:</td>
            <td class="detail-val">{location}</td>
          </tr>
          <tr>
            <td class="detail-label">Work Mode:</td>
            <td class="detail-val">{work_mode}</td>
          </tr>
          <tr>
            <td class="detail-label">Duration:</td>
            <td class="detail-val">{duration_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Stipend:</td>
            <td class="detail-val">{stipend_display}</td>
          </tr>
          <tr>
            <td class="detail-label">Application ID:</td>
            <td class="detail-val">{app_id_display}</td>
          </tr>
        </table>
      </div>

      <!-- Next Steps Box -->
      <div class="next-steps-box">
        <div class="next-steps-title">What Happens Next?</div>
        <p class="next-steps-text">{next_steps_formatted}</p>
      </div>

      <div class="cta-container">
        <a href="http://localhost:8081" class="btn" style="color:#ffffff;">Track Application on SkillSetu</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-brand">SkillSetu Recruitment Platform</div>
      <p style="margin: 0 0 6px 0;">Verified Skills & Direct Student Hiring</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">This email was sent regarding your application on SkillSetu. Please do not reply directly to this automated notification.</p>
    </div>
  </div>
</body>
</html>
"""

    return send_html_email(to_email=to_email, subject=subject, html_body=html_body, plain_body=plain_body)
