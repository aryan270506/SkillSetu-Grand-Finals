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

export default function PracticeLabSection({
  assignments = [],
  onOpenSandbox,
  onViewAllAssignments,
}) {
  if (!assignments || assignments.length === 0) {
    return null;
  }

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="PRACTICAL WORKFLOWS"
        title="Practice Lab"
        subtitle="Hands-on coding sandboxes graded through automated testing suites and mentor reviews."
        rightElement={
          <ClayButton style={styles.headerBtn} onPress={onViewAllAssignments}>
            <Text style={styles.headerBtnText}>
              View All Assignments ({assignments.length})
            </Text>
          </ClayButton>
        }
      />

      <View style={styles.assignmentsList}>
        {assignments.slice(0, 3).map((assign, idx) => {
          const isCompleted = assign.is_completed;

          return (
            <ClayCard
              key={assign.id || idx}
              style={styles.assignmentCard}
              hoverTranslate={-3}
            >
              {/* Left Number Box */}
              <View style={styles.numBox}>
                <Text style={styles.numText}>{assign.num || `0${idx + 1}`}</Text>
              </View>

              {/* Middle Content */}
              <View style={styles.contentCol}>
                <View style={styles.tagRow}>
                  <ClayBadge
                    label={assign.type || 'WORKFLOW'}
                    variant="primary"
                    size="small"
                  />
                  <ClayBadge
                    label={assign.difficulty || 'Intermediate'}
                    variant="muted"
                    size="small"
                  />
                </View>
                <Text style={styles.assignTitle}>{assign.title}</Text>
                <Text style={styles.assignSubtitle}>{assign.subtitle || assign.description}</Text>
              </View>

              {/* Right Actions */}
              <View style={styles.actionCol}>
                <ClayBadge
                  icon="✨"
                  label={isCompleted ? 'Verified (+50 XP)' : assign.points_badge || '+50 XP'}
                  variant={isCompleted ? 'emerald' : 'amber'}
                  size="small"
                />
                <ClayButton
                  style={[
                    styles.startBtn,
                    isCompleted && styles.startBtnCompleted,
                  ]}
                  onPress={() => onOpenSandbox(assign)}
                >
                  <Text
                    style={[
                      styles.startBtnText,
                      isCompleted && styles.startBtnTextCompleted,
                    ]}
                  >
                    {assign.action_label || (isCompleted ? 'Review Code ➔' : 'Continue Workflow →')}
                  </Text>
                </ClayButton>
              </View>
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
  assignmentsList: {
    gap: 12,
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    gap: 14,
    flexWrap: 'wrap',
  },
  numBox: {
    width: 38,
    height: 38,
    borderRadius: CLAY_RADII.button,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  numText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  contentCol: {
    flex: 1,
    minWidth: 240,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  assignTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 3,
  },
  assignSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
  },
  actionCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  startBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  startBtnCompleted: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  startBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  startBtnTextCompleted: {
    color: CLAY_COLORS.foreground,
  },
});
