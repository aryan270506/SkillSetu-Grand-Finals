import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function QuestionBankSection({
  questionCategories,
  questionBankFilter,
  setQuestionBankFilter,
  filteredQuestionBank,
  rawQuestionBank,
  expandedQuestion,
  setExpandedQuestion,
  allQuestionsExpanded,
  onToggleExpandAll,
  onPracticeQuestion,
}) {
  return (
    <View
      style={[styles.card, CLAY_SHADOWS.card]}
      dataSet={{ cardHover: 'true' }}
      // @ts-ignore
      className="clay-card-hover"
    >
      {/* 1. Header with Expand/Collapse All */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={styles.sectionTitle}>Curated Technical & HR Question Bank</Text>
          <Text style={styles.sectionSub}>
            Filter by topic, study the recommended STAR format, and get automated AI evaluation.
          </Text>
        </View>

        <Pressable
          style={styles.expandAllBtn}
          dataSet={{ btnWhite: 'true' }}
          // @ts-ignore
          className="clay-btn-white"
          onPress={onToggleExpandAll}
        >
          <Text style={styles.expandAllBtnText}>
            {allQuestionsExpanded ? 'Collapse All' : 'Expand All'}
          </Text>
        </Pressable>
      </View>

      {/* 2. Category Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginVertical: 4 }}>
        <View style={styles.filterPillsRow}>
          {questionCategories.cats.map((cat) => {
            const count = cat === 'All' ? rawQuestionBank.length : questionCategories.catMap[cat] || 0;
            const label = `${cat} (${count})`;
            const isActive = questionBankFilter === cat;

            return (
              <Pressable
                key={cat}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                ]}
                dataSet={{ tabPill: 'true' }}
                // @ts-ignore
                className="clay-tab-pill"
                onPress={() => setQuestionBankFilter(cat)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* 3. Questions Accordion List */}
      <View style={styles.accordionList}>
        {filteredQuestionBank.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Question bank will appear when relevant questions are available.
            </Text>
          </View>
        ) : (
          filteredQuestionBank.map((qb, idx) => {
            const isExpanded = allQuestionsExpanded || expandedQuestion === qb.id;
            const qCategory = qb.category || 'Technical';
            const isBehavioral = qCategory.toLowerCase().includes('hr') || qCategory.toLowerCase().includes('behavior');

            return (
              <View
                key={qb.id || idx}
                style={[styles.accordionItem, isExpanded && styles.accordionItemActive]}
                dataSet={{ subcardHover: 'true' }}
                // @ts-ignore
                className="clay-subcard-hover"
              >
                <Pressable
                  style={styles.accordionHeader}
                  onPress={() => setExpandedQuestion(isExpanded && !allQuestionsExpanded ? null : qb.id)}
                >
                  <View style={styles.headerLeft}>
                    <View
                      style={styles.qbBadge}
                      dataSet={{ iconInteractive: 'true' }}
                      // @ts-ignore
                      className="clay-icon-interactive"
                    >
                      <Text style={styles.qbBadgeText}>
                        {qb.id ? String(qb.id).slice(-4) : `Q${idx + 1}`}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.qbTitle}>{qb.title || qb.question}</Text>
                      <View style={styles.tagRow}>
                        <View style={styles.catPill}>
                          <Text style={styles.catPillText}>{qCategory}</Text>
                        </View>
                        <Text style={styles.difficultyText}>
                          • {qb.difficulty || 'Medium'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.headerRight}>
                    <Pressable
                      style={styles.practiceBtn}
                      dataSet={{ btnPurple: 'true' }}
                      // @ts-ignore
                      className="clay-btn-purple"
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onPracticeQuestion(qb.question || qb.title);
                      }}
                    >
                      <Text style={styles.practiceBtnText}>
                        {isBehavioral ? '🎙️ Practice Voice AI' : '⚡ Launch Sandbox'}
                      </Text>
                    </Pressable>
                    <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.accordionBody}>
                    <View style={styles.bodyGrid}>
                      {/* Left: Expected Concepts */}
                      <View style={styles.conceptBox}>
                        <Text style={styles.boxLabel}>EXPECTED CONCEPTS & FOCUS</Text>
                        <Text style={styles.conceptMainText}>• {qb.question}</Text>
                        <Text style={styles.conceptSubText}>
                          • Evaluation Criteria: Algorithmic efficiency, clear edge case handling, and modular structure.
                        </Text>
                      </View>

                      {/* Right: STAR Tip */}
                      <View style={styles.starTipBox}>
                        <Text style={styles.starLabel}>RECOMMENDED STAR STRATEGY</Text>
                        <Text style={styles.starText}>
                          {qb.sample_approach ||
                            'Framework: Use Situation & Task (problem context), Action (technical implementation trade-offs), Result (calibrated latency & reliability metrics).'}
                        </Text>
                      </View>
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
  card: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
  },
  expandAllBtn: {
    backgroundColor: CLAY_COLORS.paper,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  expandAllBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  filterPillActive: {
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
  filterPillText: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
    fontFamily: CLAY_FONTS.heading,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  accordionList: {
    gap: 12,
  },
  accordionItem: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  accordionItemActive: {
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  qbBadge: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    marginTop: 2,
  },
  qbBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: CLAY_FONTS.heading,
  },
  qbTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  catPill: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  difficultyText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.body,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  practiceBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  practiceBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  chevronText: {
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  accordionBody: {
    padding: 16,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderTopWidth: 1.5,
    borderTopColor: CLAY_COLORS.cardBorder,
  },
  bodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  conceptBox: {
    flex: 1,
    minWidth: 260,
    gap: 6,
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  conceptMainText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 18,
  },
  conceptSubText: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 17,
  },
  starTipBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: CLAY_COLORS.paper,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    gap: 6,
  },
  starLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  starText: {
    fontSize: 12,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 18,
  },
  emptyBox: {
    padding: 24,
    borderRadius: CLAY_RADII.cardSmall,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    textAlign: 'center',
  },
});
