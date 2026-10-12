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

export default function VerifiedEvidenceSection({
  credentials = [],
  xpEarned = 400,
  verifiedSkillsCount = 4,
  onNavigateToSkills,
  isDesktop,
}) {
  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="ACHIEVEMENTS AND EVIDENCE"
        title="Verified Learning Evidence"
        subtitle="Tamper-evident verification records from real project proof and diagnostic scoring."
        rightElement={
          <ClayButton
            style={styles.headerBtn}
            onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', {})}
          >
            <Text style={styles.headerBtnText}>
              View All On-File Credentials
            </Text>
          </ClayButton>
        }
      />

      {/* Top Credentials & XP Summary Row */}
      <View style={styles.xpBannerRow}>
        <View style={styles.xpBannerItem}>
          <Text style={styles.xpEmoji}>🏆</Text>
          <View>
            <Text style={styles.xpBannerVal}>{xpEarned} XP Earned</Text>
            <Text style={styles.xpBannerSub}>Committed to verified skill ledger</Text>
          </View>
        </View>

        <View style={styles.xpBannerDivider} />

        <View style={styles.xpBannerItem}>
          <Text style={styles.xpEmoji}>🛡️</Text>
          <View>
            <Text style={styles.xpBannerVal}>{verifiedSkillsCount} Skills Certified</Text>
            <Text style={styles.xpBannerSub}>Validated on-file portfolio evidence</Text>
          </View>
        </View>
      </View>

      {/* Grid of Verified Evidence Items */}
      {credentials && credentials.length > 0 ? (
        <View
          style={[
            styles.credentialsGrid,
            isDesktop ? styles.credentialsGridDesktop : styles.credentialsGridMobile,
          ]}
        >
          {credentials.map((cred, idx) => (
            <ClayCard
              key={cred.skill_id || idx}
              style={styles.credentialCard}
              hoverTranslate={-3}
            >
              <View style={styles.shieldIconBox}>
                <Text style={{ fontSize: 18 }}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.credTitle} numberOfLines={1}>
                  {cred.title}
                </Text>
                <Text style={styles.credMeta}>
                  {cred.badge} • {cred.date}
                </Text>
              </View>
              <ClayBadge
                label="Verified ✓"
                variant="emerald"
                size="small"
              />
            </ClayCard>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 24, marginBottom: 6 }}>🛡️</Text>
          <Text style={styles.emptyTitle}>No verified credentials yet</Text>
          <Text style={styles.emptySub}>
            Complete diagnostic assessments and assignments to earn verified skill proofs.
          </Text>
        </View>
      )}
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
  xpBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  xpBannerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  xpEmoji: {
    fontSize: 28,
  },
  xpBannerVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  xpBannerSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  xpBannerDivider: {
    width: 1,
    height: 36,
    backgroundColor: CLAY_COLORS.cardBorder,
  },
  credentialsGrid: {
    gap: 12,
  },
  credentialsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  credentialsGridMobile: {
    flexDirection: 'column',
  },
  credentialCard: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
    gap: 10,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CLAY_COLORS.emeraldLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  credTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  credMeta: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
  },
  emptyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  emptySub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    marginTop: 2,
    textAlign: 'center',
  },
});
