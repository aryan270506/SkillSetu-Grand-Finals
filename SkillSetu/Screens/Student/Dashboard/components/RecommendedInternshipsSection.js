import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  SectionHeader,
} from './DashboardDesignTokens';

export default function RecommendedInternshipsSection({
  internshipsLoading,
  internshipsError,
  recommendedInternships,
  onNavigate,
  isTablet,
}) {
  return (
    <View style={styles.sectionWrapper} className="dashboard-section-reveal">
      <SectionHeader
        preTitle="LIVE OPPORTUNITY MATCHES"
        title="Recommended Internships (Strict ≥80% Match)"
        subtitle="Opportunities verified by algorithmic fit against your demonstrated skills and qualification requirements."
        rightElement={
          <ClayButton
            variant="secondary"
            onPress={() => onNavigate && onNavigate('Opportunities')}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>View All Opportunities →</Text>
          </ClayButton>
        }
      />

      <View style={[styles.internshipsRow, !isTablet && styles.internshipsRowMobile]}>
        {internshipsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
            <Text style={styles.loadingText}>Fetching live eligible internships...</Text>
          </View>
        ) : internshipsError ? (
          <ClayCard style={[styles.internshipCard, { width: '100%' }]} interactive={false}>
            <ClayBadge label="Feed Error" variant="danger" size="small" style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>Unable to connect to opportunity feeds</Text>
            <Text style={styles.emptySubtitle}>{internshipsError}</Text>
          </ClayCard>
        ) : recommendedInternships.length > 0 ? (
          recommendedInternships.slice(0, 3).map((item, idx) => (
            <ClayCard
              key={item.id || idx}
              style={styles.internshipCard}
              hoverTranslate={-4}
              hoverScale={1.015}
              interactive={true}
              onPress={() => onNavigate && onNavigate('Opportunities')}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.internTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <ClayBadge
                  label={`${Math.round(item.match_score || item.score || 80)}% Match`}
                  variant="emerald"
                  size="small"
                />
              </View>

              <Text style={styles.internCompany} numberOfLines={1}>
                {item.company_name || item.company || 'Verified Employer'} • {item.work_preference || item.location || 'Remote'}
              </Text>

              <Text style={styles.internDesc} numberOfLines={2}>
                {item.description || 'Live opportunity matching your verified skillset and target role requirements.'}
              </Text>

              <ClayButton
                variant="secondary"
                onPress={() => onNavigate && onNavigate('Opportunities')}
                style={styles.viewBtn}
              >
                <Text style={styles.viewBtnText}>View Opportunity →</Text>
              </ClayButton>
            </ClayCard>
          ))
        ) : (
          <ClayCard style={[styles.internshipCard, { width: '100%' }]} interactive={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ClayBadge label="STRICT ≥80% GATE" icon="🔒" variant="amber" size="small" />
              <Text style={styles.emptyTitle}>No live internships currently match ≥ 80%</Text>
            </View>
            <Text style={styles.emptySubtitle}>
              Our matching engine enforces strict qualification criteria to protect candidate success rates. Complete practice projects and learning tracks to elevate your verified scores.
            </Text>
            <ClayButton
              variant="secondary"
              onPress={() => onNavigate && onNavigate('Opportunities')}
              style={{ alignSelf: 'flex-start', marginTop: 14 }}
            >
              <Text style={styles.viewBtnText}>Explore All Roles →</Text>
            </ClayButton>
          </ClayCard>
        )}
      </View>
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
  internshipsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  internshipsRowMobile: {
    flexDirection: 'column',
  },
  loadingBox: {
    padding: 36,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: CLAY_FONTS.body,
    marginTop: 10,
    color: CLAY_COLORS.muted,
    fontSize: 13,
  },
  internshipCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 180,
    ...CLAY_SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  internTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    flex: 1,
  },
  internCompany: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    marginTop: 4,
  },
  internDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 14,
  },
  viewBtn: {
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
  },
  viewBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  emptyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  emptySubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
    marginTop: 4,
  },
});
