import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';
import { fetchRoleQuestionBank } from '../../services/applicationService';

function sanitizeRoleTitle(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') return 'Backend Developer';
  const clean = rawRole.trim();
  if (clean.length <= 30 && !clean.endsWith('.') && !clean.toLowerCase().startsWith('to ')) return clean;
  const lower = clean.toLowerCase();
  if (lower.includes('back') || lower.includes('scalable') || lower.includes('api') || lower.includes('database')) return 'Backend Developer';
  if (lower.includes('front') || lower.includes('ui') || lower.includes('web')) return 'Frontend Developer';
  if (lower.includes('full') || lower.includes('stack')) return 'Full Stack Developer';
  if (lower.includes('data') || lower.includes('ai') || lower.includes('ml') || lower.includes('learning')) return 'Data Analyst / ML Engineer';
  if (lower.includes('cloud') || lower.includes('devops') || lower.includes('infrastructure')) return 'DevOps / Cloud Engineer';
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios') || lower.includes('react native')) return 'Mobile App Developer';
  return 'Backend Developer';
}

export default function AIInterviewPracticeModal({
  visible,
  onClose,
  initialRole,
  studentEmail,
  availableRoles = [],
  onPracticeSingleQuestion,
  onStartFullMock,
}) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  const defaultCleanRole = useMemo(() => sanitizeRoleTitle(initialRole), [initialRole]);

  // Clean, unique available roles list
  const cleanRolesList = useMemo(() => {
    const rolesSet = new Set();
    rolesSet.add(defaultCleanRole);
    (availableRoles || []).forEach((r) => {
      const title = typeof r === 'object' ? r.title || r.name : r;
      if (title) rolesSet.add(sanitizeRoleTitle(title));
    });
    [
      'Backend Developer',
      'Frontend Developer',
      'Full Stack Developer',
      'Data Analyst / ML Engineer',
      'DevOps / Cloud Engineer',
      'Mobile App Developer',
    ].forEach((r) => rolesSet.add(r));
    return Array.from(rolesSet);
  }, [defaultCleanRole, availableRoles]);

  // Selected Role State
  const [selectedRole, setSelectedRole] = useState(defaultCleanRole);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [practiceMode, setPracticeMode] = useState('practice'); // 'practice' | 'review'

  // Question Bank State
  const [questionData, setQuestionData] = useState(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [visibleCount, setVisibleCount] = useState(20);

  // Load questions for the selected role and mode
  const loadQuestions = useCallback(async (roleToLoad, modeToLoad = 'practice') => {
    setIsLoadingQuestions(true);
    try {
      const data = await fetchRoleQuestionBank(studentEmail, roleToLoad, modeToLoad);
      if (data) {
        setQuestionData(data);
      }
    } catch (err) {
      console.error('[AIInterviewPracticeModal] Error loading question bank:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    if (visible) {
      const clean = sanitizeRoleTitle(initialRole);
      setSelectedRole(clean);
      setPracticeMode('practice');
      loadQuestions(clean, 'practice');
      setVisibleCount(20);
      setIsRoleDropdownOpen(false);
    }
  }, [visible, initialRole, loadQuestions]);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setIsRoleDropdownOpen(false);
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSelectedPriority('All');
    setSearchQuery('');
    setVisibleCount(20);
    loadQuestions(newRole, practiceMode);
  };

  const handleModeChange = (newMode) => {
    setPracticeMode(newMode);
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSelectedPriority('All');
    setSearchQuery('');
    setVisibleCount(20);
    loadQuestions(selectedRole, newMode);
  };

  const rawQuestions = useMemo(() => {
    return questionData?.questions || [];
  }, [questionData]);

  // Dynamic category tabs with real counts
  const categoriesList = useMemo(() => {
    const cats = ['All'];
    const counts = questionData?.category_counts || {};
    Object.keys(counts).forEach((c) => {
      if (!cats.includes(c)) cats.push(c);
    });
    return { cats, counts };
  }, [questionData]);

  // Filter & Search computation
  const filteredQuestions = useMemo(() => {
    let result = rawQuestions;

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((q) => q.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'All') {
      result = result.filter((q) => (q.difficulty || '').toLowerCase() === selectedDifficulty.toLowerCase());
    }

    // Priority filter
    if (selectedPriority !== 'All') {
      result = result.filter((q) => (q.priority || '').includes(selectedPriority));
    }

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      result = result.filter(
        (q) =>
          (q.question && q.question.toLowerCase().includes(qLower)) ||
          (q.skill && q.skill.toLowerCase().includes(qLower)) ||
          (q.category && q.category.toLowerCase().includes(qLower)) ||
          (q.explanation && q.explanation.toLowerCase().includes(qLower))
      );
    }

    return result;
  }, [rawQuestions, selectedCategory, selectedDifficulty, selectedPriority, searchQuery]);

  // Paginated visible list
  const visibleQuestions = useMemo(() => {
    return filteredQuestions.slice(0, visibleCount);
  }, [filteredQuestions, visibleCount]);

  if (!visible) return null;

  return (
    <Modal visible={true} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View
        style={styles.modalOverlay}
        // @ts-ignore
        className="clay-backdrop-fade"
        dataSet={{ backdropFade: 'true' }}
      >
        <View
          style={[
            styles.modalContainer,
            CLAY_SHADOWS.cardHover,
            isSmallScreen && { width: '96%', padding: 16 },
          ]}
          // @ts-ignore
          className="clay-modal-enter"
          dataSet={{ modalEnter: 'true' }}
        >
          {/* 1. Modal Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.titleBadgeRow}>
                <View style={styles.liveTag}>
                  <View
                    style={styles.liveDot}
                    // @ts-ignore
                    className="clay-icon-interactive"
                    dataSet={{ iconInteractive: 'true' }}
                  />
                  <Text style={styles.liveTagText}>AI INTERVIEW PRACTICE</Text>
                </View>
                <Text style={styles.questionCountTag}>
                  {questionData?.total_questions || 0} Questions Available
                </Text>
              </View>

              <View style={styles.roleSelectorRow}>
                <Text style={styles.modalTitle}>Target Role:</Text>
                <View style={styles.dropdownWrapper}>
                  <Pressable
                    style={styles.rolePickerBtn}
                    // @ts-ignore
                    className="clay-btn-white"
                    dataSet={{ btnWhite: 'true' }}
                    onPress={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  >
                    <Text style={styles.rolePickerBtnText}>{selectedRole}</Text>
                    <Text style={styles.dropdownChevron}>{isRoleDropdownOpen ? '▲' : '▾'}</Text>
                  </Pressable>

                  {/* Dropdown Backdrop & Options */}
                  {isRoleDropdownOpen && (
                    <>
                      <Pressable
                        style={styles.dropdownBackdrop}
                        onPress={() => setIsRoleDropdownOpen(false)}
                      />
                      <View
                        style={[styles.roleDropdownMenu, CLAY_SHADOWS.cardHover]}
                        // @ts-ignore
                        className="clay-dropdown-enter"
                        dataSet={{ dropdownEnter: 'true' }}
                      >
                        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={true}>
                          {cleanRolesList.map((rTitle, idx) => (
                            <Pressable
                              key={idx}
                              style={[
                                styles.roleDropdownItem,
                                selectedRole === rTitle && styles.roleDropdownItemActive,
                              ]}
                              // @ts-ignore
                              className="clay-tab-pill"
                              dataSet={{ tabPill: 'true' }}
                              onPress={() => handleRoleChange(rTitle)}
                            >
                              <Text
                                style={[
                                  styles.roleDropdownItemText,
                                  selectedRole === rTitle && styles.roleDropdownItemTextActive,
                                ]}
                              >
                                {rTitle}
                              </Text>
                              {selectedRole === rTitle && <Text style={styles.checkIcon}>✓</Text>}
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              // @ts-ignore
              className="clay-close-btn"
              dataSet={{ closeBtn: 'true' }}
            >
              <Text style={styles.closeBtnText}>✕ Close Practice Room</Text>
            </Pressable>
          </View>

          {/* 2. Mock Launch Hero Banner */}
          <View
            style={styles.heroBanner}
            // @ts-ignore
            className="clay-subcard-hover"
            dataSet={{ subcardHover: 'true' }}
          >
            <View style={{ flex: 1, minWidth: 260, gap: 4 }}>
              <Text style={styles.heroBannerTitle}>🚀 Start Full AI Mock Interview</Text>
              <Text style={styles.heroBannerSub}>
                Launch an interactive 10-question AI interview session calibrated for {selectedRole}. Includes real-time STAR feedback and scoring.
              </Text>
            </View>
            <Pressable
              style={styles.launchMockBtn}
              // @ts-ignore
              className="clay-btn-purple"
              dataSet={{ btnPurple: 'true' }}
              onPress={() => {
                onClose();
                onStartFullMock({
                  targetRound: 'interview',
                  roleTitle: selectedRole,
                });
              }}
            >
              <Text style={styles.launchMockBtnText}>🎙️ Launch Full Mock Interview</Text>
            </Pressable>
          </View>

          {/* 3. Search & Category Filters Bar */}
          <View style={styles.filtersSection}>
            {/* Mode Switcher: Practice New Questions vs Review Completed */}
            <View style={styles.modeTabsRow}>
              <Pressable
                style={[
                  styles.modeTabBtn,
                  practiceMode === 'practice' && styles.modeTabBtnActive,
                ]}
                // @ts-ignore
                className="clay-tab-pill"
                dataSet={{ tabPill: 'true' }}
                onPress={() => handleModeChange('practice')}
              >
                <Text
                  style={[
                    styles.modeTabBtnText,
                    practiceMode === 'practice' && styles.modeTabBtnTextActive,
                  ]}
                >
                  🎯 Practice New Questions ({questionData?.available_unattempted_count ?? (questionData?.total_questions || 0)})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeTabBtn,
                  practiceMode === 'review' && styles.modeTabBtnActive,
                ]}
                // @ts-ignore
                className="clay-tab-pill"
                dataSet={{ tabPill: 'true' }}
                onPress={() => handleModeChange('review')}
              >
                <Text
                  style={[
                    styles.modeTabBtnText,
                    practiceMode === 'review' && styles.modeTabBtnTextActive,
                  ]}
                >
                  📜 Review Completed ({questionData?.submitted_count || 0})
                </Text>
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchBarWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search interview questions, skills (e.g. FastAPI, Redis, React)..."
                placeholderTextColor={CLAY_COLORS.mutedLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.trim() ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Category Pills Strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 2 }}>
              <View style={styles.categoryPillsRow}>
                {categoriesList.cats.map((cat) => {
                  const count = cat === 'All' ? rawQuestions.length : categoriesList.counts[cat] || 0;
                  const isActive = selectedCategory === cat;

                  return (
                    <Pressable
                      key={cat}
                      style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setVisibleCount(20);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isActive && styles.categoryPillTextActive,
                        ]}
                      >
                        {cat} ({count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Difficulty & Priority Quick Filters */}
            <View style={styles.subFilterRow}>
              <View style={styles.filterChipGroup}>
                <Text style={styles.filterGroupLabel}>Difficulty:</Text>
                {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
                  <Pressable
                    key={d}
                    style={[
                      styles.miniFilterChip,
                      selectedDifficulty === d && styles.miniFilterChipActive,
                    ]}
                    onPress={() => setSelectedDifficulty(d)}
                  >
                    <Text
                      style={[
                        styles.miniFilterChipText,
                        selectedDifficulty === d && styles.miniFilterChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.filterChipGroup}>
                <Text style={styles.filterGroupLabel}>Priority:</Text>
                {['All', '🔥 Frequently Asked', '⭐ High Priority'].map((p) => {
                  const label = p.includes('Frequently') ? '🔥 Top Asked' : p.includes('High') ? '⭐ High' : 'All';
                  return (
                    <Pressable
                      key={p}
                      style={[
                        styles.miniFilterChip,
                        selectedPriority === p && styles.miniFilterChipActive,
                      ]}
                      onPress={() => setSelectedPriority(p)}
                    >
                      <Text
                        style={[
                          styles.miniFilterChipText,
                          selectedPriority === p && styles.miniFilterChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 4. Questions List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.questionsContainer}>
            {isLoadingQuestions ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
                <Text style={styles.loadingText}>
                  Compiling 100+ role-specific interview questions for {selectedRole}...
                </Text>
              </View>
            ) : filteredQuestions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>
                  {practiceMode === 'review'
                    ? 'No completed interview questions yet'
                    : 'No matching interview questions found'}
                </Text>
                <Text style={styles.emptySub}>
                  {practiceMode === 'review'
                    ? 'Practice and submit questions in AI Practice Sandbox to review past evaluations.'
                    : 'Try clearing your search filters or switching categories.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.questionsGrid}>
                  {visibleQuestions.map((q, idx) => {
                    const isFrequentlyAsked = (q.priority || '').includes('Frequently');

                    return (
                      <View
                        key={q.id || idx}
                        style={[styles.questionCard, CLAY_SHADOWS.card]}
                        // @ts-ignore
                        className="clay-hover-lift"
                        dataSet={{ cardHover: 'true' }}
                      >
                        {/* Card Top: Priority, Category & Submission Status */}
                        <View style={styles.qCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View
                              style={[
                                styles.priorityBadge,
                                isFrequentlyAsked && { backgroundColor: CLAY_COLORS.primaryLight },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.priorityBadgeText,
                                  isFrequentlyAsked && { color: CLAY_COLORS.primaryDark },
                                ]}
                              >
                                {q.priority || 'Recommended'}
                              </Text>
                            </View>

                            {q.is_submitted && (
                              <View style={styles.completedBadge}>
                                <Text style={styles.completedBadgeText}>
                                  ✅ {q.last_score !== undefined ? `${q.last_score}%` : 'Done'}
                                  {q.last_verdict ? ` (${q.last_verdict})` : ''}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{q.category}</Text>
                          </View>
                        </View>

                        {/* Question Text */}
                        <Text style={styles.questionText}>"{q.question}"</Text>

                        {/* Previous Answer Snippet (Review Mode) */}
                        {q.last_answer ? (
                          <View style={styles.prevAnswerBox}>
                            <Text style={styles.prevAnswerLabel}>YOUR PREVIOUS ANSWER:</Text>
                            <Text style={styles.prevAnswerText} numberOfLines={2}>
                              "{q.last_answer}"
                            </Text>
                          </View>
                        ) : null}

                        {/* Explanation / STAR Tip */}
                        {q.explanation ? (
                          <View style={styles.explanationBox}>
                            <Text style={styles.explanationLabel}>EXPECTED STAR APPROACH:</Text>
                            <Text style={styles.explanationText} numberOfLines={3}>
                              {q.explanation}
                            </Text>
                          </View>
                        ) : null}

                        {/* Card Footer: Tags & Practice Action */}
                        <View style={styles.qCardFooter}>
                          <View style={styles.tagsGroup}>
                            {q.skill ? (
                              <View style={styles.skillPill}>
                                <Text style={styles.skillPillText}>{q.skill}</Text>
                              </View>
                            ) : null}
                            <View style={styles.difficultyPill}>
                              <Text style={styles.difficultyPillText}>
                                {q.difficulty || 'Intermediate'}
                              </Text>
                            </View>
                          </View>

                          <Pressable
                            style={styles.practiceBtn}
                            // @ts-ignore
                            className="clay-btn-purple"
                            dataSet={{ btnPurple: 'true' }}
                            onPress={() => {
                              onClose();
                              onPracticeSingleQuestion(q);
                            }}
                          >
                            <Text style={styles.practiceBtnText}>
                              {q.is_submitted ? '🔄 Retake with AI ➔' : '🎙️ Practice with AI ➔'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* 5. Load More Button */}
                {visibleCount < filteredQuestions.length && (
                  <View style={styles.loadMoreContainer}>
                    <Pressable
                      style={styles.loadMoreBtn}
                      // @ts-ignore
                      className="clay-btn-white"
                      dataSet={{ btnWhite: 'true' }}
                      onPress={() => setVisibleCount((prev) => prev + 20)}
                    >
                      <Text style={styles.loadMoreBtnText}>
                        Load More Questions ({visibleCount} of {filteredQuestions.length})
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '94%',
    maxWidth: 1100,
    height: '92%',
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 2,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    zIndex: 1000,
    elevation: 50,
    position: 'relative',
  },
  topBarLeft: {
    gap: 6,
    flex: 1,
    minWidth: 280,
    zIndex: 1000,
    elevation: 50,
    position: 'relative',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY_COLORS.primary,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: 0.6,
  },
  questionCountTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  roleSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    zIndex: 1000,
    elevation: 50,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 99999,
    elevation: 100,
  },
  dropdownBackdrop: {
    ...Platform.select({
      web: {
        position: 'fixed',
      },
      default: {
        position: 'absolute',
      },
    }),
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 99990,
    backgroundColor: 'transparent',
  },
  rolePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 8,
  },
  rolePickerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
    fontFamily: CLAY_FONTS.heading,
  },
  dropdownChevron: {
    fontSize: 11,
    color: CLAY_COLORS.primary,
    fontWeight: '800',
  },
  roleDropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    minWidth: 260,
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    zIndex: 99999,
    elevation: 100,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(124, 58, 237, 0.2)',
      },
      default: {},
    }),
  },
  roleDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.subtleBorder,
  },
  roleDropdownItemActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  roleDropdownItemText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  roleDropdownItemTextActive: {
    color: CLAY_COLORS.primaryDark,
    fontWeight: '800',
  },
  checkIcon: {
    color: CLAY_COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  closeBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  closeBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  heroBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primaryLight,
    padding: 16,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    flexWrap: 'wrap',
    gap: 12,
    zIndex: 1,
    position: 'relative',
  },
  heroBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.primaryDark,
    fontFamily: CLAY_FONTS.heading,
  },
  heroBannerSub: {
    fontSize: 12,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 17,
  },
  launchMockBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  launchMockBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  filtersSection: {
    gap: 10,
    zIndex: 1,
    position: 'relative',
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  modeTabBtnActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)',
      },
      default: {},
    }),
  },
  modeTabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  modeTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.successDark,
    fontFamily: CLAY_FONTS.heading,
  },
  prevAnswerBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 3,
  },
  prevAnswerLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: 0.5,
  },
  prevAnswerText: {
    fontSize: 11.5,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    fontStyle: 'italic',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    height: '100%',
  },
  clearSearchText: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontWeight: '700',
    padding: 4,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  categoryPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)',
      },
      default: {},
    }),
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterChipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterGroupLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.heading,
  },
  miniFilterChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  miniFilterChipActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: CLAY_COLORS.primary,
  },
  miniFilterChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  miniFilterChipTextActive: {
    color: CLAY_COLORS.primaryDark,
    fontWeight: '800',
  },
  questionsContainer: {
    paddingVertical: 10,
    gap: 14,
  },
  questionsGrid: {
    gap: 12,
  },
  questionCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 16,
    gap: 10,
  },
  qCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  categoryBadge: {
    backgroundColor: CLAY_COLORS.primaryLighter,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  questionText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    lineHeight: 20,
  },
  explanationBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 3,
  },
  explanationLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
    fontFamily: CLAY_FONTS.heading,
  },
  explanationText: {
    fontSize: 11.5,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 16,
  },
  qCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillPill: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  skillPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  difficultyPill: {
    backgroundColor: CLAY_COLORS.paper,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  difficultyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.heading,
  },
  practiceBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  practiceBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreBtn: {
    backgroundColor: CLAY_COLORS.paper,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  loadMoreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  loadingBox: {
    padding: 36,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  emptySub: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
});
