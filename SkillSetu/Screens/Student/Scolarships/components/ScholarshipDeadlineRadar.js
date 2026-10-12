import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayCard,
} from './ScholarshipDesignTokens';

export default function ScholarshipDeadlineRadar({
  radarItems = [],
  onViewDetails,
  onApply,
  onToggleSave,
  savingId,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (!radarItems || radarItems.length === 0) {
    return null;
  }

  // Display top 3 most urgent schemes
  const urgentSchemes = radarItems.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerIcon}>⏰</Text>
          <View>
            <Text style={styles.headerHeading}>Deadline Radar & Critical Milestones</Text>
            <Text style={styles.headerSub}>
              {urgentSchemes.length} verified grant(s) require action before portal closing
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.grid, isMobile && styles.gridMobile]}>
        {urgentSchemes.map((sch) => {
          const daysLeft = sch.days_remaining != null ? sch.days_remaining : null;
          let urgencyVariant = 'emerald';
          let urgencyLabel = `${daysLeft} Days Left`;
          let borderColor = 'rgba(16, 185, 129, 0.3)';

          if (daysLeft != null) {
            if (daysLeft <= 7) {
              urgencyVariant = 'crimson';
              urgencyLabel = `Critical: ${daysLeft} Day${daysLeft === 1 ? '' : 's'} Left`;
              borderColor = 'rgba(239, 68, 68, 0.35)';
            } else if (daysLeft <= 30) {
              urgencyVariant = 'amber';
              urgencyLabel = `Upcoming: ${daysLeft} Days Left`;
              borderColor = 'rgba(245, 158, 11, 0.35)';
            }
          } else {
            urgencyLabel = 'Intake Active';
          }

          const deadlineFormatted = sch.application_deadline
            ? new Date(sch.application_deadline).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Open Rolling';

          const awardText = sch.award_description || (sch.award_amount ? `₹${Number(sch.award_amount).toLocaleString('en-IN')}` : 'Financial Grant');

          return (
            <Pressable
              key={sch.id || sch.name}
              onPress={() => onViewDetails(sch)}
              style={({ hovered, pressed }) => [
                styles.radarPressableWrapper,
                {
                  transform: [
                    { translateY: hovered ? -5 : 0 },
                    { scale: pressed ? 0.985 : hovered ? 1.015 : 1 },
                  ],
                },
                isMobile && styles.radarPressableWrapperMobile,
              ]}
            >
              <ClayCard
                style={[
                  styles.radarCard,
                  { borderColor },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <ClayBadge
                    text={urgencyLabel}
                    variant={urgencyVariant}
                    size="sm"
                  />
                  <Text style={styles.deadlineDateText}>{deadlineFormatted}</Text>
                </View>

                <Text style={styles.providerMeta} numberOfLines={1}>
                  {sch.provider || 'Official Authority'}
                </Text>
                <Text style={styles.schemeTitle} numberOfLines={2}>
                  {sch.name}
                </Text>

                <View style={styles.infoPillsRow}>
                  <View style={styles.infoPill}>
                    <Text style={styles.infoPillLabel}>Grant: </Text>
                    <Text style={styles.infoPillValue} numberOfLines={1}>
                      {awardText}
                    </Text>
                  </View>
                </View>

                <Text style={styles.schemeDesc} numberOfLines={2}>
                  {sch.description || 'Verified state & corporate grant scheme.'}
                </Text>

                <View style={styles.actionRow}>
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.btnApply,
                      {
                        transform: [
                          { translateY: hovered ? -2 : 0 },
                          { scale: pressed ? 0.96 : hovered ? 1.025 : 1 },
                        ],
                      },
                    ]}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onApply(sch);
                    }}
                  >
                    <Text style={styles.btnApplyText}>Launch Portal ↗</Text>
                  </Pressable>

                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.btnDetails,
                      {
                        transform: [
                          { translateY: hovered ? -2 : 0 },
                          { scale: pressed ? 0.96 : hovered ? 1.025 : 1 },
                        ],
                      },
                    ]}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onViewDetails(sch);
                    }}
                  >
                    <Text style={styles.btnDetailsText}>Details</Text>
                  </Pressable>

                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.btnBookmark,
                      {
                        transform: [{ scale: pressed ? 0.90 : hovered ? 1.12 : 1 }],
                      },
                    ]}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onToggleSave(sch);
                    }}
                  >
                    <Text style={styles.btnBookmarkIcon}>
                      {sch.is_saved ? '★' : '☆'}
                    </Text>
                  </Pressable>
                </View>
              </ClayCard>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerHeading: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 18,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '500',
    color: CLAY_COLORS.muted,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  radarPressableWrapper: {
    flex: 1,
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  },
  radarPressableWrapperMobile: {
    width: '100%',
  },
  radarCard: {
    padding: 18,
    borderRadius: CLAY_RADII.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    height: '100%',
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deadlineDateText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  providerMeta: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schemeTitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 22,
    marginBottom: 10,
    minHeight: 44,
  },
  infoPillsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.sm,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
  },
  infoPillLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 11.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  infoPillValue: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  schemeDesc: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
    marginBottom: 16,
    minHeight: 36,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnApply: {
    flex: 1,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.md,
    alignItems: 'center',
    transition: 'transform 0.18s ease',
  },
  btnApplyText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDetails: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderMedium,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.md,
    alignItems: 'center',
    transition: 'transform 0.18s ease',
  },
  btnDetailsText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  btnBookmark: {
    width: 34,
    height: 34,
    borderRadius: CLAY_RADII.md,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderLight,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.18s ease',
  },
  btnBookmarkIcon: {
    fontSize: 16,
    color: CLAY_COLORS.secondary,
    fontWeight: '700',
  },
});
