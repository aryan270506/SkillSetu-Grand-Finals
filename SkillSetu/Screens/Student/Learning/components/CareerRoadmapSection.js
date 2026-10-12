import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  SectionHeader,
} from './LearningDesignTokens';

export default function CareerRoadmapSection({
  milestones = [],
  displayCareerName,
  onRefreshPath,
  onTrackCourseProgress,
  onOpenCourseUrl,
  onNavigateToSkills,
  onStartAssessment,
  onUploadCertificate,
}) {
  const [expandedMilestones, setExpandedMilestones] = useState(() => {
    // Default open first 2 milestones
    return { 0: true, 1: true };
  });

  const toggleMilestone = (idx) => {
    setExpandedMilestones((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const getSkillName = (s) => {
    if (!s) return 'Technical Skill';
    if (typeof s === 'string') return s;
    return s.skill_name || s.name || s.title || 'Technical Skill';
  };

  const getProviderEvidenceReqs = (sk, course) => {
    if (sk.evidence_requirements && Array.isArray(sk.evidence_requirements) && sk.evidence_requirements.length > 0) {
      return sk.evidence_requirements;
    }
    const prov = (course?.provider_name || course?.provider || '').toLowerCase();
    const certAvail = Boolean(course?.certificate_available);
    const isNptel = prov.includes('nptel') || prov.includes('swayam');
    const isFcc = prov.includes('freecodecamp') || prov.includes('fcc');
    const isYoutube = prov.includes('youtube');

    const reqs = [];
    if (isNptel || isFcc || (certAvail && !isYoutube)) {
      reqs.push({
        type: 'certificate',
        label: 'Certificate',
        status_label: sk.certificate_verified ? 'Certificate Verified' : 'Certificate Required',
        is_satisfied: Boolean(sk.certificate_verified),
      });
    }
    reqs.push({
      type: 'assessment',
      label: 'Skill Assessment',
      status_label: sk.test_passed ? 'Assessment Passed' : (sk.test_failed ? 'Assessment Failed' : 'Assessment Required'),
      is_satisfied: Boolean(sk.test_passed),
    });
    return reqs;
  };

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="ESTABLISHED CAREER PATHWAY"
        title={`Your ${displayCareerName} Roadmap`}
        subtitle="Evidence-based competency milestones aligned with industry standards"
        rightElement={
          <ClayButton style={styles.refreshBtn} onPress={onRefreshPath}>
            <Text style={styles.refreshBtnText}>
              Restore Default Step Order & Sequence
            </Text>
          </ClayButton>
        }
      />

      <View style={styles.timelineContainer}>
        {milestones.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          const isLast = idx === milestones.length - 1;
          const stepSkills = step.skills || [];
          const isExpanded = !expandedMilestones[idx];

          const statusBadge = isCompleted
            ? { label: 'Completed', variant: 'emerald' }
            : isActive
              ? { label: 'In Progress', variant: 'primary' }
              : { label: 'Upcoming', variant: 'muted' };

          return (
            <View key={step.id || idx} style={styles.timelineRow}>
              {/* Timeline Indicator Node + Connecting Line */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.timelineNode,
                    isCompleted && styles.timelineNodeCompleted,
                    isActive && styles.timelineNodeActive,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.nodeCheckmark}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.nodeNumberText,
                        isActive && styles.nodeNumberTextActive,
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      (isCompleted || isActive) && styles.timelineLineActive,
                    ]}
                  />
                )}
              </View>

              {/* Milestone Card Content */}
              <ClayCard
                style={[
                  styles.milestoneCard,
                  isActive && styles.milestoneCardActive,
                ]}
                interactive={false}
              >
                <View style={styles.milestoneHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.milestoneTagRow}>
                      <Text style={styles.milestoneStageTag}>
                        MILESTONE 0{idx + 1} • {(step.stage || 'STAGE').toUpperCase()}
                      </Text>
                      <ClayBadge
                        label={statusBadge.label}
                        variant={statusBadge.variant}
                        size="small"
                      />
                    </View>
                    <Text style={styles.milestoneTitle}>{step.title}</Text>
                    <Text style={styles.milestoneDesc}>{step.description}</Text>
                  </View>

                  <ClayButton
                    style={styles.expandToggleBtn}
                    onPress={() => toggleMilestone(idx)}
                  >
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? '▲ Collapse' : '▼ Expand'}
                    </Text>
                  </ClayButton>
                </View>

                {/* Active step progress indicator */}
                {isActive && (
                  <View style={styles.activeStepProgressBarBox}>
                    <View style={styles.activeStepProgressInfoRow}>
                      <Text style={styles.activeStepBadgeText}>
                        🔥 {step.badge_text || step.badgeText || 'Active Competency Track'}
                      </Text>
                      <Text style={styles.activeStepValText}>
                        {step.progress || 0}% Verified
                      </Text>
                    </View>
                    <View style={styles.activeStepBarTrack}>
                      <View
                        style={[
                          styles.activeStepBarFill,
                          { width: `${step.progress || 0}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Expanded content: Skills & Associated Course */}
                {isExpanded && stepSkills.length > 0 && (
                  <View style={styles.skillsAddressedSection}>
                    <Text style={styles.skillsAddressedHeading}>
                      SKILLS ADDRESSED ({stepSkills.length})
                    </Text>

                    <View style={styles.stepSkillsGrid}>
                      {stepSkills.map((sk, skIdx) => {
                        const skName = getSkillName(sk.skill_name);
                        const isHighPrio = sk.priority === 'High Priority';
                        const isVerified = sk.status === 'Verified' || sk.status === 'VERIFIED' || sk.canonical_status === 'verified' || sk.is_verified;
                        const courseItem = sk.course;
                        const evidenceReqs = getProviderEvidenceReqs(sk, courseItem);
                        const needsCert = evidenceReqs.some((r) => r.type === 'certificate');

                        return (
                          <View
                            key={sk.skill_id || sk.skill_name || skIdx}
                            style={styles.stepSkillItemCard}
                          >
                            <View style={styles.stepSkillTopRow}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.stepSkillName}>{skName}</Text>
                                <Text style={styles.stepSkillEsco}>
                                  ESCO ID: {String(sk.skill_id)}
                                </Text>
                              </View>
                              <View style={styles.stepSkillBadgeGroup}>
                                <ClayBadge
                                  label={sk.priority || 'Core'}
                                  variant={isHighPrio ? 'danger' : 'amber'}
                                  size="small"
                                />
                                <ClayBadge
                                  label={isVerified ? '✓ Verified' : (sk.status || 'Assessment Required')}
                                  variant={isVerified ? 'emerald' : 'muted'}
                                  size="small"
                                />
                              </View>
                            </View>

                            {/* Score Metrics */}
                            <View style={styles.stepSkillMetricsBar}>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricItemKey}>Current</Text>
                                <Text style={styles.metricItemVal}>
                                  {Math.round(sk.current_score || 0)}%
                                </Text>
                              </View>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricItemKey}>Target</Text>
                                <Text style={styles.metricItemVal}>
                                  {Math.round(sk.target_score || 80)}%
                                </Text>
                              </View>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricItemKey}>Gap</Text>
                                <Text
                                  style={[
                                    styles.metricItemVal,
                                    {
                                      color:
                                        (sk.gap || 0) > 0
                                          ? CLAY_COLORS.danger
                                          : CLAY_COLORS.emerald,
                                    },
                                  ]}
                                >
                                  {Math.round(sk.gap || 0)}%
                                </Text>
                              </View>
                            </View>

                            {/* Associated Learning & Evidence Requirements */}
                            {courseItem ? (
                              <View style={styles.associatedCourseBox}>
                                <View style={styles.associatedCourseHeader}>
                                  <Text style={styles.associatedCoursePre}>
                                    ASSOCIATED LEARNING
                                  </Text>
                                  <View style={styles.providerBadgePill}>
                                    <Text style={styles.associatedCourseProvider}>
                                      {(courseItem.provider_name || courseItem.provider || 'NPTEL').toUpperCase()}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={styles.associatedCourseTitle}
                                  numberOfLines={2}
                                >
                                  {courseItem.title}
                                </Text>

                                {/* Evidence Requirements Checklist */}
                                <View style={styles.evidenceContainer}>
                                  <Text style={styles.evidenceHeading}>REQUIRED EVIDENCE</Text>
                                  <View style={styles.evidenceChipsRow}>
                                    {evidenceReqs.map((req, rIdx) => {
                                      const isSat = req.is_satisfied || req.status === 'verified' || req.status === 'passed';
                                      const isFail = req.status === 'failed';
                                      const icon = isSat ? '✓' : (isFail ? '✗' : '○');
                                      const badgeVariant = isSat ? 'emerald' : (isFail ? 'danger' : 'amber');
                                      return (
                                        <View key={req.type || rIdx} style={styles.evidenceChipWrap}>
                                          <ClayBadge
                                            label={`${icon} ${req.status_label || req.label}`}
                                            variant={badgeVariant}
                                            size="small"
                                          />
                                        </View>
                                      );
                                    })}
                                  </View>
                                </View>
                              </View>
                            ) : null}

                            {/* Action Buttons */}
                            <View style={styles.skillActionButtonsRow}>
                              {/* Take Assessment CTA */}
                              {!isVerified && (!sk.test_passed || sk.test_failed) ? (
                                <ClayButton
                                  style={styles.takeAssessmentBtn}
                                  onPress={() => onStartAssessment && onStartAssessment(sk)}
                                >
                                  <Text style={styles.takeAssessmentBtnText}>
                                    {sk.test_failed ? 'Retake Assessment' : 'Take Assessment'}
                                  </Text>
                                </ClayButton>
                              ) : null}

                              {/* Upload Certificate CTA */}
                              {!isVerified && needsCert && !sk.certificate_verified && courseItem ? (
                                <ClayButton
                                  style={styles.uploadCertBtn}
                                  onPress={() => onUploadCertificate && onUploadCertificate(courseItem, sk)}
                                >
                                  <Text style={styles.uploadCertBtnText}>
                                    Upload Certificate
                                  </Text>
                                </ClayButton>
                              ) : null}

                              {courseItem?.url ? (
                                <ClayButton
                                  style={styles.exploreCourseBtn}
                                  onPress={() => onOpenCourseUrl(courseItem.url)}
                                >
                                  <Text style={styles.exploreCourseBtnText}>
                                    Explore Course ↗
                                  </Text>
                                </ClayButton>
                              ) : null}

                              <ClayButton
                                style={styles.escoSkillBtn}
                                onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', { skill_id: sk.skill_id })}
                              >
                                <Text style={styles.escoSkillBtnText}>
                                  View ESCO Skill ➔
                                </Text>
                              </ClayButton>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ClayCard>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 20,
  },
  refreshBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  refreshBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  timelineContainer: {
    marginTop: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  indicatorCol: {
    alignItems: 'center',
    marginRight: 14,
    width: 32,
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 2,
    borderColor: CLAY_COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNodeActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: CLAY_COLORS.primary,
  },
  timelineNodeCompleted: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderColor: CLAY_COLORS.emerald,
  },
  nodeCheckmark: {
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.emeraldDark,
  },
  nodeNumberText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  nodeNumberTextActive: {
    color: CLAY_COLORS.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: CLAY_COLORS.cardBorder,
    marginVertical: 4,
  },
  timelineLineActive: {
    backgroundColor: CLAY_COLORS.primary,
  },
  milestoneCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
  },
  milestoneCardActive: {
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: '#FAF8FC',
  },
  milestoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  milestoneTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  milestoneStageTag: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.8,
  },
  milestoneTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 2,
  },
  milestoneDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
  },
  expandToggleBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.button,
  },
  expandToggleText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  activeStepProgressBarBox: {
    backgroundColor: CLAY_COLORS.primaryLight,
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    marginVertical: 10,
  },
  activeStepProgressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeStepBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
  },
  activeStepValText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  activeStepBarTrack: {
    height: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeStepBarFill: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 2,
  },
  skillsAddressedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.recessedBorder,
    paddingTop: 12,
  },
  skillsAddressedHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stepSkillsGrid: {
    gap: 8,
  },
  stepSkillItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 10,
  },
  stepSkillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stepSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  stepSkillEsco: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  stepSkillBadgeGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  stepSkillMetricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: CLAY_RADII.cardSmall,
    marginBottom: 6,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricItemKey: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9,
    color: CLAY_COLORS.muted,
  },
  metricItemVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  associatedCourseBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  associatedCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  associatedCoursePre: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  providerBadgePill: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  associatedCourseProvider: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  associatedCourseTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
    lineHeight: 15,
    marginBottom: 8,
  },
  evidenceContainer: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  evidenceHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  evidenceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  evidenceChipWrap: {
    marginRight: 2,
    marginBottom: 2,
  },
  skillActionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  takeAssessmentBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
  },
  takeAssessmentBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  uploadCertBtn: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  uploadCertBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
  },
  exploreCourseBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  exploreCourseBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  escoSkillBtn: {
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  escoSkillBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
});
