import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function MockInterviewCard({
  careerTrack,
  applications = [],
  interviewHistory = [],
  onStartPractice,
  practicingAppId,
}) {
  // Dynamically derive available roles from real system data (target career track + applied internships)
  const availableRoles = useMemo(() => {
    const rolesMap = new Map();

    // 1. Add career track as primary default role
    if (careerTrack) {
      rolesMap.set(careerTrack, {
        id: 'career_track',
        title: careerTrack,
        company: 'Target Career Track',
        applicationId: null,
        internshipId: null,
        skills: [],
      });
    }

    // 2. Add roles from active applications/internships
    applications.forEach((app) => {
      const title = app.internship_title || app.role_title;
      if (title && !rolesMap.has(title)) {
        rolesMap.set(title, {
          id: `app_${app.application_id}`,
          title: title,
          company: app.company_name || 'Applied Role',
          applicationId: app.application_id,
          internshipId: app.internship_id,
          skills: app.required_skills || [],
          rounds: app.rounds || [],
        });
      }
    });

    const list = Array.from(rolesMap.values());
    // Fallback if empty
    if (list.length === 0) {
      list.push({
        id: 'default',
        title: 'Software Engineer',
        company: 'Target Role',
        applicationId: null,
        internshipId: null,
        skills: [],
      });
    }
    return list;
  }, [careerTrack, applications]);

  // Selected role state (defaults to first available role)
  const [selectedRoleId, setSelectedRoleId] = useState(() => availableRoles[0]?.id || 'career_track');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedRole = useMemo(() => {
    return availableRoles.find((r) => r.id === selectedRoleId) || availableRoles[0];
  }, [availableRoles, selectedRoleId]);

  // Check if historical score exists for aptitude, technical, or interview for this role
  const roleHistory = useMemo(() => {
    if (!selectedRole) return { aptitude: null, technical: null, interview: null };

    // Search in interviewHistory matching role title or company
    const relevant = interviewHistory.filter(
      (h) =>
        (h.role_title && selectedRole.title && h.role_title.toLowerCase().includes(selectedRole.title.toLowerCase())) ||
        (h.company_name && selectedRole.company && h.company_name.toLowerCase().includes(selectedRole.company.toLowerCase()))
    );

    let aptScore = null;
    let techScore = null;
    let intScore = null;

    relevant.forEach((h) => {
      const rName = (h.round_name || '').toLowerCase();
      if (rName.includes('aptitude') && h.overall_score !== undefined) aptScore = h.overall_score;
      else if ((rName.includes('technical') || rName.includes('coding')) && h.overall_score !== undefined) techScore = h.overall_score;
      else if ((rName.includes('interview') || rName.includes('ai')) && h.overall_score !== undefined) intScore = h.overall_score;
    });

    // Also check if app rounds have scores
    if (selectedRole.rounds) {
      selectedRole.rounds.forEach((r) => {
        const rName = (r.round_name || '').toLowerCase();
        if (r.score !== undefined && r.score !== null) {
          if (rName.includes('aptitude')) aptScore = r.score;
          else if (rName.includes('technical') || rName.includes('coding')) techScore = r.score;
          else if (rName.includes('interview') || rName.includes('ai')) intScore = r.score;
        }
      });
    }

    return { aptitude: aptScore, technical: techScore, interview: intScore };
  }, [selectedRole, interviewHistory]);

  const roundsConfig = [
    {
      key: 'aptitude',
      label: 'Aptitude Mock',
      icon: '📝',
      tag: 'Stage 1',
      desc: 'Quantitative, logical reasoning & problem-solving speed tests calibrated for your profile.',
      lastScore: roleHistory.aptitude,
      actionText: 'Start Aptitude →',
    },
    {
      key: 'technical',
      label: 'Technical Mock',
      icon: '💻',
      tag: 'Stage 2',
      desc: 'Role-specific live coding, algorithms, database queries & system architecture questions.',
      lastScore: roleHistory.technical,
      actionText: 'Start Technical →',
    },
    {
      key: 'interview',
      label: 'AI Mock Interview',
      icon: '🎤',
      tag: 'Stage 3',
      desc: 'Interactive AI voice & video interview with real-time STAR response evaluation and tips.',
      lastScore: roleHistory.interview,
      actionText: 'Start AI Interview →',
    },
  ];

  const handleLaunchMock = (roundKey) => {
    onStartPractice({
      applicationId: selectedRole?.applicationId || null,
      internshipId: selectedRole?.internshipId || null,
      targetRound: roundKey,
      roleTitle: selectedRole?.title,
    });
  };

  return (
    <View
      style={[styles.mainCard, CLAY_SHADOWS.card]}
      dataSet={{ cardHover: 'true' }}
      // @ts-ignore
      className="clay-card-hover"
    >
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>🎯 Mock Interview & Practice</Text>
            <View
              style={styles.sparkBadge}
              dataSet={{ iconInteractive: 'true' }}
              // @ts-ignore
              className="clay-icon-interactive"
            >
              <Text style={styles.sparkIcon}>✨</Text>
            </View>
          </View>
          <Text style={styles.cardSub}>
            Practice every stage of your interview for the role you're targeting with realistic AI-powered sandboxes.
          </Text>
        </View>

        {/* Dynamic Role Selector Button */}
        <View style={styles.roleSelectorWrapper}>
          <Text style={styles.selectorLabel}>TARGET ROLE:</Text>
          <Pressable
            style={styles.dropdownTrigger}
            dataSet={{ btnWhite: 'true' }}
            // @ts-ignore
            className="clay-btn-white"
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Text style={styles.dropdownTriggerText} numberOfLines={1}>
              {selectedRole?.title || 'Select Role'}
            </Text>
            <Text style={styles.dropdownChevron}>{isDropdownOpen ? '▲' : '▾'}</Text>
          </Pressable>

          {/* Custom Dropdown Menu */}
          {isDropdownOpen && (
            <View
              style={[styles.dropdownMenu, CLAY_SHADOWS.cardHover]}
              dataSet={{ dropdownEnter: 'true' }}
              // @ts-ignore
              className="clay-dropdown-enter"
            >
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={true}>
                {availableRoles.map((role) => {
                  const isSelected = role.id === selectedRoleId;
                  return (
                    <Pressable
                      key={role.id}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      dataSet={{ tabPill: 'true' }}
                      // @ts-ignore
                      className="clay-tab-pill"
                      onPress={() => {
                        setSelectedRoleId(role.id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTitleActive]}
                          numberOfLines={1}
                        >
                          {role.title}
                        </Text>
                        <Text style={styles.dropdownItemCompany} numberOfLines={1}>
                          {role.company}
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* 2. Selected Role Skills Bar (if available) */}
      {selectedRole?.skills && selectedRole.skills.length > 0 && (
        <View style={styles.skillsBar}>
          <Text style={styles.skillsBarLabel}>EVALUATED SKILLS:</Text>
          <View style={styles.skillsList}>
            {selectedRole.skills.map((sk, idx) => (
              <View
                key={idx}
                style={styles.skillChip}
                dataSet={{ subcardHover: 'true' }}
                // @ts-ignore
                className="clay-subcard-hover"
              >
                <Text style={styles.skillChipText}>{sk}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 3. 3 Practice Round Cards (Aptitude, Technical, AI Interview) */}
      <View style={styles.roundsGrid}>
        {roundsConfig.map((r) => {
          const isCurrentPracticing = practicingAppId === (selectedRole?.applicationId || 'global');

          return (
            <View
              key={r.key}
              style={[styles.roundCard, CLAY_SHADOWS.card]}
              dataSet={{ subcardHover: 'true' }}
              // @ts-ignore
              className="clay-subcard-hover"
            >
              {/* Top Tag & Icon */}
              <View style={styles.roundCardHeader}>
                <View
                  style={styles.roundIconCircle}
                  dataSet={{ iconInteractive: 'true' }}
                  // @ts-ignore
                  className="clay-icon-interactive"
                >
                  <Text style={styles.roundIcon}>{r.icon}</Text>
                </View>
                <View style={styles.stageTag}>
                  <Text style={styles.stageTagText}>{r.tag}</Text>
                </View>
              </View>

              {/* Title & Desc */}
              <View style={{ gap: 4 }}>
                <Text style={styles.roundTitle}>{r.label}</Text>
                <Text style={styles.roundDesc}>{r.desc}</Text>
              </View>

              {/* Dynamic Status / Last Score */}
              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>STATUS:</Text>
                {r.lastScore !== null ? (
                  <View style={styles.scorePill}>
                    <Text style={styles.scorePillText}>Last Score: {r.lastScore}%</Text>
                  </View>
                ) : (
                  <Text style={styles.statusReadyText}>● Ready to Practice</Text>
                )}
              </View>

              {/* Action Button */}
              <Pressable
                style={[styles.startBtn, isCurrentPracticing && { opacity: 0.7 }]}
                dataSet={{ btnPurple: 'true' }}
                // @ts-ignore
                className="clay-btn-purple"
                onPress={() => handleLaunchMock(r.key)}
                disabled={isCurrentPracticing}
              >
                {isCurrentPracticing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.startBtnText}>{r.actionText}</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    gap: 16,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.4,
  },
  sparkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkIcon: {
    fontSize: 12,
  },
  cardSub: {
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 620,
  },
  roleSelectorWrapper: {
    position: 'relative',
    minWidth: 240,
    gap: 4,
  },
  selectorLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CLAY_COLORS.paper,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 8,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
    fontFamily: CLAY_FONTS.heading,
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: CLAY_COLORS.primary,
    fontWeight: '800',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.subtleBorder,
  },
  dropdownItemActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  dropdownItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  dropdownItemTitleActive: {
    color: CLAY_COLORS.primaryDark,
    fontWeight: '800',
  },
  dropdownItemCompany: {
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 1,
  },
  checkIcon: {
    color: CLAY_COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  skillsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    flexWrap: 'wrap',
    gap: 8,
  },
  skillsBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    backgroundColor: CLAY_COLORS.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  skillChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  roundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  roundCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 18,
    gap: 12,
    justifyContent: 'space-between',
  },
  roundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  roundIcon: {
    fontSize: 16,
  },
  stageTag: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  stageTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.3,
  },
  roundDesc: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 17,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.heading,
  },
  scorePill: {
    backgroundColor: CLAY_COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  scorePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.successDark,
    fontFamily: CLAY_FONTS.heading,
  },
  statusReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  startBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
});
