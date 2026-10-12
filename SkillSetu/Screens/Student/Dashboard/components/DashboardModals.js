import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  ClayProgressBar,
} from './DashboardDesignTokens';

/**
 * 1. GitHub Skill Analysis Modal
 */
export function SkillIndexModal({
  isOpen,
  onClose,
  overallGithubScore,
  getEvidenceLevelText,
  skillIndexDetails,
  githubState,
  activeEvidencePop,
  setActiveEvidencePop,
}) {
  if (!isOpen) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCardLarge}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={true}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
                <Text style={styles.modalTitle}>GitHub Technical Evidence Analysis</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Weighted evidence model derived across your analyzed repositories
              </Text>
            </View>

            <Pressable style={styles.closeCircleBtn} onPress={onClose}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Overall Score Header Banner */}
          <View style={styles.overallBanner}>
            <Text style={styles.overallScoreBig}>
              {overallGithubScore} <Text style={styles.overallScoreDenom}>/ 100</Text>
            </Text>
            <Text style={styles.overallScoreLevel}>
              {getEvidenceLevelText(overallGithubScore)}
            </Text>
            <Text style={styles.overallScoreHint}>Technical Evidence Strength</Text>
          </View>

          {/* 1. Evidence Breakdown (Core Skills, Project Depth, Skill Breadth) */}
          <Text style={styles.sectionHeaderLabel}>
            SKILL INDEX BREAKDOWN <Text style={styles.sectionHeaderSub}>(Tap card for detailed evidence ℹ️)</Text>
          </Text>

          <View style={{ gap: 10, marginBottom: 20 }}>
            {/* Card 1: Core Skill Strength */}
            <Pressable
              onPress={() => setActiveEvidencePop('core')}
              style={({ hovered }) => [
                styles.breakdownCard,
                hovered && styles.breakdownCardHovered,
              ]}
            >
              <View style={styles.breakdownCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.breakdownCardTitle}>Core Skill Strength (60% Weight)</Text>
                  <ClayBadge label="Why? ℹ️" variant="primary" size="small" />
                </View>
                <Text style={styles.breakdownCardScore}>{skillIndexDetails.coreSkillStrength} / 100</Text>
              </View>
              <ClayProgressBar progress={skillIndexDetails.coreSkillStrength} color={CLAY_COLORS.primary} height={6} borderRadius={3} />
            </Pressable>

            {/* Card 2: Project Depth */}
            <Pressable
              onPress={() => setActiveEvidencePop('depth')}
              style={({ hovered }) => [
                styles.breakdownCard,
                hovered && styles.breakdownCardHovered,
              ]}
            >
              <View style={styles.breakdownCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.breakdownCardTitle}>Project Depth (25% Weight)</Text>
                  <ClayBadge label="Why? ℹ️" variant="emerald" size="small" />
                </View>
                <Text style={styles.breakdownCardScore}>{skillIndexDetails.projectDepth} / 100</Text>
              </View>
              <ClayProgressBar progress={skillIndexDetails.projectDepth} color={CLAY_COLORS.emerald} height={6} borderRadius={3} />
            </Pressable>

            {/* Card 3: Skill Breadth */}
            <Pressable
              onPress={() => setActiveEvidencePop('breadth')}
              style={({ hovered }) => [
                styles.breakdownCard,
                hovered && styles.breakdownCardHovered,
              ]}
            >
              <View style={styles.breakdownCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.breakdownCardTitle}>Skill Breadth (15% Weight)</Text>
                  <ClayBadge label="Why? ℹ️" variant="sky" size="small" />
                </View>
                <Text style={styles.breakdownCardScore}>{skillIndexDetails.skillBreadth} / 100</Text>
              </View>
              <ClayProgressBar progress={skillIndexDetails.skillBreadth} color={CLAY_COLORS.sky} height={6} borderRadius={3} />
            </Pressable>
          </View>

          {/* Evidence Popup Sub-Modal */}
          {activeEvidencePop && (
            <View style={styles.evidenceSubModalBackdrop}>
              <View style={styles.evidenceSubModalCard}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.modalTitle}>
                      {activeEvidencePop === 'core' && `Core Skill Strength (${skillIndexDetails.coreSkillStrength}/100)`}
                      {activeEvidencePop === 'depth' && `Project Depth Evidence (${skillIndexDetails.projectDepth}/100)`}
                      {activeEvidencePop === 'breadth' && `Skill Breadth Evidence (${skillIndexDetails.skillBreadth}/100)`}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {activeEvidencePop === 'core' && "Calculated from weighted evidence across your core engineering languages and frameworks."}
                      {activeEvidencePop === 'depth' && "Measures repeated and meaningful usage across your top demonstrated skills."}
                      {activeEvidencePop === 'breadth' && "Measures technical versatility across distinct core engineering domains."}
                    </Text>
                  </View>
                  <Pressable style={styles.closeCircleBtn} onPress={() => setActiveEvidencePop(null)}>
                    <Text style={styles.closeIconText}>✕</Text>
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 360, marginVertical: 8 }}>
                  {activeEvidencePop === 'core' && (
                    <View style={{ gap: 12 }}>
                      <View style={styles.infoBanner}>
                        <Text style={styles.infoBannerTitle}>Calculation Rationale:</Text>
                        <Text style={styles.infoBannerBody}>
                          Weighted average of detected Tier 1 Core Skills (1.2x - 1.0x) and Tier 2 Supporting Skills (0.5x). Tier 3 micro-dependencies were excluded.
                        </Text>
                      </View>

                      <Text style={styles.subSectionTitle}>TIER 1 CORE SKILLS ({skillIndexDetails.tier1Skills?.length || 0})</Text>
                      <View style={styles.skillsTagWrap}>
                        {(skillIndexDetails.tier1Skills || []).map((s, idx) => (
                          <View key={idx} style={styles.evidenceTagItem}>
                            <Text style={styles.evidenceTagText}>{s.name}</Text>
                            <Text style={styles.evidenceTagScore}>{s.scoreVal}%</Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.subSectionTitle}>TIER 2 SUPPORTING SKILLS ({skillIndexDetails.tier2Skills?.length || 0})</Text>
                      <View style={styles.skillsTagWrap}>
                        {(skillIndexDetails.tier2Skills || []).map((s, idx) => (
                          <View key={idx} style={styles.evidenceTagItem}>
                            <Text style={styles.evidenceTagText}>{s.name}</Text>
                            <Text style={styles.evidenceTagScore}>{s.scoreVal}%</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {activeEvidencePop === 'depth' && (
                    <View style={{ gap: 12 }}>
                      <View style={styles.infoBanner}>
                        <Text style={styles.infoBannerTitle}>Calculation Rationale:</Text>
                        <Text style={styles.infoBannerBody}>
                          Depth score reflects configuration, multi-repository frequency, architecture conventions, and repository commit density.
                        </Text>
                      </View>

                      <Text style={styles.subSectionTitle}>TOP DEMONSTRATED SKILLS</Text>
                      <View style={{ gap: 8 }}>
                        {(skillIndexDetails.topCoreSkills || []).map((s, idx) => (
                          <View key={idx} style={styles.provenanceItem}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.evidenceTagText}>{s.name}</Text>
                              <ClayBadge label={`${s.scoreVal}/100`} variant="emerald" size="small" />
                            </View>
                            <Text style={styles.provenanceSub}>
                              Found across {s.repository_count || 1} repository{(s.repository_count || 1) > 1 ? 'ies' : ''} • {s.category || 'Core Skill'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {activeEvidencePop === 'breadth' && (
                    <View style={{ gap: 12 }}>
                      <View style={styles.infoBanner}>
                        <Text style={styles.infoBannerTitle}>Calculation Rationale:</Text>
                        <Text style={styles.infoBannerBody}>
                          Evaluated across engineering domains with active core evidence (≥40% score). You have demonstrated skills across {skillIndexDetails.activeDomainCount} core domain(s).
                        </Text>
                      </View>

                      <Text style={styles.subSectionTitle}>ACTIVE DOMAINS ({skillIndexDetails.activeDomainCount})</Text>
                      <View style={{ gap: 8 }}>
                        {Object.entries(skillIndexDetails.domainBreakdown || {}).map(([domainName, techList], idx) => (
                          <View key={idx} style={styles.provenanceItem}>
                            <Text style={styles.evidenceTagText}>{domainName} Engineering</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {techList.map((t, tIdx) => (
                                <ClayBadge key={tIdx} label={t} variant="muted" size="small" />
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                <ClayButton
                  variant="primary"
                  onPress={() => setActiveEvidencePop(null)}
                  style={{ marginTop: 12 }}
                >
                  <Text style={styles.btnTextWhite}>Close Evidence Details</Text>
                </ClayButton>
              </View>
            </View>
          )}

          {/* 2. Repository Coverage */}
          <Text style={styles.sectionHeaderLabel}>REPOSITORY COVERAGE</Text>
          <View style={styles.coverageRow}>
            <View style={styles.coverageBox}>
              <Text style={styles.coverageNumber}>{githubState.reposAnalyzed}</Text>
              <Text style={styles.coverageLabel}>Repositories Analyzed</Text>
            </View>
            <View style={styles.coverageBox}>
              <Text style={[styles.coverageNumber, { color: CLAY_COLORS.primary }]}>{githubState.skills.length}</Text>
              <Text style={styles.coverageLabel}>Skills with Evidence</Text>
            </View>
            <View style={styles.coverageBox}>
              <Text style={styles.coverageNumber}>{githubState.reposAnalyzed}</Text>
              <Text style={styles.coverageLabel}>Selected Repos</Text>
            </View>
          </View>

          {/* Close Action */}
          <ClayButton
            variant="secondary"
            onPress={onClose}
            style={{ marginTop: 16 }}
          >
            <Text style={styles.btnTextPrimary}>Close Analysis</Text>
          </ClayButton>
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * 2. Complete Skill Gap Analysis Modal
 */
export function SkillGapAnalysisModal({
  isOpen,
  onClose,
  activeTargetCareers,
  computedGapData,
  gapAnalysisTab,
  setGapAnalysisTab,
}) {
  if (!isOpen) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCardLarge}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={true}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18 }}>🎯</Text>
                <Text style={styles.modalTitle}>Complete Skill Gap Analysis</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Comprehensive ESCO skill gap breakdown across your selected career goals
              </Text>
            </View>
            <Pressable style={styles.closeCircleBtn} onPress={onClose}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Selected Target Careers Chips */}
          <View style={styles.targetGoalsBanner}>
            <Text style={styles.targetGoalsLabel}>SELECTED CAREER GOALS ({activeTargetCareers.length})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {activeTargetCareers.map((car, idx) => (
                <ClayBadge key={idx} label={car} icon="🎯" variant="primary" size="medium" />
              ))}
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelectorRow}>
            <Pressable
              style={[styles.tabSelectorBtn, gapAnalysisTab === 'combined' && styles.tabSelectorBtnActive]}
              onPress={() => setGapAnalysisTab('combined')}
            >
              <Text style={[styles.tabSelectorText, gapAnalysisTab === 'combined' && styles.tabSelectorTextActive]}>
                Combined Skill Gaps ({computedGapData.skill_gaps ? computedGapData.skill_gaps.length : 0})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabSelectorBtn, gapAnalysisTab === 'breakdown' && styles.tabSelectorBtnActive]}
              onPress={() => setGapAnalysisTab('breakdown')}
            >
              <Text style={[styles.tabSelectorText, gapAnalysisTab === 'breakdown' && styles.tabSelectorTextActive]}>
                Breakdown by Career
              </Text>
            </Pressable>
          </View>

          {gapAnalysisTab === 'combined' ? (
            /* Tab 1: Combined Gaps */
            <View style={{ gap: 12, marginBottom: 18 }}>
              {computedGapData.skill_gaps && computedGapData.skill_gaps.length > 0 ? (
                computedGapData.skill_gaps.map((gap, idx) => {
                  const isHigh = gap.priority === 'High Priority';
                  return (
                    <View key={idx} style={styles.gapModalItemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 18 }}>{gap.icon || '🚀'}</Text>
                          <Text style={styles.gapModalSkillName}>{gap.skill_name}</Text>
                        </View>
                        <ClayBadge label={gap.priority} variant={isHigh ? 'danger' : 'amber'} size="small" />
                      </View>

                      <View style={{ gap: 4, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.gapModalMetaText}>Current: <Text style={{ fontWeight: '800', color: CLAY_COLORS.foreground }}>{gap.current_level}%</Text></Text>
                          <Text style={styles.gapModalMetaText}>Required: <Text style={{ fontWeight: '800', color: CLAY_COLORS.primary }}>{gap.required_level}%</Text></Text>
                        </View>
                        <ClayProgressBar progress={gap.current_level} color={gap.current_level >= 50 ? CLAY_COLORS.emerald : CLAY_COLORS.danger} height={6} borderRadius={3} />
                      </View>

                      {gap.required_by_careers && gap.required_by_careers.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Text style={styles.requiredByLabel}>Required by:</Text>
                          {gap.required_by_careers.map((reqCar, cIdx) => (
                            <ClayBadge key={cIdx} label={reqCar} variant="muted" size="small" />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyNoticeText}>No skill gaps detected across your selected career goals.</Text>
              )}
            </View>
          ) : (
            /* Tab 2: Breakdown by Career */
            <View style={{ gap: 14, marginBottom: 18 }}>
              {activeTargetCareers.map((carName, cIdx) => {
                const carSkills = computedGapData.career_skills_map?.[carName] || [];
                return (
                  <View key={cIdx} style={styles.careerBreakdownBox}>
                    <Text style={styles.careerBreakdownTitle}>🎯 {carName}</Text>
                    <View style={{ gap: 8 }}>
                      {carSkills.length > 0 ? (
                        carSkills.map((sk, sIdx) => (
                          <View key={sIdx} style={styles.careerSkillItemRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 14 }}>{sk.icon || '⚡'}</Text>
                              <Text style={styles.careerSkillName}>{sk.skill_name || sk.name}</Text>
                            </View>
                            <ClayBadge label={`${sk.required_level || sk.req || 80}% Required`} variant="primary" size="small" />
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyNoticeText}>Standard competency requirements applied.</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Close Action */}
          <ClayButton
            variant="secondary"
            onPress={onClose}
            style={{ marginTop: 12 }}
          >
            <Text style={styles.btnTextPrimary}>Close Analysis</Text>
          </ClayButton>
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * 3. Single Skill Analysis Modal
 */
export function SingleSkillModal({
  selectedSkillModal,
  onClose,
  getEvidenceLevelText,
}) {
  if (!selectedSkillModal) return null;

  const score = selectedSkillModal.score || selectedSkillModal.percentage || 0;
  const c1 = Math.min(45, Math.round(score * 0.45));
  const c2 = Math.min(30, Math.round(score * 0.30));
  const c3 = Math.min(15, Math.round(score * 0.15));
  const c4 = Math.min(10, Math.round(score * 0.10));

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCardMedium}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={true}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{selectedSkillModal.name}</Text>
              <Text style={styles.modalSubtitle}>
                {selectedSkillModal.rating || getEvidenceLevelText(score)}
              </Text>
            </View>
            <Pressable style={styles.closeCircleBtn} onPress={onClose}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Score Ring Banner */}
          <View style={styles.overallBanner}>
            <Text style={styles.overallScoreBig}>
              {score} <Text style={styles.overallScoreDenom}>/ 100</Text>
            </Text>
            <Text style={styles.overallScoreLevel}>Technical Evidence Strength</Text>
            <View style={{ width: '80%', marginVertical: 8 }}>
              <ClayProgressBar progress={score} color={CLAY_COLORS.primary} height={7} borderRadius={4} />
            </View>
            <Text style={styles.overallScoreHint}>
              Detected across {selectedSkillModal.repository_count || 1} repository{(selectedSkillModal.repository_count || 1) > 1 ? 'ies' : ''}
            </Text>
          </View>

          {/* Evidence Breakdown (4 Dimensions) */}
          <Text style={styles.sectionHeaderLabel}>EVIDENCE BREAKDOWN (4 DIMENSIONS)</Text>
          <View style={{ gap: 10, marginBottom: 18 }}>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownCardTop}>
                <Text style={styles.breakdownCardTitle}>Source Code Usage</Text>
                <Text style={styles.breakdownCardScore}>{c1} / 45</Text>
              </View>
              <ClayProgressBar progress={(c1 / 45) * 100} color={CLAY_COLORS.primary} height={5} borderRadius={3} />
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownCardTop}>
                <Text style={styles.breakdownCardTitle}>Manifest & Framework Config</Text>
                <Text style={styles.breakdownCardScore}>{c2} / 30</Text>
              </View>
              <ClayProgressBar progress={(c2 / 30) * 100} color={CLAY_COLORS.emerald} height={5} borderRadius={3} />
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownCardTop}>
                <Text style={styles.breakdownCardTitle}>Architecture & Conventions</Text>
                <Text style={styles.breakdownCardScore}>{c3} / 15</Text>
              </View>
              <ClayProgressBar progress={(c3 / 15) * 100} color={CLAY_COLORS.sky} height={5} borderRadius={3} />
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownCardTop}>
                <Text style={styles.breakdownCardTitle}>Documentation & Topics</Text>
                <Text style={styles.breakdownCardScore}>{c4} / 10</Text>
              </View>
              <ClayProgressBar progress={(c4 / 10) * 100} color={CLAY_COLORS.amber} height={5} borderRadius={3} />
            </View>
          </View>

          {/* Repository Provenance */}
          <Text style={styles.sectionHeaderLabel}>REPOSITORY PROVENANCE</Text>
          <View style={{ gap: 8, marginBottom: 18 }}>
            {selectedSkillModal.signals && selectedSkillModal.signals.length > 0 ? (
              selectedSkillModal.signals.map((sig, sIdx) => (
                <View key={sIdx} style={styles.provenanceItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.evidenceTagText}>✓ {sig.repository_name || 'Repository'}</Text>
                    <ClayBadge label="PUBLIC" variant="emerald" size="small" />
                  </View>
                  {sig.file_path && (
                    <Text style={styles.provenanceFilePath}>📄 {sig.file_path}</Text>
                  )}
                  <Text style={styles.provenanceSub}>{sig.evidence_description || 'Technical evidence detected'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.provenanceItem}>
                <Text style={styles.evidenceTagText}>✓ Analyzed Repositories</Text>
                <Text style={styles.provenanceSub}>Detected evidence in user projects for {selectedSkillModal.name}</Text>
              </View>
            )}
          </View>

          {/* Close Action */}
          <ClayButton
            variant="secondary"
            onPress={onClose}
          >
            <Text style={styles.btnTextPrimary}>Close</Text>
          </ClayButton>
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * 4. View All Skills Modal
 */
export function AllSkillsModal({
  isOpen,
  onClose,
  formattedSkills,
  isTablet,
  setSelectedSkillModal,
}) {
  if (!isOpen) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCardLarge}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
              <Text style={styles.modalTitle}>All Verified Skills</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Complete breakdown of your demonstrated skills ordered by proficiency
            </Text>
          </View>
          <Pressable style={styles.closeCircleBtn} onPress={onClose}>
            <Text style={styles.closeIconText}>✕</Text>
          </Pressable>
        </View>

        {/* Scrollable list */}
        <ScrollView style={{ maxHeight: '65vh' }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={true}>
          <View style={[styles.allSkillsGrid, !isTablet && styles.allSkillsGridMobile]}>
            {formattedSkills.map((s, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  onClose();
                  setSelectedSkillModal(s);
                }}
                style={({ hovered }) => [
                  styles.allSkillItemCard,
                  hovered && styles.allSkillItemCardHovered,
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.allSkillName}>{s.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {s.score >= 70 && (
                      <ClayBadge label="VERIFIED" variant="emerald" size="small" />
                    )}
                    <Text style={styles.allSkillScore}>{s.score}%</Text>
                  </View>
                </View>
                <ClayProgressBar
                  progress={s.score}
                  color={s.score >= 60 ? CLAY_COLORS.emerald : (s.score >= 40 ? CLAY_COLORS.amber : CLAY_COLORS.danger)}
                  height={5}
                  borderRadius={3}
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Modal Footer */}
        <View style={styles.modalFooter}>
          <Text style={styles.modalFooterCount}>
            Total Skills: {formattedSkills.length}
          </Text>
          <ClayButton
            variant="secondary"
            onPress={onClose}
            style={{ paddingVertical: 8, paddingHorizontal: 20 }}
          >
            <Text style={styles.btnTextPrimary}>Close</Text>
          </ClayButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 36, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  modalCardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    maxWidth: 680,
    width: '100%',
    maxHeight: '90vh',
    padding: 24,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.card,
  },
  modalCardMedium: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    maxWidth: 560,
    width: '100%',
    maxHeight: '90vh',
    padding: 24,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  modalSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLAY_COLORS.recessedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  overallBanner: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    marginBottom: 20,
  },
  overallScoreBig: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 34,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  overallScoreDenom: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    color: CLAY_COLORS.muted,
    fontWeight: '700',
  },
  overallScoreLevel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginTop: 4,
  },
  overallScoreHint: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  sectionHeaderLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionHeaderSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    fontWeight: '500',
    color: CLAY_COLORS.muted,
  },
  breakdownCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  breakdownCardHovered: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  breakdownCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownCardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  breakdownCardScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  evidenceSubModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 36, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  evidenceSubModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 20,
    ...CLAY_SHADOWS.card,
  },
  infoBanner: {
    backgroundColor: CLAY_COLORS.primaryLight,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  infoBannerTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
    marginBottom: 2,
  },
  infoBannerBody: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.foreground,
    lineHeight: 16,
  },
  subSectionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  skillsTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceTagItem: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceTagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  evidenceTagScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  provenanceItem: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  provenanceSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  provenanceFilePath: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: CLAY_COLORS.primary,
    marginTop: 2,
  },
  coverageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  coverageBox: {
    flex: 1,
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
  },
  coverageNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  coverageLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  btnTextPrimary: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  btnTextWhite: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  targetGoalsBanner: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardMedium,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  targetGoalsLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tabSelectorRow: {
    flexDirection: 'row',
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 4,
    borderRadius: CLAY_RADII.button,
    marginBottom: 16,
  },
  tabSelectorBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button - 2,
    alignItems: 'center',
  },
  tabSelectorBtnActive: {
    backgroundColor: '#FFFFFF',
    ...CLAY_SHADOWS.buttonSecondary,
  },
  tabSelectorText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  tabSelectorTextActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '800',
  },
  gapModalItemCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  gapModalSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  gapModalMetaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  requiredByLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  careerBreakdownBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  careerBreakdownTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginBottom: 10,
  },
  careerSkillItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  careerSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  emptyNoticeText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    marginVertical: 14,
  },
  allSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  allSkillsGridMobile: {
    flexDirection: 'column',
  },
  allSkillItemCard: {
    width: '48.5%',
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  allSkillItemCardHovered: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  allSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  allSkillScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooterCount: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
});
