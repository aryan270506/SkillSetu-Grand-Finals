import React from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  ClayProgressBar,
  SectionHeader,
  useAnimatedNumber,
} from './DashboardDesignTokens';

export default function ResumeIntelligenceSection({
  resumeIntelligence,
  handleDashboardResumeUpload,
  onNavigateToProfile,
  isTablet,
}) {
  const atsScore = resumeIntelligence.result?.ats_score || 0;
  const animatedAtsScore = useAnimatedNumber(atsScore, 800);

  return (
    <View style={styles.sectionWrapper} className="dashboard-section-reveal">
      <SectionHeader
        preTitle="ATS DIAGNOSTIC"
        title="Resume Intelligence"
        subtitle="Analyze ATS compatibility, extract structured skills, and benchmark against industry standards."
        rightElement={
          <ClayBadge
            label="🔒 Isolated Analysis • Does not alter profile"
            variant="sky"
            size="small"
          />
        }
      />

      <ClayCard style={styles.resumeCard} interactive={false}>
        {/* Hidden File Input for Web */}
        {Platform.OS === 'web' && (
          <input
            type="file"
            id="dashboardResumeFileInput"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleDashboardResumeUpload(e.target.files[0]);
              }
            }}
          />
        )}

        {/* 1. Loading State */}
        {resumeIntelligence.analyzing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
            <Text style={styles.loadingTitle}>
              Analyzing {resumeIntelligence.file?.name || 'Resume'}...
            </Text>
            <Text style={styles.loadingSubtitle}>
              Extracting structured skills, parsing experience, and computing ATS compatibility via unified SkillSetu intelligence engine.
            </Text>
          </View>
        ) : resumeIntelligence.result ? (
          /* 2. Analysis Result State */
          <View style={styles.resultContainer}>
            {/* Top Result Banner */}
            <View style={styles.resultBanner}>
              <View style={styles.fileMetaGroup}>
                <Text style={styles.fileNameText}>
                  📄 {resumeIntelligence.result.filename || 'Candidate Resume'}
                </Text>
                <Text style={styles.fileParsedAtText}>
                  Analyzed just now via unified ESCO engine
                </Text>
              </View>

              <ClayButton
                variant="secondary"
                onPress={() => {
                  if (Platform.OS === 'web') {
                    document.getElementById('dashboardResumeFileInput')?.click();
                  }
                }}
                style={styles.reanalyzeBtn}
              >
                <Text style={styles.reanalyzeBtnText}>Upload Another Resume</Text>
              </ClayButton>
            </View>

            {/* Score and Role Fit Row */}
            <View style={[styles.metricsRow, !isTablet && styles.metricsRowMobile]}>
              {/* ATS Score Box */}
              <View style={styles.scoreBox}>
                <Text style={styles.boxLabel}>ATS COMPATIBILITY SCORE</Text>

                <View style={styles.scoreNumberRow}>
                  <Text style={styles.scoreBig}>{animatedAtsScore}</Text>
                  <Text style={styles.scoreDenom}>/100</Text>
                  <ClayBadge
                    label={atsScore >= 80 ? 'Strong Fit' : (atsScore >= 65 ? 'Good Progress' : 'Needs Work')}
                    icon="✓"
                    variant={atsScore >= 80 ? 'emerald' : (atsScore >= 65 ? 'amber' : 'danger')}
                    size="medium"
                  />
                </View>

                <Text style={styles.scoreExplanation}>
                  {resumeIntelligence.result.score_text || 'ATS structure, format, and keywords evaluated against industry standards.'}
                </Text>

                {/* Breakdown Bars */}
                {resumeIntelligence.result.ats_breakdown && (
                  <View style={styles.breakdownList}>
                    <View style={styles.breakdownItem}>
                      <View style={styles.breakdownHeader}>
                        <Text style={styles.breakdownLabel}>Skills</Text>
                        <Text style={styles.breakdownScore}>
                          {resumeIntelligence.result.ats_breakdown.skills || 0}/30
                        </Text>
                      </View>
                      <ClayProgressBar
                        progress={resumeIntelligence.result.ats_breakdown.skills || 0}
                        max={30}
                        color={CLAY_COLORS.primary}
                        height={6}
                        borderRadius={3}
                      />
                    </View>

                    <View style={styles.breakdownItem}>
                      <View style={styles.breakdownHeader}>
                        <Text style={styles.breakdownLabel}>Experience</Text>
                        <Text style={styles.breakdownScore}>
                          {resumeIntelligence.result.ats_breakdown.experience || 0}/25
                        </Text>
                      </View>
                      <ClayProgressBar
                        progress={resumeIntelligence.result.ats_breakdown.experience || 0}
                        max={25}
                        color={CLAY_COLORS.secondary}
                        height={6}
                        borderRadius={3}
                      />
                    </View>

                    <View style={styles.breakdownItem}>
                      <View style={styles.breakdownHeader}>
                        <Text style={styles.breakdownLabel}>Projects</Text>
                        <Text style={styles.breakdownScore}>
                          {resumeIntelligence.result.ats_breakdown.projects || 0}/20
                        </Text>
                      </View>
                      <ClayProgressBar
                        progress={resumeIntelligence.result.ats_breakdown.projects || 0}
                        max={20}
                        color={CLAY_COLORS.sky}
                        height={6}
                        borderRadius={3}
                      />
                    </View>

                    <View style={styles.breakdownItem}>
                      <View style={styles.breakdownHeader}>
                        <Text style={styles.breakdownLabel}>Education & Extras</Text>
                        <Text style={styles.breakdownScore}>
                          {((resumeIntelligence.result.ats_breakdown.education || 0) + (resumeIntelligence.result.ats_breakdown.extras || 0))}/25
                        </Text>
                      </View>
                      <ClayProgressBar
                        progress={((resumeIntelligence.result.ats_breakdown.education || 0) + (resumeIntelligence.result.ats_breakdown.extras || 0))}
                        max={25}
                        color={CLAY_COLORS.emerald}
                        height={6}
                        borderRadius={3}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Best Fit Role Box */}
              <View style={styles.roleFitBox}>
                <Text style={styles.boxLabel}>BEST-FIT CAREER MATCH</Text>
                <Text style={styles.bestFitTitle}>
                  {resumeIntelligence.result.role_fit?.best_fit_role || 'General Software Engineering'}
                </Text>

                <View style={styles.fitScoreRow}>
                  <Text style={styles.fitScoreLabel}>Role Fit Alignment:</Text>
                  <Text style={styles.fitScoreVal}>{resumeIntelligence.result.role_fit?.fit_score || 0}%</Text>
                </View>

                <Text style={styles.fitWhyText}>
                  {resumeIntelligence.result.role_fit?.why_fit || 'Evidence matches core taxonomy requirements.'}
                </Text>

                {/* Key Strengths & Gaps */}
                <View style={styles.strengthsGapsBox}>
                  <Text style={styles.subGroupLabel}>KEY EXTRACTED STRENGTHS</Text>
                  <View style={styles.skillsPillWrap}>
                    {(resumeIntelligence.result.extracted_skills || []).slice(0, 6).map((sk, idx) => (
                      <ClayBadge
                        key={idx}
                        label={sk}
                        icon="✓"
                        variant="emerald"
                        size="small"
                      />
                    ))}
                  </View>

                  {resumeIntelligence.result.role_fit?.missing_skills && resumeIntelligence.result.role_fit.missing_skills.length > 0 && (
                    <>
                      <Text style={[styles.subGroupLabel, { marginTop: 12 }]}>KEY SKILL GAPS FOR ROLE</Text>
                      <View style={styles.skillsPillWrap}>
                        {resumeIntelligence.result.role_fit.missing_skills.slice(0, 4).map((sk, idx) => (
                          <ClayBadge
                            key={idx}
                            label={sk}
                            icon="!"
                            variant="amber"
                            size="small"
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Why SkillSetu? Section */}
            {resumeIntelligence.result.skillsetu_value && resumeIntelligence.result.skillsetu_value.length > 0 && (
              <View style={styles.whyBox}>
                <Text style={styles.whyTitle}>💡 Why SkillSetu for this Resume?</Text>
                {resumeIntelligence.result.skillsetu_value.map((point, idx) => (
                  <View style={styles.whyRow} key={idx}>
                    <Text style={styles.whyBullet}>●</Text>
                    <Text style={styles.whyText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer action */}
            <View style={styles.footerActionRow}>
              <ClayButton
                variant="ghost"
                onPress={onNavigateToProfile}
                style={styles.profileResumeBtn}
              >
                <Text style={styles.profileResumeBtnText}>View Profile Resume Analysis →</Text>
              </ClayButton>
            </View>
          </View>
        ) : (
          /* 3. Initial Empty Upload State */
          <View style={styles.emptyUploadBox}>
            <View style={styles.dropzone}>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text style={styles.dropzoneTitle}>Upload any resume for instant ATS intelligence</Text>
              <Text style={styles.dropzoneSubtitle}>
                Supports PDF, DOCX, and TXT files up to 10MB. Evaluated using the unified SkillSetu parsing & scoring model.
              </Text>

              {resumeIntelligence.error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {resumeIntelligence.error}</Text>
                </View>
              )}

              <ClayButton
                variant="primary"
                onPress={() => {
                  if (Platform.OS === 'web') {
                    document.getElementById('dashboardResumeFileInput')?.click();
                  } else {
                    alert('Please upload a PDF, DOCX, or TXT resume.');
                  }
                }}
                style={styles.uploadButton}
              >
                <Text style={styles.uploadButtonText}>Upload Resume</Text>
              </ClayButton>
            </View>
          </View>
        )}
      </ClayCard>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrapper: {
    marginBottom: 28,
  },
  resumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    ...CLAY_SHADOWS.card,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginTop: 16,
  },
  loadingSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 480,
    lineHeight: 18,
  },
  resultContainer: {
    marginTop: 4,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  fileMetaGroup: {
    flex: 1,
    minWidth: 200,
  },
  fileNameText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  fileParsedAtText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  reanalyzeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  reanalyzeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricsRowMobile: {
    flexDirection: 'column',
  },
  scoreBox: {
    flex: 1,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
  },
  boxLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 8,
  },
  scoreBig: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 34,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  scoreDenom: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  scoreExplanation: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    marginTop: 8,
    lineHeight: 18,
  },
  breakdownList: {
    marginTop: 14,
    gap: 10,
  },
  breakdownItem: {
    gap: 3,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.foreground,
    fontWeight: '600',
  },
  breakdownScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  roleFitBox: {
    flex: 1.2,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
  },
  bestFitTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginTop: 6,
  },
  fitScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  fitScoreLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
  },
  fitScoreVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.emerald,
  },
  fitWhyText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.foreground,
    marginTop: 6,
    lineHeight: 18,
  },
  strengthsGapsBox: {
    marginTop: 14,
  },
  subGroupLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  skillsPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  whyBox: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 16,
    marginTop: 16,
  },
  whyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.emeraldDark,
    marginBottom: 8,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  whyBullet: {
    fontSize: 8,
    color: CLAY_COLORS.emeraldDark,
    marginTop: 4,
  },
  whyText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.foreground,
    lineHeight: 18,
  },
  footerActionRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  profileResumeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  profileResumeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  emptyUploadBox: {
    marginTop: 4,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: CLAY_RADII.cardMedium,
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 38,
    marginBottom: 10,
  },
  dropzoneTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    textAlign: 'center',
  },
  dropzoneSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 460,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: CLAY_COLORS.dangerLight,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.danger,
    fontWeight: '600',
  },
  uploadButton: {
    marginTop: 18,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: CLAY_RADII.button,
  },
  uploadButtonText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
