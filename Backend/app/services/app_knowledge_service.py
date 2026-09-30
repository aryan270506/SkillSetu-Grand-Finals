"""
AppKnowledgeService: Authoritative Application Knowledge Registry for SkillSetu.

Provides structured, comprehensive knowledge of every tab, screen, module, feature,
workflow, metric, score calculation, button, and navigation action in the SkillSetu application.

This ensures the Personal AI Mentor has complete, verifiable knowledge of the entire
SkillSetu platform without hallucinating non-existent features or arbitrary navigation routes.
"""

from typing import Dict, Any, List, Optional
import re


class AppKnowledgeService:
    """
    Central registry and query engine for SkillSetu application knowledge.
    Contains verified details extracted directly from the active frontend and backend codebase.
    """

    # =========================================================================
    # 1. REGISTERED APPLICATION TABS & SCREENS
    # =========================================================================
    TABS_REGISTRY: Dict[str, Dict[str, Any]] = {
        "Dashboard": {
            "tabId": "Dashboard",
            "navLabel": "Dashboard",
            "title": "Student Career Dashboard",
            "summary": "The central command center providing a high-level overview of career readiness, GitHub skill index, target career fit, action plan items, and quick course recommendations.",
            "location": "Header navigation -> 'Dashboard' tab",
            "keyFeatures": [
                {
                    "name": "Skill Index Breakdown Card",
                    "description": "Displays the student's evidence-based technical Skill Index (0-100) calculated from verified GitHub repositories and core technologies.",
                    "formula": "60% Core Skill Strength + 25% Project Depth + 15% Skill Breadth",
                    "actions": ["View Skill Index Details", "Explore Evidence Breakdown", "View Active Domains"]
                },
                {
                    "name": "Target Career Fit & Readiness",
                    "description": "Shows current readiness percentage against the student's selected target role (e.g. Backend Developer, Full Stack Developer).",
                    "formula": "(verified_skills / total_required_skills) * 100",
                    "actions": ["Switch Target Career", "Navigate to Skills Matrix"]
                },
                {
                    "name": "GitHub Analysis Summary",
                    "description": "Displays connected GitHub username, repositories scanned, top programming languages, and verified framework evidence.",
                    "actions": ["Connect / Refresh GitHub", "View Scanned Repositories"]
                },
                {
                    "name": "Priority Action Plan",
                    "description": "Interactive checklist of prioritized next steps (e.g., complete missing skill module, apply for top matching internship, take mock interview).",
                    "actions": ["Mark Action Completed", "Launch Action Target"]
                },
                {
                    "name": "Recommended Courses",
                    "description": "Quick access to curated learning modules from NPTEL, SWAYAM, freeCodeCamp, and YouTube designed to close immediate skill gaps.",
                    "actions": ["Open Learning Roadmap", "Start Course"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Explore Skills / View Gaps", "action": "Navigates to Skills screen"},
                {"label": "Explore Matching Internships", "action": "Navigates to Opportunities screen"},
                {"label": "View Resume", "action": "Navigates to Resume screen"},
                {"label": "Complete Profile", "action": "Navigates to Profile wizard"}
            ]
        },

        "Profile": {
            "tabId": "Profile",
            "navLabel": "My Profile",
            "title": "Comprehensive Student Profile & Onboarding Wizard",
            "summary": "6-step profile management and verification system covering personal info, marksheet OCR extraction, career goals, resume analysis, and GitHub integration.",
            "location": "Header navigation -> 'My Profile' tab, or avatar dropdown -> 'My Profile'",
            "steps": [
                {
                    "stepNumber": 1,
                    "name": "Personal Info",
                    "fields": ["Full Name", "Email Address", "Phone Number", "Professional Headline", "Current Location", "Years of Experience", "Bio", "Profile Image"],
                    "purpose": "Establishes identity and basic professional positioning."
                },
                {
                    "stepNumber": 2,
                    "name": "Education & Marksheet Verification",
                    "fields": ["Institution / University", "Degree / Branch", "Academic Year", "CGPA / Percentage", "Marksheet File Upload"],
                    "technology": "Integrated with Sarvam OCR for automatic marksheet parsing (extracts CGPA, university name, academic year, degree).",
                    "purpose": "Provides verified academic standing."
                },
                {
                    "stepNumber": 3,
                    "name": "Career Goals & Preferences",
                    "fields": ["Target Career / Roles (multi-select)", "Preferred Locations", "Career Interests", "Opportunity Types (Full-time, Internship)", "Work Preferences (Remote, Hybrid, On-site)", "Industry Sector (FinTech, SaaS, Healthcare, etc.)", "Target Timeline (3-6 Months, 6-12 Months)"],
                    "purpose": "Configures the recommendation engine for matching internships, learning roadmaps, and career readiness."
                },
                {
                    "stepNumber": 4,
                    "name": "Resume & AI Analysis",
                    "fields": ["Resume File Upload (PDF/DOCX)", "Parsed Projects", "Work Experience", "Extracted Core Technologies", "ATS Compatibility Score"],
                    "technology": "Groq LLM Resume Parser extracts normalized skills, projects, experience, and calculates ATS compatibility.",
                    "purpose": "Populates verified skill evidence from past experience."
                },
                {
                    "stepNumber": 5,
                    "name": "GitHub & Professional Links",
                    "fields": ["GitHub Username", "LinkedIn URL", "Portfolio URL", "Scanned Repositories", "Detected Frameworks"],
                    "technology": "GitHub Analyzer scans public commits, language distributions, and manifest files (package.json, requirements.txt) to verify practical coding competence.",
                    "purpose": "Supplies objective, evidence-based code verification."
                },
                {
                    "stepNumber": 6,
                    "name": "Profile Verification & Summary",
                    "fields": ["Overall Profile Completion (0-100%)", "Verification Badge Status", "Summary Review"],
                    "purpose": "Locks in verified profile data and enables maximum internship match weighting."
                }
            ],
            "buttonsAndControls": [
                {"label": "Upload Marksheet", "action": "Triggers Sarvam OCR document processing"},
                {"label": "Upload Resume", "action": "Parses resume and updates ATS score & extracted skills"},
                {"label": "Connect GitHub", "action": "Initiates repository scan and commit analysis"},
                {"label": "Save & Continue / Save Profile", "action": "Persists profile changes to PostgreSQL backend"},
                {"label": "Edit Step", "action": "Jumps directly to any of the 6 onboarding steps"}
            ]
        },

        "Resume": {
            "tabId": "Resume",
            "navLabel": "Resume",
            "title": "AI Tailored Resume Generator & ATS Optimizer",
            "summary": "Interactive resume builder and ATS optimization studio. Automatically crafts a targeted resume matching the student's chosen career role, scores ATS readiness, and allows inline customization.",
            "location": "Header navigation -> 'Resume' tab",
            "keyFeatures": [
                {
                    "name": "Live Role-Based Tailoring",
                    "description": "Generates a customized resume dynamically tailored to any target career (e.g., Backend Developer, Full Stack Developer, Data Analyst) using verified skills and project evidence.",
                    "actions": ["Switch Target Role", "Regenerate Tailored Resume"]
                },
                {
                    "name": "ATS Score & Keyword Alignment Meter",
                    "description": "Scores resume ATS readiness (0-100) and displays matched keywords vs missing high-impact technical keywords for the chosen role.",
                    "formula": "Weighted composite: Contact info (10%) + Experience impact (35%) + Skill keyword alignment (30%) + Education (15%) + Certifications/Links (10%)",
                    "actions": ["Inspect Missing Keywords", "Apply AI ATS Recommendations"]
                },
                {
                    "name": "Structured Resume Sections",
                    "sections": [
                        "Header (Name, Contact, Headline, GitHub/LinkedIn links)",
                        "Professional Summary (Role-targeted executive summary)",
                        "Technical Skills (Categorized: Languages, Frameworks, Databases, Tools with matched vs recommended tags)",
                        "Work Experience (Action-oriented bullet points with measurable impact)",
                        "Featured Projects (Tech stack, live links, GitHub repos, problem solved)",
                        "Education & Academics (University, Degree, CGPA, graduation year)",
                        "Certifications & Achievements"
                    ]
                },
                {
                    "name": "Interactive Resume Editor",
                    "description": "Allows students to edit summaries, modify project descriptions, add custom bullet points, or reorder entries before exporting.",
                    "actions": ["Toggle Edit Mode", "Save Edits", "Discard Changes"]
                },
                {
                    "name": "Export & View Controls",
                    "description": "Provides print preview, PDF export, and zoom level adjustments (80%, 100%, 120%).",
                    "actions": ["Print / Download PDF", "Zoom In / Out"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Target Role Dropdown", "action": "Selects which job profile to tailor the resume for"},
                {"label": "Edit Resume", "action": "Opens the inline editor for custom modifications"},
                {"label": "Save Changes", "action": "Saves edited resume buffer to profile"},
                {"label": "Download PDF / Print", "action": "Exports print-ready PDF resume"},
                {"label": "Zoom 80% / 100% / 120%", "action": "Adjusts document viewport scale"}
            ]
        },

        "Skills": {
            "tabId": "Skills",
            "navLabel": "Skills",
            "title": "Skill Intelligence Matrix & Diagnostic Assessments",
            "summary": "Deep technical skill evaluation system mapped to canonical ESCO taxonomy. Measures career readiness, identifies skill gaps, offers diagnostic assessments, coding challenges, and tracks verified evidence.",
            "location": "Header navigation -> 'Skills' tab",
            "keyFeatures": [
                {
                    "name": "Career Readiness & Target Fit Score",
                    "description": "Calculates exact readiness percentage for the target career by evaluating verified skills against ESCO standard requirements.",
                    "formula": "Readiness = (verified_skills / total_required_skills) * 100; Target Fit = min(100, max(45, round(Readiness * 0.85 + 25)))",
                    "actions": ["Switch Target Career", "View Required vs Optional Skills"]
                },
                {
                    "name": "ESCO Skill Gap Matrix",
                    "description": "Comprehensive matrix categorizing skills into Essential (Core) vs Optional (Specialized) based on European Skills/Competences, Qualifications and Occupations (ESCO) standards.",
                    "statuses": [
                        "Verified (Green): Proven with GitHub commits, projects, or assessments",
                        "In Progress (Amber): Active in learning paths or developing",
                        "Missing / Gap (Red): Required for target career but unverified"
                    ]
                },
                {
                    "name": "Diagnostic Skill Assessments (MCQs)",
                    "description": "Interactive multiple-choice knowledge evaluations for specific technical skills (e.g. Python, SQL, Docker, React).",
                    "actions": ["Take Assessment", "Submit Quiz", "Instant Verification (80%+ score unlocks Verified badge)"]
                },
                {
                    "name": "Hands-on Coding Practice Challenges",
                    "description": "Algorithmic and practical coding tasks tied to skill gaps to build concrete coding proof.",
                    "actions": ["Practice Challenge", "View Problem Description", "Submit Solution"]
                },
                {
                    "name": "Skill Evidence Drawer",
                    "description": "Transparently shows the exact evidence backing each skill rating (e.g. GitHub commit count, repository names, lines of code, resume mentions, course certificates).",
                    "actions": ["Click on any skill card", "View Evidence Details", "View Related Projects"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Career Selector Dropdown", "action": "Switches the active career framework to analyze gaps against"},
                {"label": "Take Assessment", "action": "Launches MCQ skill verification quiz"},
                {"label": "Practice Challenge", "action": "Opens practical coding challenge sandbox"},
                {"label": "Filter by Domain / Status", "action": "Filters skills by Frontend, Backend, Database, Cloud, DevOps, or status"},
                {"label": "View Evidence", "action": "Opens drawer detailing GitHub and resume proofs for that skill"}
            ]
        },

        "Learning": {
            "tabId": "Learning",
            "navLabel": "Learning",
            "title": "Personalized Multi-Stage Learning Roadmap & Course Catalog",
            "summary": "Adaptive learning management system that generates stage-by-stage learning paths (Foundation -> Intermediate -> Advanced) and aggregates curated courses from top Indian and global platforms.",
            "location": "Header navigation -> 'Learning' tab",
            "subTabs": [
                {
                    "subTabId": "Overview",
                    "name": "Roadmap Overview",
                    "description": "Visual multi-stage career progression timeline showing Foundation (Stage 1), Intermediate (Stage 2), and Advanced (Stage 3) milestones, total hours, and completion percentage."
                },
                {
                    "subTabId": "Courses",
                    "name": "Curated Courses Catalog",
                    "description": "Searchable and filterable catalog of free/high-quality courses aggregated from NPTEL, SWAYAM, freeCodeCamp, YouTube, Coursera, and MIT OpenCourseWare.",
                    "filters": ["Status: All, In Progress, Completed, Not Started", "Provider: All, NPTEL, SWAYAM, freeCodeCamp, YouTube, Coursera"]
                },
                {
                    "subTabId": "Practice",
                    "name": "Practice Projects & Labs",
                    "description": "Hands-on implementation projects designed to convert theoretical course learning into verifiable portfolio artifacts."
                },
                {
                    "subTabId": "Schedule",
                    "name": "Weekly Study Schedule",
                    "description": "Paced study timetable recommending daily focus hours, upcoming deadlines, and weekly module completion goals."
                }
            ],
            "keyFeatures": [
                {
                    "name": "Stage-Wise Progression",
                    "stages": [
                        "Stage 1: Foundation (Core languages, data structures, fundamental concepts)",
                        "Stage 2: Intermediate (Frameworks, databases, REST APIs, architecture)",
                        "Stage 3: Advanced (Cloud deployment, Docker, CI/CD, system design, scalability)"
                    ]
                },
                {
                    "name": "Interactive Progress Tracking",
                    "description": "Students can update their progress percentage for any course or mark modules completed, which dynamically updates their Skill Readiness.",
                    "actions": ["Update Progress Modal", "Set Progress 0-100%", "Mark Completed"]
                },
                {
                    "name": "External Course Launch",
                    "description": "Direct external links to official course platforms (NPTEL portal, SWAYAM, YouTube playlists, freeCodeCamp interactive labs).",
                    "actions": ["Start Course / Go to Course"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Sub-Tabs (Overview, Courses, Practice, Schedule)", "action": "Switches the active learning sub-view"},
                {"label": "Update Progress", "action": "Opens modal to record completed modules or update completion %"},
                {"label": "Start Course / View Course", "action": "Launches external course URL in new browser tab"},
                {"label": "Refresh Roadmap", "action": "Regenerates learning path based on newly verified skills"}
            ]
        },

        "Opportunities": {
            "tabId": "Opportunities",
            "navLabel": "Opportunities",
            "title": "Internship Recommendation & Matching Engine",
            "summary": "Real-time technology internship recommendation platform. Calculates explainable match percentages based on skills, career preferences, location, and industry.",
            "location": "Header navigation -> 'Opportunities' tab",
            "keyFeatures": [
                {
                    "name": "Deterministic Internship Match Score (0-100%)",
                    "description": "Calculates transparent match scores for every listing using a multi-factor weighted formula.",
                    "formula": "40% Skill Match + 20% Target Career Alignment + 15% Industry Fit + 10% Location Match + 5% Opportunity Type + 5% Work Preference + 5% Timeline Fit",
                    "actions": ["View Match Breakdown Drawer", "Inspect Matched vs Missing Skills"]
                },
                {
                    "name": "Rich Internship Listings",
                    "fields": [
                        "Job Title & Company Name",
                        "Location & Work Preference (Remote, Hybrid, On-site)",
                        "Monthly Stipend (e.g. ₹25,000 - ₹35,000 / month)",
                        "Application Deadline",
                        "Required vs Preferred Technical Skills",
                        "Company Industry & Opportunity Type"
                    ]
                },
                {
                    "name": "Search & Multi-Facet Filters",
                    "filters": [
                        "Search Keyword (e.g. 'Backend', 'React', 'Python', 'FastAPI')",
                        "Location Filter (e.g. Pune, Bengaluru, Mumbai, Remote)",
                        "Work Type (Full-time, Internship)",
                        "Work Preference (Remote, Hybrid, On-site)",
                        "Stipend Range Filter"
                    ]
                },
                {
                    "name": "Direct Application Submission",
                    "description": "Allows students to apply directly with their tailored resume and profile data with a single click, instantly syncing with the Applications tracker.",
                    "actions": ["Apply Now", "Bookmark / Save Opportunity"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Apply Now", "action": "Submits student application to the company and logs it in Applications tab"},
                {"label": "View Match Breakdown / Why this match?", "action": "Opens drawer detailing exact skill matches and missing gaps"},
                {"label": "Bookmark / Save", "action": "Saves internship to student's shortlisted opportunities"},
                {"label": "Filter Chips & Search Bar", "action": "Filters the available internship listings in real-time"}
            ]
        },

        "Applications": {
            "tabId": "Applications",
            "navLabel": "Applications",
            "title": "Internship Application Pipeline & Status Tracker",
            "summary": "Full lifecycle tracking for all submitted internship applications, including review stages, recruiter feedback, interview schedules, and assessment links.",
            "location": "Header navigation -> 'Applications' tab",
            "keyFeatures": [
                {
                    "name": "Multi-Stage Application Pipeline",
                    "stages": [
                        "1. Saved: Bookmarked opportunities",
                        "2. Application Submitted: Successfully delivered to employer",
                        "3. Resume Viewed: Recruiter reviewed the tailored resume",
                        "4. Under Review: Candidate profile in technical evaluation",
                        "5. Shortlisted: Selected for testing or interview stage",
                        "6. Assessment: Pending coding/technical test",
                        "7. Interview: Technical or HR interview scheduled",
                        "8. Offered / Rejected: Final decision status"
                    ]
                },
                {
                    "name": "Status Filtering",
                    "filters": ["All", "Under Review", "Shortlisted", "Interview", "Offered", "Rejected"]
                },
                {
                    "name": "Application Cards & Next Actions",
                    "fields": [
                        "Company Name & Role",
                        "Match Rate % at time of application",
                        "Date Applied & Deadline",
                        "Resume Version Used (e.g. Backend Resume v2.pdf)",
                        "ATS Score at submission",
                        "Next Action Callout (e.g. 'Complete assessment', 'Waiting for employer review')"
                    ]
                },
                {
                    "name": "Assessment Launcher",
                    "description": "Directly opens pending technical assessments associated with shortlisted applications.",
                    "actions": ["Take Assessment / Start Test"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Status Filter Chips (All, Under Review, Shortlisted, etc.)", "action": "Filters visible applications by stage"},
                {"label": "Take Assessment", "action": "Launches required employer evaluation test"},
                {"label": "View Timeline / Details", "action": "Expands the full multi-step history and recruiter notes"}
            ]
        },

        "Scholarships": {
            "tabId": "Scholarships",
            "navLabel": "Scholarships",
            "title": "Financial Aid & Technical Scholarship Portal",
            "summary": "Curated database of educational grants, government schemes, and corporate STEM scholarships for Indian engineering students.",
            "location": "Header navigation -> 'Scholarships' tab",
            "keyFeatures": [
                {
                    "name": "Curated Scholarship Programs",
                    "examples": [
                        "Tata Scholarship Program (₹2,00,000/yr for top engineering undergraduates)",
                        "Santoor Women's Scholarship (₹75,000/yr for women in technical disciplines)",
                        "Amazon Future Engineer Scholarship (₹1,60,000 + SWE mentorship & coding gear)"
                    ]
                },
                {
                    "name": "Match & Eligibility Verification",
                    "fields": ["Match %", "Eligibility Type (Merit-based, Need-based, Women in Tech, STEM)", "Award Amount", "Application Deadline", "Required Documents"]
                },
                {
                    "name": "External Application Link",
                    "description": "Direct link to verified scholarship provider portals.",
                    "actions": ["Apply on Portal", "Bookmark Scholarship"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Apply Now / Apply on Portal", "action": "Opens official scholarship application portal"},
                {"label": "Bookmark", "action": "Saves scholarship to student's saved list"}
            ]
        },

        "InterviewPrep": {
            "tabId": "InterviewPrep",
            "navLabel": "Interview",
            "title": "AI Mock Interview Simulator & Technical Question Bank",
            "summary": "Complete interview preparation environment featuring upcoming interview countdowns, AI mock interview simulator with response recording, and comprehensive topic-wise question banks.",
            "location": "Header navigation -> 'Interview' tab",
            "keyFeatures": [
                {
                    "name": "Upcoming Interviews Timeline",
                    "description": "Tracks confirmed technical rounds with countdown badges ('Tomorrow', 'In 2 days'), meeting links (Google Meet, Zoom, SkillSetu Sandbox), tested skills, and prep readiness %.",
                    "actions": ["Prepare Now", "Join Room (Test)", "View Round Details"]
                },
                {
                    "name": "AI Mock Interview Simulator",
                    "description": "Simulates realistic technical and behavioral interviews. Presents questions, allows text or audio answer recording, and provides instant rubric scoring and constructive feedback.",
                    "actions": ["Start Mock Interview", "Record Answer", "Submit for AI Evaluation"]
                },
                {
                    "name": "Topic-Wise Question Bank",
                    "categories": [
                        "DSA & Algorithms (Arrays, Linked Lists, Trees, DP, Graphs)",
                        "System Design & Architecture (Databases, Caching, Load Balancing)",
                        "Behavioral & HR (STAR Method, Conflict Resolution, Leadership)",
                        "Fullstack & Web Development (React lifecycle, DOM, REST APIs)",
                        "Backend & Databases (SQL indexing, transactions, Docker, FastAPI)"
                    ],
                    "actions": ["Expand Solution Accordion", "View STAR Method Hint", "Practice Answer"]
                }
            ],
            "buttonsAndControls": [
                {"label": "Start Mock Interview", "action": "Initiates full AI mock interview session"},
                {"label": "Prepare Now", "action": "Opens targeted prep plan for an upcoming scheduled interview"},
                {"label": "Join Room (Test)", "action": "Tests audio/video/sandbox connection before live interview"},
                {"label": "Expand Question Accordion", "action": "Reveals detailed answer, time complexity, and explanation"},
                {"label": "Practice This Question", "action": "Opens sandbox to draft answer and receive AI critique"}
            ]
        }
    }

    # =========================================================================
    # 2. METRICS, SCORES & CALCULATION REGISTRY
    # =========================================================================
    METRICS_REGISTRY: Dict[str, Dict[str, Any]] = {
        "Career Readiness Score": {
            "name": "Career Readiness Score",
            "range": "0% to 100%",
            "formula": "Career Readiness = (verified_skills_count / total_required_career_skills) * 100",
            "explanation": "Calculates the percentage of essential and required skills for a target career (defined by ESCO taxonomy) that the student has objectively verified through GitHub code commits, completed projects, course certifications, or diagnostic assessments.",
            "whereFound": "Skills screen (top hero card), Dashboard (Target Career card)",
            "impact": "Directly determines target career fit and drives internship recommendation match percentages.",
            "howToImprove": "Take diagnostic assessments on the Skills tab, complete missing course modules on Learning tab, or push code containing missing technologies to connected GitHub repos."
        },

        "Target Fit Score": {
            "name": "Target Fit Score",
            "range": "0% to 100%",
            "formula": "Target Fit = min(100, max(45, round(Career_Readiness * 0.85 + 25)))",
            "explanation": "A calibrated composite score representing overall employability fit for a specific target role, blending verified skills with academic foundation and baseline technical competence.",
            "whereFound": "Skills screen, Dashboard",
            "impact": "Indicates probability of clearing initial technical screening."
        },

        "Skill Index": {
            "name": "GitHub Skill Index",
            "range": "0 to 100",
            "formula": "Skill Index = (0.60 * Core Skill Strength) + (0.25 * Project Depth) + (0.15 * Skill Breadth)",
            "taxonomy": {
                "Tier 1 (Languages & Major Frameworks, Weight: 1.2/1.0)": "Python, JavaScript, TypeScript, Java, C++, Go, React, Node.js, FastAPI, Django, PostgreSQL, Docker, AWS, etc.",
                "Tier 2 (Supporting Technologies, Weight: 0.5)": "Redux, Tailwind CSS, Next.js, Prisma, Jest, Vite, Pandas, NumPy, Scikit-learn, etc.",
                "Tier 3 (Micro-dependencies, Weight: 0.0)": "Utility packages excluded from score to prevent dilution."
            },
            "subScores": {
                "Core Skill Strength (60%)": "Weighted average proficiency across Tier 1 and Tier 2 skills.",
                "Project Depth (25%)": "Average score of the top 5 highest proficiency skills, reflecting depth in key specializations.",
                "Skill Breadth (15%)": "Breadth across different technical domains (Frontend, Backend, Database, Cloud, AI/ML, DevOps). Max 100 for 5+ domains."
            },
            "whereFound": "Dashboard screen (Skill Index hero widget)",
            "impact": "Validates practical, real-world coding ability directly from Git commits.",
            "howToImprove": "Build and commit substantial multi-file projects in Tier 1 technologies to connected GitHub repositories."
        },

        "Resume ATS Score": {
            "name": "Resume ATS Compatibility Score",
            "range": "0 to 100",
            "formula": "Weighted sum of: Contact info (10%) + Experience & Action Verbs (35%) + Skill Keyword Alignment (30%) + Education (15%) + Certifications/Links (10%)",
            "explanation": "Measures how effectively the student's resume parses through Applicant Tracking Systems (ATS) and how closely its technical keywords match industry job descriptions for their target role.",
            "whereFound": "Resume screen (ATS score gauge), Profile Step 4",
            "impact": "High ATS scores (85+) drastically reduce resume auto-rejections by corporate recruiters.",
            "howToImprove": "Use the Resume screen's AI Tailored Resume generator to automatically include missing high-impact technical keywords and quantifiable impact statements."
        },

        "Internship Match Score": {
            "name": "Internship Match Score",
            "range": "0% to 100%",
            "formula": "Match = (0.40 * Skill Match) + (0.20 * Career Alignment) + (0.15 * Industry Fit) + (0.10 * Location Match) + (0.05 * Opportunity Type) + (0.05 * Work Preference) + (0.05 * Timeline Fit)",
            "explanation": "Deterministic multi-factor matching formula that explains exactly why a student is qualified for an internship listing.",
            "weights": {
                "Required Skills Match": "40% — Proportion of mandatory internship skills verified in student profile",
                "Target Career Match": "20% — Alignment between internship title and student's target careers",
                "Industry Fit": "15% — Match with student's preferred industry sector (e.g. FinTech, SaaS)",
                "Location Match": "10% — Exact match with student's preferred cities or Remote preference",
                "Opportunity Type": "5% — Match with Full-time vs Internship preference",
                "Work Preference": "5% — Remote vs Hybrid vs On-site alignment",
                "Timeline Fit": "5% — Application start date alignment with student availability"
            },
            "whereFound": "Opportunities screen (Match % badge on internship cards), Application tracker",
            "impact": "Determines ordering and recommendation priority of internship opportunities."
        },

        "Profile Completion Score": {
            "name": "Profile Completion Score",
            "range": "0% to 100%",
            "formula": "(Completed_Steps / 5) * 80% + 20% Verified Badge Bonus",
            "explanation": "Tracks progress through the 5 core profile steps: Personal Info (+16%), Education & Marksheet (+16%), Career Goals (+16%), Resume Analysis (+16%), and GitHub/Links (+16%). Verification unlocks 100%.",
            "whereFound": "Dashboard (header completion banner), Profile screen",
            "impact": "Completed profiles unlock full personalized recommendation accuracy and priority recruiter visibility."
        }
    }

    # =========================================================================
    # 3. WORKFLOWS & STEP-BY-STEP GUIDES
    # =========================================================================
    WORKFLOWS_REGISTRY: Dict[str, Dict[str, Any]] = {
        "connect_github": {
            "title": "How to Connect and Analyze GitHub",
            "steps": [
                "1. Navigate to 'My Profile' tab (or click 'Connect GitHub' on Dashboard).",
                "2. Scroll to Step 5: 'GitHub & Professional Links'.",
                "3. Enter your GitHub username in the input field.",
                "4. Click 'Connect GitHub' or 'Analyze Repositories'.",
                "5. SkillSetu scans public repositories, analyzes commit frequency, language distribution, and package manifests.",
                "6. Your GitHub Skill Index and verified skills update automatically on Dashboard and Skills tabs."
            ],
            "actionTab": "Profile"
        },
        "upload_marksheet_ocr": {
            "title": "How to Upload Marksheet with Sarvam OCR",
            "steps": [
                "1. Navigate to 'My Profile' tab -> Step 2: 'Education & Marksheet Verification'.",
                "2. Click 'Upload Marksheet' and select your marksheet PDF or image.",
                "3. Sarvam OCR parses the document in seconds, extracting CGPA, institution name, academic year, and branch.",
                "4. Review the detected details and click 'Confirm & Save'."
            ],
            "actionTab": "Profile"
        },
        "generate_tailored_resume": {
            "title": "How to Generate and Export a Tailored Resume",
            "steps": [
                "1. Navigate to the 'Resume' tab from the top navigation bar.",
                "2. Use the 'Target Role' dropdown at the top to select the desired job role (e.g. Backend Developer).",
                "3. SkillSetu's AI instantly tailors the Professional Summary, highlights matching technical skills, and aligns experience bullet points.",
                "4. Review your ATS Score and check for missing keywords in the ATS panel.",
                "5. (Optional) Click 'Edit Resume' to make custom modifications in the inline editor.",
                "6. Click 'Download PDF / Print' to export your ATS-optimized resume."
            ],
            "actionTab": "Resume"
        },
        "take_skill_assessment": {
            "title": "How to Take a Skill Diagnostic Assessment",
            "steps": [
                "1. Navigate to the 'Skills' tab.",
                "2. Locate the skill you want to verify in the Skill Gap Matrix (e.g. Python, SQL, Docker).",
                "3. Click 'Take Assessment' on that skill card.",
                "4. Complete the multiple-choice diagnostic quiz within the allotted time.",
                "5. Scoring 80% or higher immediately changes that skill's status to 'Verified' (Green) and updates your Career Readiness score."
            ],
            "actionTab": "Skills"
        },
        "apply_for_internship": {
            "title": "How to Find and Apply for Internships",
            "steps": [
                "1. Navigate to the 'Opportunities' tab.",
                "2. Filter listings by role, location (Remote/Hybrid/Onsite), or stipend, or search by keyword.",
                "3. Review the Match Score % on each card. Click 'Why this match?' to see matched vs missing skills.",
                "4. Click 'Apply Now' on the chosen listing.",
                "5. Your tailored resume and verified profile data are submitted directly.",
                "6. Track your application status anytime under the 'Applications' tab."
            ],
            "actionTab": "Opportunities"
        },
        "update_course_progress": {
            "title": "How to Update Course Progress on Learning Roadmap",
            "steps": [
                "1. Navigate to the 'Learning' tab.",
                "2. Switch to the 'Courses' sub-tab.",
                "3. Find the course module you have been studying (from NPTEL, freeCodeCamp, etc.).",
                "4. Click 'Update Progress' on the course card.",
                "5. Adjust the progress slider (0-100%) or click 'Mark as Completed'.",
                "6. Click 'Save Progress' — your Career Readiness score and roadmap timeline update dynamically."
            ],
            "actionTab": "Learning"
        },
        "start_mock_interview": {
            "title": "How to Start an AI Mock Interview",
            "steps": [
                "1. Navigate to the 'Interview' tab.",
                "2. Under the hero section, click 'Start Mock Interview'.",
                "3. Select your target domain (DSA, Backend, Frontend, System Design, or Behavioral).",
                "4. Answer each question via text or speech recording.",
                "5. Receive instant AI feedback, scoring on clarity, technical accuracy, and STAR methodology."
            ],
            "actionTab": "InterviewPrep"
        },
        "change_target_career": {
            "title": "How to Change or Add Target Careers",
            "steps": [
                "1. Navigate to 'My Profile' tab -> Step 3: 'Career Goals & Preferences'.",
                "2. In 'Target Career / Roles', select or add new roles (e.g. Backend Developer, Data Scientist).",
                "3. Click 'Save Career Goals'.",
                "4. Your Skill Gap matrix, Learning Roadmap, and Internship recommendations immediately adjust to your new career focus."
            ],
            "actionTab": "Profile"
        }
    }

    # =========================================================================
    # 4. SAFE NAVIGATION ALIAS MAP
    # =========================================================================
    NAVIGATION_MAPPINGS: Dict[str, str] = {
        "dashboard": "Dashboard",
        "home": "Dashboard",
        "skill index": "Dashboard",
        "action plan": "Dashboard",
        
        "profile": "Profile",
        "my profile": "Profile",
        "marksheet": "Profile",
        "ocr": "Profile",
        "sarvam": "Profile",
        "github": "Profile",
        "connect github": "Profile",
        "career goals": "Profile",
        "settings": "Profile",
        "education": "Profile",
        
        "resume": "Resume",
        "ats": "Resume",
        "ats score": "Resume",
        "cv": "Resume",
        "resume generator": "Resume",
        "resume editor": "Resume",
        "tailored resume": "Resume",
        
        "skills": "Skills",
        "skill": "Skills",
        "skill gap": "Skills",
        "skill gaps": "Skills",
        "skill matrix": "Skills",
        "career readiness": "Skills",
        "target fit": "Skills",
        "assessment": "Skills",
        "assessments": "Skills",
        "quiz": "Skills",
        "challenge": "Skills",
        "challenges": "Skills",
        "coding challenge": "Skills",
        "evidence": "Skills",
        "esco": "Skills",
        
        "learning": "Learning",
        "learning roadmap": "Learning",
        "roadmap": "Learning",
        "courses": "Learning",
        "course": "Learning",
        "nptel": "Learning",
        "swayam": "Learning",
        "freecodecamp": "Learning",
        "schedule": "Learning",
        "study plan": "Learning",
        
        "opportunities": "Opportunities",
        "internship": "Opportunities",
        "internships": "Opportunities",
        "jobs": "Opportunities",
        "job": "Opportunities",
        "match score": "Opportunities",
        "recommended internships": "Opportunities",
        
        "applications": "Applications",
        "application": "Applications",
        "applied": "Applications",
        "tracker": "Applications",
        "application tracker": "Applications",
        "application status": "Applications",
        
        "scholarships": "Scholarships",
        "scholarship": "Scholarships",
        "financial aid": "Scholarships",
        "grants": "Scholarships",
        
        "interview": "InterviewPrep",
        "interviewprep": "InterviewPrep",
        "mock interview": "InterviewPrep",
        "interview prep": "InterviewPrep",
        "question bank": "InterviewPrep",
        "dsa": "InterviewPrep",
        "system design": "InterviewPrep"
    }

    # =========================================================================
    # 5. QUERY & KNOWLEDGE RETRIEVAL METHODS
    # =========================================================================
    @classmethod
    def get_app_overview(cls) -> Dict[str, Any]:
        """Returns structured high-level overview of all 9 registered tabs and key platform capabilities."""
        return {
            "appName": "SkillSetu",
            "tagline": "AI-Powered Technical Career Readiness & Internship Ecosystem",
            "totalTabs": len(cls.TABS_REGISTRY),
            "tabs": [
                {
                    "tabId": t["tabId"],
                    "navLabel": t["navLabel"],
                    "title": t["title"],
                    "summary": t["summary"],
                    "location": t["location"]
                }
                for t in cls.TABS_REGISTRY.values()
            ]
        }

    @classmethod
    def get_screen_info(cls, screen_or_tab_name: str) -> Optional[Dict[str, Any]]:
        """Retrieves comprehensive information about a specific screen or tab."""
        if not screen_or_tab_name:
            return None
        
        clean = screen_or_tab_name.strip().lower()
        tab_id = cls.NAVIGATION_MAPPINGS.get(clean)
        
        if not tab_id:
            for tid in cls.TABS_REGISTRY.keys():
                if tid.lower() == clean or clean in tid.lower():
                    tab_id = tid
                    break
        
        if tab_id and tab_id in cls.TABS_REGISTRY:
            return cls.TABS_REGISTRY[tab_id]
        
        return None

    @classmethod
    def get_metric_explanation(cls, metric_name: str) -> Optional[Dict[str, Any]]:
        """Retrieves exact formula, range, impact, and improvement instructions for a metric."""
        if not metric_name:
            return None
        
        clean = metric_name.strip().lower()
        for m_key, m_val in cls.METRICS_REGISTRY.items():
            m_key_lower = m_key.lower()
            m_key_short = m_key_lower.replace(" score", "")
            if clean in m_key_lower or m_key_lower in clean or m_key_short in clean:
                return m_val
        
        return None

    @classmethod
    def get_workflow_instructions(cls, workflow_key: str) -> Optional[Dict[str, Any]]:
        """Retrieves step-by-step instructions for a common user workflow."""
        if not workflow_key:
            return None
        
        clean = workflow_key.strip().lower().replace(" ", "_").replace("-", "_")
        for w_key, w_val in cls.WORKFLOWS_REGISTRY.items():
            if clean in w_key or w_key in clean:
                return w_val
        
        return None

    @classmethod
    def resolve_safe_tab(cls, query_or_feature: str) -> str:
        """Resolves any feature or user term into a safe, valid frontend Tab ID."""
        if not query_or_feature:
            return "Dashboard"
        
        clean = query_or_feature.strip().lower()
        
        # Exact match in mapping
        if clean in cls.NAVIGATION_MAPPINGS:
            return cls.NAVIGATION_MAPPINGS[clean]
        
        # Substring search
        for alias, tab_id in cls.NAVIGATION_MAPPINGS.items():
            if alias in clean:
                return tab_id
        
        return "Dashboard"

    @classmethod
    def search_app_knowledge(cls, query: str) -> Dict[str, Any]:
        """
        Intelligent search across tabs, features, metrics, buttons, and workflows.
        Returns matched screens, metrics, workflows, and safe navigation action.
        """
        if not query:
            return cls.get_app_overview()
        
        q = query.lower().strip()
        matched_tabs = []
        matched_metrics = []
        matched_workflows = []
        
        # Search Tabs & Features
        for tab_id, tab_data in cls.TABS_REGISTRY.items():
            if q in tab_id.lower() or q in tab_data["title"].lower() or q in tab_data["summary"].lower() or tab_id.lower() in q:
                matched_tabs.append(tab_data)
                continue
            
            # Check key features
            features = tab_data.get("keyFeatures", [])
            for f in features:
                if q in f["name"].lower() or q in f.get("description", "").lower() or f["name"].lower() in q:
                    matched_tabs.append(tab_data)
                    break
        
        # Search Metrics
        for m_name, m_data in cls.METRICS_REGISTRY.items():
            m_name_lower = m_name.lower()
            m_name_short = m_name_lower.replace(" score", "")
            if q in m_name_lower or q in m_data.get("explanation", "").lower() or q in m_data.get("formula", "").lower() or m_name_lower in q or m_name_short in q:
                matched_metrics.append(m_data)
        
        # Search Workflows
        for w_key, w_data in cls.WORKFLOWS_REGISTRY.items():
            w_key_spaced = w_key.replace("_", " ")
            if q in w_key_spaced or q in w_data["title"].lower() or w_key_spaced in q:
                matched_workflows.append(w_data)
        
        safe_tab = cls.resolve_safe_tab(query)
        
        return {
            "query": query,
            "resolvedTab": safe_tab,
            "matchedTabs": matched_tabs,
            "matchedMetrics": matched_metrics,
            "matchedWorkflows": matched_workflows
        }

    @classmethod
    def get_knowledge_summary_for_prompt(cls) -> str:
        """
        Generates a concise, high-density summary of the entire SkillSetu application
        architecture for inclusion in the Groq Mentor system prompt.
        """
        return """SKILLSETU ENTIRE APPLICATION STRUCTURE & REGISTERED KNOWLEDGE:

1. DASHBOARD ('Dashboard'):
   - Skill Index: (60% Core Strength + 25% Project Depth + 15% Skill Breadth). Excludes Tier 3 micro-dependencies.
   - Target Career Readiness & Fit match score.
   - GitHub analysis summary (repos, languages, commit proofs).
   - Priority Action Plan checklist.
   - Recommended Courses quick widget.

2. MY PROFILE ('Profile'):
   - 6-Step Onboarding & Verification Wizard:
     * Step 1: Personal Info (name, email, phone, headline, bio, avatar).
     * Step 2: Education & Marksheet Verification (Sarvam OCR automatic marksheet parsing for CGPA, university, degree).
     * Step 3: Career Goals & Preferences (target careers, preferred locations, opportunity types, work preferences, industry, timeline).
     * Step 4: Resume & AI Analysis (Groq AI resume parsing, ATS scoring, extracted skills).
     * Step 5: GitHub & Professional Links (scanned repos, commit evidence, framework proofs, LinkedIn/portfolio).
     * Step 6: Profile Verification & Summary.

3. RESUME GENERATOR & ATS OPTIMIZER ('Resume'):
   - Live AI Tailored Resume generator matching chosen Target Role.
   - ATS Score (0-100) & Keyword alignment breakdown.
   - Structured sections: Summary, Skills (matched vs recommended), Experience, Projects (with GitHub/live links), Education, Certifications.
   - Interactive inline resume editor.
   - PDF export / Print button.
   - Zoom controls (80%, 100%, 120%).

4. SKILL INTELLIGENCE & ASSESSMENTS ('Skills'):
   - Career Readiness Score: (verified_skills / total_required_skills) * 100.
   - Target Fit Score: min(100, max(45, round(Readiness * 0.85 + 25))).
   - ESCO-classified Skill Gap Matrix (Essential vs Optional skills; Verified [Green], In Progress [Amber], Missing [Red]).
   - Diagnostic Skill Assessments: MCQ quizzes ('Take Assessment', 80%+ verifies skill).
   - Coding Practice Challenges ('Practice Challenge').
   - Verified Skill Evidence Drawer (inspect GitHub commits, resume extractions, course proofs).
   - Target Career Switcher dropdown.

5. LEARNING ROADMAP & COURSES ('Learning'):
   - Personalized stage-wise progression: Foundation (Stage 1) -> Intermediate (Stage 2) -> Advanced (Stage 3).
   - 4 Sub-Tabs: Overview (timeline & milestones), Courses (curated NPTEL, SWAYAM, freeCodeCamp, YouTube, Coursera), Practice (coding labs), Schedule (weekly milestones).
   - Course Progress Updater modal (update progress %, mark completed).
   - External course links.

6. INTERNSHIP OPPORTUNITIES ('Opportunities'):
   - Curated & real-time tech internships.
   - Explainable Match Score % (40% skills + 20% career + 15% industry + 10% location + 5% type + 5% work preference + 5% timeline).
   - Match breakdown drawer: shows matched vs missing skills for each role.
   - Filters: Keyword search, Location (Remote/Hybrid/On-site), Work Type, Stipend range.
   - 'Apply Now' button (submits application directly and logs in Applications tracker).

7. APPLICATION TRACKER ('Applications'):
   - Internship application tracking system.
   - Status filters: All, Under Review, Shortlisted, Interview, Offered, Rejected.
   - Pipeline Timeline: Saved -> Submitted -> Viewed -> Under Review -> Shortlisted -> Assessment -> Interview -> Offered.
   - Pending employer assessment launcher.

8. SCHOLARSHIPS ('Scholarships'):
   - Curated financial aid & technical scholarship opportunities (Tata Trusts, Santoor Women's, Amazon Future Engineer).
   - Match Score %, Eligibility criteria, deadlines, award amounts.

9. INTERVIEW PREPARATION ('InterviewPrep'):
   - Upcoming scheduled interviews timeline with countdown badges and meeting links.
   - AI Mock Interview simulator ('Start Mock Interview') with audio/text answer recording and AI rubric evaluation.
   - Question Bank (DSA & Algorithms, System Design, Behavioral/HR, Fullstack, Backend) with expandable STAR method solutions.
"""
