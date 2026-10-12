import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function SkillMatrixAndProjectQuestions({
  skillMatrix,
  projectQuestions,
  onPracticeQuestion,
  onOpenInterviewPracticeModal,
}) {
  return (
    <View style={styles.twoColGrid}>
      {/* 1. Left Card: Verified Skill Matrix */}
      <View
        style={[styles.card, CLAY_SHADOWS.card]}
        dataSet={{ cardHover: 'true' }}
        // @ts-ignore
        className="clay-card-hover"
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🛡️ Verified Skill Matrix</Text>
          <Text style={styles.cardSub}>
            Canonical skill evidence scores derived from code proof & verified assessments.
          </Text>
        </View>

        <View style={styles.skillsList}>
          {skillMatrix.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No verified skills yet</Text>
              <Text style={styles.emptyText}>
                Complete a verified assessment, project submission, or certificate verification to build your verified skill profile.
              </Text>
            </View>
          ) : (
            skillMatrix.slice(0, 6).map((item, idx) => {
              const pct = item.percentage || 0;
              let barColor = CLAY_COLORS.primary;
              if (pct >= 85) barColor = CLAY_COLORS.primaryDark;
              else if (pct < 50) barColor = CLAY_COLORS.warning;

              const levelLabel = item.level ? item.level : (pct >= 85 ? 'Mastery' : pct >= 70 ? 'Advanced' : pct >= 50 ? 'Proficient' : 'Developing');
              const verifiedTag = item.is_verified ? 'Verified' : levelLabel;

              return (
                <View key={idx} style={styles.skillItem}>
                  <View style={styles.skillInfoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Text style={styles.skillName} numberOfLines={1}>
                        {item.skill_name}
                      </Text>
                      {item.source && (
                        <View style={styles.sourceTag}>
                          <Text style={styles.sourceTagText}>{item.source}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.skillPercent, { color: barColor }]}>
                      {pct}% ({verifiedTag})
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(pct, 5)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                      dataSet={{ progressBar: 'true' }}
                      // @ts-ignore
                      className="clay-progress-bar-fill"
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Shield Footer Banner */}
        {(() => {
          const verifiedCount = skillMatrix.filter((s) => s.is_verified).length;
          const isShieldActive = skillMatrix.length > 0 && (verifiedCount > 0 || skillMatrix.some((s) => (s.percentage || 0) >= 50));

          return (
            <View
              style={[
                styles.shieldBanner,
                !isShieldActive && { backgroundColor: CLAY_COLORS.recessedLight, borderColor: CLAY_COLORS.cardBorder },
              ]}
            >
              <View style={styles.shieldContent}>
                <Text
                  style={styles.shieldIcon}
                  dataSet={{ iconInteractive: 'true' }}
                  // @ts-ignore
                  className="clay-icon-interactive"
                >
                  🛡️
                </Text>
                <Text
                  style={[
                    styles.shieldText,
                    !isShieldActive && { color: CLAY_COLORS.muted },
                  ]}
                >
                  {isShieldActive ? 'SkillSetu Career Verification Shield: Active' : 'SkillSetu Career Verification Shield: Pending Evidence'}
                  {verifiedCount > 0 ? ` (${verifiedCount} Verified)` : ''}
                </Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* 2. Right Card: Questions From Your Verified Projects */}
      <View
        style={[styles.card, CLAY_SHADOWS.card]}
        dataSet={{ cardHover: 'true' }}
        // @ts-ignore
        className="clay-card-hover"
      >
        <View style={styles.cardHeaderWithTag}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={styles.cardTitle}>💻 Questions From Your Verified Projects</Text>
            <Text style={styles.cardSub}>
              {projectQuestions.length > 0
                ? `AI-generated from your verified GitHub projects (${projectQuestions[0]?.repo_name || 'Code Proof'})`
                : 'AI-generated from your verified GitHub projects'}
            </Text>
          </View>
          {projectQuestions.length > 0 && (
            <View style={styles.verifiedTag}>
              <Text style={styles.verifiedTagText}>Code Proof Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.questionsList}>
          {projectQuestions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No verified GitHub projects found. Connect your GitHub repository in Profile to generate AI project questions.
              </Text>
            </View>
          ) : (
            projectQuestions.slice(0, 2).map((pq, idx) => (
              <View
                key={pq.id || idx}
                style={styles.questionCard}
                dataSet={{ subcardHover: 'true' }}
                // @ts-ignore
                className="clay-subcard-hover"
              >
                <View style={styles.questionHeader}>
                  <View
                    style={styles.qNumBadge}
                    dataSet={{ iconInteractive: 'true' }}
                    // @ts-ignore
                    className="clay-icon-interactive"
                  >
                    <Text style={styles.qNumText}>Q{idx + 1}</Text>
                  </View>
                  <Text style={styles.questionTitle} numberOfLines={2}>
                    "{pq.question}"
                  </Text>
                </View>

                {pq.description ? (
                  <Text style={styles.questionDesc} numberOfLines={2}>
                    {pq.description}
                  </Text>
                ) : (
                  <Text style={styles.questionFocusText}>
                    Expected: Architecture, trade-offs & synchronization.
                  </Text>
                )}

                <View style={styles.questionFooter}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{pq.language || 'Architecture'}</Text>
                  </View>
                  <Pressable
                    style={styles.practiceAiBtn}
                    dataSet={{ btnPurple: 'true' }}
                    // @ts-ignore
                    className="clay-btn-purple"
                    onPress={() => onPracticeQuestion(pq.question)}
                  >
                    <Text style={styles.practiceAiBtnText}>Practice in AI Sandbox ➔</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.moreQuestionsRow}>
          <Pressable
            style={styles.generateMoreBtn}
            dataSet={{ btnWhite: 'true' }}
            // @ts-ignore
            className="clay-btn-white"
            onPress={() => {
              if (onOpenInterviewPracticeModal) {
                onOpenInterviewPracticeModal();
              } else {
                onPracticeQuestion(projectQuestions[0]?.question || 'System Design');
              }
            }}
          >
            <Text style={styles.generateMoreText}>✨ Practice AI Interview Sandbox (100+ Questions)</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flex: 1,
    minWidth: 320,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    gap: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    gap: 4,
  },
  cardHeaderWithTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
    lineHeight: 18,
  },
  verifiedTag: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  verifiedTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  skillsList: {
    gap: 12,
  },
  skillItem: {
    gap: 6,
  },
  skillInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    flex: 1,
  },
  skillPercent: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  barTrack: {
    height: 6,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  shieldBanner: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
    marginTop: 6,
  },
  shieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldIcon: {
    fontSize: 14,
  },
  shieldText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  shieldSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  questionsList: {
    gap: 12,
  },
  questionCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  qNumBadge: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
    marginTop: 2,
  },
  qNumText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: CLAY_FONTS.heading,
  },
  questionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    flex: 1,
    lineHeight: 18,
  },
  questionDesc: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 16,
  },
  questionFocusText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.body,
    fontStyle: 'italic',
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  tagBadge: {
    backgroundColor: CLAY_COLORS.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  practiceAiBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  practiceAiBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  moreQuestionsRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  generateMoreBtn: {
    backgroundColor: CLAY_COLORS.paper,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  generateMoreText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  emptyBox: {
    padding: 24,
    borderRadius: CLAY_RADII.cardSmall,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  emptyText: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 380,
  },
  sourceTag: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
    fontFamily: CLAY_FONTS.heading,
  },
});
