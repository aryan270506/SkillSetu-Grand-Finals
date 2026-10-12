import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

export default function ActiveCoursesSection({
  coursesList = [],
  filteredCourses = [],
  inProgressCourses = [],
  completedCourses = [],
  selectedStatusFilter,
  setSelectedStatusFilter,
  selectedProviderFilter,
  setSelectedProviderFilter,
  searchQuery,
  setSearchQuery,
  onSelectCourseForProgress,
  onOpenCourseUrl,
  onNavigateToSkills,
  displayCareerName,
  isDesktop,
}) {
  const savedCoursesCount = coursesList.filter((c) => !c.progress_percent).length;

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="ACTIVE ENROLLMENTS"
        title="Your Active Learning"
        subtitle={`Master core competencies across ${coursesList.length} pathway modules.`}
        rightElement={
          <ClayButton
            style={styles.headerBtn}
            onPress={() => setSelectedStatusFilter('all')}
          >
            <Text style={styles.headerBtnText}>
              View All Enrolled ({coursesList.length})
            </Text>
          </ClayButton>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <View style={styles.filterSection}>
        {/* Status Segmented Tabs */}
        <View style={styles.segmentedTabsRow}>
          {[
            { key: 'all', label: `All (${coursesList.length})` },
            { key: 'in_progress', label: `In-Progress (${inProgressCourses.length})` },
            { key: 'completed', label: `Completed (${completedCourses.length})` },
            { key: 'saved', label: `Saved (${savedCoursesCount})` },
          ].map((f) => {
            const isSel = selectedStatusFilter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.segmentedTab,
                  isSel && styles.segmentedTabActive,
                ]}
                onPress={() => setSelectedStatusFilter(f.key)}
              >
                <Text
                  style={[
                    styles.segmentedTabText,
                    isSel && styles.segmentedTabTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, skills, or instructors..."
            placeholderTextColor={CLAY_COLORS.mutedLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchBtn}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Provider Filter Row */}
      <View style={styles.providerFilterRow}>
        <Text style={styles.providerFilterLabel}>Provider Source:</Text>
        {['All', 'NPTEL', 'YouTube', 'freeCodeCamp'].map((p) => {
          const isPSelected = selectedProviderFilter.toLowerCase() === p.toLowerCase();
          return (
            <Pressable
              key={p}
              style={[
                styles.providerPill,
                isPSelected && styles.providerPillActive,
              ]}
              onPress={() => setSelectedProviderFilter(p)}
            >
              <Text
                style={[
                  styles.providerPillText,
                  isPSelected && styles.providerPillTextActive,
                ]}
              >
                {p}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Course Cards Grid */}
      {filteredCourses.length > 0 ? (
        <View
          style={[
            styles.courseGrid,
            isDesktop ? styles.courseGridDesktop : styles.courseGridMobile,
          ]}
        >
          {filteredCourses.map((course, idx) => {
            const providerName = (course.provider || 'youtube').toLowerCase();
            const providerBadge =
              providerName === 'nptel'
                ? { label: 'NPTEL', variant: 'sky' }
                : providerName === 'freecodecamp'
                  ? { label: 'freeCodeCamp', variant: 'amber' }
                  : { label: 'YouTube', variant: 'secondary' };

            const pct = Math.round(course.progress_percent || 0);

            return (
              <ClayCard
                key={course.learning_path_item_id || course.course_id || idx}
                style={styles.courseCard}
                hoverTranslate={-5}
              >
                {/* Course Header Banner */}
                <View style={styles.courseCardTop}>
                  <View style={styles.providerBadgeRow}>
                    <ClayBadge
                      label={providerBadge.label}
                      variant={providerBadge.variant}
                      size="small"
                    />
                    <Text style={styles.durationBadgeText}>
                      {course.stage || 'Intermediate'} • {course.estimated_hours || '8 hrs'}
                    </Text>
                  </View>

                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {course.title}
                  </Text>

                  <Text style={styles.courseSkills} numberOfLines={1}>
                    Addresses: {course.covered_skills?.join(', ') || course.skill_name || `${displayCareerName} Skill`}
                  </Text>
                </View>

                {/* Course Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressStatusText}>
                      {pct === 100
                        ? 'Completed (100%)'
                        : pct > 0
                          ? `${pct}% Active Track`
                          : 'Not Started (0%)'}
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          backgroundColor: pct === 100 ? CLAY_COLORS.emerald : CLAY_COLORS.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Footer Buttons */}
                <View style={styles.courseCardFooter}>
                  <ClayButton
                    style={styles.resumeBtn}
                    onPress={() => onSelectCourseForProgress(course)}
                  >
                    <Text style={styles.resumeBtnText}>
                      {pct > 0 ? 'Update Progress' : 'Start Course'}
                    </Text>
                  </ClayButton>

                  {course.canonical_url ? (
                    <ClayButton
                      style={styles.openUrlBtn}
                      onPress={() => onOpenCourseUrl(course.canonical_url)}
                    >
                      <Text style={styles.openUrlBtnText}>Open ↗</Text>
                    </ClayButton>
                  ) : null}

                  <ClayButton
                    style={styles.skillsBtn}
                    onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', { courseId: course.course_id })}
                  >
                    <Text style={styles.skillsBtnText}>🎯 View Skills</Text>
                  </ClayButton>
                </View>
              </ClayCard>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCoursesBox}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>📚</Text>
          <Text style={styles.emptyTitle}>No matching courses found</Text>
          <Text style={styles.emptySub}>
            Try changing your filter settings or search query.
          </Text>
          <ClayButton
            style={styles.resetFilterBtn}
            onPress={() => {
              setSelectedStatusFilter('all');
              setSelectedProviderFilter('All');
              setSearchQuery('');
            }}
          >
            <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
          </ClayButton>
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
  filterSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  segmentedTabsRow: {
    flexDirection: 'row',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.pill,
    padding: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  segmentedTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
  },
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
    ...CLAY_SHADOWS.badge,
  },
  segmentedTabText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  segmentedTabTextActive: {
    color: CLAY_COLORS.primary,
  },
  searchBarBox: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.foreground,
  },
  clearSearchBtn: {
    fontSize: 14,
    color: CLAY_COLORS.muted,
    padding: 4,
  },
  providerFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  providerFilterLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  providerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  providerPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  providerPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  providerPillTextActive: {
    color: '#FFFFFF',
  },
  courseGrid: {
    gap: 14,
  },
  courseGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  courseGridMobile: {
    flexDirection: 'column',
  },
  courseCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    justifyContent: 'space-between',
  },
  courseCardTop: {
    marginBottom: 12,
  },
  providerBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationBadgeText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  courseTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 20,
    marginBottom: 4,
  },
  courseSkills: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressStatusText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  courseCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  resumeBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
  },
  resumeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  openUrlBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  openUrlBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  skillsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  skillsBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  emptyCoursesBox: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
  },
  emptyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    marginBottom: 12,
  },
  resetFilterBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  resetFilterBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
