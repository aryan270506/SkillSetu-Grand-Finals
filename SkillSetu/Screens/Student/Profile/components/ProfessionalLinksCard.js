import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function ProfessionalLinksCard({
  githubLinks = {},
  user = {},
}) {
  const linkedinUrl = githubLinks?.linkedinUrl || user?.linkedin_url || 'https://linkedin.com/in/aryan-bhoge';
  const portfolioUrl = githubLinks?.portfolioUrl || user?.portfolio_url || 'https://aryan.dev';
  const githubUser = githubLinks?.githubUsername || user?.github_user_id || 'aryan270506';

  const openLink = (url) => {
    if (!url) return;
    const dest = url.startsWith('http') ? url : `https://${url}`;
    if (Platform.OS === 'web') {
      window.open(dest, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(dest).catch(() => {});
    }
  };

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      <Text style={styles.eyebrow}>VERIFIED DESTINATIONS</Text>
      <Text style={styles.cardTitle}>Professional Links</Text>

      <View style={styles.linksList}>
        {/* LinkedIn Link */}
        {linkedinUrl ? (
          <Pressable
            style={[styles.linkItem, Platform.OS === 'web' && { className: 'clay-hover-lift' }]}
            onPress={() => openLink(linkedinUrl)}
          >
            <View style={styles.linkLeft}>
              <Text style={styles.linkIcon}>💼</Text>
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>LinkedIn</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{linkedinUrl}</Text>
              </View>
            </View>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>
        ) : null}

        {/* Portfolio Link */}
        {portfolioUrl ? (
          <Pressable
            style={[styles.linkItem, Platform.OS === 'web' && { className: 'clay-hover-lift' }]}
            onPress={() => openLink(portfolioUrl)}
          >
            <View style={styles.linkLeft}>
              <Text style={styles.linkIcon}>🌐</Text>
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>Portfolio</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{portfolioUrl}</Text>
              </View>
            </View>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>
        ) : null}

        {/* GitHub Link */}
        {githubUser ? (
          <Pressable
            style={[styles.linkItem, Platform.OS === 'web' && { className: 'clay-hover-lift' }]}
            onPress={() => openLink(`https://github.com/${githubUser.replace('@', '')}`)}
          >
            <View style={styles.linkLeft}>
              <Text style={styles.linkIcon}>🐙</Text>
              <View style={styles.linkInfo}>
                <Text style={styles.linkLabel}>GitHub</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>@{githubUser.replace('@', '')}</Text>
              </View>
            </View>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 24,
    ...CLAY_SHADOWS.card,
    gap: 8,
  },
  eyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    marginBottom: 4,
  },
  linksList: {
    gap: 10,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    borderRadius: CLAY_RADII.cardSmall,
    padding: 12,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  linkIcon: {
    fontSize: 16,
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  linkUrl: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.primaryDark,
    marginTop: 1,
  },
  linkArrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    marginLeft: 6,
  },
});
