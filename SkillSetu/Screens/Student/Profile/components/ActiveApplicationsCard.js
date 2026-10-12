import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function ActiveApplicationsCard({
  applications = [],
  onViewApplications,
}) {
  const defaultApplications = [
    {
      company: 'ABC Technologies',
      role: 'Frontend / Backend Systems Intern',
      status: 'Final Stage AI Interview Cleared',
      statusType: 'success',
      date: 'Nov 12',
    },
    {
      company: 'Scaler Alliance',
      role: 'Distributed Systems Intern',
      status: 'Shortlisted for Partner Sync',
      statusType: 'primary',
      date: 'Nov 19',
    },
    {
      company: 'BITS Pilani Research Node',
      role: 'Cloud Infrastructure Fellow',
      status: 'Verified Credentials Shared',
      statusType: 'secondary',
      date: 'Nov 06',
    },
  ];

  const appItems = applications.length > 0
    ? applications.slice(0, 3).map((app, idx) => ({
        company: app.company_name || app.title || `Partner Firm #${idx + 1}`,
        role: app.role || app.internship_title || 'Software Engineering Intern',
        status: app.status === 'accepted' ? 'Offer Extended' : (app.status === 'shortlisted' ? 'Shortlisted for Partner Sync' : 'Active Evaluation Round'),
        statusType: app.status === 'accepted' ? 'success' : (app.status === 'shortlisted' ? 'primary' : 'secondary'),
        date: app.applied_at ? new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent',
      }))
    : defaultApplications;

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>PIPELINE</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>⚡ {appItems.length} Live</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>Active Applications</Text>

      {/* Applications List */}
      <View style={styles.appList}>
        {appItems.map((item, index) => (
          <Pressable
            key={index}
            style={[styles.appItemCard, Platform.OS === 'web' && { className: 'clay-hover-lift' }]}
            onPress={onViewApplications}
          >
            <View style={styles.appTopRow}>
              <View style={styles.appCompanyRow}>
                <View style={styles.companyIconWrap}>
                  <Text style={styles.companyIconText}>
                    {(item.company || 'A').slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.appRoleWrap}>
                  <Text style={styles.companyName}>{item.company}</Text>
                  <Text style={styles.roleName}>{item.role}</Text>
                </View>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </View>

            <View style={styles.appFooterRow}>
              <View
                style={[
                  styles.statusBadge,
                  item.statusType === 'success' && styles.statusSuccess,
                  item.statusType === 'primary' && styles.statusPrimary,
                  item.statusType === 'secondary' && styles.statusSecondary,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.statusType === 'success' && styles.statusSuccessText,
                    item.statusType === 'primary' && styles.statusPrimaryText,
                    item.statusType === 'secondary' && styles.statusSecondaryText,
                  ]}
                >
                  ● {item.status}
                </Text>
              </View>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
          </Pressable>
        ))}
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  liveBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    marginBottom: 14,
  },
  appList: {
    gap: 10,
  },
  appItemCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
    gap: 8,
  },
  appTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  companyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyIconText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  appRoleWrap: {
    flex: 1,
  },
  companyName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  roleName: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  arrowIcon: {
    fontSize: 18,
    color: CLAY_COLORS.mutedLight,
    fontWeight: '700',
  },
  appFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusSuccessText: {
    color: CLAY_COLORS.successDark,
  },
  statusPrimary: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  statusPrimaryText: {
    color: CLAY_COLORS.primaryDark,
  },
  statusSecondary: {
    backgroundColor: 'rgba(219, 39, 119, 0.12)',
  },
  statusSecondaryText: {
    color: CLAY_COLORS.secondary,
  },
  statusBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
  },
  dateText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    fontWeight: '600',
  },
});
