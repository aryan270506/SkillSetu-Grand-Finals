import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ClayButton, ClayCard } from './DesignTokens';

export default function CareerRoleMatchSection({
  highestMatch,
  otherRoleMatches = [],
  activeCareerName,
  onNavigate,
}) {
  // Primary role match
  const primaryRole = highestMatch || {
    career_name: activeCareerName || 'Software Development Engineer',
    match_score: 95,
    level: 'Tier-1 Qualified • 14 Matching Openings',
    matched_skills: ['Go', 'Distributed Systems', 'PostgreSQL', 'Docker'],
    priority_skills: ['OpenTelemetry', 'Kafka'],
  };

  const secondaryRoles = otherRoleMatches.length > 0
    ? otherRoleMatches.slice(0, 2)
    : [
        {
          career_name: 'Backend Go & Microservices Platform Engineer',
          match_score: 92,
          level: 'High Alignment • 7 Matching Openings',
        },
        {
          career_name: 'Cloud Infrastructure & SRE Intern',
          match_score: 89,
          level: 'Strong Candidate • 4 Matching Openings',
        },
      ];

  return (
    <View
      style={[
        styles.sectionCard,
        Platform.OS === 'web' && {
          animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 240ms both',
        },
      ]}
      className="clay-interactive-card"
    >
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.tagRow}>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeText}>AI RECRUITER COMPATIBILITY INDEX</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Your Career Role Match</Text>
          <Text style={styles.sectionSubtitle}>
            Synthesized across verified proctored exams, GitHub sandbox tests, and institutional lab evaluations.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.headerActions}>
          <ClayButton
            style={styles.secondaryBtn}
            className="clay-interactive-btn"
          >
            <Text style={styles.secondaryBtnText}>Adjust Role Weightings</Text>
          </ClayButton>

          <ClayButton
            testID="skill-apply-calibrated-roles"
            style={styles.primaryBtn}
            className="clay-interactive-btn"
            onPress={() => {
              if (onNavigate) {
                onNavigate('Internships');
              }
            }}
          >
            <Text style={styles.primaryBtnText}>Apply to Calibrated Roles (14 Available) ➔</Text>
          </ClayButton>
        </View>
      </View>

      {/* Role Match Cards 3-Column Grid */}
      <View style={styles.rolesGrid}>
        {/* Primary Match Card */}
        <ClayCard
          hoverTranslate={-4}
          hoverScale={1.015}
          style={[styles.roleCard, styles.primaryRoleCard]}
          className="clay-subcard-hover"
        >
          <View style={styles.roleCardTop}>
            <View style={styles.primaryPill}>
              <Text style={styles.primaryPillText}>★ PRIMARY MATCH</Text>
            </View>
            <Text style={styles.primaryScoreText}>
              {primaryRole.match_score !== null ? `${primaryRole.match_score}%` : '95%'}
            </Text>
          </View>

          <Text style={styles.roleName}>{primaryRole.career_name}</Text>
          <Text style={styles.roleTierLabel}>
            {primaryRole.level || 'Tier-1 Qualified • 14 Matching Openings'}
          </Text>
          <Text style={styles.roleDesc}>
            Optimal skill execution across concurrency, Raft consensus protocols, async gRPC, and container telemetry.
          </Text>

          {/* Metrics */}
          <View style={styles.miniMetricsList}>
            <View style={styles.miniMetricRow}>
              <Text style={styles.miniMetricLabel}>Stack Fit</Text>
              <Text style={styles.miniMetricVal}>{Math.min(99, (primaryRole.match_score || 95) + 2)}%</Text>
            </View>
            <View style={styles.miniMetricRow}>
              <Text style={styles.miniMetricLabel}>PR Code Quality</Text>
              <Text style={styles.miniMetricVal}>{Math.min(98, (primaryRole.match_score || 95) - 1)}%</Text>
            </View>
            <View style={styles.miniMetricRow}>
              <Text style={styles.miniMetricLabel}>Anti-Cheat Trust</Text>
              <Text style={[styles.miniMetricVal, { color: CLAY_COLORS.primary }]}>99%</Text>
            </View>
          </View>
        </ClayCard>

        {/* Secondary Roles */}
        {secondaryRoles.map((role, idx) => (
          <ClayCard
            key={role.career_id || idx}
            hoverTranslate={-4}
            hoverScale={1.015}
            style={styles.roleCard}
            className="clay-subcard-hover"
          >
            <View style={styles.roleCardTop}>
              <View style={[styles.secondaryPill, idx === 1 && { backgroundColor: CLAY_COLORS.skyLight }]}>
                <Text style={[styles.secondaryPillText, idx === 1 && { color: CLAY_COLORS.skyDark }]}>
                  {idx === 0 ? 'SECONDARY MATCH' : 'TERTIARY MATCH'}
                </Text>
              </View>
              <Text style={styles.secondaryScoreText}>
                {role.match_score !== null ? `${role.match_score}%` : `${89 - idx * 3}%`}
              </Text>
            </View>

            <Text style={styles.roleName}>{role.career_name}</Text>
            <Text style={[styles.roleTierLabel, { color: idx === 1 ? CLAY_COLORS.skyDark : CLAY_COLORS.primaryDark }]}>
              {role.level || (idx === 0 ? 'High Alignment • 7 Openings' : 'Strong Candidate • 4 Openings')}
            </Text>
            <Text style={styles.roleDesc}>
              {idx === 0
                ? 'High alignment in microservices orchestration, low-latency REST/gRPC pipeline designs.'
                : 'Firm Kubernetes, ops/app isolation, Helm chart authoring, and CI/CD automated deployment skills.'}
            </Text>

            {/* Metrics */}
            <View style={styles.miniMetricsList}>
              <View style={styles.miniMetricRow}>
                <Text style={styles.miniMetricLabel}>Stack Fit</Text>
                <Text style={styles.miniMetricVal}>{idx === 0 ? '96%' : '93%'}</Text>
              </View>
              <View style={styles.miniMetricRow}>
                <Text style={styles.miniMetricLabel}>PR Code Quality</Text>
                <Text style={styles.miniMetricVal}>{idx === 0 ? '92%' : '88%'}</Text>
              </View>
              <View style={styles.miniMetricRow}>
                <Text style={styles.miniMetricLabel}>Anti-Cheat Trust</Text>
                <Text style={[styles.miniMetricVal, { color: CLAY_COLORS.primary }]}>99%</Text>
              </View>
            </View>
          </ClayCard>
        ))}
      </View>

      {/* Bottom Aggregate Diagnostic Breakdown Strip */}
      <View style={styles.aggregateStrip}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13 }}>📊</Text>
          <Text style={styles.aggregateStripTitle}>Aggregate Diagnostic Breakdown:</Text>
        </View>
        <Text style={styles.aggregateStripText}>
          Core Stack Fit: <Text style={styles.aggBold}>97%</Text> • Practical PR Code Quality: <Text style={styles.aggBold}>94%</Text> • Proctored Anti-Cheat Exams: <Text style={styles.aggBold}>99%</Text> • System Architecture Reasoning: <Text style={styles.aggBold}>91%</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 24,
    gap: 18,
    ...CLAY_SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  telemetryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  telemetryBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  secondaryBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  primaryBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.badge,
  },
  primaryBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  roleCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 16,
    gap: 8,
  },
  primaryRoleCard: {
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: '#FAF7FD',
  },
  roleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryPill: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  primaryPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    color: CLAY_COLORS.paper,
    letterSpacing: 0.5,
  },
  primaryScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '950',
    color: CLAY_COLORS.primary,
  },
  secondaryPill: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  secondaryPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  secondaryScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '950',
    color: CLAY_COLORS.foreground,
  },
  roleName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    lineHeight: 18,
  },
  roleTierLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  roleDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
    flex: 1,
  },
  miniMetricsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 8,
    gap: 4,
  },
  miniMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniMetricLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  miniMetricVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  aggregateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: CLAY_RADII.cardSmall,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  aggregateStripTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  aggregateStripText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  aggBold: {
    fontFamily: CLAY_FONTS.heading,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
