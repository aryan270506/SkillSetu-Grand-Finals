import React, { useState, useMemo } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ClayButton, ClayCard } from './DesignTokens';

export default function RequiredSkillMatrix({
  skillGapsList = [],
  studentVerifiedSkills = [],
  careerMarketSkills = [],
  activeCareerName,
  selectedGapSkillName,
  highlightedSkillId,
  highlightedCourseId,
  onSelectSkillGap,
  onClearFilter,
  onNavigate,
  onOpenAssessmentModal,
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('matrix'); // 'dossier' or 'matrix'

  // Combine skills for matrix
  const allMatrixSkills = useMemo(() => {
    if (skillGapsList && skillGapsList.length > 0) {
      return skillGapsList;
    }
    if (careerMarketSkills && careerMarketSkills.length > 0) {
      return careerMarketSkills.map(m => ({
        skill_id: m.skill_id || `sk_${(m.skill || 'skill').toLowerCase().replace(/\s+/g, '_')}`,
        skill_name: m.skill,
        current_score: m.student_level || 0,
        target_score: m.required_level || 85,
        gap: Math.max(0, (m.required_level || 85) - (m.student_level || 0)),
        status: m.status || (m.is_verified ? 'Verified' : 'Assessment Required'),
        canonical_status: m.canonical_status || (m.is_verified ? 'verified' : 'assessment_required'),
        is_verified: Boolean(m.is_verified),
        category: m.category || 'Core Development',
        course_completed: Boolean(m.course_completed),
        certificate_verified: Boolean(m.certificate_verified),
        test_passed: Boolean(m.test_passed),
        assignment_completed: Boolean(m.assignment_completed),
        github_evidence: Boolean(m.github_evidence),
        recommended_courses: m.recommended_courses || [],
      }));
    }
    return [];
  }, [skillGapsList, careerMarketSkills]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(['All']);
    allMatrixSkills.forEach(sk => {
      if (sk.category) set.add(sk.category);
    });
    return Array.from(set);
  }, [allMatrixSkills]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return allMatrixSkills.filter(sk => {
      const matchCat = activeCategory === 'All' || sk.category === activeCategory;
      const matchSearch = !searchQuery || sk.skill_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allMatrixSkills, activeCategory, searchQuery]);

  return (
    <View
      style={[
        styles.sectionCard,
        Platform.OS === 'web' && {
          animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 360ms both',
        },
      ]}
      className="clay-interactive-card"
    >
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.tagRow}>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeText}>COMPETENCY INVENTORY</Text>
            </View>
            <View style={styles.skillCentricBadge}>
              <Text style={styles.skillCentricText}>SKILL-CENTRIC VIEW</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>
            Verified Skill Dossier ({allMatrixSkills.length} Total Competencies)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Canonical ESCO skills for {activeCareerName || 'Target Role'} and recommended learning resources mapped to close gaps.
          </Text>
        </View>

        {/* Search & Toggle */}
        <View style={styles.headerControls}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills..."
            placeholderTextColor={CLAY_COLORS.mutedLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesRow}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <ClayButton
              key={cat}
              style={[
                styles.categoryPill,
                isActive && styles.categoryPillActive,
              ]}
              className="clay-interactive-btn"
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  isActive && styles.categoryPillTextActive,
                ]}
              >
                {cat} {cat === 'All' ? `(${allMatrixSkills.length})` : ''}
              </Text>
            </ClayButton>
          );
        })}
      </View>

      {/* Active Filter Banner */}
      {(highlightedSkillId || highlightedCourseId) && (
        <View style={styles.activeFilterBanner}>
          <Text style={styles.activeFilterText}>
            🎯 Filter active: Highlighting skills{' '}
            {highlightedCourseId ? `addressed by Course ID: ${highlightedCourseId}` : 'for selected skill'}
          </Text>
          <Pressable onPress={onClearFilter}>
            <Text style={styles.clearFilterText}>✕ Clear Filter</Text>
          </Pressable>
        </View>
      )}

      {/* Skills Matrix List */}
      <View style={styles.skillsList}>
        {filteredSkills.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 24 }}>🎉</Text>
            <Text style={styles.emptyTitle}>No matching skill gaps</Text>
            <Text style={styles.emptyDesc}>You have met or exceeded all required thresholds for this view.</Text>
          </View>
        ) : (
          filteredSkills.map((sk) => {
            const isHighlighted =
              (highlightedSkillId && (String(sk.skill_id) === String(highlightedSkillId) || String(sk.esco_id) === String(highlightedSkillId))) ||
              (highlightedCourseId && sk.recommended_courses?.some((c) => String(c.course_id) === String(highlightedCourseId))) ||
              (selectedGapSkillName && sk.skill_name.toLowerCase() === selectedGapSkillName.toLowerCase());

            const isVerified = sk.is_verified || sk.status === 'Verified' || sk.status === 'VERIFIED' || sk.canonical_status === 'verified';
            const isLearning = !isVerified && (sk.current_score > 0 || sk.status === 'Learning Active' || sk.canonical_status === 'learning_active' || sk.canonical_status === 'developing');
            const currentScore = Math.round(sk.current_score ?? 0);
            const targetScore = Math.round(sk.target_score ?? 85);

            return (
              <View
                key={sk.skill_id || sk.skill_name}
                style={[
                  styles.skillMatrixCard,
                  isHighlighted && styles.skillMatrixCardHighlighted,
                ]}
              >
                {/* Header Row */}
                <View style={styles.skillCardHeader}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.skillCardTitle}>{sk.skill_name}</Text>
                      <View
                        style={[
                          styles.statusTag,
                          {
                            backgroundColor: isVerified
                              ? CLAY_COLORS.successLight
                              : isLearning
                              ? CLAY_COLORS.skyLight
                              : CLAY_COLORS.dangerLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            {
                              color: isVerified
                                ? CLAY_COLORS.successDark
                                : isLearning
                                ? CLAY_COLORS.skyDark
                                : CLAY_COLORS.danger,
                            },
                          ]}
                        >
                          {sk.status?.toUpperCase() || (isVerified ? 'VERIFIED' : 'GAP')}
                        </Text>
                      </View>
                      {sk.skill_id && (
                        <Text style={styles.skillIdText}>ID: {sk.skill_id}</Text>
                      )}
                    </View>

                    <Text style={styles.scoreDetailText}>
                      Current:{' '}
                      <Text style={{ fontWeight: '800', color: CLAY_COLORS.foreground }}>
                        {currentScore}%
                      </Text>{' '}
                      • Target:{' '}
                      <Text style={{ fontWeight: '800', color: CLAY_COLORS.foreground }}>
                        {targetScore}%
                      </Text>{' '}
                      (Gap: {Math.max(0, targetScore - currentScore)}%)
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.skillCardActions}>
                    <ClayButton
                      style={[
                        styles.focusButton,
                        selectedGapSkillName === sk.skill_name && {
                          backgroundColor: CLAY_COLORS.primary,
                        },
                      ]}
                      className="clay-interactive-btn"
                      onPress={() => onSelectSkillGap(sk.skill_name)}
                    >
                      <Text
                        style={[
                          styles.focusButtonText,
                          selectedGapSkillName === sk.skill_name && {
                            color: CLAY_COLORS.paper,
                          },
                        ]}
                      >
                        {selectedGapSkillName === sk.skill_name ? 'Active Focus ✓' : 'Focus Gap 🎯'}
                      </Text>
                    </ClayButton>

                    <ClayButton
                      style={styles.exploreButton}
                      className="clay-interactive-btn"
                      onPress={() => {
                        if (onNavigate) {
                          onNavigate('Learning', {
                            selectedSkillId: sk.skill_id,
                            selectedSkillName: sk.skill_name,
                          });
                        }
                      }}
                    >
                      <Text style={styles.exploreButtonText}>Explore Courses ➔</Text>
                    </ClayButton>

                    <ClayButton
                      testID={`skill-matrix-verify-${sk.skill_id || sk.skill_name}`}
                      style={styles.takeAssessButton}
                      className="clay-interactive-btn"
                      onPress={() => onOpenAssessmentModal(sk.skill_name)}
                    >
                      <Text style={styles.takeAssessButtonText}>Verify ⚡</Text>
                    </ClayButton>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.matrixProgressBarTrack}>
                  <View
                    style={[
                      styles.matrixProgressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, currentScore))}%`,
                        backgroundColor: isVerified
                          ? CLAY_COLORS.success
                          : isLearning
                          ? CLAY_COLORS.sky
                          : CLAY_COLORS.primary,
                      },
                    ]}
                  />
                </View>

                {/* 4-Component Verification Checklist */}
                <View style={styles.checklistRow}>
                  <View
                    style={[
                      styles.checkChip,
                      {
                        backgroundColor: sk.course_completed ? CLAY_COLORS.successLight : CLAY_COLORS.recessedLight,
                        borderColor: sk.course_completed ? 'rgba(16, 185, 129, 0.3)' : CLAY_COLORS.subtleBorder,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11 }}>{sk.course_completed ? '✅' : '❌'}</Text>
                    <Text
                      style={[
                        styles.checkChipText,
                        { color: sk.course_completed ? CLAY_COLORS.successDark : CLAY_COLORS.muted },
                      ]}
                    >
                      Course
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkChip,
                      {
                        backgroundColor: sk.test_passed ? CLAY_COLORS.successLight : CLAY_COLORS.recessedLight,
                        borderColor: sk.test_passed ? 'rgba(16, 185, 129, 0.3)' : CLAY_COLORS.subtleBorder,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11 }}>{sk.test_passed ? '✅' : '❌'}</Text>
                    <Text
                      style={[
                        styles.checkChipText,
                        { color: sk.test_passed ? CLAY_COLORS.successDark : CLAY_COLORS.muted },
                      ]}
                    >
                      Proctored Test
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkChip,
                      {
                        backgroundColor: sk.assignment_completed ? CLAY_COLORS.successLight : CLAY_COLORS.recessedLight,
                        borderColor: sk.assignment_completed ? 'rgba(16, 185, 129, 0.3)' : CLAY_COLORS.subtleBorder,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11 }}>{sk.assignment_completed ? '✅' : '❌'}</Text>
                    <Text
                      style={[
                        styles.checkChipText,
                        { color: sk.assignment_completed ? CLAY_COLORS.successDark : CLAY_COLORS.muted },
                      ]}
                    >
                      Assignment
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkChip,
                      {
                        backgroundColor: sk.github_evidence ? CLAY_COLORS.skyLight : CLAY_COLORS.recessedLight,
                        borderColor: sk.github_evidence ? 'rgba(14, 165, 233, 0.3)' : CLAY_COLORS.subtleBorder,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11 }}>{sk.github_evidence ? '✅' : '❌'}</Text>
                    <Text
                      style={[
                        styles.checkChipText,
                        { color: sk.github_evidence ? CLAY_COLORS.skyDark : CLAY_COLORS.muted },
                      ]}
                    >
                      GitHub Proof
                    </Text>
                  </View>
                </View>

                {/* Connected Recommended Courses */}
                {sk.recommended_courses && sk.recommended_courses.length > 0 && (
                  <View style={styles.coursesBlock}>
                    <Text style={styles.coursesBlockHeader}>
                      RECOMMENDED RESOURCES FOR THIS GAP:
                    </Text>
                    <View style={styles.coursesList}>
                      {sk.recommended_courses.map((course, cIdx) => (
                        <View key={course.course_id || cIdx} style={styles.courseMiniCard}>
                          <View style={styles.courseInfoLeft}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.courseTitleText}>{course.title}</Text>
                              <View style={styles.providerBadge}>
                                <Text style={styles.providerBadgeText}>
                                  {course.provider_name || course.provider || 'NPTEL'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.courseMetaText}>
                              {course.institution ? `${course.institution} • ` : ''}⏱ {course.duration || 'Self-paced'}
                            </Text>
                          </View>

                          {course.canonical_url && (
                            <Pressable
                              style={styles.openResourceBtn}
                              className="clay-interactive-btn"
                              onPress={() => Linking.openURL(course.canonical_url)}
                            >
                              <Text style={styles.openResourceBtnText}>🔗 Open Resource</Text>
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
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
    gap: 16,
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
  skillCentricBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  skillCentricText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primaryDark,
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
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: CLAY_RADII.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
    minWidth: 180,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
  },
  categoryPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  categoryPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  categoryPillTextActive: {
    color: CLAY_COLORS.paper,
  },
  activeFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: CLAY_RADII.cardSmall,
    padding: 10,
  },
  activeFilterText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  clearFilterText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  skillsList: {
    gap: 12,
  },
  skillMatrixCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 16,
    gap: 10,
  },
  skillMatrixCardHighlighted: {
    borderColor: CLAY_COLORS.primary,
    backgroundColor: '#FAF7FD',
    borderWidth: 1.5,
  },
  skillCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillCardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skillIdText: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  scoreDetailText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  skillCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  focusButton: {
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
  },
  focusButtonText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  exploreButton: {
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
  },
  exploreButtonText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  takeAssessButton: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
  },
  takeAssessButtonText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
  matrixProgressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  matrixProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklistRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  checkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkChipText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
  },
  coursesBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 8,
    gap: 6,
  },
  coursesBlockHeader: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.5,
  },
  coursesList: {
    gap: 6,
  },
  courseMiniCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  courseInfoLeft: {
    flex: 1,
    gap: 2,
  },
  courseTitleText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  providerBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  providerBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  courseMetaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  openResourceBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  openResourceBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  emptyDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
});
