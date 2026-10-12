import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function ScheduleTimelineSection({
  scheduleEntries,
  filteredScheduleEntries,
  timelineViewMode,
  setTimelineViewMode,
  selectedTimelineFilter,
  setSelectedTimelineFilter,
  timelineCounts,
  onOpenDetails,
  applications,
}) {
  const filterTabs = [
    { id: 'All', label: `All (${timelineCounts.all})` },
    { id: 'Upcoming', label: `Upcoming (${timelineCounts.upcoming})` },
    { id: 'Today', label: `Today (${timelineCounts.today})` },
    { id: 'This Week', label: `This Week (${timelineCounts.thisWeek})` },
    { id: 'Complete', label: `Complete (${timelineCounts.complete})` },
  ];

  return (
    <View
      style={[styles.card, CLAY_SHADOWS.card]}
      dataSet={{ cardHover: 'true' }}
      // @ts-ignore
      className="clay-card-hover"
    >
      {/* 1. Header with View Toggle */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>📅 Schedule & Timeline</Text>
          </View>
          <Text style={styles.sectionSub}>
            Manage your interview stages and synchronise deadlines with your study plan.
          </Text>
        </View>

        <View style={styles.toggleGroup}>
          <Pressable
            style={[
              styles.toggleBtn,
              timelineViewMode === 'list' && styles.toggleBtnActive,
            ]}
            dataSet={{ tabPill: 'true' }}
            // @ts-ignore
            className="clay-tab-pill"
            onPress={() => setTimelineViewMode('list')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                timelineViewMode === 'list' && styles.toggleBtnTextActive,
              ]}
            >
              📋 List View
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.toggleBtn,
              timelineViewMode === 'calendar' && styles.toggleBtnActive,
            ]}
            dataSet={{ tabPill: 'true' }}
            // @ts-ignore
            className="clay-tab-pill"
            onPress={() => setTimelineViewMode('calendar')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                timelineViewMode === 'calendar' && styles.toggleBtnTextActive,
              ]}
            >
              🗓️ Calendar
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Filter Pills Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginVertical: 2 }}>
        <View style={styles.filterPillsRow}>
          {filterTabs.map((f) => {
            const isActive = selectedTimelineFilter === f.id;
            return (
              <Pressable
                key={f.id}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                ]}
                dataSet={{ tabPill: 'true' }}
                // @ts-ignore
                className="clay-tab-pill"
                onPress={() => setSelectedTimelineFilter(f.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* 3. View Content (List View vs Calendar View) */}
      {timelineViewMode === 'calendar' ? (
        <View style={{ gap: 10 }}>
          <View style={styles.calendarStrip}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
              const dayEntries = scheduleEntries.filter((_, i) => i % 7 === idx);
              const hasEvent = dayEntries.length > 0;
              return (
                <View
                  key={day}
                  style={[
                    styles.calendarDayBox,
                    hasEvent && styles.calendarDayBoxActive,
                  ]}
                  dataSet={{ subcardHover: 'true' }}
                >
                  <Text style={styles.calDayName}>{day}</Text>
                  <Text
                    style={hasEvent ? styles.calEventTitle : styles.calSub}
                    numberOfLines={1}
                  >
                    {hasEvent ? dayEntries[0].round_name : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
          {scheduleEntries.length === 0 && (
            <Text style={styles.emptyText}>No scheduled rounds on the calendar.</Text>
          )}
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: '100%' }}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableColHeader, { flex: 2.4, minWidth: 190 }]}>COMPANY & ROLE</Text>
                <Text style={[styles.tableColHeader, { flex: 1.9, minWidth: 160 }]}>DATE & TIME</Text>
                <Text style={[styles.tableColHeader, { flex: 1.5, minWidth: 120 }]}>ROUND</Text>
                <Text style={[styles.tableColHeader, { flex: 1.3, minWidth: 120 }]}>TYPE</Text>
                <Text style={[styles.tableColHeader, { flex: 1.3, minWidth: 110 }]}>READINESS</Text>
                <Text style={[styles.tableColHeader, { flex: 1.3, minWidth: 110 }]}>STATUS</Text>
                <Text style={[styles.tableColHeader, { flex: 1.1, minWidth: 90, textAlign: 'right' }]}>ACTIONS</Text>
              </View>

              {/* Table Rows */}
              {filteredScheduleEntries.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No schedule entries matching the current filter.</Text>
                </View>
              ) : (
                filteredScheduleEntries.map((row) => {
                  let statusBg = CLAY_COLORS.primaryLight;
                  let statusColor = CLAY_COLORS.primaryDark;

                  if (row.status === 'COMPLETED') {
                    statusBg = CLAY_COLORS.successLight;
                    statusColor = CLAY_COLORS.successDark;
                  } else if (row.status === 'AVAILABLE' || row.status === 'IN_PROGRESS') {
                    statusBg = CLAY_COLORS.primaryLight;
                    statusColor = CLAY_COLORS.primary;
                  } else if (row.status === 'SCHEDULED') {
                    statusBg = CLAY_COLORS.warningLight;
                    statusColor = CLAY_COLORS.warningDark;
                  }

                  const readinessVal = row.readiness_percent || 0;
                  const readinessLabel = readinessVal >= 85 ? 'High' : readinessVal >= 60 ? 'Ready' : 'Good';
                  const readinessColor = readinessVal >= 80 ? CLAY_COLORS.successDark : readinessVal >= 50 ? CLAY_COLORS.primary : CLAY_COLORS.primaryDark;

                  return (
                    <View
                      key={row.id}
                      style={styles.tableRow}
                      dataSet={{ subcardHover: 'true' }}
                    >
                      {/* Company & Role */}
                      <View style={[styles.tableCol, { flex: 2.4, minWidth: 190 }]}>
                        <Text style={styles.companyNameText} numberOfLines={1}>{row.company_name}</Text>
                        <Text style={styles.roleSubText} numberOfLines={1}>{row.role_title}</Text>
                      </View>

                      {/* Date & Time */}
                      <View style={[styles.tableCol, { flex: 1.9, minWidth: 160 }]}>
                        <View style={styles.dateTimeBadge}>
                          <Text style={styles.dateTimeText}>
                            🕒 {row.scheduled_date || 'Flexible Window'}
                            {row.display_time ? ` ${row.display_time}` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Round */}
                      <View style={[styles.tableCol, { flex: 1.5, minWidth: 120 }]}>
                        <Text style={styles.roundNameText} numberOfLines={1}>{row.round_name}</Text>
                      </View>

                      {/* Type */}
                      <View style={[styles.tableCol, { flex: 1.3, minWidth: 120 }]}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText} numberOfLines={1}>{row.round_type || 'Flexible Window'}</Text>
                        </View>
                      </View>

                      {/* Readiness */}
                      <View style={[styles.tableCol, { flex: 1.3, minWidth: 110 }]}>
                        <View style={styles.readinessRow}>
                          <Text style={[styles.readinessNum, { color: readinessColor }]}>{readinessVal}%</Text>
                          <Text style={styles.readinessLabel}>{readinessLabel}</Text>
                        </View>
                      </View>

                      {/* Status */}
                      <View style={[styles.tableCol, { flex: 1.3, minWidth: 110 }]}>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{row.status}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={[styles.tableCol, { flex: 1.1, minWidth: 90, alignItems: 'flex-end' }]}>
                        <Pressable
                          style={styles.actionBtn}
                          dataSet={{ btnWhite: 'true' }}
                          // @ts-ignore
                          className="clay-btn-white"
                          onPress={() => {
                            const appObj = (applications || []).find((a) => a.application_id === row.application_id);
                            if (appObj) onOpenDetails(appObj);
                            else alert(`Details for ${row.company_name} — ${row.round_name}`);
                          }}
                        >
                          <Text style={styles.actionBtnText}>Details</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    gap: 16,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.pill,
    padding: 3,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
  },
  toggleBtnActive: {
    backgroundColor: CLAY_COLORS.paper,
    ...CLAY_SHADOWS.badge,
  },
  toggleBtnText: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
    fontFamily: CLAY_FONTS.body,
  },
  toggleBtnTextActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  filterPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
      },
      default: {},
    }),
  },
  filterPillText: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontWeight: '700',
    fontFamily: CLAY_FONTS.heading,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tableWrapper: {
    width: '100%',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    overflow: 'hidden',
    backgroundColor: CLAY_COLORS.paper,
  },
  scrollContentContainer: {
    minWidth: '100%',
    flexGrow: 1,
  },
  tableContainer: {
    width: '100%',
    minWidth: 900,
    backgroundColor: CLAY_COLORS.paper,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FD',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: CLAY_COLORS.cardBorder,
  },
  tableColHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.8,
    fontFamily: CLAY_FONTS.heading,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.07)',
  },
  tableCol: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  companyNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.2,
  },
  roleSubText: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
  },
  dateTimeBadge: {
    backgroundColor: CLAY_COLORS.primaryLighter,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  dateTimeText: {
    fontSize: 11.5,
    color: CLAY_COLORS.primaryDark,
    fontWeight: '700',
    fontFamily: CLAY_FONTS.body,
  },
  roundNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  typeBadge: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readinessNum: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: CLAY_FONTS.heading,
  },
  readinessLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.body,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: 0.3,
  },
  actionBtn: {
    backgroundColor: CLAY_COLORS.paper,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
    ...CLAY_SHADOWS.buttonSecondary,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  calendarStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  calendarDayBox: {
    flex: 1,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
    gap: 4,
  },
  calendarDayBoxActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  calDayName: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  calSub: {
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  calEventTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  emptyRow: {
    padding: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    textAlign: 'center',
    paddingVertical: 12,
  },
});

