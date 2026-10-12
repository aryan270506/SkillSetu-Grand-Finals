import React from 'react';
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

export default function AssessmentCenterSection({
  diagnosticTests = [],
  onStartAssessment,
  onBrowseAllAssessments,
  isDesktop,
}) {
  if (!diagnosticTests || diagnosticTests.length === 0) {
    return null;
  }

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="CERTIFIED BENCHMARKS"
        title="Assessment Center"
        subtitle="Simulate technical interview screening platforms with real benchmark metrics."
        rightElement={
          <ClayButton style={styles.headerBtn} onPress={onBrowseAllAssessments}>
            <Text style={styles.headerBtnText}>
              Browse All Assessment Options
            </Text>
          </ClayButton>
        }
      />

      <View
        style={[
          styles.testsGrid,
          isDesktop ? styles.testsGridDesktop : styles.testsGridMobile,
        ]}
      >
        {diagnosticTests.map((test, idx) => {
          const isNext = test.is_next;
          const isCompleted = test.is_completed;
          const isLocked = test.is_locked;

          const stateBadge = isCompleted
            ? { label: 'Verified ✓', variant: 'emerald' }
            : isNext
              ? { label: 'Next Up 🔥', variant: 'secondary' }
              : isLocked
                ? { label: 'Locked 🔒', variant: 'muted' }
                : { label: 'Available', variant: 'primary' };

          return (
            <ClayCard
              key={test.id || idx}
              style={[
                styles.testCard,
                isNext && styles.testCardActive,
              ]}
              hoverTranslate={-4}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.testTypeTag}>
                  {test.type || 'CERTIFIED BENCHMARK'}
                </Text>
                <ClayBadge
                  label={stateBadge.label}
                  variant={stateBadge.variant}
                  size="small"
                />
              </View>

              <Text style={styles.testTitle}>{test.title}</Text>
              <Text style={styles.testMetaText}>{test.meta}</Text>

              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Benchmark Status:</Text>
                <Text
                  style={[
                    styles.statusVal,
                    isCompleted && { color: CLAY_COLORS.emeraldDark },
                  ]}
                >
                  {test.status_badge || (isCompleted ? 'Passed & Verified' : 'Ready to Take')}
                </Text>
              </View>

              {/* Action Button */}
              <ClayButton
                style={[
                  styles.actionBtn,
                  isNext && styles.actionBtnPrimary,
                  isLocked && styles.actionBtnLocked,
                  isCompleted && styles.actionBtnCompleted,
                ]}
                onPress={() => onStartAssessment(test)}
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    isNext && styles.actionBtnTextPrimary,
                    isLocked && styles.actionBtnTextLocked,
                    isCompleted && styles.actionBtnTextCompleted,
                  ]}
                >
                  {test.action || (isCompleted ? 'View Results ➔' : isLocked ? 'Unlock Test 🔒' : 'Begin Test →')}
                </Text>
              </ClayButton>
            </ClayCard>
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
  headerBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  headerBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  testsGrid: {
    gap: 14,
  },
  testsGridDesktop: {
    flexDirection: 'row',
  },
  testsGridMobile: {
    flexDirection: 'column',
  },
  testCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    justifyContent: 'space-between',
  },
  testCardActive: {
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: '#FAF8FC',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testTypeTag: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  testTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 20,
    marginBottom: 4,
  },
  testMetaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginBottom: 10,
  },
  statusBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 8,
    borderRadius: CLAY_RADII.cardSmall,
    marginBottom: 14,
  },
  statusLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9,
    color: CLAY_COLORS.muted,
  },
  statusVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  actionBtnPrimary: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  actionBtnLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: CLAY_COLORS.cardBorder,
  },
  actionBtnCompleted: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  actionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
  },
  actionBtnTextLocked: {
    color: CLAY_COLORS.mutedLight,
  },
  actionBtnTextCompleted: {
    color: CLAY_COLORS.emeraldDark,
  },
});
