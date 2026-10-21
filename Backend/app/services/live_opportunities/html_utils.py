import re
import html
from typing import Dict, Any, Optional

def clean_scraped_html(raw_html: Optional[str]) -> str:
    """
    Sanitizes, cleans, and standardizes scraped HTML content from external job listings
    (Jobicy, Arbeitnow, Remotive, Internshala, Unstop, etc.) into clean readable text.
    
    Guarantees:
    - Removes <script>, <style>, <iframe>, <form> tags and contents.
    - Strips broken/unclosed tags (e.g., truncated `<a href="...` without closing `>`).
    - Converts <br>, <p>, <div>, <li>, and headers into clean line breaks and bullet points.
    - Strips all HTML markup.
    - Decodes all standard and numeric HTML entities.
    - Removes duplicate whitespace and excessive consecutive newlines.
    """
    if not raw_html:
        return ""

    text = str(raw_html)

    # 1. Remove dangerous or non-content tags with their contents
    text = re.sub(r'<(script|style|iframe|form|object|embed)[^>]*>.*?</\1>', '', text, flags=re.IGNORECASE | re.DOTALL)

    # 2. Convert common HTML breaks and block closings into clean newlines
    text = re.sub(r'<\s*br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</(p|div|section|article|h[1-6]|tr|blockquote)>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<(li|dt)>', '\n• ', text, flags=re.IGNORECASE)

    # 3. Strip any unclosed tags at the end of the text (e.g. truncated `<a href="..." rel="...`)
    text = re.sub(r'<[a-zA-Z\/][^>]*$', '', text)

    # 4. Strip all remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)

    # 5. Decode all HTML entities (named & numeric)
    text = html.unescape(text)

    # 6. Normalize non-breaking spaces and other invisible spaces
    text = text.replace('\xa0', ' ').replace('\u200b', '').replace('\u200e', '').replace('\ufeff', '')

    # 7. Clean up bullets and excessive whitespace
    lines = []
    for line in text.split('\n'):
        cleaned_line = re.sub(r'[ \t]+', ' ', line).strip()
        lines.append(cleaned_line)

    unified_text = '\n'.join(lines)
    # Collapse 3 or more consecutive newlines into 2
    unified_text = re.sub(r'\n{3,}', '\n\n', unified_text).strip()

    return unified_text


def extract_structured_sections(clean_text: str) -> Dict[str, Optional[str]]:
    """
    Extracts distinct sections (responsibilities, requirements, company info)
    from a cleaned job description if explicit heading patterns exist.
    Never invents or hallucinates fictional content.
    """
    if not clean_text:
        return {
            "responsibilities": None,
            "requirements": None,
            "company_overview": None
        }

    responsibilities = None
    requirements = None
    company_overview = None

    # Patterns for Responsibilities
    resp_match = re.search(
        r'(?:^|\n)(?:###?\s*)?(?:key\s+)?(?:responsibilities|what\s+you(?:\'ll|\s+will)\s+do|duties|your\s+role|role\s+overview)[:\s]*\n(.*?)(?=\n(?:###?\s*)?(?:requirements|qualifications|who\s+you\s+are|what\s+you(?:\'ll|\s+will)\s+bring|benefits|about\s+us|about\s+the\s+company)|$)',
        clean_text,
        flags=re.IGNORECASE | re.DOTALL
    )
    if resp_match:
        extracted = resp_match.group(1).strip()
        if len(extracted) > 20:
            responsibilities = extracted

    # Patterns for Requirements / Qualifications
    req_match = re.search(
        r'(?:^|\n)(?:###?\s*)?(?:requirements|qualifications|what\s+you(?:\'ll|\s+will)\s+bring|who\s+you\s+are|skills\s+and\s+experience|minimum\s+qualifications)[:\s]*\n(.*?)(?=\n(?:###?\s*)?(?:responsibilities|benefits|what\s+we\s+offer|about\s+us|about\s+the\s+company)|$)',
        clean_text,
        flags=re.IGNORECASE | re.DOTALL
    )
    if req_match:
        extracted = req_match.group(1).strip()
        if len(extracted) > 20:
            requirements = extracted

    # Patterns for About Company
    comp_match = re.search(
        r'(?:^|\n)(?:###?\s*)?(?:about\s+(?:the\s+company|us|[A-Za-z0-9\s]+?))[:\s]*\n(.*?)(?=\n(?:###?\s*)?(?:about\s+the\s+role|the\s+role|responsibilities|requirements|what\s+you(?:\'ll|\s+will)\s+do)|$)',
        clean_text,
        flags=re.IGNORECASE | re.DOTALL
    )
    if comp_match:
        extracted = comp_match.group(1).strip()
        if len(extracted) > 20:
            company_overview = extracted

    return {
        "responsibilities": responsibilities,
        "requirements": requirements,
        "company_overview": company_overview
    }
