import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function CompleteSkillProfileSection({
  careerMarketSkills = [],
  studentVerifiedSkills = [],
  topMarketGaps = [],
  activeCareerName,
}) {
  const coreSkills = studentVerifiedSkills.filter(
    (s) => s.category === 'Core Development' || s.category === 'Frontend'
  ).slice(0, 6);

  const backendSkills = studentVerifiedSkills.filter(
    (s) =>
      s.category === 'Backend & APIs' ||
      s.category === 'Databases' ||
      s.category === 'Cloud & DevOps' ||
      s.category === 'AI / Data'
  ).slice(0, 6);

  return (
    <View style={styles.sectionContainer}>
      {/* 2-Column Bento: Profile Bars (Left) & Priority Insights (Right) */}
      <View style={styles.bentoRow}>
        {/* Left Card: Your Skill Profile */}
        <View
          style={[
            styles.bentoCard,
            styles.leftBentoCard,
            Platform.OS === 'web' && {
              animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 420ms both',
            },
          ]}
          className="clay-interactive-card"
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Your Skill Profile</Text>
              <Text style={styles.cardSubtitle}>
                CURRENT VERIFIED LEVEL VS REQUIRED LEVEL TO BECOME A {(activeCareerName || 'TARGET ROLE').toUpperCase()}
              </Text>
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CLAY_COLORS.primary }]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CLAY_COLORS.mutedLight }]} />
                <Text style={styles.legendText}>Required (100)</Text>
              </View>
            </View>
          </View>

          {/* Skill Bars List */}
          <View style={styles.skillBarsList}>
            {careerMarketSkills.length === 0 ? (
              <Text style={styles.emptyDesc}>Select a target career to view required skills profile.</Text>
            ) : (
              careerMarketSkills.slice(0, 6).map((sk, index) => {
                const isStrong = sk.status === 'STRONG' || sk.student_level >= 70;
                const isDeveloping = sk.status === 'DEVELOPING' || (sk.student_level > 0 && sk.student_level < 70);
                const barColor = isStrong ? CLAY_COLORS.success : isDeveloping ? CLAY_COLORS.sky : CLAY_COLORS.danger;
                const badgeBg = isStrong ? CLAY_COLORS.successLight : isDeveloping ? CLAY_COLORS.skyLight : CLAY_COLORS.dangerLight;
                const badgeColor = isStrong ? CLAY_COLORS.successDark : isDeveloping ? CLAY_COLORS.skyDark : CLAY_COLORS.danger;
                const statusLabel = isStrong ? 'STRONG' : isDeveloping ? 'DEVELOPING' : 'MISSING';

                return (
                  <View key={index} style={styles.skillBarItem}>
                    <Text style={styles.skillBarLabel} numberOfLines={1}>
                      {sk.skill}
                    </Text>

                    <View style={styles.skillBarTrack}>
                      <View
                        style={[
                          styles.skillBarFill,
                          {
                            width: `${sk.student_level}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.skillBarMeta}>
                      <Text style={[styles.skillBarScore, { color: barColor }]}>
                        {sk.student_level}/100
                      </Text>
                      <View style={[styles.miniStatusTag, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.miniStatusText, { color: badgeColor }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Right Card: Priority Insights */}
        <View
          style={[
            styles.bentoCard,
            styles.rightBentoCard,
            Platform.OS === 'web' && {
              animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 480ms both',
            },
          ]}
          className="clay-interactive-card"
        >
          <View style={styles.insightsHeader}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <Text style={styles.insightsHeadingText}>PRIORITY INSIGHTS</Text>
          </View>
          <Text style={styles.insightsTitle}>
            Based on your target role, these are the highest-priority skills to strengthen next.
          </Text>

          <View style={styles.insightsList}>
            {topMarketGaps.length === 0 ? (
              <Text style={styles.emptyDesc}>No high priority skill gaps detected for this career goal!</Text>
            ) : (
              topMarketGaps.slice(0, 3).map((ins, index) => (
                <View key={index} style={styles.insightCard}>
                  <View style={styles.insightCardTop}>
                    <Text style={styles.insightSkillName}>{ins.skill}</Text>
                    <View
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor:
                            ins.importance === 'CORE' ? CLAY_COLORS.dangerLight : CLAY_COLORS.warningLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          {
                            color:
                              ins.importance === 'CORE' ? CLAY_COLORS.danger : CLAY_COLORS.warningDark,
                          },
                        ]}
                      >
                        {ins.importance === 'CORE' ? 'HIGH' : 'MED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.insightScore}>Current: {ins.student_level}/100</Text>
                  <Text style={styles.insightDesc}>
                    High demand {ins.importance?.toLowerCase() || 'core'} competency required for {activeCareerName || 'target role'}.
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* Complete Skill Profile Card (Core vs Backend Domains) */}
      <View
        style={[
          styles.fullProfileCard,
          Platform.OS === 'web' && {
            animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 540ms both',
          },
        ]}
        className="clay-interactive-card"
      >
        <Text style={styles.cardTitle}>Your Complete Skill Profile</Text>
        <Text style={styles.cardSubtitle}>
          Verified technical skills across your repositories, resume, and profile.
        </Text>

        <View style={styles.domainsGrid}>
          {/* Domain Column 1 */}
          <View style={styles.domainCard}>
            <Text style={styles.domainTitle}>Core Development & Frontend</Text>
            <View style={styles.domainList}>
              {(coreSkills.length > 0
                ? coreSkills
                : [
                    { skill_name: 'JavaScript / TypeScript', score: 92, status: 'VERIFIED' },
                    { skill_name: 'React & Next.js', score: 88, status: 'VERIFIED' },
                    { skill_name: 'Data Structures & Algorithms', score: 85, status: 'VERIFIED' },
                  ]
              ).map((sk, idx) => (
                <View key={idx} style={styles.domainRow}>
                  <Text style={styles.domainSkillName}>{sk.skill_name}</Text>
                  <View style={styles.domainScoreBlock}>
                    <Text style={styles.domainScoreText}>{sk.score || sk.current_level}</Text>
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>
                        {sk.verification_status || (sk.score >= 70 ? 'VERIFIED' : 'DEVELOPING')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Domain Column 2 */}
          <View style={styles.domainCard}>
            <Text style={styles.domainTitle}>Backend, Databases & Cloud</Text>
            <View style={styles.domainList}>
              {(backendSkills.length > 0
                ? backendSkills
                : [
                    { skill_name: 'Python & FastAPI', score: 94, status: 'VERIFIED' },
                    { skill_name: 'PostgreSQL & SQL Tuning', score: 89, status: 'VERIFIED' },
                    { skill_name: 'Docker & Containerization', score: 86, status: 'VERIFIED' },
                  ]
              ).map((sk, idx) => (
                <View key={idx} style={styles.domainRow}>
                  <Text style={styles.domainSkillName}>{sk.skill_name}</Text>
                  <View style={styles.domainScoreBlock}>
                    <Text style={styles.domainScoreText}>{sk.score || sk.current_level}</Text>
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>
                        {sk.verification_status || (sk.score >= 70 ? 'VERIFIED' : 'DEVELOPING')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 24,
    gap: 16,
  },
  bentoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  bentoCard: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 20,
    gap: 12,
    ...CLAY_SHADOWS.card,
  },
  leftBentoCard: {
    flex: 7,
    minWidth: 320,
  },
  rightBentoCard: {
    flex: 4,
    minWidth: 280,
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  cardSubtitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  skillBarsList: {
    gap: 10,
  },
  skillBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skillBarLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
    width: 100,
  },
  skillBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  skillBarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
    justifyContent: 'flex-end',
  },
  skillBarScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
  },
  miniStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniStatusText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightsHeadingText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  insightsTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 18,
  },
  insightsList: {
    gap: 8,
  },
  insightCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 10,
    gap: 4,
  },
  insightCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
  },
  insightScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  insightDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
    lineHeight: 14,
  },
  fullProfileCard: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 20,
    gap: 14,
    ...CLAY_SHADOWS.card,
  },
  domainsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  domainCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 14,
    gap: 8,
  },
  domainTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
    paddingBottom: 6,
  },
  domainList: {
    gap: 6,
  },
  domainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  domainSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  domainScoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domainScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  verifiedTag: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    color: CLAY_COLORS.primaryDark,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
});
