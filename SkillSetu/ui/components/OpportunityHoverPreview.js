import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { View, StyleSheet, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { colors, radii, space, shadows, toneOf, webOnly } from '../theme';
import Txt from './Txt';
import Icon from './Icon';
import { Avatar, Pill, Button, IconButton, Inset, Ring } from './primitives';
import { formatDate, formatCurrency } from '../../i18n/format';
import { fetchInternshipDetail } from '../../Screens/Student/services/internshipService';
import { fetchScholarshipDetail } from '../../Screens/Student/services/scholarshipService';
import {
  getCachedPreviewDetail,
  setCachedPreviewDetail,
  fetchPreviewDetailWithCache,
} from '../../Screens/Student/services/opportunityPreviewCache';

const HOVER_DELAY_MS = 280;
const LEAVE_DELAY_MS = 220;
const PREVIEW_WIDTH = 430;
const PREVIEW_ESTIMATED_HEIGHT = 490;

// Global singleton tracker to ensure at most one preview is open across the entire page
let globalCloseActivePreview = null;

// HTML tag stripper and entity decoder
function sanitizeScrapedText(html) {
  if (!html) return '';
  let str = String(html);
  str = str.replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '');
  str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
  str = str.replace(/<\s*br\s*\/?>/gi, ' ');
  str = str.replace(/<\/(p|div|section|article|h[1-6]|tr|blockquote)>/gi, ' ');
  str = str.replace(/<\/li>/gi, ' • ');
  str = str.replace(/<(li|dt)>/gi, ' • ');
  str = str.replace(/<[a-zA-Z\/][^>]*$/g, '');
  str = str.replace(/<[^>]+>/g, ' ');
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&bull;': '•',
    '&middot;': '·',
    '&mdash;': '—',
    '&ndash;': '–',
  };
  str = str.replace(/&[a-zA-Z0-9#]+;/g, (m) => entities[m] || m);
  return str.replace(/\s+/g, ' ').trim();
}

function getSkillName(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.skill_name || s.name || s.title || s.label || s.skill_id || String(s);
}

function getSkillKey(s, idx) {
  if (!s) return `skill-${idx}`;
  if (typeof s === 'string') return `skill-${s}-${idx}`;
  return `skill-${s.skill_id || s.id || s.skill_name || s.name || idx}-${idx}`;
}

/**
 * Calculates optimal viewport coordinates for floating preview panel.
 * Automatically flips left/right and clamps vertically to avoid clipping.
 */
function calculatePosition(anchorRect) {
  if (!anchorRect) return { top: 0, left: 0, maxHeight: 480, placement: 'right' };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const gap = 12;
  const padding = 14;

  const spaceRight = vw - (anchorRect.right + gap);
  const spaceLeft = anchorRect.left - gap;
  let left = anchorRect.right + gap;
  let placement = 'right';

  if (spaceRight >= PREVIEW_WIDTH) {
    left = anchorRect.right + gap;
    placement = 'right';
  } else if (spaceLeft >= PREVIEW_WIDTH) {
    left = anchorRect.left - PREVIEW_WIDTH - gap;
    placement = 'left';
  } else {
    // Center or clamp if both sides are constrained
    left = Math.max(padding, Math.min(anchorRect.left, vw - PREVIEW_WIDTH - padding));
    placement = 'overlay';
  }

  // Vertical placement
  let top = anchorRect.top;
  if (top + PREVIEW_ESTIMATED_HEIGHT > vh - padding) {
    top = Math.max(padding, vh - PREVIEW_ESTIMATED_HEIGHT - padding);
  }
  if (top < padding) {
    top = padding;
  }

  const maxHeight = Math.min(PREVIEW_ESTIMATED_HEIGHT, vh - 2 * padding);
  return { top, left, maxHeight, placement };
}

/**
 * Shared OpportunityHoverPreview component.
 * Wraps internship or scholarship cards and displays a floating preview panel on hover.
 */
export default function OpportunityHoverPreview({
  type = 'internship', // 'internship' | 'scholarship'
  item,
  studentEmail = '',
  isReady = false,
  onOpenDetails,
  onSave,
  onApply,
  saving = false,
  applying = false,
  style,
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [detailData, setDetailData] = useState(() => {
    return (item && item.id && getCachedPreviewDetail(type, item.id, studentEmail)) || null;
  });

  const anchorRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const isPointerInsideRef = useRef(false);

  const animOpacity = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(6)).current;

  // Merged live opportunity data: base item supplemented by asynchronously fetched details
  const currentItem = useMemo(() => {
    return { ...item, ...(detailData || {}) };
  }, [item, detailData]);

  // Clean close handler
  const closePreview = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    isPointerInsideRef.current = false;

    if (globalCloseActivePreview === closePreview) {
      globalCloseActivePreview = null;
    }

    Animated.parallel([
      Animated.timing(animOpacity, { toValue: 0, duration: 120, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animTranslateY, { toValue: 6, duration: 120, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      setIsOpen(false);
    });
  }, [animOpacity, animTranslateY]);

  // Open preview with edge positioning and detail fetching
  const openPreview = useCallback(() => {
    if (!anchorRef.current) return;

    // Close any other currently active preview immediately
    if (globalCloseActivePreview && globalCloseActivePreview !== closePreview) {
      globalCloseActivePreview();
    }
    globalCloseActivePreview = closePreview;

    let rect = null;
    if (Platform.OS === 'web' && typeof anchorRef.current.getBoundingClientRect === 'function') {
      rect = anchorRef.current.getBoundingClientRect();
    }

    const calculated = calculatePosition(rect);
    setCoords(calculated);
    setIsOpen(true);

    // Fade and slide animation
    animOpacity.setValue(0);
    animTranslateY.setValue(6);
    Animated.parallel([
      Animated.timing(animOpacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animTranslateY, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    // Check cache or fetch detailed data asynchronously
    if (item?.id) {
      const cached = getCachedPreviewDetail(type, item.id, studentEmail);
      if (cached) {
        setDetailData(cached);
      } else {
        const fetcher = type === 'internship' ? fetchInternshipDetail : fetchScholarshipDetail;
        fetchPreviewDetailWithCache(type, item.id, studentEmail, fetcher).then((res) => {
          if (res) {
            setDetailData(res);
          }
        });
      }
    }
  }, [item, studentEmail, type, closePreview, animOpacity, animTranslateY]);

  // Mouse Enter on Card
  const handleMouseEnter = useCallback(
    (e) => {
      // Ignore if touch device
      if (e?.pointerType === 'touch') return;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) {
        return;
      }

      isPointerInsideRef.current = true;
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }

      if (isOpen) return;

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = setTimeout(() => {
        openPreview();
      }, HOVER_DELAY_MS);
    },
    [isOpen, openPreview]
  );

  // Mouse Leave Card
  const handleMouseLeave = useCallback((e) => {
    if (e?.pointerType === 'touch') return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    isPointerInsideRef.current = false;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      if (!isPointerInsideRef.current) {
        closePreview();
      }
    }, LEAVE_DELAY_MS);
  }, [closePreview]);

  // Mouse Enter on Floating Preview Panel
  const handlePreviewMouseEnter = useCallback(() => {
    isPointerInsideRef.current = true;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  // Mouse Leave from Floating Preview Panel
  const handlePreviewMouseLeave = useCallback(() => {
    isPointerInsideRef.current = false;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      if (!isPointerInsideRef.current) {
        closePreview();
      }
    }, LEAVE_DELAY_MS);
  }, [closePreview]);

  // Dismiss on Escape key & close on scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };

    const handleScroll = () => {
      closePreview();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', handleScroll, { capture: true });
      }
    };
  }, [isOpen, closePreview]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      if (globalCloseActivePreview === closePreview) {
        globalCloseActivePreview = null;
      }
    };
  }, [closePreview]);

  // Render floating content based on opportunity type
  const renderPreviewBody = () => {
    if (type === 'internship') {
      return (
        <InternshipPreviewContent
          job={currentItem}
          isReady={isReady}
          saving={saving}
          applying={applying}
          onOpenDetails={() => {
            closePreview();
            onOpenDetails && onOpenDetails(currentItem);
          }}
          onSave={() => {
            onSave && onSave(currentItem);
          }}
          onApply={() => {
            closePreview();
            onApply && onApply(currentItem);
          }}
        />
      );
    }

    return (
      <ScholarshipPreviewContent
        sch={currentItem}
        saving={saving}
        applying={applying}
        onOpenDetails={() => {
          closePreview();
          onOpenDetails && onOpenDetails(currentItem);
        }}
        onSave={() => {
          onSave && onSave(currentItem);
        }}
        onApply={() => {
          closePreview();
          onApply && onApply(currentItem);
        }}
      />
    );
  };

  const portalContent =
    isOpen && coords && Platform.OS === 'web' && typeof document !== 'undefined'
      ? ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: Math.min(PREVIEW_WIDTH, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 28),
              maxHeight: coords.maxHeight,
              zIndex: 999999,
              pointerEvents: 'auto',
            }}
            onMouseEnter={handlePreviewMouseEnter}
            onMouseLeave={handlePreviewMouseLeave}
          >
            <Animated.View
              style={[
                styles.floatingPanel,
                shadows.float,
                {
                  opacity: animOpacity,
                  transform: [{ translateY: animTranslateY }],
                  maxHeight: coords.maxHeight,
                },
              ]}
            >
              {renderPreviewBody()}
            </Animated.View>
          </div>,
          document.body
        )
      : null;

  return (
    <View
      ref={anchorRef}
      style={[styles.anchorContainer, style]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {portalContent}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Internship Preview Content
// -----------------------------------------------------------------------------
function InternshipPreviewContent({ job, isReady, saving, applying, onOpenDetails, onSave, onApply }) {
  const companyName = job.company || job.company_name || 'Employer';
  const score = Math.round(job.match_score || 0);
  const verifiedRecruiter = job.source === 'recruiter_posting' || !!job.company_id;
  const skills = job.required_skills || job.skills || [];
  const cleanDesc = sanitizeScrapedText(job.description || '');

  // Match analysis info
  const matchAnalysis = job.match_analysis || {};
  const matchedSkills = matchAnalysis.matched_skills || job.matched_skills || [];
  const missingSkills = matchAnalysis.missing_skills || job.missing_skills || [];
  const hardFailures = matchAnalysis.hard_failures || [];
  const isHardFailed = hardFailures.length > 0;
  const isNeedsVerification = job.eligibility_status === 'NEEDS_VERIFICATION' || matchAnalysis.eligibility_status === 'NEEDS_VERIFICATION';

  const threshold = job.application_threshold != null ? job.application_threshold : 80;
  const ready = isReady ?? (score >= threshold && !isHardFailed && !isNeedsVerification);

  // Status tone and label
  const statusTone = ready
    ? 'success'
    : isHardFailed
    ? 'danger'
    : isNeedsVerification
    ? 'neutral'
    : 'warning';

  const statusLabel = ready
    ? 'Eligible · Ready to apply'
    : isHardFailed
    ? 'Mandatory requirement blocked'
    : isNeedsVerification
    ? 'Eligibility needs verification'
    : `Need ${threshold}% to apply (Current: ${score}%)`;

  // Recommended course/test fallback
  const recCourses = job.recommended_courses || [];
  const recAssessments = job.recommended_assessments || [];
  const firstMissingName =
    missingSkills.length > 0
      ? typeof missingSkills[0] === 'string'
        ? missingSkills[0]
        : missingSkills[0]?.skill_name || missingSkills[0]?.name || 'required skill'
      : '';
  const topAction =
    recCourses.length > 0
      ? `Enroll in ${recCourses[0].title || recCourses[0].name || 'recommended course'}`
      : recAssessments.length > 0
      ? `Take verified ${recAssessments[0].title || recAssessments[0].name || 'skill assessment'}`
      : firstMissingName
      ? `Verify ${firstMissingName} through coursework or project submission`
      : 'Review qualification details';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. HEADER */}
      <View style={styles.headerRow}>
        <Avatar name={companyName} uri={job.company_logo || undefined} size={42} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt variant="bodyStrong" tone="ink" numberOfLines={2}>
            {job.title || 'Internship Opportunity'}
          </Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>
            {companyName} · {job.work_mode || (job.is_remote ? 'Remote' : 'On-site')}
            {job.location ? ` · ${job.location}` : ''}
          </Txt>
          <View style={styles.badgeRow}>
            <Pill
              label={verifiedRecruiter ? 'Verified recruiter' : job.source || 'External listing'}
              tone={verifiedRecruiter ? 'success' : 'neutral'}
              icon={verifiedRecruiter ? 'ShieldCheck' : 'Globe'}
              size="sm"
            />
            {job.job_type || job.opportunity_type ? (
              <Pill label={job.job_type || job.opportunity_type} tone="info" size="sm" />
            ) : null}
          </View>
        </View>
        <Ring value={score} size={50} stroke={5} tone={ready ? 'success' : 'warning'}>
          <Txt variant="caption" weight={700} tone="ink">
            {score}%
          </Txt>
        </Ring>
      </View>

      {/* 2. OVERVIEW */}
      <View style={styles.section}>
        <View style={styles.infoGrid}>
          <InfoCell
            icon="Wallet"
            label="Stipend"
            value={job.stipend || 'Not specified'}
            tone="warning"
          />
          <InfoCell
            icon="Clock"
            label="Duration"
            value={job.duration || 'Not specified'}
            tone="info"
          />
          <InfoCell
            icon="Calendar"
            label="Deadline"
            value={
              job.application_deadline
                ? formatDate(job.application_deadline, { month: 'short', day: 'numeric' })
                : 'Not specified'
            }
            tone="neutral"
          />
        </View>

        {cleanDesc ? (
          <View style={styles.descBox}>
            <Txt variant="caption" tone="muted" numberOfLines={3} style={{ lineHeight: 18 }}>
              {cleanDesc}
            </Txt>
          </View>
        ) : null}
      </View>

      {/* 3. REQUIREMENTS & SKILLS */}
      {skills.length > 0 ? (
        <View style={styles.section}>
          <Txt variant="overline" tone="subtle" style={{ marginBottom: 6 }}>
            Required Skills & Technologies
          </Txt>
          <View style={styles.skillWrap}>
            {skills.slice(0, 5).map((s, idx) => (
              <Pill key={getSkillKey(s, idx)} label={getSkillName(s)} tone="info" size="sm" />
            ))}
            {skills.length > 5 ? (
              <Pill label={`+${skills.length - 5} more`} size="sm" tone="neutral" />
            ) : null}
          </View>
        </View>
      ) : null}

      {/* 4. SKILLSETU AI MATCH ANALYSIS */}
      <View style={styles.section}>
        <Inset tone={statusTone} padding={space.sm} style={{ borderRadius: radii.md }}>
          <View style={styles.analysisHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Icon
                name={ready ? 'CircleCheck' : isHardFailed ? 'CircleAlert' : 'Clock'}
                size={16}
                color={toneOf(statusTone).ink}
              />
              <Txt variant="caption" weight={700} color={toneOf(statusTone).ink}>
                {statusLabel}
              </Txt>
            </View>
            <Txt variant="caption" weight={600} color={toneOf(statusTone).ink}>
              {score}% / {threshold}%
            </Txt>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(8, score))}%`,
                  backgroundColor: ready ? colors.mintInk : colors.butterInk,
                },
              ]}
            />
          </View>

          {/* Matched vs Missing Pills */}
          {matchedSkills.length > 0 || missingSkills.length > 0 ? (
            <View style={{ gap: 4, marginTop: 8 }}>
              {matchedSkills.length > 0 ? (
                <View style={styles.skillWrap}>
                  <Txt variant="caption" tone="subtle" style={{ alignSelf: 'center', marginRight: 2 }}>
                    Matched:
                  </Txt>
                  {matchedSkills.slice(0, 3).map((m, idx) => (
                    <Pill key={getSkillKey(m, idx)} label={getSkillName(m)} icon="Check" tone="success" size="sm" />
                  ))}
                  {matchedSkills.length > 3 ? (
                    <Txt variant="caption" tone="muted">+{matchedSkills.length - 3}</Txt>
                  ) : null}
                </View>
              ) : null}

              {missingSkills.length > 0 ? (
                <View style={styles.skillWrap}>
                  <Txt variant="caption" tone="subtle" style={{ alignSelf: 'center', marginRight: 2 }}>
                    Missing:
                  </Txt>
                  {missingSkills.slice(0, 3).map((m, idx) => (
                    <Pill key={getSkillKey(m, idx)} label={getSkillName(m)} icon="CircleAlert" tone="warning" size="sm" />
                  ))}
                  {missingSkills.length > 3 ? (
                    <Txt variant="caption" tone="muted">+{missingSkills.length - 3}</Txt>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Impact Action */}
          {!ready ? (
            <View style={styles.recommendationBox}>
              <Icon name="Route" size={13} color={colors.textMuted} />
              <Txt variant="caption" tone="default" numberOfLines={1} style={{ flex: 1 }}>
                {topAction}
              </Txt>
            </View>
          ) : null}
        </Inset>
      </View>

      {/* 5. ACTION BUTTONS */}
      <View style={styles.footerRow}>
        <Button
          label="View details"
          variant="secondary"
          size="sm"
          icon="FileText"
          onPress={onOpenDetails}
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <IconButton
            icon="Bookmark"
            variant={job.is_saved ? 'dark' : 'soft'}
            onPress={onSave}
            disabled={saving}
            size={34}
            accessibilityLabel={job.is_saved ? 'Unsave' : 'Save'}
          />
          {ready ? (
            <Button
              label="Apply"
              size="sm"
              iconRight="ArrowUpRight"
              onPress={onApply}
              loading={applying}
            />
          ) : (
            <Button
              label="Improve match"
              size="sm"
              variant="outline"
              icon="Route"
              onPress={onApply}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// -----------------------------------------------------------------------------
// Scholarship Preview Content
// -----------------------------------------------------------------------------
function ScholarshipPreviewContent({ sch, saving, applying, onOpenDetails, onSave, onApply }) {
  const provider = sch.provider || 'Sponsoring Body';
  const checkpoints = sch.checkpoints || sch.evaluation_checkpoints || [];
  const passedChecks = checkpoints.filter((c) => c.passed === true).length;
  const isUrgent = sch.days_remaining != null && sch.days_remaining <= 30;

  const eligStatus = sch.eligibility_status || 'UNKNOWN';
  const eligTone =
    eligStatus === 'ELIGIBLE'
      ? 'success'
      : eligStatus === 'POSSIBLY_ELIGIBLE'
      ? 'info'
      : eligStatus === 'NOT_ELIGIBLE'
      ? 'danger'
      : 'neutral';

  const eligLabel =
    eligStatus === 'ELIGIBLE'
      ? 'Eligible'
      : eligStatus === 'POSSIBLY_ELIGIBLE'
      ? 'Possibly eligible'
      : eligStatus === 'NOT_ELIGIBLE'
      ? 'Not eligible'
      : 'Check eligibility';

  const cleanDesc = sanitizeScrapedText(sch.description || '');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. HEADER */}
      <View style={styles.headerRow}>
        <Avatar name={provider} size={42} tone="warning" />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt variant="bodyStrong" tone="ink" numberOfLines={2}>
            {sch.name || 'Scholarship Scheme'}
          </Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>
            {provider} · {sch.scholarship_type || sch.category || 'National Scheme'}
          </Txt>
          <View style={styles.badgeRow}>
            <Pill
              label={`${eligLabel}${sch.match_percentage ? ` · ${Math.round(sch.match_percentage)}%` : ''}`}
              tone={eligTone}
              size="sm"
            />
            {isUrgent ? (
              <Pill
                label={`${sch.days_remaining}d left`}
                tone="danger"
                icon="Clock"
                size="sm"
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* 2. FUNDING & DEADLINE GRID */}
      <View style={styles.section}>
        <View style={styles.infoGrid}>
          <InfoCell
            icon="Wallet"
            label="Grant Value"
            value={sch.award_description || (sch.award_amount ? formatCurrency(sch.award_amount) : 'Not specified')}
            tone="warning"
          />
          <InfoCell
            icon="GraduationCap"
            label="Education"
            value={sch.education_level || sch.target_course || 'All eligible courses'}
            tone="info"
          />
          <InfoCell
            icon="Calendar"
            label="Deadline"
            value={
              sch.application_deadline
                ? formatDate(sch.application_deadline, { month: 'short', day: 'numeric' })
                : 'Not specified'
            }
            tone="neutral"
          />
        </View>

        {cleanDesc ? (
          <View style={styles.descBox}>
            <Txt variant="caption" tone="muted" numberOfLines={3} style={{ lineHeight: 18 }}>
              {cleanDesc}
            </Txt>
          </View>
        ) : null}
      </View>

      {/* 3. ELIGIBILITY CRITERIA & REGIONS */}
      <View style={styles.section}>
        <Txt variant="overline" tone="subtle" style={{ marginBottom: 6 }}>
          Coverage & Conditions
        </Txt>
        <View style={styles.skillWrap}>
          {sch.domicile_state || sch.state ? (
            <Pill label={`Region: ${sch.domicile_state || sch.state}`} tone="neutral" icon="MapPin" size="sm" />
          ) : (
            <Pill label="Region: All India" tone="neutral" icon="MapPin" size="sm" />
          )}
          {sch.income_criteria || sch.income_limit ? (
            <Pill
              label={sch.income_criteria || `Income < ${formatCurrency(sch.income_limit)}`}
              tone="neutral"
              icon="Wallet"
              size="sm"
            />
          ) : null}
          {sch.funding_type ? (
            <Pill label={sch.funding_type} tone="info" size="sm" />
          ) : null}
        </View>
      </View>

      {/* 4. SKILLSETU EVALUATION CHECKPOINTS */}
      {checkpoints.length > 0 ? (
        <View style={styles.section}>
          <Inset tone={eligTone} padding={space.sm} style={{ borderRadius: radii.md }}>
            <View style={styles.analysisHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon
                  name={eligStatus === 'ELIGIBLE' ? 'CircleCheck' : 'CircleAlert'}
                  size={15}
                  color={toneOf(eligTone).ink}
                />
                <Txt variant="caption" weight={700} color={toneOf(eligTone).ink}>
                  Eligibility Verification
                </Txt>
              </View>
              <Txt variant="caption" weight={600} color={toneOf(eligTone).ink}>
                {passedChecks}/{checkpoints.length} passed
              </Txt>
            </View>

            <View style={{ gap: 4, marginTop: 6 }}>
              {checkpoints.slice(0, 3).map((c, idx) => (
                <View key={c.criterion || idx} style={styles.checkpointRow}>
                  <Icon
                    name={c.passed === true ? 'CircleCheck' : c.passed === false ? 'X' : 'CircleAlert'}
                    size={13}
                    color={c.passed === true ? colors.mintInk : c.passed === false ? '#B4232A' : colors.butterInk}
                  />
                  <Txt variant="caption" tone="default" numberOfLines={1} style={{ flex: 1 }}>
                    {c.criterion}: {typeof c.student_value === 'object' ? (c.student_value?.value ?? JSON.stringify(c.student_value)) : (c.student_value || 'Pending')} ({typeof c.required === 'object' ? (c.required?.value ?? JSON.stringify(c.required)) : (c.required || 'Required')})
                  </Txt>
                </View>
              ))}
            </View>
          </Inset>
        </View>
      ) : null}

      {/* 5. ACTION BUTTONS */}
      <View style={styles.footerRow}>
        <Button
          label="View details"
          variant="secondary"
          size="sm"
          icon="FileText"
          onPress={onOpenDetails}
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <IconButton
            icon="Bookmark"
            variant={sch.is_saved ? 'dark' : 'soft'}
            onPress={onSave}
            disabled={saving}
            size={34}
            accessibilityLabel={sch.is_saved ? 'Unsave' : 'Save'}
          />
          <Button
            label="Apply"
            size="sm"
            iconRight="ArrowUpRight"
            onPress={onApply}
            loading={applying}
          />
        </View>
      </View>
    </ScrollView>
  );
}

// Compact Grid Tile helper
function InfoCell({ icon, label, value, tone = 'neutral' }) {
  const t = toneOf(tone);
  return (
    <View style={styles.infoCell}>
      <View style={[styles.infoCellIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={13} color={t.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="caption" tone="subtle" numberOfLines={1}>
          {label}
        </Txt>
        <Txt variant="caption" weight={700} tone="ink" numberOfLines={1}>
          {value}
        </Txt>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  anchorContainer: {
    position: 'relative',
  },
  floatingPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...webOnly({
      boxShadow: '0 24px 54px -10px rgba(17, 17, 19, 0.22), 0 0 1px rgba(17, 17, 19, 0.14)',
      backdropFilter: 'blur(12px)',
    }),
  },
  scrollContainer: {
    maxHeight: 520,
  },
  contentContainer: {
    padding: space.md,
    gap: space.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingBottom: space.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  section: {
    gap: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    padding: 8,
    borderRadius: radii.md,
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  infoCellIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descBox: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  skillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  checkpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
});
