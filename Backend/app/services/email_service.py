import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

# In-memory store for OTPs: { email: {"otp": str, "timestamp": float} }
otp_store = {}

def generate_otp(length: int = 6) -> str:
    """Generate a 6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends OTP email using SMTP from 'abhoge5@gmail.com'.
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
        msg['From'] = settings.MAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email via SMTP: {e}")
        return False
