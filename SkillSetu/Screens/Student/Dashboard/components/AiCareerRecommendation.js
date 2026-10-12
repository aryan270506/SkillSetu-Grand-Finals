import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
} from './DashboardDesignTokens';

export default function AiCareerRecommendation({
  computedGapData,
  onNavigate,
}) {
  const pills = computedGapData.recommended_pills || [];

  return (
    <ClayCard
      style={styles.aiCard}
      hoverTranslate={-4}
      hoverScale={1.01}
      interactive={true}
      className="dashboard-section-reveal"
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 18 }}>✨</Text>
          </View>
          <View>
            <Text style={styles.preHeading}>AI CAREER INSIGHT</Text>
            <Text style={styles.mainTitle}>AI Career Recommendation</Text>
          </View>
        </View>

        <ClayButton
          variant="secondary"
          onPress={() => onNavigate && onNavigate('Learning')}
          style={styles.headerCta}
        >
          <Text style={styles.headerCtaText}>Personalized Learning Path →</Text>
        </ClayButton>
      </View>

      <Text style={styles.aiText}>
        {computedGapData.is_multi_career ? (
          <>Based on your selected career goals, strengthening your competency in </>
        ) : (
          <>Based on your target role of <Text style={styles.boldText}>{computedGapData.target_career}</Text>, improving </>
        )}
        {
          (() => {
            if (pills.length >= 3) {
              return (
                <>
                  <Text style={styles.boldText}>{pills[0]}</Text>, <Text style={styles.boldText}>{pills[1]}</Text> and <Text style={styles.boldText}>{pills[2]}</Text>
                </>
              );
            } else if (pills.length === 2) {
              return (
                <>
                  <Text style={styles.boldText}>{pills[0]}</Text> and <Text style={styles.boldText}>{pills[1]}</Text>
                </>
              );
            } else if (pills.length === 1) {
              return <Text style={styles.boldText}>{pills[0]}</Text>;
            }
            return <Text style={styles.boldText}>key target skills</Text>;
          })()
        }
        {computedGapData.is_multi_career ? (
          <> will significantly accelerate your match rate for verified opportunities across your target domain.</>
        ) : (
          <> will significantly increase your match rate for verified internship and career opportunities.</>
        )}
      </Text>

      {/* Recommended Skill Chips */}
      {pills.length > 0 && (
        <View style={styles.chipsContainer}>
          <Text style={styles.chipsLabel}>PRIORITY FOCUS SKILLS:</Text>
          <View style={styles.chipsRow}>
            {pills.map((pillName, idx) => (
              <ClayBadge
                key={pillName + '_' + idx}
                label={pillName}
                icon="⚡"
                variant={idx === 0 ? 'primary' : idx === 1 ? 'pink' : 'sky'}
                size="medium"
              />
            ))}
          </View>
        </View>
      )}
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  aiCard: {
    backgroundColor: '#FAF7FD',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    padding: 22,
    marginBottom: 28,
    ...CLAY_SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CLAY_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonSecondary,
  },
  preHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 1,
  },
  mainTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  headerCta: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.button,
  },
  headerCtaText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  aiText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    color: CLAY_COLORS.foreground,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  chipsContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipsLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
