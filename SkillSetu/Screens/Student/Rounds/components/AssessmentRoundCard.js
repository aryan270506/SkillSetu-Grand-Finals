import React from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function AssessmentRoundCard({
  app,
  practicingAppId,
  launchingAppId,
  onStartPractice,
  onStartOfficial,
  onOpenDetails,
}) {
  const appStatus = (app.application_status || 'APPLIED').toUpperCase();
  const isSelected = appStatus === 'SELECTED' || appStatus === 'HIRED' || app.overall_status === 'COMPLETED';
  const isRejected = appStatus === 'REJECTED' || appStatus === 'NOT_SELECTED';
  const rounds = app.rounds || [];
  const hasPipeline = !!app.has_pipeline && rounds.length > 0;

  // Derive round count & status badge text
  let badgeText = appStatus;
  let badgeBg = CLAY_COLORS.primaryLight;
  let badgeColor = CLAY_COLORS.primary;

  if (isSelected) {
    badgeText = 'Selected';
    badgeBg = CLAY_COLORS.successLight;
    badgeColor = CLAY_COLORS.successDark;
  } else if (isRejected) {
    badgeText = 'Not Selected';
    badgeBg = CLAY_COLORS.dangerLight;
    badgeColor = CLAY_COLORS.danger;
  } else if (appStatus === 'SHORTLISTED') {
    badgeText = 'Shortlisted';
    badgeBg = CLAY_COLORS.primaryLight;
    badgeColor = CLAY_COLORS.primaryDark;
  } else if (app.can_start) {
    badgeText = 'Available Now';
    badgeBg = CLAY_COLORS.primaryLight;
    badgeColor = CLAY_COLORS.primaryDark;
  }

  // If there are rounds, show current round indicator or round number
  const completedCount = rounds.filter((r) => r.status === 'COMPLETED').length;
  const currentRoundIndex = Math.min(completedCount + 1, rounds.length);
  const roundCounterBadge = rounds.length > 0 ? `Round ${currentRoundIndex} of ${rounds.length}` : badgeText;

  const currentRoundName =
    app.progression?.current_round_name || app.active_round || (rounds[0] ? rounds[0].round_name : 'Aptitude');
  const upcomingRoundName =
    app.progression?.next_round_name || (rounds.length > 1 ? rounds[1]?.round_name : null);
  const targetRoundKey =
    app.active_round_key || app.progression?.current_round_key || (rounds[0] ? rounds[0].round_key : 'aptitude');

  const dateTimeStr = app.applied_at ? `Applied: ${app.applied_at}` : 'Active Pipeline';
  const prepProgress = app.progress_percent || 0;
  const isNeedsPrep = prepProgress < 50 && !isSelected && !isRejected;

  let actionText = 'Start Assessment';
  if (targetRoundKey === 'interview') actionText = 'Start Interview';

  const isPracticing = practicingAppId === app.application_id;
  const isLaunching = launchingAppId === app.application_id;

  return (
    <View
      style={[styles.card, CLAY_SHADOWS.card]}
      dataSet={{ cardHover: 'true' }}
      // @ts-ignore
      className="clay-card-hover"
    >
      {/* 1. Header: Avatar + Company + Role + Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.companyInfoGroup}>
          <View
            style={styles.avatarBox}
            dataSet={{ iconInteractive: 'true' }}
            // @ts-ignore
            className="clay-icon-interactive"
          >
            <Text style={styles.avatarText}>{(app.company_name || 'C').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.companyName} numberOfLines={1}>
              {app.company_name || 'Company'}
            </Text>
            <Text style={styles.roleTitle} numberOfLines={1}>
              {app.internship_title || 'Internship Role'}
            </Text>
          </View>
        </View>

        <View style={[styles.roundBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.roundBadgeText, { color: badgeColor }]}>{roundCounterBadge}</Text>
        </View>
      </View>

      {/* 2. Current Round Sub-Card Banner */}
      {hasPipeline && !isRejected ? (
        <View style={styles.currentRoundBanner}>
          <View style={styles.rowBetween}>
            <Text style={styles.currentRoundTitle} numberOfLines={1}>
              {currentRoundName}
            </Text>
            <Text style={styles.currentRoundPrepText}>{prepProgress}% Prepared</Text>
          </View>
          <View style={styles.miniBarTrack}>
            <View
              style={[
                styles.miniBarFill,
                { width: `${Math.max(prepProgress, 8)}%` },
              ]}
              dataSet={{ progressBar: 'true' }}
              // @ts-ignore
              className="clay-progress-bar-fill"
            />
          </View>
        </View>
      ) : isRejected ? (
        <View style={[styles.currentRoundBanner, { backgroundColor: CLAY_COLORS.dangerLight }]}>
          <Text style={[styles.currentRoundTitle, { color: CLAY_COLORS.danger }]}>Application Closed</Text>
          {app.rejection_reason ? (
            <Text style={[styles.roleTitle, { color: CLAY_COLORS.danger, marginTop: 2 }]} numberOfLines={2}>
              {app.rejection_reason}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.currentRoundBanner}>
          <Text style={styles.currentRoundTitle}>Status: {badgeText}</Text>
          <Text style={styles.roleTitle}>Assessment pipeline is being prepared.</Text>
        </View>
      )}

      {/* 3. Stepper / Round Sequence */}
      {hasPipeline && rounds.length > 0 && (
        <View style={styles.stepperContainer}>
          {rounds.map((r, rIdx) => {
            const isDone = r.status === 'COMPLETED';
            const isCurrent = r.status === 'AVAILABLE' || r.status === 'IN_PROGRESS';
            return (
              <React.Fragment key={r.round_id || rIdx}>
                <View style={styles.stepNode}>
                  <View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isCurrent && styles.stepCircleCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNumText,
                        isDone && { color: '#FFFFFF' },
                        isCurrent && { color: CLAY_COLORS.primary, fontWeight: '800' },
                      ]}
                    >
                      {isDone ? '✓' : r.sequence || rIdx + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabelText,
                      isCurrent && { color: CLAY_COLORS.primary, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {r.round_name || `Round ${rIdx + 1}`}
                  </Text>
                </View>
                {rIdx < rounds.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isDone && { backgroundColor: CLAY_COLORS.primary },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* 4. Applied Date */}
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>📅 {dateTimeStr}</Text>
      </View>

      {/* 5. Required Skills Pills */}
      <View style={styles.skillsRow}>
        {(app.required_skills || []).slice(0, 5).map((skill, idx) => (
          <View
            key={idx}
            style={styles.skillPill}
            dataSet={{ subcardHover: 'true' }}
            // @ts-ignore
            className="clay-subcard-hover"
          >
            <Text style={styles.skillPillText}>{skill}</Text>
          </View>
        ))}
        {(app.required_skills || []).length > 5 && (
          <View style={styles.skillPillMore}>
            <Text style={styles.skillPillMoreText}>+{app.required_skills.length - 5}</Text>
          </View>
        )}
      </View>

      {/* 6. Card Action Buttons */}
      <View style={styles.actionsRow}>
        {hasPipeline && !isRejected && !isSelected && (
          <Pressable
            style={[styles.primaryActionBtn, isPracticing && { opacity: 0.7 }]}
            dataSet={{ btnPurple: 'true' }}
            // @ts-ignore
            className="clay-btn-purple"
            onPress={() =>
              onStartPractice({
                applicationId: app.application_id,
                internshipId: app.internship_id,
                targetRound: targetRoundKey,
              })
            }
            disabled={isPracticing}
          >
            {isPracticing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnContentRow}>
                <Text style={styles.btnIcon}>🎙️</Text>
                <Text style={styles.primaryActionBtnText}>Start Mock</Text>
              </View>
            )}
          </Pressable>
        )}

        {app.can_start && !isRejected && !isSelected && (
          <Pressable
            style={[styles.officialActionBtn, isLaunching && { opacity: 0.7 }]}
            dataSet={{ btnPurple: 'true' }}
            // @ts-ignore
            className="clay-btn-purple"
            onPress={() => onStartOfficial(app.application_id)}
            disabled={isLaunching}
          >
            {isLaunching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.officialActionBtnText}>⚡ {actionText}</Text>
            )}
          </Pressable>
        )}

        <Pressable
          style={styles.detailsBtn}
          dataSet={{ btnWhite: 'true' }}
          // @ts-ignore
          className="clay-btn-white"
          onPress={() => onOpenDetails(app)}
        >
          <Text style={styles.detailsBtnText}>📋 Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 310,
    maxWidth: '100%',
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  companyInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)',
      },
      default: {},
    }),
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: CLAY_FONTS.heading,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  roleTitle: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
    fontFamily: CLAY_FONTS.body,
    marginTop: 1,
  },
  roundBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  roundBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  currentRoundBanner: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentRoundTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    flex: 1,
  },
  currentRoundPrepText: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  miniBarTrack: {
    height: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  stepNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 90,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: CLAY_COLORS.recessed,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleDone: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  stepCircleCurrent: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: CLAY_COLORS.primary,
  },
  stepNumText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  stepLabelText: {
    fontSize: 10.5,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
    fontFamily: CLAY_FONTS.body,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: CLAY_COLORS.cardBorder,
    marginHorizontal: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
    fontFamily: CLAY_FONTS.body,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  skillPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  skillPillMore: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  skillPillMoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnIcon: {
    fontSize: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  officialActionBtn: {
    flex: 1,
    backgroundColor: CLAY_COLORS.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  officialActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  detailsBtn: {
    backgroundColor: CLAY_COLORS.paper,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
});
