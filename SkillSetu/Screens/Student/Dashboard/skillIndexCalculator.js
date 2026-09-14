/**
 * SkillIndexCalculator.js
 *
 * Implements evidence-based GitHub Skill Index calculation for SkillSetu:
 * Skill Index = 60% Core Skill Strength + 25% Project Depth + 15% Skill Breadth
 *
 * Excludes Tier 3 micro-dependencies from diminishing the overall technical index.
 */

const TIER1_TAXONOMY = {
  // Programming Languages (Weight: 1.2)
  'python': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'javascript': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'typescript': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'java': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'c++': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'cpp': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'c': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'c#': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'csharp': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'go': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'golang': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'rust': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'ruby': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'php': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'swift': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'kotlin': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },
  'sql': { weight: 1.2, category: 'Programming Languages', domain: 'Languages' },

  // Major Frameworks (Weight: 1.2)
  'react': { weight: 1.2, category: 'Major Frameworks', domain: 'Frontend' },
  'react native': { weight: 1.2, category: 'Major Frameworks', domain: 'Mobile' },
  'react-native': { weight: 1.2, category: 'Major Frameworks', domain: 'Mobile' },
  'node.js': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'nodejs': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'node': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'express.js': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'express': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'django': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'fastapi': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'flask': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'spring': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'spring boot': { weight: 1.2, category: 'Major Frameworks', domain: 'Backend' },
  'vue.js': { weight: 1.2, category: 'Major Frameworks', domain: 'Frontend' },
  'vue': { weight: 1.2, category: 'Major Frameworks', domain: 'Frontend' },
  'angular': { weight: 1.2, category: 'Major Frameworks', domain: 'Frontend' },
  'flutter': { weight: 1.2, category: 'Major Frameworks', domain: 'Mobile' },

  // Databases (Weight: 1.0)
  'postgresql': { weight: 1.0, category: 'Databases', domain: 'Database' },
  'postgres': { weight: 1.0, category: 'Databases', domain: 'Database' },
  'mongodb': { weight: 1.0, category: 'Databases', domain: 'Database' },
  'mysql': { weight: 1.0, category: 'Databases', domain: 'Database' },
  'sqlite': { weight: 1.0, category: 'Databases', domain: 'Database' },
  'redis': { weight: 1.0, category: 'Databases', domain: 'Database' },
  'firebase': { weight: 1.0, category: 'Databases', domain: 'Cloud' },

  // Cloud / Platform Technologies (Weight: 1.0)
  'aws': { weight: 1.0, category: 'Cloud Platforms', domain: 'Cloud' },
  'docker': { weight: 1.0, category: 'Cloud Platforms', domain: 'Cloud' },
  'kubernetes': { weight: 1.0, category: 'Cloud Platforms', domain: 'Cloud' },
  'supabase': { weight: 1.0, category: 'Cloud Platforms', domain: 'Cloud' },
  'gcp': { weight: 1.0, category: 'Cloud Platforms', domain: 'Cloud' },
  'azure': { weight: 1.0, category: 'Cloud Platforms', domain: 'Cloud' },

  // Major Engineering Tools (Weight: 0.8)
  'git': { weight: 0.8, category: 'Major Tools', domain: 'DevOps' },
  'pytorch': { weight: 0.8, category: 'Major Tools', domain: 'AI/ML' },
  'tensorflow': { weight: 0.8, category: 'Major Tools', domain: 'AI/ML' },
  'graphql': { weight: 0.8, category: 'Major Tools', domain: 'Backend' }
};

const TIER2_TAXONOMY = {
  // Supporting Technologies (Weight: 0.5)
  'redux': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'tailwind css': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'tailwind': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'tailwindcss': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'next.js': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'next': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'prisma': { weight: 0.5, category: 'Supporting Technologies', domain: 'Database' },
  'mongoose': { weight: 0.5, category: 'Supporting Technologies', domain: 'Database' },
  'jest': { weight: 0.5, category: 'Supporting Technologies', domain: 'Testing' },
  'vite': { weight: 0.5, category: 'Supporting Technologies', domain: 'DevOps' },
  'eslint': { weight: 0.5, category: 'Supporting Technologies', domain: 'DevOps' },
  'webpack': { weight: 0.5, category: 'Supporting Technologies', domain: 'DevOps' },
  'pandas': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'numpy': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'pydantic': { weight: 0.5, category: 'Supporting Technologies', domain: 'Backend' },
  'axios': { weight: 0.5, category: 'Supporting Technologies', domain: 'Frontend' },
  'scikit-learn': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'sklearn': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'opencv': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'beautifulsoup': { weight: 0.5, category: 'Supporting Technologies', domain: 'Backend' },
  'matplotlib': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'scipy': { weight: 0.5, category: 'Supporting Technologies', domain: 'AI/ML' },
  'socket.io': { weight: 0.5, category: 'Supporting Technologies', domain: 'Backend' },
  'celery': { weight: 0.5, category: 'Supporting Technologies', domain: 'Backend' },
  'sqlalchemy': { weight: 0.5, category: 'Supporting Technologies', domain: 'Database' }
};

/**
 * Classifies a skill into Tier 1, Tier 2, or Tier 3
 */
export function classifySkill(skillName) {
  if (!skillName) return { tier: 3, weight: 0, category: 'Micro Dependency / Utility', domain: 'Utility' };
  const clean = skillName.toLowerCase().trim();

  if (TIER1_TAXONOMY[clean]) {
    return { tier: 1, ...TIER1_TAXONOMY[clean] };
  }
  if (TIER2_TAXONOMY[clean]) {
    return { tier: 2, ...TIER2_TAXONOMY[clean] };
  }
  return { tier: 3, weight: 0, category: 'Micro Dependency / Utility', domain: 'Utility' };
}

/**
 * Main Skill Index Calculator function
 *
 * Formula:
 * Skill Index = 60% Core Skill Strength + 25% Project Depth + 15% Skill Breadth
 */
export function calculateSkillIndex(skills) {
  if (!skills || skills.length === 0) {
    return {
      score: 0,
      coreSkillStrength: 0,
      projectDepth: 0,
      skillBreadth: 0,
      tier1Skills: [],
      tier2Skills: [],
      tier3Skills: [],
      domainBreakdown: {},
      topCoreSkills: []
    };
  }

  const classified = skills.map(s => {
    const scoreVal = s.score !== undefined ? s.score : (s.percentage || 0);
    const taxonomy = classifySkill(s.name);
    return {
      ...s,
      scoreVal,
      ...taxonomy
    };
  });

  const tier1Skills = classified.filter(s => s.tier === 1);
  const tier2Skills = classified.filter(s => s.tier === 2);
  const tier3Skills = classified.filter(s => s.tier === 3);

  const meaningfulSkills = [...tier1Skills, ...tier2Skills];

  // 1. CORE SKILL STRENGTH SCORE (60% Weight)
  let coreSkillStrength = 0;
  if (meaningfulSkills.length > 0) {
    const totalWeightedScore = meaningfulSkills.reduce((sum, s) => sum + (s.scoreVal * s.weight), 0);
    const totalWeight = meaningfulSkills.reduce((sum, s) => sum + s.weight, 0);
    coreSkillStrength = Math.min(100, Math.round(totalWeightedScore / totalWeight));
  } else if (tier3Skills.length > 0) {
    const avgTier3 = tier3Skills.reduce((acc, s) => acc + s.scoreVal, 0) / tier3Skills.length;
    coreSkillStrength = Math.min(40, Math.round(avgTier3 * 0.5));
  }

  // 2. PROJECT DEPTH SCORE (25% Weight)
  let projectDepth = 0;
  let topCoreSkills = [];
  if (meaningfulSkills.length > 0) {
    const sortedCore = [...meaningfulSkills].sort((a, b) => b.scoreVal - a.scoreVal);
    topCoreSkills = sortedCore.slice(0, 5);
    const sumDepth = topCoreSkills.reduce((acc, s) => acc + s.scoreVal, 0);
    projectDepth = Math.min(100, Math.round(sumDepth / topCoreSkills.length));
  }

  // 3. SKILL BREADTH SCORE (15% Weight)
  const domainBreakdown = {};
  meaningfulSkills.forEach(s => {
    if (s.scoreVal >= 40 && s.domain && s.domain !== 'Utility') {
      if (!domainBreakdown[s.domain]) {
        domainBreakdown[s.domain] = [];
      }
      domainBreakdown[s.domain].push(s.name);
    }
  });

  const activeDomains = Object.keys(domainBreakdown);
  const domainCount = activeDomains.length;

  let skillBreadth = 0;
  if (domainCount >= 5) skillBreadth = 100;
  else if (domainCount === 4) skillBreadth = 92;
  else if (domainCount === 3) skillBreadth = 82;
  else if (domainCount === 2) skillBreadth = 65;
  else if (domainCount === 1) skillBreadth = 40;
  else skillBreadth = 0;

  // FINAL SKILL INDEX (0 - 100)
  const finalScore = Math.min(100, Math.max(0, Math.round(
    (0.60 * coreSkillStrength) +
    (0.25 * projectDepth) +
    (0.15 * skillBreadth)
  )));

  return {
    score: finalScore,
    coreSkillStrength,
    projectDepth,
    skillBreadth,
    tier1Skills,
    tier2Skills,
    tier3Skills,
    topCoreSkills,
    domainBreakdown,
    activeDomainCount: domainCount
  };
}
