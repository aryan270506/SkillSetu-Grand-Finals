import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';
import { formatCareerTitle } from '../../services/profileService';

export default function GuidedPathwayCard({
  targetCareer = 'Full Stack Developer',
  completionPercentage = 52,
  onExploreRounds,
}) {
  const careerTitle = formatCareerTitle(targetCareer) || 'Fullstack & High-Throughput Systems';

  const stages = [
    {
      id: 1,
      title: 'Stage 1: Core Fundamentals & DSA Benchmarking',
      scoreText: 'Score: 98.4%',
      desc: '48/50 algorithmic test cases cleared. Solved Graph DP, Segment Trees, and Thread Pools.',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Stage 2: Sandboxed Docker Microservices PR Lab',
      scoreText: 'Zero Vulnerabilities',
      desc: 'Automated SonarQube & Trivy audit passed. Built Kafka consumer cluster with failover replication.',
      status: 'completed',
    },
    {
      id: 3,
      title: 'Stage 3: Proctored AI Technical & System Design Round',
      scoreText: 'Top 1st Percentile',
      desc: 'Simulated rate limiter, distributed cache hashing, and multi-tenant sharding architecture.',
      status: 'completed',
    },
    {
      id: 4,
      title: 'Stage 4: Enterprise Recruiter Matching & Interviews',
      scoreText: 'Active Round',
      desc: 'Shortlisted by 3 partner firms. Scheduled for final founder syncs this week.',
      status: 'active',
      actions: [
        { label: '3 Active Matches', type: 'info' },
        { label: 'View Interview Calendar ↗', type: 'link' },
      ],
    },
    {
      id: 5,
      title: 'Stage 5: Pre-Placement Offer & University Credit Transfer',
      scoreText: 'Final Milestone',
      desc: 'Direct conversion to full-time career with NEP 2020 8th-semester credit mapping.',
      status: 'upcoming',
    },
  ];

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>GUIDED PATHWAY</Text>
          <Text style={styles.pathwayTitle}>{careerTitle}</Text>
        </View>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>{completionPercentage}% Completed</Text>
        </View>
      </View>

      {/* Stepping Stones Hero Sub-Card */}
      <View style={styles.steppingBanner}>
        <View style={styles.steppingLeft}>
          <View style={styles.fastTrackTag}>
            <Text style={styles.fastTrackText}>Top 1 Track</Text>
          </View>
          <Text style={styles.steppingTitle}>Stepping Stones to Placement</Text>
          <Text style={styles.steppingSubtitle}>
            Unlocked 4 of 5 career gates with proctored code integrity verified by the academic grid.
          </Text>
          <View style={styles.targetDateRow}>
            <Text style={styles.targetDateIcon}>🎯</Text>
            <Text style={styles.targetDateText}>Target Placement Date: Dec 2025</Text>
          </View>
        </View>

        <View style={styles.steppingIllustration}>
          <View style={styles.illustrationOrb}>
            <Text style={styles.illustrationEmoji}>🚀</Text>
          </View>
        </View>
      </View>

      {/* Stages List */}
      <View style={styles.stagesList}>
        {stages.map((stage) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';

          return (
            <View
              key={stage.id}
              style={[
                styles.stageItem,
                isActive && styles.stageItemActive,
                Platform.OS === 'web' && { className: 'clay-hover-lift' },
              ]}
            >
              {/* Stage Check / Icon */}
              <View
                style={[
                  styles.stageIconWrap,
                  isCompleted && styles.stageIconCompleted,
                  isActive && styles.stageIconActive,
                ]}
              >
                <Text style={styles.stageIconText}>
                  {isCompleted ? '✓' : (isActive ? '💼' : '🏁')}
                </Text>
              </View>

              {/* Stage Body */}
              <View style={styles.stageContent}>
                <View style={styles.stageTitleRow}>
                  <Text style={[styles.stageTitle, isActive && styles.stageTitleActive]}>
                    {stage.title}
                  </Text>
                  <View
                    style={[
                      styles.stageScoreBadge,
                      isCompleted && styles.stageScoreCompleted,
                      isActive && styles.stageScoreActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stageScoreText,
                        isCompleted && styles.stageScoreTextCompleted,
                        isActive && styles.stageScoreTextActive,
                      ]}
                    >
                      {stage.scoreText}
                    </Text>
                  </View>
                </View>

                <Text style={styles.stageDesc}>{stage.desc}</Text>

                {/* Optional Sub-actions */}
                {stage.actions && (
                  <View style={styles.stageActionsRow}>
                    {stage.actions.map((act, aIdx) => (
                      <Pressable
                        key={aIdx}
                        style={[
                          styles.stageActionBtn,
                          act.type === 'link' ? styles.stageActionLink : styles.stageActionInfo,
                          Platform.OS === 'web' && { className: 'clay-btn-interactive' },
                        ]}
                        onPress={onExploreRounds}
                      >
                        <Text
                          style={[
                            styles.stageActionText,
                            act.type === 'link' ? styles.stageActionLinkText : styles.stageActionInfoText,
                          ]}
                        >
                          {act.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
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
    padding: 24,
    marginBottom: 24,
    ...CLAY_SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  pathwayTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    marginTop: 2,
  },
  completedBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
  },
  completedBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  steppingBanner: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  steppingLeft: {
    flex: 1,
    gap: 6,
  },
  fastTrackTag: {
    alignSelf: 'flex-start',
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  fastTrackText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  steppingTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  steppingSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
  },
  targetDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  targetDateIcon: {
    fontSize: 13,
  },
  targetDateText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  steppingIllustration: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationOrb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  illustrationEmoji: {
    fontSize: 26,
  },
  stagesList: {
    gap: 12,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 14,
  },
  stageItemActive: {
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: '#FAF8FE',
    borderWidth: 1.5,
  },
  stageIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CLAY_COLORS.recessed,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stageIconCompleted: {
    backgroundColor: CLAY_COLORS.primary,
  },
  stageIconActive: {
    backgroundColor: CLAY_COLORS.primary,
  },
  stageIconText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stageContent: {
    flex: 1,
    gap: 4,
  },
  stageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    flex: 1,
  },
  stageTitleActive: {
    color: CLAY_COLORS.primaryDark,
  },
  stageScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessed,
  },
  stageScoreCompleted: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  stageScoreActive: {
    backgroundColor: CLAY_COLORS.primary,
  },
  stageScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  stageScoreTextCompleted: {
    color: CLAY_COLORS.primary,
  },
  stageScoreTextActive: {
    color: '#FFFFFF',
  },
  stageDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
  },
  stageActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  stageActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  stageActionInfo: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  stageActionInfoText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  stageActionLink: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  stageActionLinkText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
