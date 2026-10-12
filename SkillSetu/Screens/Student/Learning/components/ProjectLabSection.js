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

export default function ProjectLabSection({
  projects = [],
  displayCareerName,
  onStartProjectTrack,
  onOpenProjectSpecs,
  isDesktop,
}) {
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="REAL WORLD SIMULATIONS"
        title="Project Lab"
        subtitle={`Peer-reviewed production projects built for your live ${displayCareerName} portfolio showcase.`}
      />

      <View
        style={[
          styles.projectsGrid,
          isDesktop ? styles.projectsGridDesktop : styles.projectsGridMobile,
        ]}
      >
        {projects.map((proj, idx) => {
          const isCompleted = proj.status === 'completed';

          return (
            <ClayCard
              key={proj.id || idx}
              style={styles.projectCard}
              hoverTranslate={-4}
            >
              <View>
                {/* Tags */}
                <View style={styles.tagsRow}>
                  {proj.tags?.map((tag, tIdx) => (
                    <ClayBadge
                      key={tIdx}
                      label={tag}
                      variant="primary"
                      size="small"
                    />
                  ))}
                  <ClayBadge
                    icon="✨"
                    label="+200 XP"
                    variant="amber"
                    size="small"
                  />
                </View>

                <Text style={styles.projectTitle}>{proj.title}</Text>
                <Text style={styles.projectDesc}>{proj.desc}</Text>

                {/* Skills covered chips */}
                <View style={styles.skillsRow}>
                  {proj.skills?.map((s, sIdx) => (
                    <View key={sIdx} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <ClayButton
                  style={[
                    styles.primaryActionBtn,
                    isCompleted && styles.primaryActionBtnCompleted,
                  ]}
                  onPress={() => onStartProjectTrack(proj)}
                >
                  <Text
                    style={[
                      styles.primaryActionBtnText,
                      isCompleted && styles.primaryActionBtnTextCompleted,
                    ]}
                  >
                    {proj.btn_label || (isCompleted ? 'Deliverables Verified ✓' : 'Start Project Track →')}
                  </Text>
                </ClayButton>

                <ClayButton
                  style={styles.secondaryActionBtn}
                  onPress={() => onOpenProjectSpecs(proj)}
                >
                  <Text style={styles.secondaryActionBtnText}>View Specs</Text>
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
  projectsGrid: {
    gap: 14,
  },
  projectsGridDesktop: {
    flexDirection: 'row',
  },
  projectsGridMobile: {
    flexDirection: 'column',
  },
  projectCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    justifyContent: 'space-between',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  projectTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 21,
    marginBottom: 6,
  },
  projectDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
    marginBottom: 12,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  skillChip: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  skillChipText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.3,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
  },
  primaryActionBtnCompleted: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  primaryActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryActionBtnTextCompleted: {
    color: CLAY_COLORS.emeraldDark,
  },
  secondaryActionBtn: {
    flex: 0.8,
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  secondaryActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
});
