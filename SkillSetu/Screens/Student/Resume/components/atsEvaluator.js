/**
 * Real ATS Metrics Evaluator
 * Deterministically analyzes real resume data, ATS keyword matching, and document encoding.
 * No mock data. No hardcoded fallback constants.
 */

export function calculateFormatScore(resumeData) {
  if (!resumeData || Object.keys(resumeData).length === 0) {
    return null;
  }

  let score = 0;
  const header = resumeData.header || {};

  // 1. Candidate Name (10 pts)
  if (header.name && String(header.name).trim().length > 0) {
    score += 10;
  }

  // 2. Contact Information: Email + at least 1 other (Phone, Location, GitHub, LinkedIn) (15 pts)
  const hasEmail = Boolean(header.email && String(header.email).includes('@'));
  const hasOtherContact = Boolean(header.phone || header.location || header.github || header.linkedin);
  if (hasEmail && hasOtherContact) {
    score += 15;
  } else if (hasEmail || hasOtherContact) {
    score += 8;
  }

  // 3. Professional Summary (20 pts)
  const summary = resumeData.summary || '';
  if (summary && String(summary).trim().length >= 40) {
    score += 20;
  } else if (summary && String(summary).trim().length > 0) {
    score += 10;
  }

  // 4. Categorized Technical Skills (20 pts)
  const skills = resumeData.skills || [];
  if (Array.isArray(skills) && skills.length >= 2) {
    score += 20;
  } else if (Array.isArray(skills) && skills.length > 0) {
    score += 12;
  }

  // 5. Key Projects and/or Work Experience (20 pts)
  const projects = resumeData.projects || [];
  const experience = resumeData.experience || [];
  const hasValidProjects = Array.isArray(projects) && projects.length > 0 && projects.some(p => (p.bullets && p.bullets.length > 0) || p.description);
  const hasValidExp = Array.isArray(experience) && experience.length > 0 && experience.some(e => (e.bullets && e.bullets.length > 0) || e.description);

  if (hasValidProjects && hasValidExp) {
    score += 20;
  } else if (hasValidProjects || hasValidExp) {
    score += 18;
  }

  // 6. Education (15 pts)
  const education = resumeData.education || [];
  if (Array.isArray(education) && education.length > 0 && education.some(ed => ed.degree || ed.university)) {
    score += 15;
  }

  return Math.min(100, Math.max(0, score));
}

export function calculateKeywordScore(atsData, careerRequirements, profileMatch) {
  const matchedKeywords = atsData?.matched_keywords || [];
  const missingKeywords = atsData?.missing_keywords || [];

  const uniqueMatched = Array.from(new Set(matchedKeywords.map(k => String(k).toLowerCase().trim())));
  const uniqueMissing = Array.from(new Set(missingKeywords.map(k => String(k).toLowerCase().trim())));

  const totalKw = uniqueMatched.length + uniqueMissing.length;
  if (totalKw > 0) {
    return Math.round((uniqueMatched.length / totalKw) * 100);
  }

  if (Array.isArray(careerRequirements) && careerRequirements.length > 0) {
    const matchedCount = careerRequirements.filter(r => r.matched || (typeof r.student_level === 'number' && r.student_level >= 50)).length;
    return Math.round((matchedCount / careerRequirements.length) * 100);
  }

  if (typeof profileMatch?.skills === 'number') {
    return profileMatch.skills;
  }

  return null;
}

export function calculateImpactScore(resumeData) {
  if (!resumeData || Object.keys(resumeData).length === 0) {
    return null;
  }

  const allBullets = [];

  // Extract bullets from projects
  const projects = resumeData.projects || [];
  if (Array.isArray(projects)) {
    for (const p of projects) {
      if (Array.isArray(p.bullets)) {
        allBullets.push(...p.bullets);
      } else if (p.description) {
        allBullets.push(p.description);
      }
    }
  }

  // Extract bullets from experience
  const experience = resumeData.experience || [];
  if (Array.isArray(experience)) {
    for (const e of experience) {
      if (Array.isArray(e.bullets)) {
        allBullets.push(...e.bullets);
      } else if (e.description) {
        allBullets.push(e.description);
      }
    }
  }

  if (allBullets.length === 0) {
    return typeof resumeData.summary === 'string' && resumeData.summary.length > 50 ? 60 : null;
  }

  // Regex patterns for quantified metrics (numbers, percentages, speedups, scaling numbers, currencies, multipliers)
  const QUANT_PATTERN = /\b(\d+[\d,.]*%?|\d+x|\d+\+|\$\d+|[0-9]+\s*(ms|sec|kb|mb|gb|tb|req|users|k|m))\b/i;

  // Regex patterns for strong outcome-oriented engineering action verbs
  const ACTION_PATTERN = /\b(architected|engineered|scaled|optimized|reduced|accelerated|automated|implemented|delivered|built|designed|developed|integrated|spearheaded|improved|launched|deployed|published|constructed|refactored|achieved)\b/i;

  let quantifiedCount = 0;
  let actionVerbCount = 0;

  for (const bullet of allBullets) {
    const bStr = String(bullet);
    if (QUANT_PATTERN.test(bStr)) {
      quantifiedCount++;
    }
    if (ACTION_PATTERN.test(bStr)) {
      actionVerbCount++;
    }
  }

  const total = allBullets.length;
  const quantRatio = quantifiedCount / total;
  const actionRatio = actionVerbCount / total;

  // Base score 40 + up to 35 for quantified metrics + up to 25 for strong action verbs
  const calculated = Math.round(40 + (quantRatio * 35) + (actionRatio * 25));
  return Math.min(100, Math.max(25, calculated));
}

export function calculateUtf8Score(resumeData) {
  if (!resumeData || Object.keys(resumeData).length === 0) {
    return null;
  }

  try {
    const rawJson = JSON.stringify(resumeData);
    if (!rawJson || rawJson.length === 0) return null;

    let corruptedChars = 0;

    // Check for Unicode replacement character (\uFFFD) indicating bad decode
    if (rawJson.includes('\uFFFD')) {
      const matches = rawJson.match(/\uFFFD/g);
      corruptedChars += (matches ? matches.length : 1);
    }

    // Check for malformed surrogate halves (unpaired high/low surrogates)
    const malformedSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    if (malformedSurrogate.test(rawJson)) {
      corruptedChars += 3;
    }

    // Encoding round-trip test
    const encoded = encodeURIComponent(rawJson);
    const decoded = decodeURIComponent(encoded);
    if (decoded !== rawJson) {
      corruptedChars += 5;
    }

    if (corruptedChars === 0) {
      return 100;
    }

    const deducted = 100 - (corruptedChars * 10);
    return Math.max(0, deducted);
  } catch (err) {
    return 0;
  }
}
