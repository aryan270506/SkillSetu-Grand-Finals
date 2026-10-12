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
  ClayProgressBar,
  SectionHeader,
} from './DashboardDesignTokens';

export default function SkillIntelligenceSection({
  top8Skills,
  formattedSkills,
  setShowAllSkills,
  setSelectedSkillModal,
  isTablet,
}) {
  const getSkillColor = (score) => {
    if (score >= 60) return CLAY_COLORS.emerald;
    if (score >= 40) return CLAY_COLORS.amber;
    return CLAY_COLORS.danger;
  };

  const renderSkillRow = (skill) => {
    const { name, score } = skill;
    const barColor = getSkillColor(score);

    return (
      <Pressable
        key={name}
        onPress={() => setSelectedSkillModal && setSelectedSkillModal(skill)}
        style={({ hovered }) => [
          styles.skillRowItem,
          hovered && styles.skillRowHovered,
        ]}
      >
        <View style={styles.skillRowHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13 }}>⚡</Text>
            <Text style={styles.skillRowName}>{name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {score >= 70 && (
              <ClayBadge label="VERIFIED" variant="emerald" size="small" />
            )}
            <Text style={[styles.skillRowScore, { color: barColor }]}>{score}%</Text>
          </View>
        </View>

        <ClayProgressBar
          progress={score}
          color={barColor}
          height={6}
          borderRadius={3}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.sectionWrapper} className="dashboard-section-reveal">
      <SectionHeader
        preTitle="VERIFIED CAPABILITIES"
        title="Skill Intelligence"
        subtitle="Technical evidence detected across your analyzed source repositories and verified credentials."
        rightElement={
          <ClayButton
            variant="secondary"
            onPress={() => setShowAllSkills(true)}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>View All Skills ({formattedSkills.length}) →</Text>
          </ClayButton>
        }
      />

      <ClayCard style={styles.containerCard} interactive={false}>
        {top8Skills && top8Skills.length > 0 ? (
          <View style={[styles.skillsTwoCol, !isTablet && styles.skillsOneCol]}>
            <View style={styles.columnHalf}>
              {top8Skills.slice(0, 4).map(s => renderSkillRow(s))}
            </View>
            <View style={styles.columnHalf}>
              {top8Skills.slice(4, 8).map(s => renderSkillRow(s))}
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: CLAY_FONTS.body, color: CLAY_COLORS.muted, fontSize: 13 }}>
              Connect GitHub or add skills in your Profile to populate skill intelligence.
            </Text>
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
  headerBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.button,
  },
  headerBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  containerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    ...CLAY_SHADOWS.card,
  },
  skillsTwoCol: {
    flexDirection: 'row',
    gap: 28,
  },
  skillsOneCol: {
    flexDirection: 'column',
    gap: 12,
  },
  columnHalf: {
    flex: 1,
    gap: 14,
  },
  skillRowItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: CLAY_RADII.cardSmall,
  },
  skillRowHovered: {
    backgroundColor: CLAY_COLORS.recessedLight,
  },
  skillRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skillRowName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  skillRowScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '900',
  },
});
