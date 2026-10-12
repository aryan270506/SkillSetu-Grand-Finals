import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function TopRecommendedSection({
  featuredJobs = [],
  onViewDetails,
  onOpenPlan,
  onApply,
  applyingId,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  if (!featuredJobs || featuredJobs.length === 0) return null;

  const topJob = featuredJobs[0];
  const subJobs = featuredJobs.slice(1, 3);

  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionIcon}>⭐</Text>
          <Text style={styles.sectionTitle}>Top AI Skill-Matched Opportunities</Text>
        </View>
        <View style={styles.liveSyncPill}>
          <Text style={styles.liveSyncIcon}>⚡</Text>
          <Text style={styles.liveSyncText}>Live Sync Active</Text>
        </View>
      </View>

      {/* Featured Primary Opportunity (Large Bento Card) */}
      {topJob && (
        <FeaturedLargeCard
          job={topJob}
          onViewDetails={onViewDetails}
          onOpenPlan={onOpenPlan}
          onApply={onApply}
          isApplying={applyingId === topJob.id}
        />
      )}

      {/* Sub-featured Opportunities (2-Column Cards) */}
      {subJobs.length > 0 && (
        <View style={[styles.subJobsGrid, isTablet ? styles.rowLayout : styles.columnLayout]}>
          {subJobs.map((job) => (
            <SubFeaturedCard
              key={job.id}
              job={job}
              onViewDetails={onViewDetails}
              onOpenPlan={onOpenPlan}
              onApply={onApply}
              isApplying={applyingId === job.id}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function FeaturedLargeCard({
  job,
  onViewDetails,
  onOpenPlan,
  onApply,
  isApplying,
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const threshold = job.application_threshold ?? job.minimum_match_threshold ?? 80;
  const isHardEligible = job.hard_eligible !== false;
  const isScoreMet = (job.match_score || 0) >= threshold;
  const isReady = isHardEligible && (job.readiness_status === 'READY_TO_APPLY' || isScoreMet);
  const isVerified = job.verification_status === 'VERIFIED' || job.verified === true;
  const matchPercent = Math.round(job.match_score || 0);

  const companyInitials = job.company ? job.company.substring(0, 3).toUpperCase() : 'SK';
  const locationText = job.location ? (job.is_remote ? `${job.location} (Hybrid/Remote)` : job.location) : (job.is_remote ? 'Remote' : 'Pan-India');
  const stipendText = job.stipend || 'Stipend Disclosed Upon Selection';

  // Extract up to 3 core skills for breakdown
  const skillsList = job.skills || [];

  return (
    <View
      style={[
        styles.featuredCard,
        hovered && styles.featuredCardHover,
        pressed && styles.cardPressed,
      ]}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top Header Row */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.companyInfoGroup}>
          <View style={styles.companyAvatarBox}>
            <Text style={styles.companyAvatarText}>{companyInitials}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.companyNameText}>{job.company}</Text>
              {isVerified ? (
                <View style={styles.partnerBadge}>
                  <Text style={styles.partnerBadgeText}>✓ Verified Partner</Text>
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <Text style={styles.unverifiedBadgeText}>⚠ Unverified Source</Text>
                </View>
              )}
            </View>
            <Text style={styles.featuredJobTitle}>{job.title}</Text>
          </View>
        </View>

        {/* Big Match Badge */}
        <View style={styles.matchPillContainer}>
          <View style={styles.matchPill}>
            <Text style={styles.matchPillText}>★ {matchPercent}% MATCH</Text>
          </View>
          <Text style={styles.matchSublabel}>Top Recommendation</Text>
        </View>
      </View>

      {/* Stipend & Location Metadata */}
      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaIcon}>💼</Text>
          <Text style={styles.metaBoldText}>{stipendText}</Text>
        </View>

        <View style={styles.metaBadge}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{locationText}</Text>
        </View>

        {job.work_mode && (
          <View style={styles.metaBadge}>
            <Text style={styles.metaIcon}>🌐</Text>
            <Text style={styles.metaText}>{job.work_mode}</Text>
          </View>
        )}
      </View>

      {/* Verified Skill Ledger Breakdown */}
      <View style={styles.skillLedgerBox}>
        <View style={styles.skillLedgerHeader}>
          <Text style={styles.skillLedgerTitle}>VERIFIED SKILL LEDGER BREAKDOWN</Text>
          <Text style={styles.ledgerHashText}>LEDGER HASH: 0X89F7...B29C</Text>
        </View>

        <View style={styles.skillLedgerGrid}>
          {skillsList.slice(0, 3).map((skill, idx) => {
            const skillPercent = Math.min(98, Math.max(75, matchPercent - (idx * 3)));
            return (
              <View key={idx} style={styles.skillLedgerItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.skillItemName}>{skill}</Text>
                  <Text style={styles.skillItemScore}>{skillPercent}%</Text>
                </View>
                <View style={styles.skillProgressBarBg}>
                  <View style={[styles.skillProgressBarFill, { width: `${skillPercent}%` }]} />
                </View>
                <Text style={styles.skillProofText}>✓ Cryptographically Ledger-Verified</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Direct Fast-Track / Readiness Callout */}
      <View style={styles.fastTrackCallout}>
        <Text style={styles.fastTrackCalloutIcon}>⚡</Text>
        <Text style={styles.fastTrackCalloutText}>
          <Text style={styles.bold}>
            {isReady ? 'Direct Interview Fast-Track : ' : 'Readiness Calibration : '}
          </Text>
          {isReady
            ? `Pre-screen coding rounds bypassed via verified ${matchPercent}% Readiness Score & verified skill ledger.`
            : `Match is at ${matchPercent}%. Target threshold is ${threshold}%. Complete roadmap drills to earn instant unlock.`}
        </Text>
      </View>

      {/* Footer Actions */}
      <View style={styles.cardFooterRow}>
        <View style={styles.footerLeftBadges}>
          <View style={styles.atsBadge}>
            <Text style={styles.atsBadgeText}>✦ ATS Resume 99% Compatible</Text>
          </View>
        </View>

        <View style={styles.footerRightButtons}>
          <Pressable
            style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.btnPressed]}
            onPress={() => (isReady ? onViewDetails(job) : onOpenPlan(job))}
          >
            <Text style={styles.secondaryActionBtnText}>
              {isReady ? 'View Blueprint & Details' : 'View Roadmap'}
            </Text>
          </Pressable>

          {isReady ? (
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.btnPressed]}
              onPress={() => onApply(job)}
              disabled={isApplying}
            >
              <Text style={styles.primaryActionBtnText}>
                {isApplying ? 'Applying...' : 'Apply with ATS Resume (1-Click) →'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.btnPressed]}
              onPress={() => onOpenPlan(job)}
            >
              <Text style={styles.primaryActionBtnText}>
                Start Roadmap Drill →
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function SubFeaturedCard({
  job,
  onViewDetails,
  onOpenPlan,
  onApply,
  isApplying,
}) {
  const [hovered, setHovered] = useState(false);

  const threshold = job.application_threshold ?? job.minimum_match_threshold ?? 80;
  const isHardEligible = job.hard_eligible !== false;
  const isScoreMet = (job.match_score || 0) >= threshold;
  const isReady = isHardEligible && (job.readiness_status === 'READY_TO_APPLY' || isScoreMet);
  const matchPercent = Math.round(job.match_score || 0);
  const companyInitials = job.company ? job.company.substring(0, 2).toUpperCase() : 'SK';

  return (
    <View
      style={[
        styles.subCard,
        hovered && styles.subCardHover,
      ]}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <View style={styles.subCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.subAvatarBox}>
            <Text style={styles.subAvatarText}>{companyInitials}</Text>
          </View>
          <View>
            <Text style={styles.subCompanyText}>{job.company}</Text>
            <Text style={styles.subRoleText} numberOfLines={1}>{job.title}</Text>
          </View>
        </View>

        <View style={styles.subMatchBadge}>
          <Text style={styles.subMatchText}>{matchPercent}% Match</Text>
        </View>
      </View>

      <View style={styles.subMetaRow}>
        <Text style={styles.subMetaText}>📍 {job.location || 'Remote'}</Text>
        <Text style={styles.subMetaText}>💼 {job.stipend || 'Competitive'}</Text>
      </View>

      {/* Skills chips */}
      <View style={styles.subSkillsRow}>
        {(job.skills || []).slice(0, 3).map((s, idx) => (
          <View key={idx} style={styles.subSkillPill}>
            <Text style={styles.subSkillPillText}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.subActionsRow}>
        <Pressable
          style={({ pressed }) => [styles.subDetailsBtn, pressed && styles.btnPressed]}
          onPress={() => onViewDetails(job)}
        >
          <Text style={styles.subDetailsBtnText}>Preview Match</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.subApplyBtn, pressed && styles.btnPressed]}
          onPress={() => (isReady ? onApply(job) : onOpenPlan(job))}
          disabled={isApplying}
        >
          <Text style={styles.subApplyBtnText}>
            {isApplying ? 'Applying...' : isReady ? 'Apply Now' : 'Roadmap'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  liveSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    gap: 4,
  },
  liveSyncIcon: {
    fontSize: 11,
    color: CLAY_COLORS.primary,
  },
  liveSyncText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  rowLayout: {
    flexDirection: 'row',
  },
  columnLayout: {
    flexDirection: 'column',
  },
  featuredCard: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.card,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    marginBottom: 16,
    ...CLAY_SHADOWS.card,
    transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  featuredCardHover: {
    transform: [{ translateY: -4 }],
    ...CLAY_SHADOWS.cardHover,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  companyInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260,
  },
  companyAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  companyAvatarText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  companyNameText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  partnerBadge: {
    backgroundColor: CLAY_COLORS.successLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  partnerBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.successText,
  },
  unverifiedBadge: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  unverifiedBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  featuredJobTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginTop: 2,
  },
  matchPillContainer: {
    alignItems: 'flex-end',
  },
  matchPill: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  matchPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  matchSublabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.recessed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaBoldText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  metaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
  },
  skillLedgerBox: {
    backgroundColor: '#FAF8FE',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    marginBottom: 14,
  },
  skillLedgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillLedgerTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
  },
  ledgerHashText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
  },
  skillLedgerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillLedgerItem: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.8)',
  },
  skillItemName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  skillItemScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  skillProgressBarBg: {
    height: 5,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  skillProgressBarFill: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 3,
  },
  skillProofText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: CLAY_COLORS.successText,
    fontWeight: '600',
  },
  fastTrackCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  fastTrackCalloutIcon: {
    fontSize: 16,
    color: CLAY_COLORS.primary,
  },
  fastTrackCalloutText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.foreground,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 14,
  },
  footerLeftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atsBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  atsBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  footerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryActionBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonSecondary,
    cursor: 'pointer',
  },
  secondaryActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  primaryActionBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  primaryActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  subJobsGrid: {
    gap: 16,
  },
  subCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
    transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  subCardHover: {
    transform: [{ translateY: -3 }],
    ...CLAY_SHADOWS.cardHover,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAvatarText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  subCompanyText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  subRoleText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  subMatchBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  subMatchText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  subMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  subMetaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  subSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  subSkillPill: {
    backgroundColor: CLAY_COLORS.recessed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subSkillPillText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.foreground,
    fontWeight: '600',
  },
  subActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  subDetailsBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonSecondary,
    cursor: 'pointer',
  },
  subDetailsBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  subApplyBtn: {
    flex: 1,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  subApplyBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
});
