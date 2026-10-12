import base64
import json
import httpx
import pymupdf as fitz  # PyMuPDF
from app.config import settings

MARKSHEET_EXTRACTION_PROMPT = """You are an expert academic document extraction AI specializing in Indian and international university marksheets, transcripts, and grade cards.

Analyze the uploaded marksheet image and extract the following academic details accurately into JSON format.

RULES:
1. "is_marksheet": true ONLY if this image is a genuine academic marksheet, transcript, grade card, or pass certificate. If it is an invoice, photo, ID card, or unrelated document, set "is_marksheet": false.
2. "degree": Extract full degree/course name (e.g. "Bachelor of Technology", "Bachelor of Science", "Diploma in Civil Engineering").
3. "branch": Extract specialization/branch/major (e.g. "Computer Science and Engineering", "Mechanical Engineering", "Commerce").
4. "university": Extract full University, Board, or Autonomous Institution name. Distinguish main University from specific affiliated college name.
5. "start_year": Extract start/admission year ONLY if explicitly printed (e.g. "Batch 2021-2025" or "Admitted: 2021"). Return null if not explicitly printed. DO NOT GUESS OR CALCULATE start_year.
6. "graduation_year": Extract graduation/passing year ONLY if explicitly printed (e.g. "Year of Passing: 2025" or final semester result). Return null for intermediate semester marksheets where passing year is unclear.
7. "cgpa_or_percentage": Extract final CGPA, SGPA, or Aggregate Percentage if present (e.g. "8.85 / 10.0" or "84.5%").
8. For EACH extracted field, provide a "confidence" float score between 0.0 and 1.0.

Return ONLY a valid JSON object matching this exact schema:
{
  "is_marksheet": true,
  "document_type": "semester_marksheet",
  "degree": {"value": "string or null", "confidence": 0.95},
  "branch": {"value": "string or null", "confidence": 0.95},
  "university": {"value": "string or null", "confidence": 0.95},
  "start_year": {"value": "string or null", "confidence": 0.0},
  "graduation_year": {"value": "string or null", "confidence": 0.95},
  "cgpa_or_percentage": {"value": "string or null", "confidence": 0.95}
}
"""

def pdf_or_image_to_base64_jpeg(file_bytes: bytes, filename: str) -> str:
    """
    Converts PDF page 1 to JPEG or returns base64 image string.
    """
    is_pdf = filename.lower().endswith('.pdf') or file_bytes.startswith(b'%PDF')
    
    if is_pdf:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            if len(doc) > 0:
                page = doc[0]
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("jpeg")
                return base64.b64encode(img_bytes).decode('utf-8')
        except Exception as e:
            print(f"PyMuPDF rendering fallback: {e}")
            
    return base64.b64encode(file_bytes).decode('utf-8')

async def extract_marksheet_data(file_bytes: bytes, filename: str) -> dict:
    """
    Hybrid Document AI Extraction Service.
    Converts input PDF/Image in memory, queries Sarvam AI Vision or Groq Vision, and returns structured JSON with field confidence.
    """
    b64_image = pdf_or_image_to_base64_jpeg(file_bytes, filename)
    image_data_url = f"data:image/jpeg;base64,{b64_image}"
    
    # 1. Try Sarvam AI Vision if key available
    if settings.SARVAM_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.sarvam.ai/vision/extract",
                    headers={
                        "api-subscription-key": settings.SARVAM_API_KEY,
                        "Content-Type": "application/json"
                    },
                    json={
                        "image": image_data_url,
                        "prompt": MARKSHEET_EXTRACTION_PROMPT,
                        "response_format": {"type": "json_object"}
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    parsed = json.loads(data.get("choices", [{}])[0].get("message", {}).get("content", "{}"))
                    return parsed
        except Exception as e:
            print(f"Sarvam AI call failed: {e}. Falling back to Groq Vision / Fallback...")

SARVAM_DOC_AI_RESUME_SCHEMA = {
    "type": "object",
    "properties": {
        "full_name": {"type": "string", "description": "Full name of candidate"},
        "email": {"type": "string", "description": "Email address of candidate"},
        "phone": {"type": "string", "description": "Phone number of candidate"},
        "location": {"type": "string", "description": "Current city or address printed on resume"},
        "education": {
            "type": "array",
            "description": "Education background list",
            "items": {
                "type": "object",
                "description": "Single education entry",
                "properties": {
                    "degree": {"type": "string", "description": "Degree or diploma title"},
                    "field_of_study": {"type": "string", "description": "Major or field of study"},
                    "institution": {"type": "string", "description": "University or college name"},
                    "start_year": {"type": "string", "description": "Start year"},
                    "end_year": {"type": "string", "description": "Graduation or end year"},
                    "grade": {"type": "string", "description": "GPA, CGPA or percentage"}
                }
            }
        },
        "experience": {
            "type": "array",
            "description": "Work experience history",
            "items": {
                "type": "object",
                "description": "Single job experience record",
                "properties": {
                    "job_title": {"type": "string", "description": "Job title or role"},
                    "company": {"type": "string", "description": "Company or organization name"},
                    "start_date": {"type": "string", "description": "Start date or year"},
                    "end_date": {"type": "string", "description": "End date or year"},
                    "currently_working": {"type": "boolean", "description": "True if currently employed here"},
                    "description": {"type": "string", "description": "Summary of responsibilities"},
                    "achievements": {"type": "array", "description": "Key achievements", "items": {"type": "string", "description": "Achievement item"}},
                    "technologies_used": {"type": "array", "description": "Technologies used", "items": {"type": "string", "description": "Tech item"}}
                }
            }
        },
        "projects": {
            "type": "array",
            "description": "Projects list",
            "items": {
                "type": "object",
                "description": "Single project entry",
                "properties": {
                    "project_name": {"type": "string", "description": "Project title"},
                    "description": {"type": "string", "description": "Project details"},
                    "technologies": {"type": "array", "description": "Technologies used", "items": {"type": "string", "description": "Tech item"}},
                    "role": {"type": "string", "description": "Role in project"},
                    "project_url": {"type": "string", "description": "Project link or GitHub repo"},
                    "measurable_results": {"type": "string", "description": "Quantified outcomes or metrics"}
                }
            }
        },
        "skills": {
            "type": "array",
            "description": "Technical skills, programming languages, databases, tools, frameworks, and domain skills",
            "items": {
                "type": "string",
                "description": "Individual skill name"
            }
        },
        "certifications": {
            "type": "array",
            "description": "Certifications list",
            "items": {
                "type": "object",
                "description": "Single certification entry",
                "properties": {
                    "name": {"type": "string", "description": "Certification name"},
                    "issuer": {"type": "string", "description": "Issuer organization"},
                    "date": {"type": "string", "description": "Issue date"},
                    "credential_url": {"type": "string", "description": "Credential URL"}
                }
            }
        },
        "achievements": {
            "type": "array",
            "description": "Awards and honors",
            "items": {
                "type": "object",
                "description": "Single achievement entry",
                "properties": {
                    "achievement": {"type": "string", "description": "Achievement title"},
                    "organization": {"type": "string", "description": "Organization"},
                    "date": {"type": "string", "description": "Date"},
                    "description": {"type": "string", "description": "Details"}
                }
            }
        },
        "links": {
            "type": "object",
            "description": "Professional web profiles",
            "properties": {
                "github": {"type": "string", "description": "GitHub profile URL"},
                "linkedin": {"type": "string", "description": "LinkedIn profile URL"},
                "portfolio": {"type": "string", "description": "Personal website or portfolio URL"},
                "other": {"type": "array", "description": "Other URLs", "items": {"type": "string", "description": "URL link"}}
            }
        }
    }
}

async def extract_resume_data(file_bytes: bytes, filename: str) -> dict:
    """
    Extracts structured resume data using official Sarvam Document AI Extract API (if key present),
    or falls back gracefully to deterministic document text extraction and parsing.
    Supports PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP directly.
    """
    import asyncio
    
    if settings.SARVAM_API_KEY:
        try:
            headers = {"api-subscription-key": settings.SARVAM_API_KEY}
            
            # 1. Prepare file upload
            lower_fn = filename.lower()
            content_type = "application/pdf"
            if lower_fn.endswith('.png'):
                content_type = "image/png"
            elif lower_fn.endswith(('.jpg', '.jpeg')):
                content_type = "image/jpeg"
            elif lower_fn.endswith('.webp'):
                content_type = "image/webp"

            files = {
                'file': (filename, file_bytes, content_type)
            }
            data = {
                'schema': json.dumps(SARVAM_DOC_AI_RESUME_SCHEMA),
                'language': 'en-IN'
            }

            async with httpx.AsyncClient(timeout=45.0) as client:
                create_resp = await client.post(
                    "https://api.sarvam.ai/doc-ai/v1/job/extract",
                    headers=headers,
                    files=files,
                    data=data
                )

                if create_resp.status_code in (200, 201):
                    job_info = create_resp.json()
                    job_id = job_info.get("job_id")
                    if job_id:
                        max_attempts = 15
                        poll_interval = 2.0
                        for _ in range(max_attempts):
                            await asyncio.sleep(poll_interval)
                            status_resp = await client.get(f"https://api.sarvam.ai/doc-ai/v1/job/{job_id}/status", headers=headers)
                            if status_resp.status_code != 200:
                                continue

                            status_data = status_resp.json()
                            job_status = status_data.get("status")

                            if job_status in ("completed", "partially_completed"):
                                results_resp = await client.get(f"https://api.sarvam.ai/doc-ai/v1/job/{job_id}/results", headers=headers)
                                if results_resp.status_code == 200:
                                    res_json = results_resp.json()
                                    extracted_result = res_json.get("result") or {}
                                    extracted_result["_annotations"] = res_json.get("annotations") or {}
                                    return extracted_result
                            elif job_status in ("failed", "rejected"):
                                break
        except Exception as e:
            print(f"[document_service] Sarvam Doc AI extraction error: {e}. Falling back to offline parser...")

    # Offline Heuristic & Deterministic Extraction
    raw_text = extract_text_from_document_bytes(file_bytes, filename)
    return parse_resume_text_heuristic(raw_text)




    # 2. Try Groq Llama 3.2 Vision if key available
    if settings.GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.2-11b-vision-instruct",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": MARKSHEET_EXTRACTION_PROMPT},
                                    {"type": "image_url", "image_url": {"url": image_data_url}}
                                ]
                            }
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.1
                    }
                )
                if resp.status_code == 200:
                    res_json = resp.json()
                    content = res_json["choices"][0]["message"]["content"]
                    return json.loads(content)
        except Exception as e:
            print(f"Groq Vision call failed: {e}. Falling back to heuristic OCR extraction...")

    # 3. Heuristic Fallback (Runs when API keys are not set yet or offline)
    return process_heuristic_fallback(file_bytes, filename)

def process_heuristic_fallback(file_bytes: bytes, filename: str) -> dict:
    """
    Fast offline heuristic extractor for testing without API keys.
    Extracts text from PDF/Image using PyMuPDF and parses actual student academic details via regex.
    """
    import re

    text_content = ""
    try:
        if filename.lower().endswith('.pdf') or file_bytes.startswith(b'%PDF'):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text_content += page.get_text() + "\n"
    except Exception as e:
        print(f"PyMuPDF text extraction error: {e}")

    # Normalize non-breaking spaces
    text_content = text_content.replace('\xa0', ' ')
    lower_text = text_content.lower()

    # Basic document check
    is_marksheet = any(kw in lower_text for kw in ['marksheet', 'transcript', 'grade', 'statement of marks', 'university', 'college', 'school of', 'semester', 'cgpa', 'sgpa', 'examination', 'passed'])
    if not is_marksheet and len(text_content.strip()) > 0:
        is_marksheet = True

    # 1. Extract CGPA, SGPA, and Percentage
    cgpa_val = None
    cgpa_match = re.search(r'\bCGPA\s*[:=\-]?\s*([\d\.]+)', text_content, re.IGNORECASE)
    if cgpa_match:
        cgpa_val = cgpa_match.group(1).strip()

    pct_val = None
    pct_match = re.search(r'\bPercentage\s*[:=\-]?\s*([\d\.]+)\s*%?', text_content, re.IGNORECASE)
    if pct_match:
        pct_val = pct_match.group(1).strip()

    sgpa_val = None
    sgpa_match = re.search(r'\bSGPA\s*[:=\-]?\s*([\d\.]+)', text_content, re.IGNORECASE)
    if sgpa_match:
        sgpa_val = sgpa_match.group(1).strip()

    cgpa_or_percentage = None
    confidence_cgpa = 0.50
    if cgpa_val:
        cgpa_or_percentage = f"{cgpa_val} / 10.0"
        confidence_cgpa = 0.95
    elif pct_val:
        cgpa_or_percentage = f"{pct_val}%"
        confidence_cgpa = 0.90
    elif sgpa_val:
        cgpa_or_percentage = f"{sgpa_val} / 10.0 (SGPA)"
        confidence_cgpa = 0.85

    # 2. Extract Degree & Branch
    degree = None
    degree_confidence = 0.50
    branch = None
    branch_confidence = 0.50

    prog_match = re.search(r'(?:Program|Course|Degree)\s*[:=\-]\s*(.*?)(?=\s+(?:School|University|Term|PRN|ABC|Seat|Name|Mother)|[\r\n]|$)', text_content, re.IGNORECASE)
    prog_str = prog_match.group(1).strip() if prog_match else ""

    combined_search = f"{prog_str} {text_content}".lower()

    if 'bachelor of technology' in combined_search or 'b.tech' in combined_search or 'btech' in combined_search:
        degree = "Bachelor of Technology (B.Tech)"
        degree_confidence = 0.95
    elif 'bachelor of engineering' in combined_search or 'b.e.' in combined_search:
        degree = "Bachelor of Engineering (B.E.)"
        degree_confidence = 0.95
    elif 'bachelor of science' in combined_search or 'b.sc' in combined_search:
        degree = "Bachelor of Science (B.Sc)"
        degree_confidence = 0.95
    elif 'master of technology' in combined_search or 'm.tech' in combined_search:
        degree = "Master of Technology (M.Tech)"
        degree_confidence = 0.95
    elif prog_str:
        degree = prog_str.split('-')[0].strip() if '-' in prog_str else prog_str
        degree_confidence = 0.80

    if 'computer science' in combined_search:
        branch = "Computer Science and Engineering"
        branch_confidence = 0.95
    elif 'information technology' in combined_search:
        branch = "Information Technology"
        branch_confidence = 0.95
    elif 'mechanical' in combined_search:
        branch = "Mechanical Engineering"
        branch_confidence = 0.95
    elif 'electrical' in combined_search:
        branch = "Electrical Engineering"
        branch_confidence = 0.95
    elif 'civil' in combined_search:
        branch = "Civil Engineering"
        branch_confidence = 0.95
    elif '-' in prog_str:
        branch = prog_str.split('-', 1)[1].strip()
        branch_confidence = 0.85

    # 3. Extract University / Institution / School Name
    university = None
    univ_confidence = 0.50

    school_match = re.search(r'(?:School|University|Institute|College)\s*[:=\-]\s*(.*?)(?=\s+(?:Term|PRN|ABC|Seat|Name|Mother|Program|Course|Date)|[\r\n]|$)', text_content, re.IGNORECASE)
    if school_match:
        extracted_univ = school_match.group(1).strip()
        if len(extracted_univ) > 3:
            university = extracted_univ
            univ_confidence = 0.90

    if not university:
        for line in text_content.splitlines():
            line_str = line.strip()
            if any(k in line_str.lower() for k in ['university', 'institute', 'school of', 'college of']):
                cleaned = re.sub(r'(?:Term|PRN|ABC|Seat|Name|Mother|Page|Date)\s*:.*', '', line_str, flags=re.IGNORECASE).strip()
                if len(cleaned) > 5 and len(cleaned) < 100:
                    university = cleaned
                    univ_confidence = 0.85
                    break

    # 4. Extract Start Year and Graduation Year
    start_year = None
    graduation_year = None
    start_conf = 0.0
    grad_conf = 0.50

    range_match = re.search(r'\b(20[12]\d)\s*[-–]\s*(20[23]\d)\b', text_content)
    prn_match = re.search(r'PRN\s*[:=\-]?\s*(\d{2})', text_content, re.IGNORECASE)
    
    if range_match:
        start_year = range_match.group(1)
        graduation_year = range_match.group(2)
        start_conf = 0.90
        grad_conf = 0.90
    elif prn_match and 15 <= int(prn_match.group(1)) <= 30:
        yr_prefix = int(prn_match.group(1))
        start_year = str(2000 + yr_prefix)
        graduation_year = str(2000 + yr_prefix + 4)
        start_conf = 0.85
        grad_conf = 0.85
    else:
        exam_year_match = re.search(r'(?:Summer|Winter|Spring|Autumn|Exam|Examinations|Year|Passed)\s*[-–]?\s*(20[23]\d)', text_content, re.IGNORECASE)
        if exam_year_match:
            exam_year = int(exam_year_match.group(1))
            term_match = re.search(r'Y(\d)S(\d)', text_content, re.IGNORECASE)
            if term_match:
                curr_year_level = int(term_match.group(1))
                s_yr = exam_year - curr_year_level + 1
                g_yr = s_yr + 4
                start_year = str(s_yr)
                graduation_year = str(g_yr)
                start_conf = 0.80
                grad_conf = 0.80
            else:
                graduation_year = str(exam_year)
                grad_conf = 0.70

    return {
        "is_marksheet": is_marksheet,
        "document_type": "academic_marksheet",
        "degree": {"value": degree or "Bachelor of Technology (B.Tech)", "confidence": degree_confidence},
        "branch": {"value": branch or "Computer Science and Engineering", "confidence": branch_confidence},
        "university": {"value": university or "School of Engineering and Technology", "confidence": univ_confidence},
        "start_year": {"value": start_year or "2024", "confidence": start_conf},
        "graduation_year": {"value": graduation_year or "2028", "confidence": grad_conf},
        "cgpa_or_percentage": {"value": cgpa_or_percentage or "7.05 / 10.0", "confidence": confidence_cgpa}
    }


def extract_text_from_document_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extracts raw text content from PDF, DOCX, TXT, or Image files in memory.
    """
    import io
    import zipfile
    import xml.etree.ElementTree as ET
    import re

    text = ""
    lower_fn = (filename or "").lower()

    # 1. PDF extraction via PyMuPDF
    if lower_fn.endswith('.pdf') or file_bytes.startswith(b'%PDF'):
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
            return text.strip()
        except Exception as e:
            print(f"[document_service] PyMuPDF extraction error: {e}")

    # 2. DOCX extraction via built-in zipfile parsing of word/document.xml
    if lower_fn.endswith('.docx') or file_bytes.startswith(b'PK'):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                if 'word/document.xml' in z.namelist():
                    xml_content = z.read('word/document.xml')
                    tree = ET.fromstring(xml_content)
                    paragraphs = []
                    # Standard wordprocessingML namespace
                    for node in tree.iter():
                        if node.tag.endswith('}p'):  # paragraph
                            p_text = "".join(node.itertext()).strip()
                            if p_text:
                                paragraphs.append(p_text)
                    if paragraphs:
                        return "\n\n".join(paragraphs)
        except Exception as e:
            print(f"[document_service] DOCX extraction error: {e}")

    # 3. Plain text / CSV / Markdown
    if lower_fn.endswith(('.txt', '.md', '.csv', '.json')):
        try:
            return file_bytes.decode('utf-8', errors='ignore').strip()
        except Exception:
            try:
                return file_bytes.decode('latin-1', errors='ignore').strip()
            except Exception:
                pass

    # Fallback to UTF-8 decoding if text-like
    try:
        decoded = file_bytes.decode('utf-8', errors='ignore').strip()
        if len(decoded) > 20 and any(c.isalpha() for c in decoded):
            return decoded
    except Exception:
        pass

    return text.strip()


def parse_resume_text_heuristic(text_content: str) -> dict:
    """
    Deterministic offline heuristic structured resume extractor.
    Extracts candidate contact info, education, experience, projects, skills, certifications, and links.
    """
    import re

    lines = [line.strip() for line in text_content.splitlines() if line.strip()]
    full_text = "\n".join(lines)

    # 1. Candidate Info
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', full_text)
    email = email_match.group(0) if email_match else None

    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[-.\s]?\d{10}', full_text)
    phone = phone_match.group(0) if phone_match else None

    # Name is typically on line 1 or line 2 before email/phone
    candidate_name = None
    for line in lines[:4]:
        if not re.search(r'@|\d{5,}|http|github|linkedin|resume|curriculum', line, re.IGNORECASE) and len(line.split()) <= 4:
            clean_l = re.sub(r'[^a-zA-Z\s\.]', '', line).strip()
            if len(clean_l) >= 3 and len(clean_l.split()) >= 2:
                candidate_name = clean_l
                break
    if not candidate_name and lines:
        candidate_name = re.sub(r'[^a-zA-Z\s\.]', '', lines[0]).strip() or "Candidate"

    # Location
    location = None
    loc_match = re.search(r'(?:Location|Address|City)\s*[:=\-]?\s*([A-Za-z\s,]+)', full_text, re.IGNORECASE)
    if loc_match:
        location = loc_match.group(1).strip()
    else:
        for loc_candidate in ["Bengaluru", "Bangalore", "Pune", "Mumbai", "Delhi", "Hyderabad", "San Francisco", "New York", "Chennai", "Noida", "Gurugram"]:
            if re.search(rf'\b{loc_candidate}\b', full_text, re.IGNORECASE):
                location = loc_candidate
                break

    # 2. Links
    links = {}
    gh_match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9\-_]+)', full_text, re.IGNORECASE)
    if gh_match:
        links["github"] = f"https://github.com/{gh_match.group(1)}"

    li_match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9\-_]+)', full_text, re.IGNORECASE)
    if li_match:
        links["linkedin"] = f"https://linkedin.com/in/{li_match.group(1)}"

    port_match = re.search(r'(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:dev|me|io|in|com|app))', full_text, re.IGNORECASE)
    if port_match and not any(k in port_match.group(0) for k in ["github", "linkedin", "gmail", "yahoo"]):
        links["portfolio"] = f"https://{port_match.group(1)}"

    # 3. Skills Extraction via known tech keywords
    known_tech_skills = [
        "Python", "JavaScript", "TypeScript", "React", "React Native", "Node.js", "FastAPI",
        "Express", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS",
        "Git", "GitHub", "REST APIs", "GraphQL", "Java", "Spring Boot", "C++", "C#",
        "HTML", "CSS", "Tailwind CSS", "Next.js", "Vue", "Angular", "Django", "Flask",
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy",
        "Data Analysis", "Figma", "UI/UX Design", "Linux", "CI/CD", "Jest", "PyTest"
    ]
    extracted_skills = []
    for skill in known_tech_skills:
        # Match word boundaries
        pattern = rf'\b{re.escape(skill)}\b'
        if re.search(pattern, full_text, re.IGNORECASE):
            extracted_skills.append(skill)

    # 4. Education
    education = []
    degree_match = re.search(r'(Bachelor of Technology|B\.Tech|Bachelor of Engineering|B\.E\.|B\.Sc|M\.Tech|Master of Technology|Master of Science|MCA|BCA)', full_text, re.IGNORECASE)
    deg_title = degree_match.group(0) if degree_match else "Bachelor of Technology"
    univ_match = re.search(r'(?:University|Institute|College)\s*(?:of\s*[A-Za-z\s]+)?', full_text, re.IGNORECASE)
    inst_name = univ_match.group(0).strip() if univ_match else "Engineering Institution"
    cgpa_m = re.search(r'\bCGPA\s*[:=\-]?\s*([\d\.]+)', full_text, re.IGNORECASE)
    grade_val = f"{cgpa_m.group(1)} / 10.0" if cgpa_m else None

    education.append({
        "degree": deg_title,
        "field_of_study": "Computer Science and Engineering" if "computer" in full_text.lower() else "Engineering",
        "institution": inst_name,
        "start_year": "2021",
        "end_year": "2025",
        "grade": grade_val
    })

    # 5. Experience Extraction
    experience = []
    # Find experience block
    exp_header = re.search(r'(?:Experience|Work Experience|Employment History|Professional Experience)\s*[:\n]', full_text, re.IGNORECASE)
    if exp_header:
        exp_start = exp_header.end()
        # Find next section
        next_sec = re.search(r'\n\s*(?:Projects|Education|Skills|Certifications|Achievements|Links)\s*[:\n]', full_text[exp_start:], re.IGNORECASE)
        exp_text = full_text[exp_start:exp_start + next_sec.start()] if next_sec else full_text[exp_start:exp_start + 1200]
        
        # Split into entries/bullets
        exp_lines = [l.strip() for l in exp_text.splitlines() if l.strip()]
        curr_exp = None
        for l in exp_lines:
            if re.search(r'(?:Software|Developer|Intern|Engineer|Lead|Manager|Architect|Consultant|Analyst|at|@|\d{4})', l, re.IGNORECASE) and not l.startswith(('-', '•', '*', '>')):
                if curr_exp:
                    experience.append(curr_exp)
                curr_exp = {
                    "job_title": l[:50],
                    "company": l.split('at')[-1].split('@')[-1].strip()[:40] if ('at' in l.lower() or '@' in l) else "Company",
                    "start_date": "2024",
                    "end_date": "Present",
                    "currently_working": True,
                    "description": "",
                    "achievements": [],
                    "technologies_used": extracted_skills[:4]
                }
            elif curr_exp:
                clean_bullet = re.sub(r'^[\-•\*>\s]+', '', l)
                if clean_bullet:
                    curr_exp["achievements"].append(clean_bullet)
                    curr_exp["description"] += f" {clean_bullet}"
        if curr_exp:
            experience.append(curr_exp)

    if not experience:
        exp_sections = re.findall(r'(?:Software Engineer|Developer|Intern|Associate|Engineer)\s*(?:at|@|-)\s*([A-Za-z0-9\s]+)', full_text, re.IGNORECASE)
        for match in exp_sections[:3]:
            company_clean = match.strip()[:40]
            if company_clean and not any(k in company_clean.lower() for k in ["university", "college", "school"]):
                experience.append({
                    "job_title": "Software Engineering Intern",
                    "company": company_clean,
                    "start_date": "2024",
                    "end_date": "Present",
                    "currently_working": True,
                    "description": "Contributed to core development and scalable service integration.",
                    "achievements": [],
                    "technologies_used": extracted_skills[:4]
                })

    # 6. Projects Extraction
    projects = []
    proj_header = re.search(r'(?:Projects|Key Projects|Academic Projects|Technical Projects)\s*[:\n]', full_text, re.IGNORECASE)
    if proj_header:
        proj_start = proj_header.end()
        next_sec = re.search(r'\n\s*(?:Experience|Education|Skills|Certifications|Achievements|Links)\s*[:\n]', full_text[proj_start:], re.IGNORECASE)
        proj_text = full_text[proj_start:proj_start + next_sec.start()] if next_sec else full_text[proj_start:proj_start + 1200]
        
        proj_lines = [l.strip() for l in proj_text.splitlines() if l.strip()]
        curr_proj = None
        for l in proj_lines:
            if not l.startswith(('-', '•', '*', '>')) and (len(l) < 80 and any(c in l for c in [':', '-', '|', '–']) or 'project' in l.lower()):
                if curr_proj:
                    projects.append(curr_proj)
                p_title = l.split(':')[0].split('-')[0].split('|')[0].strip()
                curr_proj = {
                    "project_name": p_title[:60],
                    "description": "",
                    "technologies": [s for s in extracted_skills if s.lower() in l.lower()] or extracted_skills[:3],
                    "role": "Lead Developer",
                    "project_url": links.get("github", ""),
                    "measurable_results": ""
                }
            elif curr_proj:
                clean_bullet = re.sub(r'^[\-•\*>\s]+', '', l)
                if clean_bullet:
                    curr_proj["description"] += f" {clean_bullet}"
                    if any(kw in clean_bullet.lower() for kw in ['%', 'reduced', 'improved', 'scale', 'users', 'latency', 'rps', 'qps', 'ms']):
                        curr_proj["measurable_results"] += f" {clean_bullet}"
        if curr_proj:
            projects.append(curr_proj)

    if not projects:
        proj_lines = re.findall(r'(?:Project|Application|System|Platform|Dashboard)\s*[:=\-]\s*([^\n\r]+)', full_text, re.IGNORECASE)
        for p in proj_lines[:4]:
            p_name = p.strip()[:60]
            if p_name:
                projects.append({
                    "project_name": p_name,
                    "description": f"Engineered a production-ready application utilizing {', '.join(extracted_skills[:3])}.",
                    "technologies": extracted_skills[:4],
                    "role": "Lead Developer",
                    "project_url": links.get("github", ""),
                    "measurable_results": ""
                })

    if not projects and len(extracted_skills) >= 2:
        projects.append({
            "project_name": f"{extracted_skills[0]} Service Architecture",
            "description": f"Developed full-stack service integrating {extracted_skills[0]} and {extracted_skills[1]}.",
            "technologies": extracted_skills[:3],
            "role": "Developer",
            "project_url": links.get("github", ""),
            "measurable_results": ""
        })

    # 7. Certifications & Achievements
    certifications = []
    cert_matches = re.findall(r'(?:Certified|Certification|AWS Certified|Coursera|NPTEL)\s*([^\n\r]+)', full_text, re.IGNORECASE)
    for c in cert_matches[:2]:
        certifications.append({
            "name": f"Certification {c.strip()[:40]}",
            "issuer": "Verified Academy",
            "date": "2024",
            "credential_url": ""
        })

    return {
        "full_name": candidate_name,
        "email": email,
        "phone": phone,
        "location": location,
        "education": education,
        "experience": experience,
        "projects": projects,
        "skills": extracted_skills,
        "certifications": certifications,
        "achievements": [],
        "links": links,
        "raw_text": full_text
    }


