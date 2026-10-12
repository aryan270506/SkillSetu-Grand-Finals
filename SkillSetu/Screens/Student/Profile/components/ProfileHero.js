import React from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';
import { formatCareerTitle } from '../../services/profileService';

export default function ProfileHero({
  user = {},
  profileData = {},
  onEditProfile,
  onShareProfile,
  onDownloadReport,
  isDownloading = false,
}) {
  const pInfo = profileData?.personalInfo || {};
  const edu = profileData?.education || {};
  const eduItem = (edu?.list && edu.list[0]) || {};
  const cGoals = profileData?.careerGoals || {};
  const gLinks = profileData?.githubLinks || {};
  const rawData = profileData?.resumeAnalysis?.extractedData || {};
  const linksData = rawData.links || {};

  // Real data binding
  const fullName = pInfo.fullName || user?.name || 'Aryan Bhoge';
  const profileImg = pInfo.profileImage || user?.profile_image || '';
  const headline = pInfo.headline || formatCareerTitle(cGoals.targetCareer) || user?.headline || 'Full Stack Developer';
  const degree = eduItem.degree || user?.degree || 'B.Tech Computer Science';
  const university = eduItem.university || user?.university || 'Sanjay Ghodawat University';
  const cgpa = eduItem.cgpa || user?.cgpa_or_percentage || '7.05 / 10.0';
  const batch = (user?.start_year && user?.graduation_year) 
    ? `${user.start_year} – ${user.graduation_year}` 
    : (user?.graduation_year ? `Batch: ${user.graduation_year}` : '2021 – 2025');
  const rollNo = user?.roll_number || user?.id ? `Roll: SS-${String(user?.id || '281042').slice(-6)}` : 'Roll: SS-281042';
  
  const githubUser = gLinks.githubUsername || user?.github_user_id || linksData.github || 'aryan270506';
  const linkedinUrl = gLinks.linkedinUrl || user?.linkedin_url || linksData.linkedin || 'https://linkedin.com/in/aryan-bhoge';
  const email = pInfo.email || user?.email || 'abhoge27@gmail.com';
  
  const bio = pInfo.bio || user?.bio || 'Passionate Distributed Systems & Cloud-Native Engineer. Solved 450+ LeetCode problems, building high-throughput async services with zero downtime and sub-5ms p99 latency guarantees.';

  // Calculate real Dossier Strength
  let strengthScore = 50;
  if (profileImg) strengthScore += 10;
  if (degree && university) strengthScore += 10;
  if (gLinks.githubConnected || githubUser) strengthScore += 10;
  if (profileData?.resumeAnalysis?.score) strengthScore += 10;
  if (pInfo.bio) strengthScore += 8;
  strengthScore = Math.min(100, strengthScore);

  const openLink = (url) => {
    if (!url) return;
    const dest = url.startsWith('http') ? url : `https://${url}`;
    if (Platform.OS === 'web') {
      window.open(dest, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(dest).catch(() => {});
    }
  };

  const openEmail = () => {
    if (Platform.OS === 'web') {
      window.location.href = `mailto:${email}`;
    } else {
      Linking.openURL(`mailto:${email}`).catch(() => {});
    }
  };

  return (
    <View style={[styles.heroCard, Platform.OS === 'web' && { className: 'clay-hero-animated clay-hover-lift' }]}>
      {/* Upper Tier: Avatar + Main Info + Actions */}
      <View style={styles.topRow}>
        {/* Left: Avatar Column */}
        <View style={[styles.avatarWrapper, Platform.OS === 'web' && { className: 'clay-hero-avatar' }]}>
          <View style={styles.avatarBorderGlow}>
            {profileImg ? (
              <Image source={{ uri: profileImg }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{(fullName[0] || 'A').toUpperCase()}</Text>
              </View>
            )}
            {/* Status Floating Pill */}
            <View style={styles.verifiedFloatingBadge}>
              <Text style={styles.verifiedFloatingIcon}>🛡️</Text>
            </View>
          </View>
        </View>

        {/* Center: Identity & Meta Details */}
        <View style={[styles.identityBlock, Platform.OS === 'web' && { className: 'clay-hero-info' }]}>
          <View style={styles.nameRow}>
            <Text style={styles.studentName}>{fullName}</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusPillDot} />
              <Text style={styles.statusPillText}>Actively Interviewing</Text>
            </View>
          </View>

          <View style={styles.degreeRow}>
            <Text style={styles.degreeText}>{degree}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.universityText}>🏛️ {university}</Text>
          </View>

          {/* Academic Pills & Dossier Strength */}
          <View style={styles.metaBadgesRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeLabel}>{rollNo}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeLabel}>CGPA: <Text style={styles.metaBadgeHighlight}>{cgpa}</Text></Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeLabel}>Batch: {batch}</Text>
            </View>
            <View style={styles.dossierStrengthBadge}>
              <Text style={styles.dossierStrengthText}>⚡ {strengthScore}% Dossier Strength</Text>
            </View>
          </View>

          {/* Social & Direct Contact Links */}
          <View style={styles.socialPillsRow}>
            {githubUser ? (
              <Pressable
                style={[styles.socialChip, Platform.OS === 'web' && { className: 'clay-chip-interactive' }]}
                onPress={() => openLink(`https://github.com/${githubUser.replace('@', '')}`)}
              >
                <Text style={styles.socialChipIcon}>🐙</Text>
                <Text style={styles.socialChipText}>@{githubUser.replace('@', '')}</Text>
              </Pressable>
            ) : null}

            {linkedinUrl ? (
              <Pressable
                style={[styles.socialChip, Platform.OS === 'web' && { className: 'clay-chip-interactive' }]}
                onPress={() => openLink(linkedinUrl)}
              >
                <Text style={styles.socialChipIcon}>💼</Text>
                <Text style={styles.socialChipText}>
                  {linkedinUrl.includes('linkedin.com/in/')
                    ? `in/${linkedinUrl.split('linkedin.com/in/')[1]?.replace(/\/$/, '')}`
                    : 'in/aryan-bhoge'}
                </Text>
              </Pressable>
            ) : null}

            {email ? (
              <Pressable
                style={[styles.socialChip, Platform.OS === 'web' && { className: 'clay-chip-interactive' }]}
                onPress={openEmail}
              >
                <Text style={styles.socialChipIcon}>✉️</Text>
                <Text style={styles.socialChipText}>{email}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Right: Quick Action Buttons */}
        <View style={[styles.heroActionsCol, Platform.OS === 'web' && { className: 'clay-hero-actions' }]}>
          <Pressable
            style={[styles.heroBtnSecondary, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
            onPress={onEditProfile}
          >
            <Text style={styles.heroBtnSecondaryIcon}>✏️</Text>
            <Text style={styles.heroBtnSecondaryText}>Edit Profile</Text>
          </Pressable>

          <Pressable
            style={[styles.heroBtnSecondary, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
            onPress={onShareProfile}
          >
            <Text style={styles.heroBtnSecondaryIcon}>🔗</Text>
            <Text style={styles.heroBtnSecondaryText}>Share Profile</Text>
          </Pressable>

          <Pressable
            style={[styles.heroBtnPrimary, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
            onPress={onDownloadReport}
            disabled={isDownloading}
          >
            <Text style={styles.heroBtnPrimaryIcon}>{isDownloading ? '⏳' : '📥'}</Text>
            <Text style={styles.heroBtnPrimaryText}>{isDownloading ? 'Generating...' : 'Download Report'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Lower Tier: Bio Quote Box */}
      {bio ? (
        <View style={styles.bioQuoteBox}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.bioQuoteText}>{bio}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.hero,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 28,
    marginBottom: 26,
    ...CLAY_SHADOWS.card,
    position: 'relative',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 22,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorderGlow: {
    width: 92,
    height: 92,
    borderRadius: 28,
    padding: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 34,
    fontWeight: '900',
    color: CLAY_COLORS.primaryDark,
  },
  verifiedFloatingBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.full,
    padding: 3,
    ...CLAY_SHADOWS.badge,
  },
  verifiedFloatingIcon: {
    fontSize: 14,
  },
  identityBlock: {
    flex: 1,
    minWidth: 280,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  studentName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 26,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  statusPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CLAY_COLORS.primary,
  },
  statusPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  degreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  degreeText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
    color: CLAY_COLORS.mutedLight,
  },
  universityText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaBadge: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderColor: CLAY_COLORS.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  metaBadgeLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  metaBadgeHighlight: {
    color: CLAY_COLORS.primaryDark,
    fontWeight: '900',
  },
  dossierStrengthBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  dossierStrengthText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.successDark,
  },
  socialPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.badge,
  },
  socialChipIcon: {
    fontSize: 12,
  },
  socialChipText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  heroActionsCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'center',
  },
  heroBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1.2,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  heroBtnSecondaryIcon: {
    fontSize: 13,
  },
  heroBtnSecondaryText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  heroBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  heroBtnPrimaryIcon: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  heroBtnPrimaryText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bioQuoteBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    flexDirection: 'row',
    gap: 8,
  },
  quoteMark: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 24,
    lineHeight: 22,
    color: CLAY_COLORS.primary,
    fontWeight: '900',
  },
  bioQuoteText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: CLAY_COLORS.muted,
    fontStyle: 'italic',
  },
});
