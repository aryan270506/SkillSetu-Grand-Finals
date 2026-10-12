import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
} from './ScholarshipDesignTokens';

export default function ScholarshipDetailModal({
  visible = false,
  scholarship = null,
  onClose,
  onApply,
  onToggleSave,
  isSaving = false,
}) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [modalRendered, setModalRendered] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.91)).current;
  const modalTranslateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    if (visible) {
      setModalRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(modalScale, {
          toValue: 1.0,
          friction: 6,
          tension: 90,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(modalTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 90,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else if (modalRendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(modalScale, {
          toValue: 0.93,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(modalTranslateY, {
          toValue: 20,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setModalRendered(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(modalScale, {
        toValue: 0.93,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(modalTranslateY, {
        toValue: 20,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setModalRendered(false);
      if (onClose) onClose();
    });
  };

  if (!modalRendered || !scholarship) return null;

  const {
    id,
    name,
    provider,
    description,
    academic_year,
    scholarship_type,
    award_amount,
    award_description,
    award_frequency,
    application_open,
    application_deadline,
    days_remaining,
    checkpoints = [],
    missing_info = [],
    source,
    source_url,
    application_url,
    is_saved,
    has_applied,
  } = scholarship;

  const openUrl = (url) => {
    if (!url) return;
    Linking.openURL(url).catch((err) => console.warn('Cannot open URL:', err));
  };

  const deadlineFormatted = application_deadline
    ? new Date(application_deadline).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Open Rolling Basis';

  const openDateFormatted = application_open
    ? new Date(application_open).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  return (
    <Modal
      visible={modalRendered}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            CLAY_SHADOWS.modal,
            {
              maxHeight: height * 0.88,
              width: isMobile ? '92%' : 680,
              transform: [
                { scale: modalScale },
                { translateY: modalTranslateY },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerLabel}>{provider}</Text>
              <Text style={styles.modalTitle}>{name}</Text>
            </View>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.closeBtn,
                {
                  transform: [{ scale: pressed ? 0.90 : hovered ? 1.10 : 1 }],
                },
              ]}
              onPress={handleClose}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Scrollable Body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Badges */}
            <View style={styles.badgesRow}>
              {scholarship_type ? (
                <ClayBadge text={scholarship_type} variant="primary" size="sm" />
              ) : null}
              {academic_year ? (
                <ClayBadge text={`Session ${academic_year}`} variant="muted" size="sm" />
              ) : null}
              {days_remaining != null ? (
                <ClayBadge
                  text={`${days_remaining} days remaining`}
                  variant={days_remaining <= 7 ? 'crimson' : days_remaining <= 30 ? 'amber' : 'emerald'}
                  size="sm"
                />
              ) : null}
            </View>

            {/* Description */}
            <Text style={styles.sectionHeading}>Scheme Overview</Text>
            <Text style={styles.descriptionText}>{description}</Text>

            {/* Grant & Financial Breakdown */}
            <Text style={styles.sectionHeading}>Financial Grant Details</Text>
            <View style={styles.grantBox}>
              <View style={styles.grantRow}>
                <Text style={styles.grantLabel}>Grant Amount:</Text>
                <Text style={styles.grantValue}>
                  {award_description || (award_amount ? `₹${Number(award_amount).toLocaleString('en-IN')}` : 'Variable Grant')}
                </Text>
              </View>
              {award_frequency ? (
                <View style={styles.grantRow}>
                  <Text style={styles.grantLabel}>Disbursement Cycle:</Text>
                  <Text style={styles.grantSubValue}>{award_frequency}</Text>
                </View>
              ) : null}
            </View>

            {/* Application Timelines */}
            <Text style={styles.sectionHeading}>Application Timelines</Text>
            <View style={styles.timelineBox}>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineKey}>Portal Open Date:</Text>
                <Text style={styles.timelineVal}>{openDateFormatted}</Text>
              </View>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineKey}>Submission Deadline:</Text>
                <Text style={[styles.timelineVal, { color: CLAY_COLORS.amberText, fontWeight: '800' }]}>
                  {deadlineFormatted}
                </Text>
              </View>
            </View>

            {/* Eligibility Rule Evaluation */}
            <Text style={styles.sectionHeading}>Deterministic Rule Verification</Text>
            {checkpoints && checkpoints.length > 0 ? (
              <View style={styles.checkpointsContainer}>
                {checkpoints.map((cp, idx) => (
                  <View key={idx} style={styles.checkpointCard}>
                    <View style={styles.checkpointTop}>
                      <Text style={styles.checkpointCriterion}>{cp.criterion}</Text>
                      <ClayBadge
                        text={cp.passed ? '✓ PASSED' : cp.passed === false ? '✕ FAILED' : '• UNVERIFIED'}
                        variant={cp.passed ? 'emerald' : cp.passed === false ? 'crimson' : 'amber'}
                        size="sm"
                      />
                    </View>
                    <Text style={styles.checkpointRequired}>
                      Required Rule: <Text style={{ fontWeight: '700' }}>{cp.required}</Text>
                    </Text>
                    <Text style={styles.checkpointStudentVal}>
                      Your Profile Value: <Text style={{ fontWeight: '700' }}>{cp.student_value || 'Not provided'}</Text>
                    </Text>
                    {cp.reason ? (
                      <Text style={styles.checkpointReason}>{cp.reason}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyCheckpoints}>
                All standard higher education merit-cum-means criteria apply.
              </Text>
            )}

            {/* Missing Profile Fields Alert if any */}
            {missing_info && missing_info.length > 0 ? (
              <View style={styles.missingInfoBox}>
                <Text style={styles.missingInfoTitle}>⚠️ Profile Data Needed for Full Verification:</Text>
                <Text style={styles.missingInfoList}>
                  {missing_info.map((f) => `• ${f.replace(/_/g, ' ')}`).join('\n')}
                </Text>
              </View>
            ) : null}

            {/* Source Provenance */}
            <Text style={styles.sectionHeading}>Official Source & Provenance</Text>
            <View style={styles.sourceBox}>
              <Text style={styles.sourceText}>
                Verified from: <Text style={{ fontWeight: '800' }}>{source?.toUpperCase() || 'Official Web Portal'}</Text>
              </Text>
              {source_url ? (
                <Pressable onPress={() => openUrl(source_url)} style={styles.sourceLinkRow}>
                  <Text style={styles.sourceLinkText}>View Official Scheme Page ↗</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.btnModalSave,
                is_saved && styles.btnModalSaveActive,
                {
                  transform: [{ scale: pressed ? 0.94 : hovered ? 1.05 : 1 }],
                },
              ]}
              onPress={() => onToggleSave(scholarship)}
              disabled={isSaving}
            >
              <Text style={[styles.btnModalSaveText, is_saved && styles.btnModalSaveTextActive]}>
                {is_saved ? '★ Saved' : '☆ Bookmark'}
              </Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.btnModalApply,
                {
                  transform: [
                    { translateY: hovered ? -2 : 0 },
                    { scale: pressed ? 0.97 : hovered ? 1.02 : 1 },
                  ],
                },
              ]}
              onPress={() => {
                handleClose();
                onApply(scholarship);
              }}
            >
              <Text style={styles.btnModalApplyText}>
                {has_applied ? 'Tracked ✓ Launch Official Portal ↗' : 'Launch Official Portal ↗'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.borderLight,
    gap: 16,
  },
  providerLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: CLAY_RADII.full,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.18s ease',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  modalBody: {
    paddingHorizontal: 22,
  },
  modalBodyContent: {
    paddingVertical: 18,
    gap: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  sectionHeading: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  descriptionText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '400',
    color: CLAY_COLORS.muted,
    lineHeight: 21,
  },
  grantBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderRadius: CLAY_RADII.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    gap: 6,
  },
  grantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grantLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  grantValue: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  grantSubValue: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  timelineBox: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderRadius: CLAY_RADII.md,
    padding: 14,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineKey: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  timelineVal: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  checkpointsContainer: {
    gap: 8,
  },
  checkpointCard: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderRadius: CLAY_RADII.md,
    padding: 12,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    gap: 4,
  },
  checkpointTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkpointCriterion: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  checkpointRequired: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  checkpointStudentVal: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
  },
  checkpointReason: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 11.5,
    fontStyle: 'italic',
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  emptyCheckpoints: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    color: CLAY_COLORS.muted,
  },
  missingInfoBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: CLAY_RADII.md,
    padding: 12,
    gap: 4,
  },
  missingInfoTitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.amberText,
  },
  missingInfoList: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.amberText,
    lineHeight: 18,
  },
  sourceBox: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderRadius: CLAY_RADII.md,
    padding: 12,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    gap: 6,
  },
  sourceText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
  },
  sourceLinkRow: {
    alignSelf: 'flex-start',
  },
  sourceLinkText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    textDecorationLine: 'underline',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.borderLight,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  btnModalSave: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: CLAY_RADII.md,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderMedium,
    borderWidth: 1,
    transition: 'transform 0.18s ease',
  },
  btnModalSaveActive: {
    backgroundColor: CLAY_COLORS.secondaryBg,
    borderColor: 'rgba(219, 39, 119, 0.3)',
  },
  btnModalSaveText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  btnModalSaveTextActive: {
    color: CLAY_COLORS.secondary,
    fontWeight: '800',
  },
  btnModalApply: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: CLAY_RADII.md,
    backgroundColor: CLAY_COLORS.primary,
    alignItems: 'center',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  },
  btnModalApplyText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
