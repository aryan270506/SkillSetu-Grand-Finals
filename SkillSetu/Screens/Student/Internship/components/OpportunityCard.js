import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, cleanJobDescription } from './DesignTokens';

export default function OpportunityCard({
  job,
  cardWidth = '100%',
  onViewDetails,
  onOpenPlan,
  onApply,
  onToggleSave,
  isSaving = false,
  isApplying = false,
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const threshold = job.application_threshold ?? job.minimum_match_threshold ?? 80;
  const isHardEligible = job.hard_eligible !== false;
  const isScoreMet = (job.match_score || 0) >= threshold;
  const isReady = isHardEligible && (job.readiness_status === 'READY_TO_APPLY' || isScoreMet);
  const isVerified = (
    String(job?.verification_status || '').toUpperCase() === 'VERIFIED' ||
    job?.verified === true ||
    job?.is_verified === true ||
    job?.source === 'recruiter_posting' ||
    job?.source_type === 'recruiter_verified' ||
    (job?.company_id != null && job?.company_id !== undefined && job?.company_id !== '')
  );
  const matchPercent = Math.round(job.match_score || 0);

  const companyInitials = job.company ? job.company.substring(0, 2).toUpperCase() : 'SK';
  const locationText = job.location ? (job.is_remote ? `${job.location} · Remote` : job.location) : (job.is_remote ? 'Remote' : 'Pan-India');
  const sourceText = isVerified ? 'SkillSetu Partner' : (job.source ? job.source.toUpperCase() : 'Aggregator Feed');
  const stipendText = job.stipend || 'Competitive';

  return (
    <View
      style={[
        styles.cardContainer,
        { width: cardWidth },
        hovered && styles.cardHover,
        pressed && styles.cardPressed,
      ]}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 1. Header: Company Avatar, Star Bookmark & Distinct Badges */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftGroup}>
          <View style={[
            styles.avatarSquare,
            isReady ? styles.avatarReady : styles.avatarDev,
          ]}>
            <Text style={[
              styles.avatarText,
              isReady ? { color: CLAY_COLORS.primary } : { color: CLAY_COLORS.warningText },
            ]}>
              {companyInitials}
            </Text>
          </View>

          <Pressable
            style={styles.starBtn}
            onPress={() => onToggleSave && onToggleSave(job)}
            disabled={isSaving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[
              styles.starIcon,
              job.is_saved ? styles.starSaved : styles.starUnsaved,
            ]}>
              {job.is_saved ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        {/* Right Badges */}
        <View style={styles.headerBadgesWrap}>
          {/* Readiness Badge */}
          <View style={[
            styles.readinessBadge,
            isReady ? styles.readinessBadgeGreen : styles.readinessBadgeAmber,
          ]}>
            <Text style={[
              styles.readinessBadgeText,
              isReady ? { color: CLAY_COLORS.successText } : { color: CLAY_COLORS.warningText },
            ]}>
              {!isHardEligible ? '❌ Not Eligible' : isReady ? `✓ ${matchPercent}% Ready` : `⚡ ${matchPercent}% (Min: ${threshold}%)`}
            </Text>
          </View>

          {/* Verification Badge */}
          <View style={[
            styles.provenanceBadge,
            isVerified ? styles.provenanceVerified : styles.provenanceUnverified,
          ]}>
            <Text style={[
              styles.provenanceBadgeText,
              isVerified ? { color: '#047857' } : { color: '#B45309' },
            ]}>
              {isVerified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Job Title & Company */}
      <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
      <Text style={styles.jobCompany} numberOfLines={1}>{job.company}</Text>

      {/* 3. Location & Secondary Provenance */}
      <View style={styles.metaRow}>
        <Text style={styles.locationText} numberOfLines={1}>
          📍 {locationText}
        </Text>
        <Text style={styles.sourceText} numberOfLines={1}>
          Source: <Text style={{ fontWeight: '700' }}>{sourceText}</Text>
        </Text>
      </View>

      {/* 4. Needs Development Gaps Banner if below threshold */}
      {!isReady && (job.missing_skills || []).length > 0 && (
        <View style={styles.gapBanner}>
          <Text style={styles.gapTitle}>Target: {threshold}% • Gaps to Close:</Text>
          <Text style={styles.gapSkills} numberOfLines={1}>
            {job.missing_skills.slice(0, 3).join(', ')}
          </Text>
        </View>
      )}

      {/* 5. Short Description */}
      <Text style={styles.descriptionText} numberOfLines={2}>
        {cleanJobDescription(job.description)}
      </Text>

      {/* 6. Skills Tags */}
      <View style={styles.skillsRow}>
        {(job.skills || []).slice(0, 3).map((s, idx) => (
          <View key={idx} style={styles.skillTag}>
            <Text style={styles.skillTagText}>{s}</Text>
          </View>
        ))}
        {(job.skills || []).length > 3 && (
          <View style={[styles.skillTag, styles.skillTagMore]}>
            <Text style={styles.skillTagMoreText}>
              +{(job.skills || []).length - 3}
            </Text>
          </View>
        )}
      </View>

      {/* 6.5. Flex Spacer to pin footer at consistent card height */}
      <View style={{ flex: 1, minHeight: 12 }} />

      {/* 7. Footer: Stipend + Action Buttons */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Text style={styles.stipendText} numberOfLines={1}>{stipendText}</Text>
          {job.application_deadline && (
            <Text style={styles.deadlineText} numberOfLines={1}>
              Deadline: {new Date(job.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>

        <View style={styles.footerRight}>
          <Pressable
            style={({ pressed }) => [styles.btnDetails, pressed && styles.btnPressed]}
            onPress={() => onViewDetails(job)}
          >
            <Text style={styles.btnDetailsText}>Details</Text>
          </Pressable>

          {!isReady ? (
            <Pressable
              style={({ pressed }) => [styles.btnRoadmap, pressed && styles.btnPressed]}
              onPress={() => onOpenPlan(job)}
            >
              <Text style={styles.btnRoadmapText}>Roadmap</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.btnApply, pressed && styles.btnPressed]}
              onPress={() => onApply(job)}
              disabled={isApplying}
            >
              <Text style={styles.btnApplyText}>
                {isApplying ? '...' : 'Apply'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    minWidth: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    ...CLAY_SHADOWS.card,
    transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  cardHover: {
    transform: [{ translateY: -4 }],
    ...CLAY_SHADOWS.cardHover,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSquare: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarReady: {
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  avatarDev: {
    backgroundColor: CLAY_COLORS.warningLight,
  },
  avatarText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
  },
  starBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  starSaved: {
    color: '#EAB308',
  },
  starUnsaved: {
    color: '#CBD5E1',
  },
  headerBadgesWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  readinessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
  },
  readinessBadgeGreen: {
    backgroundColor: CLAY_COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  readinessBadgeAmber: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  readinessBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
  },
  provenanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
  },
  provenanceVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  provenanceUnverified: {
    backgroundColor: '#FFFBEB',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  provenanceBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  jobTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 20,
    marginBottom: 2,
  },
  jobCompany: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    marginBottom: 6,
  },
  metaRow: {
    marginBottom: 8,
  },
  locationText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  sourceText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    marginTop: 2,
  },
  gapBanner: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  gapTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  gapSkills: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    fontWeight: '600',
    color: CLAY_COLORS.foreground,
  },
  descriptionText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
    marginBottom: 10,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: CLAY_COLORS.recessed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillTagText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    fontWeight: '600',
    color: CLAY_COLORS.foreground,
  },
  skillTagMore: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  skillTagMoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 10,
    marginTop: 'auto',
  },
  footerLeft: {
    flex: 1,
    marginRight: 6,
  },
  stipendText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  deadlineText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  footerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  btnDetails: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonSecondary,
    cursor: 'pointer',
  },
  btnDetailsText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  btnRoadmap: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.pill,
    cursor: 'pointer',
  },
  btnRoadmapText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  btnApply: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  btnApplyText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
});
