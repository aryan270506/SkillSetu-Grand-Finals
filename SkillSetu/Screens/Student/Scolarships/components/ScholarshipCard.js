import React, { useRef, useEffect } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayCard,
} from './ScholarshipDesignTokens';

export default function ScholarshipCard({
  scholarship,
  onViewDetails,
  onApply,
  onToggleSave,
  isSaving = false,
  isApplying = false,
}) {
  if (!scholarship) return null;

  const {
    id,
    name = 'Scholarship Opportunity',
    provider = 'Government / Institutional Body',
    description,
    award_amount,
    award_description,
    application_deadline,
    days_remaining,
    eligibility_status,
    match_percentage,
    checkpoints = [],
    is_saved = false,
    has_applied = false,
    source,
    academic_year,
  } = scholarship;

  // Real award text formatting
  const awardText =
    award_description ||
    (award_amount ? `₹${Number(award_amount).toLocaleString('en-IN')}` : 'Grant Scheme');

  // Real deadline formatting
  const deadlineText = application_deadline
    ? new Date(application_deadline).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Open Intake';

  // Real eligibility pill
  let eligPillVariant = 'muted';
  let eligPillText = 'Profile Review';
  let eligPillIcon = 'ℹ';

  if (eligibility_status === 'ELIGIBLE') {
    eligPillVariant = 'emerald';
    eligPillText = match_percentage ? `✓ Eligible (${Math.round(match_percentage)}% Match)` : '✓ 100% Eligible';
    eligPillIcon = '✓';
  } else if (eligibility_status === 'POSSIBLY_ELIGIBLE') {
    eligPillVariant = 'amber';
    eligPillText = '⚡ Pre-Qualified';
    eligPillIcon = '⚡';
  } else if (eligibility_status === 'NOT_ELIGIBLE') {
    eligPillVariant = 'crimson';
    eligPillText = 'Not Eligible';
    eligPillIcon = '✕';
  } else if (eligibility_status === 'INSUFFICIENT_DATA') {
    eligPillVariant = 'sky';
    eligPillText = 'Verify Profile Data';
    eligPillIcon = '📋';
  }

  // Days left urgency badge
  let daysVariant = 'emerald';
  let daysLabel = `${days_remaining}d left`;
  if (days_remaining != null) {
    if (days_remaining <= 7) {
      daysVariant = 'crimson';
      daysLabel = `🔴 ${days_remaining}d left`;
    } else if (days_remaining <= 30) {
      daysVariant = 'amber';
      daysLabel = `⏱ ${days_remaining}d left`;
    }
  } else {
    daysLabel = 'Active';
  }

  // Animated Save Button Bounce
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(bookmarkScale, {
        toValue: 0.85,
        duration: 90,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1.25,
        friction: 3,
        tension: 100,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1.0,
        friction: 4,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [is_saved, bookmarkScale]);

  return (
    <Pressable
      onPress={() => onViewDetails(scholarship)}
      style={({ hovered, pressed }) => [
        styles.interactiveCardWrapper,
        {
          transform: [
            { translateY: hovered ? -6 : 0 },
            { scale: pressed ? 0.985 : hovered ? 1.012 : 1 },
          ],
          borderColor: hovered ? 'rgba(124, 58, 237, 0.28)' : CLAY_COLORS.borderLight,
        },
        hovered && CLAY_SHADOWS.cardHover,
      ]}
    >
      <ClayCard style={styles.cardContainer}>
        {/* Header: Provider & Bookmark */}
        <View style={styles.cardHeader}>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName} numberOfLines={1}>
              {provider} {academic_year ? `• ${academic_year}` : ''}
            </Text>
            <Text style={styles.schemeTitle} numberOfLines={2}>
              {name}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.bookmarkBtn,
                is_saved && styles.bookmarkBtnActive,
                {
                  transform: [
                    { scale: pressed ? 0.90 : hovered ? 1.12 : 1 },
                  ],
                },
              ]}
              onPress={(e) => {
                e?.stopPropagation?.();
                onToggleSave(scholarship);
              }}
              disabled={isSaving}
            >
              <Text style={[styles.bookmarkIcon, is_saved && styles.bookmarkIconActive]}>
                {is_saved ? '★' : '☆'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <ClayBadge
            text={eligPillText}
            icon={eligPillIcon}
            variant={eligPillVariant}
            size="sm"
          />
          <ClayBadge
            text={daysLabel}
            variant={daysVariant}
            size="sm"
          />
          {source ? (
            <ClayBadge
              text={source.toUpperCase()}
              variant="muted"
              size="sm"
            />
          ) : null}
        </View>

        {/* Description */}
        <Text style={styles.descriptionText} numberOfLines={3}>
          {description || 'Official government or corporate institutional scholarship program with merit & need-based funding.'}
        </Text>

        {/* Checkpoints summary */}
        {checkpoints && checkpoints.length > 0 ? (
          <View style={styles.checkpointsSummary}>
            {checkpoints.slice(0, 2).map((cp, idx) => (
              <View key={idx} style={styles.checkpointItem}>
                <Text
                  style={[
                    styles.checkpointDot,
                    { color: cp.passed ? CLAY_COLORS.emeraldText : CLAY_COLORS.amberText },
                  ]}
                >
                  {cp.passed ? '✓' : '•'}
                </Text>
                <Text style={styles.checkpointText} numberOfLines={1}>
                  {cp.criterion}: {cp.reason || cp.required}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Financial & Deadline Meta Grid */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>ANNUAL GRANT</Text>
            <Text style={styles.metaValueHighlight} numberOfLines={1}>
              {awardText}
            </Text>
          </View>

          <View style={styles.metaBlockRight}>
            <Text style={styles.metaLabel}>DEADLINE</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {deadlineText}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.btnApply,
              {
                transform: [
                  { translateY: hovered ? -2 : 0 },
                  { scale: pressed ? 0.96 : hovered ? 1.025 : 1 },
                ],
                shadowColor: hovered ? CLAY_COLORS.primary : 'transparent',
                shadowOpacity: hovered ? 0.28 : 0,
                shadowRadius: 10,
              },
            ]}
            onPress={(e) => {
              e?.stopPropagation?.();
              onApply(scholarship);
            }}
            disabled={isApplying}
          >
            <Text style={styles.btnApplyText}>
              {has_applied ? 'Tracked ✓ Launch Again ↗' : 'Apply on Portal ↗'}
            </Text>
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
              onViewDetails(scholarship);
            }}
          >
            <Text style={styles.btnDetailsText}>Details</Text>
          </Pressable>
        </View>
      </ClayCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  interactiveCardWrapper: {
    borderRadius: CLAY_RADII.lg,
    transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease, border-color 0.24s ease',
    marginBottom: 16,
  },
  cardContainer: {
    padding: 20,
    borderRadius: CLAY_RADII.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  schemeTitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 16.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 22,
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: CLAY_RADII.full,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  bookmarkBtnActive: {
    backgroundColor: CLAY_COLORS.secondaryBg,
    borderColor: 'rgba(219, 39, 119, 0.3)',
  },
  bookmarkIcon: {
    fontSize: 18,
    color: CLAY_COLORS.muted,
  },
  bookmarkIconActive: {
    color: CLAY_COLORS.secondary,
    fontWeight: '900',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  descriptionText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '400',
    color: CLAY_COLORS.muted,
    lineHeight: 19,
    marginBottom: 14,
    minHeight: 38,
  },
  checkpointsSummary: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderRadius: CLAY_RADII.sm,
    padding: 10,
    marginBottom: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkpointDot: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkpointText: {
    flex: 1,
    fontFamily: CLAY_FONTS.family,
    fontSize: 11.5,
    fontWeight: '600',
    color: CLAY_COLORS.foreground,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
  },
  metaBlock: {
    flex: 1,
  },
  metaBlockRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValueHighlight: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 14.5,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  metaValue: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnApply: {
    flex: 1,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
  },
  btnApplyText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDetails: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderMedium,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: CLAY_RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  btnDetailsText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
});
