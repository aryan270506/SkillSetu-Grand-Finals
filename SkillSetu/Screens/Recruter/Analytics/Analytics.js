import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { recruiterService } from '../services/recruiterService';

const COLORS = {
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  textMain: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  primaryTeal: '#004D40',
  primaryTealHover: '#00382E',
  tealAccent: '#00BFA5',
  mintBg: '#E6F4F1',
  mintBorder: '#B2DFDB',
  mintBadge: '#D1FAE5',
  mintBadgeText: '#065F46',
  orangePillBg: '#FEF3C7',
  orangePillText: '#D97706',
  greenPillBg: '#DCFCE7',
  greenPillText: '#15803D',
  bluePillBg: '#E0F2FE',
  bluePillText: '#0369A1',
  redPillBg: '#FEE2E2',
  redPillText: '#DC2626',
  purplePillBg: '#F3E8FF',
  purplePillText: '#7E22CE',
  grayBg: '#F1F5F9',
  darkSurface: '#0F172A',
};

// Reusable Hover Card
function HoverCard({ children, style, hoverScale = 1.015, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scaleAnim, {
        toValue: hoverScale,
        friction: 7,
        tension: 100,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={{ flex: style?.flex, minWidth: style?.minWidth }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Switch Toggle Component
function ToggleSwitch({ value, onValueChange, label, disabled = false }) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.switchContainer,
        value ? styles.switchOn : styles.switchOff,
        disabled && styles.switchDisabled,
      ]}
    >
      <View style={[styles.switchThumb, value ? styles.thumbOn : styles.thumbOff]} />
      {label ? <Text style={[styles.switchLabel, value ? styles.labelOn : styles.labelOff]}>{label}</Text> : null}
    </Pressable>
  );
}

// ============================================================
// DATE, TIME & DROPDOWN PICKERS FOR ROUND SCHEDULING
// ============================================================

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function formatDateDisplay(dateStr) {
  if (!dateStr) return 'Select Date';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${d} ${SHORT_MONTHS[m] || ''} ${y}`;
    }
  } catch (e) {}
  return dateStr;
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return 'Select Time';
  try {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      return `${strHours}:${strMinutes} ${ampm}`;
    }
  } catch (e) {}
  return timeStr;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  try {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    return (h || 0) * 60 + (m || 0);
  } catch (e) {
    return 0;
  }
}

// 15-minute time intervals (96 intervals per day)
const TIME_SLOTS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const time24 = `${hh}:${mm}`;
    TIME_SLOTS.push({
      value: time24,
      label: formatTimeDisplay(time24),
      minutes: h * 60 + m,
    });
  }
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes (1 hr)' },
  { value: 90, label: '90 minutes (1.5 hrs)' },
  { value: 120, label: '120 minutes (2 hrs)' },
];

const GD_PREP_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 2, label: '2 minutes' },
  { value: 3, label: '3 minutes' },
  { value: 5, label: '5 minutes' },
];

const GD_DISCUSSION_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
];

const GD_ROOM_SIZE_OPTIONS = [
  { value: 3, label: '3 candidates' },
  { value: 4, label: '4 candidates' },
  { value: 5, label: '5 candidates' },
  { value: 6, label: '6 candidates' },
  { value: 8, label: '8 candidates' },
  { value: 10, label: '10 candidates' },
];

const CODING_LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C++',
  'C',
  'Go',
  'SQL',
];

// Interactive Calendar Date Picker
function SkillSetuDatePicker({ value, onChange, minDate, disabled = false }) {
  const [modalVisible, setModalVisible] = useState(false);

  const initDate = useMemo(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value, modalVisible]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${mm}-${dd}`;
      const isDisabled = minDate ? dateStr < minDate : false;
      const isSelected = value === dateStr;
      const isToday = todayStr === dateStr;

      cells.push({
        day: d,
        dateStr,
        isDisabled,
        isSelected,
        isToday,
        key: dateStr,
      });
    }
    return cells;
  }, [viewYear, viewMonth, minDate, value, todayStr]);

  const handleSelect = (cell) => {
    if (cell.isDisabled || !cell.dateStr) return;
    onChange(cell.dateStr);
    setModalVisible(false);
  };

  return (
    <View style={styles.pickerWrapper}>
      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        style={[styles.pickerTriggerBtn, disabled && styles.pickerTriggerDisabled]}
      >
        <Text style={styles.pickerTriggerIcon}>📅</Text>
        <Text style={[styles.pickerTriggerText, !value && styles.pickerTriggerPlaceholder]}>
          {formatDateDisplay(value)}
        </Text>
        <Text style={styles.pickerChevron}>▼</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.calendarModalCard} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={handlePrevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavBtnText}>◀</Text>
              </Pressable>
              <Text style={styles.calMonthYearTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={handleNextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavBtnText}>▶</Text>
              </Pressable>
            </View>

            <View style={styles.calDaysHeaderRow}>
              {DAY_LABELS.map((dl) => (
                <Text key={dl} style={styles.calDayLabel}>
                  {dl}
                </Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {calendarCells.map((cell) => {
                if (!cell.day) {
                  return <View key={cell.key} style={styles.calCellEmpty} />;
                }
                return (
                  <Pressable
                    key={cell.key}
                    disabled={cell.isDisabled}
                    onPress={() => handleSelect(cell)}
                    style={[
                      styles.calCell,
                      cell.isToday && styles.calCellToday,
                      cell.isSelected && styles.calCellSelected,
                      cell.isDisabled && styles.calCellDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calCellText,
                        cell.isToday && styles.calCellTextToday,
                        cell.isSelected && styles.calCellTextSelected,
                        cell.isDisabled && styles.calCellTextDisabled,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calFooter}>
              <Pressable
                style={styles.calTodayBtn}
                onPress={() => {
                  onChange(todayStr);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.calTodayBtnText}>Today</Text>
              </Pressable>
              <Pressable style={styles.calDoneBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.calDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// 15-minute Interval Time Picker Dropdown/Modal
function SkillSetuTimePicker({ value, onChange, minTime, disabled = false }) {
  const [modalVisible, setModalVisible] = useState(false);
  const minMinutes = useMemo(() => (minTime ? parseTimeToMinutes(minTime) : -1), [minTime]);

  return (
    <View style={styles.pickerWrapper}>
      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        style={[styles.pickerTriggerBtn, disabled && styles.pickerTriggerDisabled]}
      >
        <Text style={styles.pickerTriggerIcon}>🕐</Text>
        <Text style={[styles.pickerTriggerText, !value && styles.pickerTriggerPlaceholder]}>
          {formatTimeDisplay(value)}
        </Text>
        <Text style={styles.pickerChevron}>▼</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.timeModalCard} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.timeModalTitle}>Select Time (15-min intervals)</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.timeSlotsScroll} showsVerticalScrollIndicator={true}>
              <View style={styles.timeSlotsGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isPast = minMinutes >= 0 && slot.minutes <= minMinutes;
                  const isSelected = value === slot.value;
                  return (
                    <Pressable
                      key={slot.value}
                      disabled={isPast}
                      onPress={() => {
                        onChange(slot.value);
                        setModalVisible(false);
                      }}
                      style={[
                        styles.timeSlotPill,
                        isSelected && styles.timeSlotPillSelected,
                        isPast && styles.timeSlotPillDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeSlotPillText,
                          isSelected && styles.timeSlotPillTextSelected,
                          isPast && styles.timeSlotPillTextDisabled,
                        ]}
                      >
                        {slot.label} {isSelected ? '✓' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Reusable Select Dropdown (Timezone, Duration, GD parameters)
function SkillSetuSelectDropdown({ value, onChange, options = [], icon = '⏱️', placeholder = 'Select Option', disabled = false }) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  return (
    <View style={styles.pickerWrapper}>
      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        style={[styles.pickerTriggerBtn, disabled && styles.pickerTriggerDisabled]}
      >
        {icon ? <Text style={styles.pickerTriggerIcon}>{icon}</Text> : null}
        <Text style={[styles.pickerTriggerText, !selectedOption && styles.pickerTriggerPlaceholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.pickerChevron}>▼</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.selectModalCard} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.timeModalTitle}>{placeholder}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.selectOptionsScroll}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => {
                      onChange(opt.value);
                      setModalVisible(false);
                    }}
                    style={[styles.selectOptionItem, isSelected && styles.selectOptionItemSelected]}
                  >
                    <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected ? <Text style={styles.selectCheckmark}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function Analytics({ user, onNavigateTab }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const token = user?.token || user?.access_token || '';

  // 1. Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState('Assessment Management'); // 'Overview' | 'Assessment Management' | 'Assessment Reports'

  // 2. Internships & Selection State
  const [internships, setInternships] = useState([]);
  const [internshipsLoading, setInternshipsLoading] = useState(true);
  const [selectedInternshipId, setSelectedInternshipId] = useState(null);
  const [internshipDropdownOpen, setInternshipDropdownOpen] = useState(false);

  // 3. Assessment Configuration State
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [scheduleReviewModalVisible, setScheduleReviewModalVisible] = useState(false);
  const [scheduleReviewList, setScheduleReviewList] = useState([]);
  const [editScheduleModalVisible, setEditScheduleModalVisible] = useState(false);
  const [regenerateConfirmModalVisible, setRegenerateConfirmModalVisible] = useState(false);
  const [roundSequence, setRoundSequence] = useState(['aptitude', 'technical', 'interview', 'gd']);
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');
  const [configErrorMsg, setConfigErrorMsg] = useState('');
  const [configWarnings, setConfigWarnings] = useState([]);
  const [configData, setConfigData] = useState(null);

  // Overall Assessment Availability Window
  const [assessmentWindow, setAssessmentWindow] = useState({
    start_date: '2026-10-10',
    end_date: '2026-10-16',
    timezone: 'Asia/Kolkata',
  });

  // Form State for Assessment Pipeline with Intelligent Scheduling
  const [pipelineState, setPipelineState] = useState({
    aptitude: {
      enabled: true,
      question_count: 20,
      duration_min: 30,
      difficulty: 'Medium',
      question_types: ['MCQ', 'Numeric', 'Short Written'],
      schedule: {
        sequence: 1,
        schedule_mode: 'flexible_window',
        start_date: '2026-10-10',
        start_time: '10:00',
        end_date: '2026-10-11',
        end_time: '22:00',
        timezone: 'Asia/Kolkata',
        duration_minutes: 30,
      },
    },
    technical: {
      enabled: true,
      theory_enabled: true,
      coding_enabled: true,
      languages: ['Python', 'JavaScript'],
      duration_min: 45,
      difficulty: 'Medium',
      schedule: {
        sequence: 2,
        schedule_mode: 'flexible_window',
        start_date: '2026-10-11',
        start_time: '10:00',
        end_date: '2026-10-12',
        end_time: '22:00',
        timezone: 'Asia/Kolkata',
        duration_minutes: 45,
      },
    },
    interview: {
      enabled: true,
      duration_min: 20,
      schedule: {
        sequence: 3,
        schedule_mode: 'GEMINI_MANAGED',
        start_date: '2026-10-13',
        start_time: null,
        end_date: '2026-10-13',
        end_time: null,
        timezone: 'Asia/Kolkata',
        duration_minutes: 20,
      },
    },
    gd: {
      enabled: true,
      candidates_per_room: 5,
      prep_time_min: 2,
      discussion_time_min: 10,
      schedule: {
        sequence: 4,
        schedule_mode: 'fixed_session',
        start_date: '2026-10-15',
        start_time: '16:00',
        end_date: '2026-10-15',
        end_time: '16:40',
        timezone: 'Asia/Kolkata',
        duration_minutes: 40,
      },
    },
  });

  const [scoringWeights, setScoringWeights] = useState({
    aptitude: 20,
    technical: 40,
    interview: 20,
    gd: 20,
    passing_threshold: 60,
  });

  const [integrityConfig, setIntegrityConfig] = useState({
    camera_required: true,
    microphone_required: true,
    continuous_recording: true,
    integrity_monitoring: true,
  });

  // 4. Reports & Candidates State
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [candidatesList, setCandidatesList] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [reportFilterInternship, setReportFilterInternship] = useState('All');
  const [reportFilterStatus, setReportFilterStatus] = useState('All');
  const [reportFilterIntegrity, setReportFilterIntegrity] = useState('All');
  const [reportSearch, setReportSearch] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);

  // 5. Candidate Forensic Dossier Modal State
  const [selectedCandidateSessionId, setSelectedCandidateSessionId] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState(null);
  const [dossierActiveTab, setDossierActiveTab] = useState('Performance'); // 'Performance' | 'Integrity' | 'Dossier'

  // ==========================================
  // FETCH INTERNSHIPS (Authoritative Company Only)
  // ==========================================
  const loadInternships = useCallback(async () => {
    if (!token) return;
    setInternshipsLoading(true);
    try {
      const res = await recruiterService.getInternships(token);
      const list = res?.internships || [];
      setInternships(list);
      if (list.length > 0 && !selectedInternshipId) {
        setSelectedInternshipId(list[0].id);
      }
    } catch (err) {
      console.warn('Failed to load recruiter internships:', err);
    } finally {
      setInternshipsLoading(false);
    }
  }, [token, selectedInternshipId]);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  // ==========================================
  // FETCH ASSESSMENT CONFIG
  // ==========================================
  const loadAssessmentConfig = useCallback(async (internshipId) => {
    if (!token || !internshipId) return;
    setConfigLoading(true);
    setConfigErrorMsg('');
    try {
      const data = await recruiterService.getAssessmentConfig(token, internshipId);
      setConfigData(data);
      if (data?.config?.pipeline_config) {
        setPipelineState(data.config.pipeline_config);
      }
      if (data?.config?.scoring_weights) {
        setScoringWeights(data.config.scoring_weights);
      }
      if (data?.config?.integrity_config) {
        setIntegrityConfig(data.config.integrity_config);
      }
      if (data?.config?.assessment_window) {
        setAssessmentWindow({
          start_date: data.config.assessment_window.start_date || '2026-10-10',
          end_date: data.config.assessment_window.end_date || '2026-10-15',
          timezone: data.config.assessment_window.timezone || 'Asia/Kolkata',
        });
      }
      if (data?.config?.round_sequence || data?.round_sequence || data?.config?.pipeline_config?.round_sequence) {
        const seq = data?.config?.round_sequence || data?.round_sequence || data?.config?.pipeline_config?.round_sequence;
        if (Array.isArray(seq) && seq.length > 0) {
          setRoundSequence(seq);
        }
      }
      // If configured, default to viewing active state; if not, go to edit mode
      setIsEditingConfig(!data?.is_configured);
    } catch (err) {
      setConfigErrorMsg(err.message || 'Assessment service is temporarily unavailable.');
    } finally {
      setConfigLoading(false);
    }
  }, [token]);

  const moveRoundInSequence = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= roundSequence.length) return;
    setRoundSequence((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  useEffect(() => {
    if (selectedInternshipId && activeSubTab === 'Assessment Management') {
      loadAssessmentConfig(selectedInternshipId);
    }
  }, [selectedInternshipId, activeSubTab, loadAssessmentConfig]);

  // ==========================================
  // FETCH REPORTS & CANDIDATE ASSESSMENTS
  // ==========================================
  const loadReportsAndCandidates = useCallback(async () => {
    if (!token) return;
    setReportsLoading(true);
    setCandidatesLoading(true);
    try {
      const pInternship = reportFilterInternship !== 'All' ? reportFilterInternship : undefined;
      const repRes = await recruiterService.getAssessmentReports(token, {
        internship_id: pInternship,
        status: reportFilterStatus !== 'All' ? reportFilterStatus : undefined,
      });
      setReportsData(repRes);

      const candRes = await recruiterService.getAssessmentCandidates(token, {
        internship_id: pInternship,
        status: reportFilterStatus !== 'All' ? reportFilterStatus : undefined,
        integrity_status: reportFilterIntegrity !== 'All' ? reportFilterIntegrity : undefined,
        search: reportSearch.trim() || undefined,
        page: reportPage,
        page_size: 10,
      });
      setCandidatesList(candRes?.candidates || []);
      setReportTotalPages(candRes?.total_pages || 1);
    } catch (err) {
      console.warn('Failed to load assessment reports:', err);
    } finally {
      setReportsLoading(false);
      setCandidatesLoading(false);
    }
  }, [token, reportFilterInternship, reportFilterStatus, reportFilterIntegrity, reportSearch, reportPage]);

  useEffect(() => {
    if (activeSubTab === 'Assessment Reports' || activeSubTab === 'Overview') {
      loadReportsAndCandidates();
    }
  }, [activeSubTab, loadReportsAndCandidates]);

  // ==========================================
  // GEMINI INTELLIGENT SCHEDULE GENERATION
  // ==========================================
  const handleGenerateSchedule = async () => {
    if (!selectedInternshipId) return;

    // 1. Validate start and end dates
    if (!assessmentWindow.start_date || !assessmentWindow.end_date) {
      setConfigErrorMsg('Validation Error: Please select both Start Date and End Date for the assessment window.');
      return;
    }
    if (assessmentWindow.start_date > assessmentWindow.end_date) {
      setConfigErrorMsg('Validation Error: Assessment Start Date cannot be after End Date.');
      return;
    }

    // 2. Validate at least one round enabled
    const anyEnabled = (
      pipelineState.aptitude.enabled ||
      pipelineState.technical.enabled ||
      pipelineState.interview.enabled ||
      pipelineState.gd.enabled
    );
    if (!anyEnabled) {
      setConfigErrorMsg('Validation Error: At least one assessment round must be enabled to generate a schedule.');
      return;
    }

    setGeneratingSchedule(true);
    setConfigErrorMsg('');
    setConfigSuccessMsg('');

    try {
      const res = await recruiterService.generateAssessmentSchedule(token, {
        internship_id: selectedInternshipId,
        start_date: assessmentWindow.start_date,
        end_date: assessmentWindow.end_date,
        timezone: assessmentWindow.timezone || 'Asia/Kolkata',
        round_sequence: roundSequence,
        pipeline_config: pipelineState,
      });

      if (res?.pipeline_config) {
        setPipelineState(res.pipeline_config);
      }
      if (res?.round_sequence) {
        setRoundSequence(res.round_sequence);
      }
      if (res?.schedule_timeline) {
        setScheduleReviewList(res.schedule_timeline);
        setScheduleReviewModalVisible(true);
      }
      setConfigSuccessMsg('✨ Gemini intelligently generated the assessment schedule inside your window!');
      setTimeout(() => setConfigSuccessMsg(''), 5000);
    } catch (err) {
      setConfigErrorMsg(err.message || 'Failed to generate schedule with Gemini.');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // ==========================================
  // SAVE ASSESSMENT PIPELINE HANDLER
  // ==========================================
  const handleSaveAssessment = async (activate = true) => {
    if (!selectedInternshipId) return;

    // 1. Validation: at least one round enabled
    const anyEnabled = (
      pipelineState.aptitude.enabled ||
      pipelineState.technical.enabled ||
      pipelineState.interview.enabled ||
      pipelineState.gd.enabled
    );
    if (!anyEnabled) {
      setConfigErrorMsg('Validation Error: At least one assessment round must be enabled.');
      return;
    }

    // 2. Validation: weights sum to 100
    const totalWeights = (
      Number(scoringWeights.aptitude || 0) +
      Number(scoringWeights.technical || 0) +
      Number(scoringWeights.interview || 0) +
      Number(scoringWeights.gd || 0)
    );
    if (totalWeights !== 100) {
      setConfigErrorMsg(`Validation Error: Round scoring weights must sum to exactly 100% (currently ${totalWeights}%).`);
      return;
    }

    // 3. Validation: Technical coding languages
    if (pipelineState.technical.enabled && pipelineState.technical.coding_enabled) {
      if (!pipelineState.technical.languages || pipelineState.technical.languages.length === 0) {
        setConfigErrorMsg('Validation Error: Select at least one programming language for the technical coding sandbox.');
        return;
      }
    }

    setConfigSaving(true);
    setConfigErrorMsg('');
    setConfigSuccessMsg('');
    setConfigWarnings([]);

    try {
      const payload = {
        internship_id: selectedInternshipId,
        is_active: activate,
        pipeline_config: pipelineState,
        scoring_weights: scoringWeights,
        integrity_config: integrityConfig,
        assessment_window_start: assessmentWindow.start_date,
        assessment_window_end: assessmentWindow.end_date,
        timezone: assessmentWindow.timezone || 'Asia/Kolkata',
        round_sequence: roundSequence,
      };

      const res = await recruiterService.saveAssessmentConfig(token, payload);
      if (res?.warnings && res.warnings.length > 0) {
        setConfigWarnings(res.warnings);
      }
      setConfigSuccessMsg(activate ? '✓ Assessment Pipeline & Round Schedules activated and published successfully!' : '✓ Assessment Draft saved successfully.');
      setIsEditingConfig(false);
      setScheduleReviewModalVisible(false);
      loadAssessmentConfig(selectedInternshipId);
      setTimeout(() => setConfigSuccessMsg(''), 5000);
    } catch (err) {
      setConfigErrorMsg(err.message || 'Failed to save assessment pipeline configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  // ==========================================
  // CANDIDATE FORENSIC DOSSIER VIEWER
  // ==========================================
  const handleOpenDossier = async (sessionId) => {
    setSelectedCandidateSessionId(sessionId);
    setDossierLoading(true);
    setDossierData(null);
    try {
      const data = await recruiterService.getCandidateAssessmentDossier(token, sessionId);
      setDossierData(data);
    } catch (err) {
      console.warn('Failed to load candidate dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const selectedInternshipObj = useMemo(() => {
    return internships.find((i) => i.id === selectedInternshipId) || internships[0] || null;
  }, [internships, selectedInternshipId]);

  // Total weight helper
  const currentTotalWeight = useMemo(() => {
    return (
      (pipelineState.aptitude.enabled ? Number(scoringWeights.aptitude || 0) : 0) +
      (pipelineState.technical.enabled ? Number(scoringWeights.technical || 0) : 0) +
      (pipelineState.interview.enabled ? Number(scoringWeights.interview || 0) : 0) +
      (pipelineState.gd.enabled ? Number(scoringWeights.gd || 0) : 0)
    );
  }, [scoringWeights, pipelineState]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. Page Header matching SkillSetu Dashboard typography & layout */}
      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>
            Track recruitment performance and manage candidate assessments.
          </Text>
        </View>

        {/* Sub-Tab Navigation Bar */}
        <View style={styles.subTabNav}>
          {['Overview', 'Assessment Management', 'Assessment Reports'].map((tab) => {
            const isActive = activeSubTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveSubTab(tab)}
                style={[styles.subTabItem, isActive && styles.subTabItemActive]}
              >
                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.subTabIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ========================================== */}
      {/* TAB 1: OVERVIEW TAB */}
      {/* ========================================== */}
      {activeSubTab === 'Overview' && (
        <View style={styles.tabContent}>
          {/* Executive Overview KPI Cards */}
          <View style={styles.kpiRow}>
            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxTeal}>
                <Text style={styles.kpiEmoji}>📊</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.total_assessments || 0}</Text>
              <Text style={styles.kpiLabel}>Total Assessments</Text>
              <Text style={styles.kpiSub}>Across all active roles</Text>
            </HoverCard>

            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxGreen}>
                <Text style={styles.kpiEmoji}>✅</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.completed || 0}</Text>
              <Text style={styles.kpiLabel}>Completed Pipelines</Text>
              <Text style={styles.kpiSub}>Multi-round verified</Text>
            </HoverCard>

            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxBlue}>
                <Text style={styles.kpiEmoji}>⏱️</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.in_progress || 0}</Text>
              <Text style={styles.kpiLabel}>In Progress</Text>
              <Text style={styles.kpiSub}>Active candidate tests</Text>
            </HoverCard>

            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxRed}>
                <Text style={styles.kpiEmoji}>🛡️</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.flagged || 0}</Text>
              <Text style={styles.kpiLabel}>Integrity Flags</Text>
              <Text style={styles.kpiSub}>Reviewed by AI forensics</Text>
            </HoverCard>
          </View>

          {/* Quick Action Navigation Card */}
          <View style={styles.actionBannerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerHeading}>Ready to configure assessment pipelines?</Text>
              <Text style={styles.bannerDesc}>
                Set up customizable Aptitude, Technical sandbox coding, Live AI Voice Interviews, and Group Discussions for your openings.
              </Text>
            </View>
            <Pressable
              style={styles.bannerBtn}
              onPress={() => setActiveSubTab('Assessment Management')}
            >
              <Text style={styles.bannerBtnText}>Configure Pipeline →</Text>
            </Pressable>
          </View>

          {/* Average Performance Overview */}
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionHeading}>Candidate Assessment Benchmarks</Text>
            <View style={styles.benchmarkGrid}>
              <View style={styles.benchmarkCard}>
                <Text style={styles.benchmarkTitle}>Aptitude Average</Text>
                <Text style={styles.benchmarkVal}>{reportsData?.average_scores?.aptitude || 0}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${reportsData?.average_scores?.aptitude || 0}%` }]} />
                </View>
              </View>

              <View style={styles.benchmarkCard}>
                <Text style={styles.benchmarkTitle}>Technical Average</Text>
                <Text style={styles.benchmarkVal}>{reportsData?.average_scores?.technical || 0}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${reportsData?.average_scores?.technical || 0}%`, backgroundColor: '#0284C7' }]} />
                </View>
              </View>

              <View style={styles.benchmarkCard}>
                <Text style={styles.benchmarkTitle}>AI Interview Average</Text>
                <Text style={styles.benchmarkVal}>{reportsData?.average_scores?.interview || 0}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${reportsData?.average_scores?.interview || 0}%`, backgroundColor: '#7C3AED' }]} />
                </View>
              </View>

              <View style={styles.benchmarkCard}>
                <Text style={styles.benchmarkTitle}>Group Discussion Average</Text>
                <Text style={styles.benchmarkVal}>{reportsData?.average_scores?.gd || 0}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${reportsData?.average_scores?.gd || 0}%`, backgroundColor: '#EA580C' }]} />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ========================================== */}
      {/* TAB 2: ASSESSMENT MANAGEMENT TAB */}
      {/* ========================================== */}
      {activeSubTab === 'Assessment Management' && (
        <View style={styles.tabContent}>
          {/* Top Section Header */}
          <View style={styles.managementHeader}>
            <View>
              <Text style={styles.managementTitle}>Assessment Management</Text>
              <Text style={styles.managementSub}>
                Configure AI-powered assessments for your internships.
              </Text>
            </View>

            {/* Select Internship Dropdown (Real Company Internships Only) */}
            <View style={[styles.dropdownWrapper, { zIndex: 1000 }]}>
              <Text style={styles.dropdownLabel}>Select Internship:</Text>
              {internshipsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primaryTeal} />
              ) : internships.length === 0 ? (
                <View style={styles.noInternshipsPill}>
                  <Text style={styles.noInternshipsPillText}>No openings created</Text>
                </View>
              ) : (
                <View style={{ position: 'relative', zIndex: 1000 }}>
                  <Pressable
                    style={styles.dropdownTrigger}
                    onPress={() => setInternshipDropdownOpen(!internshipDropdownOpen)}
                  >
                    <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                      {selectedInternshipObj?.title || 'Select internship'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </Pressable>

                  {internshipDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {internships.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.dropdownMenuItem,
                            selectedInternshipId === item.id && styles.dropdownMenuItemActive,
                          ]}
                          onPress={() => {
                            setSelectedInternshipId(item.id);
                            setInternshipDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownMenuItemText,
                            selectedInternshipId === item.id && styles.dropdownMenuItemTextActive,
                          ]}>
                            {item.title}
                          </Text>
                          <Text style={styles.dropdownItemDept}>{item.department || 'Engineering'}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Feedback Alerts */}
          {configSuccessMsg ? (
            <View style={styles.successAlert}>
              <Text style={styles.successAlertText}>{configSuccessMsg}</Text>
            </View>
          ) : null}

          {configErrorMsg ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{configErrorMsg}</Text>
            </View>
          ) : null}

          {configWarnings.length > 0 ? (
            <View style={styles.warningAlertBox}>
              <Text style={styles.warningAlertHeading}>⚠️ Schedule Overlap Notice:</Text>
              {configWarnings.map((w, idx) => (
                <Text key={idx} style={styles.warningAlertItem}>• {w}</Text>
              ))}
            </View>
          ) : null}

          {/* Empty State when no internships exist */}
          {internships.length === 0 && !internshipsLoading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No internships created yet.</Text>
              <Text style={styles.emptySub}>
                Create an internship posting first to configure an AI assessment pipeline.
              </Text>
              <Pressable
                style={styles.primaryActionBtn}
                onPress={() => onNavigateTab && onNavigateTab('Internships')}
              >
                <Text style={styles.primaryActionBtnText}>+ Create Internship</Text>
              </Pressable>
            </View>
          )}

          {/* Internship Assessment Status Summary Card */}
          {internships.length > 0 && selectedInternshipObj && (
            <View style={styles.statusSummaryCard}>
              <View style={styles.statusCardLeft}>
                <View style={styles.statusTitleRow}>
                  <Text style={styles.statusRoleTitle}>{selectedInternshipObj.title}</Text>
                  <View style={[
                    styles.statusBadgePill,
                    configData?.is_configured ? styles.statusBadgeActive : styles.statusBadgeDraft,
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      configData?.is_configured ? styles.statusBadgeTextActive : styles.statusBadgeTextDraft,
                    ]}>
                      {configData?.is_configured ? 'ACTIVE' : 'Draft / Not Configured'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusRoleSub}>
                  {selectedInternshipObj.department || 'Engineering'} • {selectedInternshipObj.location || 'Pune'}
                </Text>
              </View>

              <View style={styles.statusMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemVal}>{configData?.stats?.rounds_count || 4}</Text>
                  <Text style={styles.metricItemLabel}>Rounds</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemVal}>{configData?.is_configured ? 'Yes' : 'No'}</Text>
                  <Text style={styles.metricItemLabel}>Configured</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemVal}>{configData?.stats?.candidates_count || 0}</Text>
                  <Text style={styles.metricItemLabel}>Candidates</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemVal}>{configData?.stats?.completed_count || 0}</Text>
                  <Text style={styles.metricItemLabel}>Completed</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricItemVal, { color: configData?.stats?.flagged_count ? COLORS.redPillText : COLORS.textMain }]}>
                    {configData?.stats?.flagged_count || 0}
                  </Text>
                  <Text style={styles.metricItemLabel}>Flagged</Text>
                </View>
              </View>
            </View>
          )}

          {/* ========================================== */}
          {/* VIEW 1: ACTIVE ASSESSMENT CONFIGURATION VIEW */}
          {/* ========================================== */}
          {configData?.is_configured && !isEditingConfig && selectedInternshipObj && (
            <View style={styles.pipelineContainer}>
              {/* Active Assessment Window & Action Bar */}
              <View style={styles.activeWindowHeroCard}>
                <View style={styles.activeWindowInfo}>
                  <View style={styles.activeBadgeRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.activeHeroTitle}>Assessment Configuration: ACTIVE</Text>
                  </View>
                  <View style={styles.activeHeroMetaRow}>
                    <Text style={styles.activeHeroMetaText}>
                      📅 Assessment Window: <Text style={styles.boldText}>{formatDateDisplay(configData.config?.assessment_window?.start_date || assessmentWindow.start_date)}</Text> → <Text style={styles.boldText}>{formatDateDisplay(configData.config?.assessment_window?.end_date || assessmentWindow.end_date)}</Text>
                    </Text>
                    <Text style={styles.activeHeroMetaDivider}>•</Text>
                    <Text style={styles.activeHeroMetaText}>
                      🌐 Timezone: <Text style={styles.boldText}>{configData.config?.assessment_window?.timezone || assessmentWindow.timezone || 'Asia/Kolkata'}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.activeActionsRow}>
                  <Pressable
                    style={styles.editConfigBtn}
                    onPress={() => setIsEditingConfig(true)}
                  >
                    <Text style={styles.editConfigBtnText}>✏️ Edit Configuration</Text>
                  </Pressable>

                  <Pressable
                    style={styles.editScheduleBtn}
                    onPress={() => setEditScheduleModalVisible(true)}
                  >
                    <Text style={styles.editScheduleBtnText}>📅 Edit Schedule</Text>
                  </Pressable>

                  <Pressable
                    style={styles.regenerateBtn}
                    onPress={() => setRegenerateConfirmModalVisible(true)}
                  >
                    <Text style={styles.regenerateBtnText}>🔄 Regenerate Schedule</Text>
                  </Pressable>
                </View>
              </View>

              {/* Configured Round Schedule Timeline Table */}
              <View style={styles.scheduleTimelineCard}>
                <View style={styles.timelineCardHeaderRow}>
                  <View>
                    <Text style={styles.statCardHeading}>📅 Configured Round Schedule Timeline</Text>
                    <Text style={styles.sectionSubtitle}>
                      Intelligently sequenced schedule persisted in PostgreSQL.
                    </Text>
                  </View>
                  <View style={styles.geminiBadge}>
                    <Text style={styles.geminiBadgeText}>✨ Gemini Scheduled</Text>
                  </View>
                </View>

                <View style={styles.scheduleTimelineTable}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={[styles.timelineTh, { flex: 0.6 }]}>Seq</Text>
                    <Text style={[styles.timelineTh, { flex: 1.6 }]}>Round</Text>
                    <Text style={[styles.timelineTh, { flex: 1.4 }]}>Schedule Type</Text>
                    <Text style={[styles.timelineTh, { flex: 1.5 }]}>Date</Text>
                    <Text style={[styles.timelineTh, { flex: 1.4 }]}>Time</Text>
                    <Text style={[styles.timelineTh, { flex: 1.0 }]}>Duration</Text>
                    <Text style={[styles.timelineTh, { flex: 1.1 }]}>Timezone</Text>
                  </View>
                  {configData.config?.schedule_timeline && configData.config.schedule_timeline.length > 0 ? (
                    configData.config.schedule_timeline.map((sc, idx) => {
                      const roundName = sc.round_name || sc.display_name || sc.displayName || sc.round || sc.name || sc.label || (sc.round_key === 'interview' ? 'AI Voice Interview' : sc.round_key === 'gd' ? 'Group Discussion' : sc.round_key === 'technical' ? 'Technical Assessment' : sc.round_key === 'aptitude' ? 'Aptitude' : 'Assessment Round');
                      const isGeminiManaged = sc.schedule_mode === 'GEMINI_MANAGED' || sc.schedule_type === 'Gemini Managed' || sc.round_key === 'interview';
                      const isFixed = sc.schedule_mode === 'fixed_session' || sc.schedule_type === 'Fixed Session' || sc.round_key === 'gd';
                      const scheduleType = isGeminiManaged ? 'Gemini Managed' : isFixed ? 'Fixed Session' : 'Flexible Window';
                      const dur = sc.duration || sc.duration_minutes || sc.duration_min || (isGeminiManaged ? 20 : isFixed ? 40 : 30);
                      const durationDisplay = sc.duration_display || `${dur} min`;
                      const dateDisplay = formatDateDisplay(sc.start_date || sc.date || sc.scheduled_date || sc.scheduledDate);
                      const timeDisplay = isGeminiManaged
                        ? (sc.candidate_slot_time || 'Gemini Managed Time')
                        : (sc.start_time ? `${formatTimeDisplay(sc.start_time)}${sc.end_time ? ` – ${formatTimeDisplay(sc.end_time)}` : ''}` : 'Flexible Window');

                      return (
                        <View key={idx} style={styles.timelineRow}>
                          <View style={{ flex: 0.6 }}>
                            <View style={styles.seqBadgeSmall}>
                              <Text style={styles.seqBadgeSmallText}>{sc.sequence || idx + 1}</Text>
                            </View>
                          </View>
                          <Text style={[styles.timelineTdName, { flex: 1.6 }]}>{roundName}</Text>
                          <View style={{ flex: 1.4 }}>
                            <View style={[
                              styles.timelineModePill,
                              isGeminiManaged && { backgroundColor: '#F3E8FF' },
                              isFixed && { backgroundColor: '#FEF3C7' },
                            ]}>
                              <Text style={[
                                styles.timelineModePillText,
                                isGeminiManaged && { color: '#7C3AED' },
                                isFixed && { color: '#B45309' },
                              ]}>
                                {scheduleType}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.timelineTd, { flex: 1.5 }]}>
                            {dateDisplay}
                          </Text>
                          <Text style={[styles.timelineTd, { flex: 1.4 }]}>
                            {timeDisplay}
                          </Text>
                          <Text style={[styles.timelineTd, { flex: 1.0 }]}>
                            {durationDisplay}
                          </Text>
                          <Text style={[styles.timelineTd, { flex: 1.1 }]}>
                            {sc.timezone || 'Asia/Kolkata'}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>No schedule timeline data available.</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Scoring Weights & Integrity Summary Section */}
              <View style={styles.summarySplitGrid}>
                <View style={styles.settingsSectionCard}>
                  <Text style={styles.settingsSectionTitle}>Scoring Distribution</Text>
                  <View style={styles.summaryWeightsGrid}>
                    <View style={styles.summaryWeightItem}>
                      <Text style={styles.summaryWeightLabel}>Aptitude</Text>
                      <Text style={styles.summaryWeightVal}>{configData.config?.scoring_weights?.aptitude || 20}%</Text>
                    </View>
                    <View style={styles.summaryWeightItem}>
                      <Text style={styles.summaryWeightLabel}>Technical</Text>
                      <Text style={styles.summaryWeightVal}>{configData.config?.scoring_weights?.technical || 40}%</Text>
                    </View>
                    <View style={styles.summaryWeightItem}>
                      <Text style={styles.summaryWeightLabel}>AI Interview</Text>
                      <Text style={styles.summaryWeightVal}>{configData.config?.scoring_weights?.interview || 20}%</Text>
                    </View>
                    <View style={styles.summaryWeightItem}>
                      <Text style={styles.summaryWeightLabel}>GD</Text>
                      <Text style={styles.summaryWeightVal}>{configData.config?.scoring_weights?.gd || 20}%</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.settingsSectionCard}>
                  <Text style={styles.settingsSectionTitle}>Proctoring Controls</Text>
                  <View style={styles.integrityGrid}>
                    <View style={styles.integrityItem}>
                      <Text style={styles.integrityCheck}>✓</Text>
                      <Text style={styles.integrityLabel}>Camera Verification Active</Text>
                    </View>
                    <View style={styles.integrityItem}>
                      <Text style={styles.integrityCheck}>✓</Text>
                      <Text style={styles.integrityLabel}>Continuous Recording Active</Text>
                    </View>
                    <View style={styles.integrityItem}>
                      <Text style={styles.integrityCheck}>✓</Text>
                      <Text style={styles.integrityLabel}>Anti-Cheating AI Active</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ========================================== */}
          {/* VIEW 2: EDIT / CREATION CONFIGURATION VIEW */}
          {/* ========================================== */}
          {(!configData?.is_configured || isEditingConfig) && selectedInternshipObj && (
            <View style={styles.pipelineContainer}>
              {/* Header banner when editing an existing active config */}
              {configData?.is_configured && (
                <View style={styles.editingBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editingBannerTitle}>✏️ Editing Active Assessment Configuration</Text>
                    <Text style={styles.editingBannerSub}>
                      Update the assessment availability window, round sequence, or settings. Completed candidate results and applications will remain strictly preserved.
                    </Text>
                  </View>
                  <Pressable
                    style={styles.cancelEditBtn}
                    onPress={() => setIsEditingConfig(false)}
                  >
                    <Text style={styles.cancelEditBtnText}>✕ Cancel / View Active</Text>
                  </Pressable>
                </View>
              )}

              {/* OVERALL ASSESSMENT SCHEDULE WINDOW (GEMINI INTELLIGENT PLANNER) */}
              <View style={styles.windowPlanningCard}>
                <View style={styles.windowPlanningHeader}>
                  <View>
                    <Text style={styles.windowPlanningTitle}>📅 Overall Assessment Availability Window</Text>
                    <Text style={styles.windowPlanningSub}>
                      Define the overall assessment window. Gemini will intelligently sequence and schedule all enabled rounds inside this window.
                    </Text>
                  </View>
                  <View style={styles.geminiBadge}>
                    <Text style={styles.geminiBadgeText}>✨ Powered by Gemini</Text>
                  </View>
                </View>

                <View style={styles.windowFieldGrid}>
                  <View style={styles.windowFieldItem}>
                    <Text style={styles.fieldLabel}>Overall Start Date</Text>
                    <SkillSetuDatePicker
                      value={assessmentWindow.start_date || '2026-10-10'}
                      onChange={(d) => {
                        setAssessmentWindow((prev) => {
                          const nextEnd = prev.end_date < d ? d : prev.end_date;
                          return { ...prev, start_date: d, end_date: nextEnd };
                        });
                      }}
                    />
                  </View>

                  <View style={styles.windowFieldItem}>
                    <Text style={styles.fieldLabel}>Overall End Date</Text>
                    <SkillSetuDatePicker
                      value={assessmentWindow.end_date || '2026-10-16'}
                      minDate={assessmentWindow.start_date || '2026-10-10'}
                      onChange={(d) => setAssessmentWindow((prev) => ({ ...prev, end_date: d }))}
                    />
                  </View>

                  <View style={styles.windowFieldItem}>
                    <Text style={styles.fieldLabel}>Assessment Timezone</Text>
                    <SkillSetuSelectDropdown
                      icon="🌐"
                      value={assessmentWindow.timezone || 'Asia/Kolkata'}
                      options={TIMEZONE_OPTIONS}
                      placeholder="Select Timezone"
                      onChange={(tz) => setAssessmentWindow((prev) => ({ ...prev, timezone: tz }))}
                    />
                  </View>
                </View>

                <View style={styles.windowActionRow}>
                  <Pressable
                    style={[styles.geminiGenerateBtn, generatingSchedule && styles.btnDisabled]}
                    onPress={handleGenerateSchedule}
                    disabled={generatingSchedule}
                  >
                    {generatingSchedule ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.geminiGenerateBtnText}>⚡ Generate Schedule with Gemini</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* ROUND SEQUENCE & REORDER SECTION */}
              <View style={styles.sequenceSectionCard}>
                <View style={styles.sequenceSectionHeader}>
                  <View>
                    <Text style={styles.sequenceSectionTitle}>☰ Round Sequence & Order</Text>
                    <Text style={styles.sequenceSectionSub}>
                      Use the arrow controls to customize the progression order of rounds. Gemini will sequence dates strictly according to this order.
                    </Text>
                  </View>
                  <View style={styles.sequenceOrderBadge}>
                    <Text style={styles.sequenceOrderBadgeText}>Strict Progression</Text>
                  </View>
                </View>

                <View style={styles.sequenceListWrap}>
                  {roundSequence.map((rKey, idx) => {
                    const rInfo = pipelineState[rKey];
                    if (!rInfo || !rInfo.enabled) return null;
                    const roundName = rKey === 'aptitude' ? 'Aptitude' : rKey === 'technical' ? 'Technical Assessment' : rKey === 'interview' ? 'AI Voice Interview' : 'Group Discussion';
                    const dur = rInfo.schedule?.duration_minutes || rInfo.duration_min || (rKey === 'interview' ? 20 : 30);
                    const schedMode = rKey === 'interview' ? 'Gemini Managed' : rKey === 'gd' ? 'Fixed Session' : 'Flexible Window';
                    const assignedDate = rInfo.schedule?.start_date;

                    return (
                      <View key={rKey} style={styles.sequenceItemCard}>
                        <View style={styles.sequenceItemLeft}>
                          <Text style={styles.dragHandleIcon}>☰</Text>
                          <View style={styles.sequenceNumberBadge}>
                            <Text style={styles.sequenceNumberText}>{idx + 1}</Text>
                          </View>
                          <View>
                            <Text style={styles.sequenceRoundName}>{roundName}</Text>
                            <Text style={styles.sequenceRoundMeta}>
                              {dur} min • {schedMode}{assignedDate ? ` • 📅 ${formatDateDisplay(assignedDate)}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.sequenceControls}>
                          <Pressable
                            style={[styles.sequenceBtn, idx === 0 && styles.sequenceBtnDisabled]}
                            disabled={idx === 0}
                            onPress={() => moveRoundInSequence(idx, idx - 1)}
                          >
                            <Text style={[styles.sequenceBtnText, idx === 0 && styles.sequenceBtnTextDisabled]}>▲ Up</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.sequenceBtn, idx === roundSequence.length - 1 && styles.sequenceBtnDisabled]}
                            disabled={idx === roundSequence.length - 1}
                            onPress={() => moveRoundInSequence(idx, idx + 1)}
                          >
                            <Text style={[styles.sequenceBtnText, idx === roundSequence.length - 1 && styles.sequenceBtnTextDisabled]}>▼ Down</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* GEMINI GENERATED ASSESSMENT SCHEDULE PREVIEW & EDIT BOX */}
              <View style={styles.generatedScheduleCard}>
                <View style={styles.generatedScheduleHeader}>
                  <View>
                    <Text style={styles.generatedScheduleTitle}>✨ Gemini Generated Assessment Schedule</Text>
                    <Text style={styles.generatedScheduleSub}>
                      Rounds scheduled inside {formatDateDisplay(assessmentWindow.start_date)} → {formatDateDisplay(assessmentWindow.end_date)} ({assessmentWindow.timezone || 'Asia/Kolkata'}).
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      style={styles.editScheduleBtnSmall}
                      onPress={() => setEditScheduleModalVisible(true)}
                    >
                      <Text style={styles.editScheduleBtnSmallText}>✏️ Edit Schedule</Text>
                    </Pressable>
                    <Pressable
                      style={styles.regenerateBtnSmall}
                      onPress={() => setRegenerateConfirmModalVisible(true)}
                    >
                      <Text style={styles.regenerateBtnSmallText}>🔄 Regenerate</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.generatedScheduleGrid}>
                  {roundSequence.map((rKey, idx) => {
                    const rInfo = pipelineState[rKey];
                    if (!rInfo || !rInfo.enabled) return null;
                    const roundName = rKey === 'aptitude' ? 'Aptitude' : rKey === 'technical' ? 'Technical Assessment' : rKey === 'interview' ? 'AI Voice Interview' : 'Group Discussion';
                    const dur = rInfo.schedule?.duration_minutes || rInfo.duration_min || (rKey === 'interview' ? 20 : 30);
                    const isGeminiManaged = rKey === 'interview';
                    const isFixed = rKey === 'gd';
                    const sMode = isGeminiManaged ? 'Gemini Managed' : isFixed ? 'Fixed Session' : 'Flexible Window';
                    const sDate = rInfo.schedule?.start_date;

                    return (
                      <View key={rKey} style={styles.generatedScheduleCol}>
                        <View style={styles.generatedColHeader}>
                          <Text style={styles.generatedColSeq}>Round {idx + 1}</Text>
                          <View style={[
                            styles.timelineModePill,
                            isGeminiManaged && { backgroundColor: '#F3E8FF' },
                            isFixed && { backgroundColor: '#FEF3C7' },
                          ]}>
                            <Text style={[
                              styles.timelineModePillText,
                              isGeminiManaged && { color: '#7C3AED' },
                              isFixed && { color: '#B45309' },
                            ]}>
                              {sMode}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.generatedColName}>{roundName}</Text>
                        <Text style={styles.generatedColDate}>
                          📅 {sDate ? formatDateDisplay(sDate) : 'Auto Assigned'}
                        </Text>
                        <Text style={styles.generatedColTime}>
                          {isGeminiManaged ? 'Gemini Managed Time' : (rInfo.schedule?.start_time ? `${formatTimeDisplay(rInfo.schedule.start_time)}${rInfo.schedule.end_time ? ` – ${formatTimeDisplay(rInfo.schedule.end_time)}` : ''}` : 'Flexible Window')}
                        </Text>
                        <Text style={styles.generatedColDur}>⏱️ {dur} min</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.pipelineHeaderRow}>
                <Text style={styles.sectionTitle}>Enabled Assessment Rounds</Text>
                <Text style={styles.sectionSubtitle}>
                  Enable rounds and set durations. Gemini automatically coordinates round timing inside the window.
                </Text>
              </View>

              {/* 01 APTITUDE ROUND CARD */}
              <View style={[styles.roundCard, !pipelineState.aptitude.enabled && styles.roundCardMuted]}>
                <View style={styles.roundCardHeader}>
                  <View style={styles.roundTitleGroup}>
                    <View style={styles.roundNumberBadge}>
                      <Text style={styles.roundNumberText}>01</Text>
                    </View>
                    <View>
                      <Text style={styles.roundName}>Aptitude Round</Text>
                      <Text style={styles.roundDesc}>
                        Test candidate reasoning, quantitative, and cognitive fundamentals.
                      </Text>
                    </View>
                  </View>
                  <ToggleSwitch
                    value={pipelineState.aptitude.enabled}
                    onValueChange={(val) =>
                      setPipelineState((prev) => ({
                        ...prev,
                        aptitude: { ...prev.aptitude, enabled: val },
                      }))
                    }
                    label={pipelineState.aptitude.enabled ? 'ON' : 'OFF'}
                  />
                </View>

                {pipelineState.aptitude.enabled && (
                  <View style={styles.roundConfigBody}>
                    <View style={styles.fieldRow}>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Question Count</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          value={String(pipelineState.aptitude.question_count || 20)}
                          onChangeText={(t) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              aptitude: { ...prev.aptitude, question_count: parseInt(t, 10) || 10 },
                            }))
                          }
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Duration</Text>
                        <SkillSetuSelectDropdown
                          icon="⏱️"
                          value={pipelineState.aptitude.schedule?.duration_minutes || pipelineState.aptitude.duration_min || 30}
                          options={DURATION_OPTIONS}
                          placeholder="Select Duration"
                          onChange={(dur) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              aptitude: {
                                ...prev.aptitude,
                                duration_min: dur,
                                schedule: { ...prev.aptitude.schedule, duration_minutes: dur },
                              },
                            }))
                          }
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Difficulty</Text>
                        <View style={styles.pillGroup}>
                          {['Easy', 'Medium', 'Hard'].map((diff) => (
                            <Pressable
                              key={diff}
                              style={[
                                styles.optionPill,
                                pipelineState.aptitude.difficulty === diff && styles.optionPillActive,
                              ]}
                              onPress={() =>
                                setPipelineState((prev) => ({
                                  ...prev,
                                  aptitude: { ...prev.aptitude, difficulty: diff },
                                }))
                              }
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  pipelineState.aptitude.difficulty === diff && styles.optionPillTextActive,
                                ]}
                              >
                                {diff}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Schedule & Availability Box */}
                    <View style={styles.scheduleSectionBox}>
                      <View style={styles.scheduleSectionHeader}>
                        <Text style={styles.scheduleSectionTitle}>📅 Intelligent Round Schedule</Text>
                        <View style={styles.scheduleModeBadge}>
                          <Text style={styles.scheduleModeBadgeText}>Flexible Window</Text>
                        </View>
                      </View>
                      <Text style={styles.scheduleSubtitle}>
                        Candidates can start anytime within the flexible window scheduled by Gemini. Once started, a {pipelineState.aptitude.schedule?.duration_minutes || pipelineState.aptitude.duration_min || 30}-minute timer countdown begins.
                      </Text>
                      <View style={styles.scheduledPillRow}>
                        <Text style={styles.scheduledPillLabel}>
                          Scheduled Window: <Text style={styles.boldText}>{formatDateDisplay(pipelineState.aptitude.schedule?.start_date || assessmentWindow.start_date)} {pipelineState.aptitude.schedule?.start_time || '10:00'}</Text> → <Text style={styles.boldText}>{formatDateDisplay(pipelineState.aptitude.schedule?.end_date || assessmentWindow.start_date)} {pipelineState.aptitude.schedule?.end_time || '22:00'}</Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.supportedTypesRow}>
                      <Text style={styles.subFieldLabel}>Supported Question Types:</Text>
                      <View style={styles.badgeRow}>
                        {['MCQ', 'Numeric', 'Short Written'].map((type) => (
                          <View key={type} style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>✓ {type}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Down Arrow Flow Indicator */}
              <View style={styles.pipelineFlowIndicator}>
                <Text style={styles.pipelineArrowText}>↓</Text>
              </View>

              {/* 02 TECHNICAL ROUND CARD */}
              <View style={[styles.roundCard, !pipelineState.technical.enabled && styles.roundCardMuted]}>
                <View style={styles.roundCardHeader}>
                  <View style={styles.roundTitleGroup}>
                    <View style={styles.roundNumberBadge}>
                      <Text style={styles.roundNumberText}>02</Text>
                    </View>
                    <View>
                      <Text style={styles.roundName}>Technical Round</Text>
                      <Text style={styles.roundDesc}>
                        Evaluate technical theory knowledge and live sandbox coding execution.
                      </Text>
                    </View>
                  </View>
                  <ToggleSwitch
                    value={pipelineState.technical.enabled}
                    onValueChange={(val) =>
                      setPipelineState((prev) => ({
                        ...prev,
                        technical: { ...prev.technical, enabled: val },
                      }))
                    }
                    label={pipelineState.technical.enabled ? 'ON' : 'OFF'}
                  />
                </View>

                {pipelineState.technical.enabled && (
                  <View style={styles.roundConfigBody}>
                    <View style={styles.fieldRow}>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Theory Section</Text>
                        <ToggleSwitch
                          value={pipelineState.technical.theory_enabled}
                          onValueChange={(val) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              technical: { ...prev.technical, theory_enabled: val },
                            }))
                          }
                          label={pipelineState.technical.theory_enabled ? 'ON' : 'OFF'}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Coding Sandbox</Text>
                        <ToggleSwitch
                          value={pipelineState.technical.coding_enabled}
                          onValueChange={(val) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              technical: { ...prev.technical, coding_enabled: val },
                            }))
                          }
                          label={pipelineState.technical.coding_enabled ? 'ON' : 'OFF'}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Duration</Text>
                        <SkillSetuSelectDropdown
                          icon="⏱️"
                          value={pipelineState.technical.schedule?.duration_minutes || pipelineState.technical.duration_min || 45}
                          options={DURATION_OPTIONS}
                          placeholder="Select Duration"
                          onChange={(dur) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              technical: {
                                ...prev.technical,
                                duration_min: dur,
                                schedule: { ...prev.technical.schedule, duration_minutes: dur },
                              },
                            }))
                          }
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Difficulty</Text>
                        <View style={styles.pillGroup}>
                          {['Easy', 'Medium', 'Hard'].map((diff) => (
                            <Pressable
                              key={diff}
                              style={[
                                styles.optionPill,
                                pipelineState.technical.difficulty === diff && styles.optionPillActive,
                              ]}
                              onPress={() =>
                                setPipelineState((prev) => ({
                                  ...prev,
                                  technical: { ...prev.technical, difficulty: diff },
                                }))
                              }
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  pipelineState.technical.difficulty === diff && styles.optionPillTextActive,
                                ]}
                              >
                                {diff}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    {pipelineState.technical.coding_enabled && (
                      <View style={styles.codingConfigBox}>
                        <Text style={styles.subFieldLabel}>Allowed Sandbox Programming Languages:</Text>
                        <View style={styles.languagePillsWrap}>
                          {CODING_LANGUAGES.map((lang) => {
                            const isSelected = pipelineState.technical.languages?.includes(lang);
                            return (
                              <Pressable
                                key={lang}
                                style={[styles.langPill, isSelected && styles.langPillActive]}
                                onPress={() => {
                                  const current = pipelineState.technical.languages || [];
                                  const next = isSelected
                                    ? current.filter((l) => l !== lang)
                                    : [...current, lang];
                                  if (next.length > 0) {
                                    setPipelineState((prev) => ({
                                      ...prev,
                                      technical: { ...prev.technical, languages: next },
                                    }));
                                  }
                                }}
                              >
                                <Text style={[styles.langPillText, isSelected && styles.langPillTextActive]}>
                                  {isSelected ? `✓ ${lang}` : lang}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Schedule & Availability Box */}
                    <View style={styles.scheduleSectionBox}>
                      <View style={styles.scheduleSectionHeader}>
                        <Text style={styles.scheduleSectionTitle}>📅 Intelligent Technical Window</Text>
                        <View style={styles.scheduleModeBadge}>
                          <Text style={styles.scheduleModeBadgeText}>Flexible Window</Text>
                        </View>
                      </View>
                      <Text style={styles.scheduleSubtitle}>
                        Sequenced by Gemini after Aptitude within the assessment window. Candidate can complete theory + coding in a single {pipelineState.technical.schedule?.duration_minutes || pipelineState.technical.duration_min || 45}-minute session.
                      </Text>
                      <View style={styles.scheduledPillRow}>
                        <Text style={styles.scheduledPillLabel}>
                          Scheduled Window: <Text style={styles.boldText}>{formatDateDisplay(pipelineState.technical.schedule?.start_date || assessmentWindow.start_date)} {pipelineState.technical.schedule?.start_time || '10:00'}</Text> → <Text style={styles.boldText}>{formatDateDisplay(pipelineState.technical.schedule?.end_date || assessmentWindow.end_date)} {pipelineState.technical.schedule?.end_time || '22:00'}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Down Arrow Flow Indicator */}
              <View style={styles.pipelineFlowIndicator}>
                <Text style={styles.pipelineArrowText}>↓</Text>
              </View>

              {/* 03 AI VOICE INTERVIEW CARD (SPECIAL RULE: GEMINI MANAGED) */}
              <View style={[styles.roundCard, !pipelineState.interview.enabled && styles.roundCardMuted]}>
                <View style={styles.roundCardHeader}>
                  <View style={styles.roundTitleGroup}>
                    <View style={styles.roundNumberBadge}>
                      <Text style={styles.roundNumberText}>03</Text>
                    </View>
                    <View>
                      <Text style={styles.roundName}>AI Voice Interview</Text>
                      <Text style={styles.roundDesc}>
                        Live conversational voice interview conducted by adaptive Gemini AI agents.
                      </Text>
                    </View>
                  </View>
                  <ToggleSwitch
                    value={pipelineState.interview.enabled}
                    onValueChange={(val) =>
                      setPipelineState((prev) => ({
                        ...prev,
                        interview: { ...prev.interview, enabled: val },
                      }))
                    }
                    label={pipelineState.interview.enabled ? 'ON' : 'OFF'}
                  />
                </View>

                {pipelineState.interview.enabled && (
                  <View style={styles.roundConfigBody}>
                    <View style={styles.fieldRow}>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Interview Duration</Text>
                        <SkillSetuSelectDropdown
                          icon="⏱️"
                          value={pipelineState.interview.schedule?.duration_minutes || pipelineState.interview.duration_min || 20}
                          options={DURATION_OPTIONS}
                          placeholder="Select Duration"
                          onChange={(dur) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              interview: {
                                ...prev.interview,
                                duration_min: dur,
                                schedule: { ...prev.interview.schedule, duration_minutes: dur },
                              },
                            }))
                          }
                        />
                      </View>
                    </View>

                    {/* Schedule Box for AI Interview: GEMINI MANAGED with Assigned Date */}
                    <View style={[styles.scheduleSectionBox, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                      <View style={styles.scheduleSectionHeader}>
                        <Text style={[styles.scheduleSectionTitle, { color: '#6B21A8' }]}>🤖 AI Voice Interview Scheduling</Text>
                        <View style={[styles.scheduleModeBadge, { backgroundColor: '#F3E8FF' }]}>
                          <Text style={[styles.scheduleModeBadgeText, { color: '#7C3AED' }]}>Gemini Managed</Text>
                        </View>
                      </View>
                      
                      <View style={styles.aiInterviewScheduleRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Scheduled Interview Date</Text>
                          <SkillSetuDatePicker
                            value={pipelineState.interview.schedule?.start_date || assessmentWindow.start_date || '2026-10-13'}
                            onChange={(d) => {
                              setPipelineState((prev) => ({
                                ...prev,
                                interview: {
                                  ...prev.interview,
                                  schedule: {
                                    ...prev.interview.schedule,
                                    start_date: d,
                                    end_date: d,
                                  },
                                },
                              }));
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <Text style={styles.fieldLabel}>Interview Time</Text>
                          <View style={styles.geminiManagedTimeBox}>
                            <Text style={styles.geminiManagedTimeText}>⚡ Automatically allocated per candidate</Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.geminiManagedInfoBanner, { marginTop: 12 }]}>
                        <Text style={styles.geminiManagedInfoIcon}>✨</Text>
                        <Text style={styles.geminiManagedInfoText}>
                          Candidate will see the interview date (<Text style={styles.boldText}>{formatDateDisplay(pipelineState.interview.schedule?.start_date || '2026-10-13')}</Text>) in their portal. Exact time slots ({pipelineState.interview.schedule?.duration_minutes || pipelineState.interview.duration_min || 20} min) are dynamically managed by Gemini.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Down Arrow Flow Indicator */}
              <View style={styles.pipelineFlowIndicator}>
                <Text style={styles.pipelineArrowText}>↓</Text>
              </View>

              {/* 04 GROUP DISCUSSION CARD (FIXED SYNCHRONIZED SESSION) */}
              <View style={[styles.roundCard, !pipelineState.gd.enabled && styles.roundCardMuted]}>
                <View style={styles.roundCardHeader}>
                  <View style={styles.roundTitleGroup}>
                    <View style={styles.roundNumberBadge}>
                      <Text style={styles.roundNumberText}>04</Text>
                    </View>
                    <View>
                      <Text style={styles.roundName}>Group Discussion</Text>
                      <Text style={styles.roundDesc}>
                        Multi-candidate real-time discussion room with AI moderation and leadership scoring.
                      </Text>
                    </View>
                  </View>
                  <ToggleSwitch
                    value={pipelineState.gd.enabled}
                    onValueChange={(val) =>
                      setPipelineState((prev) => ({
                        ...prev,
                        gd: { ...prev.gd, enabled: val },
                      }))
                    }
                    label={pipelineState.gd.enabled ? 'ON' : 'OFF'}
                  />
                </View>

                {pipelineState.gd.enabled && (
                  <View style={styles.roundConfigBody}>
                    <View style={styles.fieldRow}>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Candidates Per Room</Text>
                        <SkillSetuSelectDropdown
                          icon="👥"
                          value={pipelineState.gd.candidates_per_room || 5}
                          options={GD_ROOM_SIZE_OPTIONS}
                          placeholder="Select Room Size"
                          onChange={(cs) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              gd: {
                                ...prev.gd,
                                candidates_per_room: cs,
                                schedule: { ...prev.gd.schedule, room_size: cs },
                              },
                            }))
                          }
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Preparation Time</Text>
                        <SkillSetuSelectDropdown
                          icon="⏱️"
                          value={pipelineState.gd.prep_time_min || 2}
                          options={GD_PREP_OPTIONS}
                          placeholder="Select Prep Time"
                          onChange={(pt) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              gd: {
                                ...prev.gd,
                                prep_time_min: pt,
                                schedule: {
                                  ...prev.gd.schedule,
                                  prep_time_minutes: pt,
                                  duration_minutes: pt + (prev.gd.discussion_time_min || 10),
                                },
                              },
                            }))
                          }
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Discussion Duration</Text>
                        <SkillSetuSelectDropdown
                          icon="⏱️"
                          value={pipelineState.gd.discussion_time_min || 10}
                          options={GD_DISCUSSION_OPTIONS}
                          placeholder="Select Duration"
                          onChange={(dt) =>
                            setPipelineState((prev) => ({
                              ...prev,
                              gd: {
                                ...prev.gd,
                                discussion_time_min: dt,
                                schedule: {
                                  ...prev.gd.schedule,
                                  discussion_time_minutes: dt,
                                  duration_minutes: (prev.gd.prep_time_min || 2) + dt,
                                },
                              },
                            }))
                          }
                        />
                      </View>
                    </View>

                    {/* Schedule & Synchronized Room Box */}
                    <View style={styles.scheduleSectionBox}>
                      <View style={styles.scheduleSectionHeader}>
                        <Text style={styles.scheduleSectionTitle}>👥 GD Synchronized Session Time</Text>
                        <View style={[styles.scheduleModeBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.scheduleModeBadgeText, { color: '#B45309' }]}>Fixed Session</Text>
                        </View>
                      </View>
                      <Text style={styles.scheduleSubtitle}>
                        All {pipelineState.gd.candidates_per_room || 5} room participants enter together. Gemini proposes a synchronized session near the conclusion of the assessment window. Total duration: {(pipelineState.gd.prep_time_min || 2) + (pipelineState.gd.discussion_time_min || 10)} min.
                      </Text>
                      <View style={styles.scheduledPillRow}>
                        <Text style={styles.scheduledPillLabel}>
                          Synchronized Session: <Text style={styles.boldText}>{formatDateDisplay(pipelineState.gd.schedule?.start_date || assessmentWindow.end_date)} at {formatTimeDisplay(pipelineState.gd.schedule?.start_time || '16:00')}</Text> ({pipelineState.gd.schedule?.duration_minutes || 12} min)
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* ========================================== */}
              {/* SCORING & EVALUATION CONFIGURATION */}
              {/* ========================================== */}
              <View style={styles.settingsSectionCard}>
                <View style={styles.settingsHeader}>
                  <Text style={styles.settingsSectionTitle}>Scoring & Evaluation</Text>
                  <View style={[
                    styles.weightSumBadge,
                    currentTotalWeight === 100 ? styles.weightSumValid : styles.weightSumInvalid,
                  ]}>
                    <Text style={[
                      styles.weightSumText,
                      currentTotalWeight === 100 ? styles.weightSumTextValid : styles.weightSumTextInvalid,
                    ]}>
                      Total Weight: {currentTotalWeight}% {currentTotalWeight === 100 ? '✓' : '(Must equal 100%)'}
                    </Text>
                  </View>
                </View>

                <View style={styles.scoringInputsGrid}>
                  <View style={styles.scoreWeightBox}>
                    <Text style={styles.scoreWeightLabel}>Aptitude Weight</Text>
                    <View style={styles.weightInputRow}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="numeric"
                        editable={pipelineState.aptitude.enabled}
                        value={String(scoringWeights.aptitude || 0)}
                        onChangeText={(t) =>
                          setScoringWeights((prev) => ({ ...prev, aptitude: parseInt(t, 10) || 0 }))
                        }
                      />
                      <Text style={styles.weightUnit}>%</Text>
                    </View>
                  </View>

                  <View style={styles.scoreWeightBox}>
                    <Text style={styles.scoreWeightLabel}>Technical Weight</Text>
                    <View style={styles.weightInputRow}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="numeric"
                        editable={pipelineState.technical.enabled}
                        value={String(scoringWeights.technical || 0)}
                        onChangeText={(t) =>
                          setScoringWeights((prev) => ({ ...prev, technical: parseInt(t, 10) || 0 }))
                        }
                      />
                      <Text style={styles.weightUnit}>%</Text>
                    </View>
                  </View>

                  <View style={styles.scoreWeightBox}>
                    <Text style={styles.scoreWeightLabel}>Interview Weight</Text>
                    <View style={styles.weightInputRow}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="numeric"
                        editable={pipelineState.interview.enabled}
                        value={String(scoringWeights.interview || 0)}
                        onChangeText={(t) =>
                          setScoringWeights((prev) => ({ ...prev, interview: parseInt(t, 10) || 0 }))
                        }
                      />
                      <Text style={styles.weightUnit}>%</Text>
                    </View>
                  </View>

                  <View style={styles.scoreWeightBox}>
                    <Text style={styles.scoreWeightLabel}>GD Weight</Text>
                    <View style={styles.weightInputRow}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="numeric"
                        editable={pipelineState.gd.enabled}
                        value={String(scoringWeights.gd || 0)}
                        onChangeText={(t) =>
                          setScoringWeights((prev) => ({ ...prev, gd: parseInt(t, 10) || 0 }))
                        }
                      />
                      <Text style={styles.weightUnit}>%</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ========================================== */}
              {/* ASSESSMENT INTEGRITY & PROCTORING */}
              {/* ========================================== */}
              <View style={styles.settingsSectionCard}>
                <Text style={styles.settingsSectionTitle}>Assessment Integrity & Proctoring</Text>
                <View style={styles.integrityGrid}>
                  <View style={styles.integrityItem}>
                    <Text style={styles.integrityCheck}>✓</Text>
                    <Text style={styles.integrityLabel}>Camera Verification Active</Text>
                  </View>
                  <View style={styles.integrityItem}>
                    <Text style={styles.integrityCheck}>✓</Text>
                    <Text style={styles.integrityLabel}>Microphone Telemetry Active</Text>
                  </View>
                  <View style={styles.integrityItem}>
                    <Text style={styles.integrityCheck}>✓</Text>
                    <Text style={styles.integrityLabel}>Continuous Recording Active</Text>
                  </View>
                  <View style={styles.integrityItem}>
                    <Text style={styles.integrityCheck}>✓</Text>
                    <Text style={styles.integrityLabel}>Multi-Agent Anti-Cheating Active</Text>
                  </View>
                </View>
                <View style={styles.integrityInfoBanner}>
                  <Text style={styles.integrityInfoIcon}>ℹ️</Text>
                  <Text style={styles.integrityInfoText}>
                    Candidate integrity is monitored throughout supported assessment rounds. Confirmed violations may pause or terminate a round.
                  </Text>
                </View>
              </View>

              {/* ========================================== */}
              {/* SAVE / PUBLISH ACTIONS */}
              {/* ========================================== */}
              <View style={styles.publishActionRow}>
                <Pressable
                  style={[styles.draftBtn, configSaving && styles.btnDisabled]}
                  onPress={() => handleSaveAssessment(false)}
                  disabled={configSaving}
                >
                  <Text style={styles.draftBtnText}>Save Draft</Text>
                </Pressable>

                <Pressable
                  style={[styles.activateBtn, configSaving && styles.btnDisabled]}
                  onPress={() => handleSaveAssessment(true)}
                  disabled={configSaving}
                >
                  {configSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.activateBtnText}>Save & Activate Pipeline</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ========================================== */}
      {/* TAB 3: ASSESSMENT REPORTS TAB */}
      {/* ========================================== */}
      {activeSubTab === 'Assessment Reports' && (
        <View style={styles.tabContent}>
          {/* Top KPI Cards */}
          <View style={styles.kpiRow}>
            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxTeal}>
                <Text style={styles.kpiEmoji}>👥</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.total_assessments || 0}</Text>
              <Text style={styles.kpiLabel}>Total Assessments</Text>
            </HoverCard>

            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxGreen}>
                <Text style={styles.kpiEmoji}>🎯</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.completed || 0}</Text>
              <Text style={styles.kpiLabel}>Completed</Text>
            </HoverCard>

            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxBlue}>
                <Text style={styles.kpiEmoji}>⏳</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.in_progress || 0}</Text>
              <Text style={styles.kpiLabel}>In Progress</Text>
            </HoverCard>

            <HoverCard style={styles.kpiCard}>
              <View style={styles.kpiIconBoxRed}>
                <Text style={styles.kpiEmoji}>🚩</Text>
              </View>
              <Text style={styles.kpiValue}>{reportsData?.kpis?.flagged || 0}</Text>
              <Text style={styles.kpiLabel}>Flagged</Text>
            </HoverCard>
          </View>

          {/* Breakdown Stats Grid */}
          <View style={styles.reportsStatsRow}>
            {/* Assessment Completion per round */}
            <View style={styles.reportsStatCard}>
              <Text style={styles.statCardHeading}>Assessment Completion</Text>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>Aptitude</Text>
                <Text style={styles.roundStatVal}>{reportsData?.round_completion?.aptitude || 0} candidates</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>Technical</Text>
                <Text style={styles.roundStatVal}>{reportsData?.round_completion?.technical || 0} candidates</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>AI Interview</Text>
                <Text style={styles.roundStatVal}>{reportsData?.round_completion?.interview || 0} candidates</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>Group Discussion</Text>
                <Text style={styles.roundStatVal}>{reportsData?.round_completion?.gd || 0} candidates</Text>
              </View>
            </View>

            {/* Average Scores */}
            <View style={styles.reportsStatCard}>
              <Text style={styles.statCardHeading}>Average Scores</Text>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>Aptitude</Text>
                <Text style={styles.roundStatScore}>{reportsData?.average_scores?.aptitude || 0}%</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>Technical</Text>
                <Text style={styles.roundStatScore}>{reportsData?.average_scores?.technical || 0}%</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>Interview</Text>
                <Text style={styles.roundStatScore}>{reportsData?.average_scores?.interview || 0}%</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>GD</Text>
                <Text style={styles.roundStatScore}>{reportsData?.average_scores?.gd || 0}%</Text>
              </View>
              <View style={[styles.roundStatItem, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 }]}>
                <Text style={[styles.roundStatLabel, { fontWeight: '700' }]}>Overall Average</Text>
                <Text style={[styles.roundStatScore, { color: COLORS.primaryTeal }]}>
                  {reportsData?.average_scores?.overall || 0}%
                </Text>
              </View>
            </View>

            {/* Integrity Overview */}
            <View style={styles.reportsStatCard}>
              <Text style={styles.statCardHeading}>Integrity Overview</Text>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>✓ Verified Clean</Text>
                <Text style={styles.roundStatVal}>{reportsData?.integrity_overview?.verified || 0}</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>⚠️ Warnings Issued</Text>
                <Text style={styles.roundStatVal}>{reportsData?.integrity_overview?.warnings || 0}</Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>🚩 Flagged for Review</Text>
                <Text style={[styles.roundStatVal, { color: COLORS.orangePillText }]}>
                  {reportsData?.integrity_overview?.flagged || 0}
                </Text>
              </View>
              <View style={styles.roundStatItem}>
                <Text style={styles.roundStatLabel}>❌ Terminated / Failed</Text>
                <Text style={[styles.roundStatVal, { color: COLORS.redPillText }]}>
                  {reportsData?.integrity_overview?.failed || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Round Schedule Timeline Card */}
          {reportsData?.schedule_timeline && reportsData.schedule_timeline.length > 0 && (
            <View style={styles.scheduleTimelineCard}>
              <View style={styles.timelineCardHeaderRow}>
                <View>
                  <Text style={styles.statCardHeading}>📅 Configured Round Schedule Timeline</Text>
                  <Text style={styles.sectionSubtitle}>
                    Persistent evaluation sequence configured for this assessment pipeline.
                  </Text>
                </View>
                <View style={styles.geminiBadge}>
                  <Text style={styles.geminiBadgeText}>✨ Gemini Scheduled</Text>
                </View>
              </View>
              <View style={styles.scheduleTimelineTable}>
                <View style={styles.timelineHeaderRow}>
                  <Text style={[styles.timelineTh, { flex: 1.6 }]}>Round</Text>
                  <Text style={[styles.timelineTh, { flex: 1.4 }]}>Schedule Type</Text>
                  <Text style={[styles.timelineTh, { flex: 2.2 }]}>Date & Time Window</Text>
                  <Text style={[styles.timelineTh, { flex: 1.2 }]}>Duration</Text>
                  <Text style={[styles.timelineTh, { flex: 1.2 }]}>Timezone</Text>
                </View>
                {reportsData.schedule_timeline.map((sc, idx) => {
                  const roundName = sc.round_name || sc.display_name || sc.displayName || sc.round || sc.name || sc.label || (sc.round_key === 'interview' ? 'AI Voice Interview' : sc.round_key === 'gd' ? 'Group Discussion' : sc.round_key === 'technical' ? 'Technical Assessment' : sc.round_key === 'aptitude' ? 'Aptitude' : 'Assessment Round');
                  const isGeminiManaged = sc.schedule_mode === 'GEMINI_MANAGED' || sc.schedule_type === 'Gemini Managed' || sc.round_key === 'interview';
                  const isFixed = sc.schedule_mode === 'fixed_session' || sc.schedule_type === 'Fixed Session' || sc.round_key === 'gd';
                  const scheduleType = isGeminiManaged ? 'Gemini Managed' : isFixed ? 'Fixed Session' : 'Flexible Window';
                  const dur = sc.duration || sc.duration_minutes || sc.duration_min || (isGeminiManaged ? 20 : isFixed ? 40 : 30);
                  const durationDisplay = sc.duration_display || `${dur} min`;
                  const dateDisplay = isGeminiManaged
                    ? `${formatDateDisplay(sc.start_date || sc.date || sc.scheduled_date)} · Automatically allocated by Gemini`
                    : `${formatDateDisplay(sc.start_date || sc.date || sc.scheduled_date)} ${sc.start_time ? `· ${formatTimeDisplay(sc.start_time)}` : ''}${sc.end_time ? ` – ${formatTimeDisplay(sc.end_time)}` : ''}`;

                  return (
                    <View key={idx} style={styles.timelineRow}>
                      <Text style={[styles.timelineTdName, { flex: 1.6 }]}>{roundName}</Text>
                      <View style={{ flex: 1.4 }}>
                        <View style={[
                          styles.timelineModePill,
                          isGeminiManaged && { backgroundColor: '#F3E8FF' },
                          isFixed && { backgroundColor: '#FEF3C7' },
                        ]}>
                          <Text style={[
                            styles.timelineModePillText,
                            isGeminiManaged && { color: '#7C3AED' },
                            isFixed && { color: '#B45309' },
                          ]}>
                            {scheduleType}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.timelineTd, { flex: 2.2 }]}>
                        {dateDisplay}
                      </Text>
                      <Text style={[styles.timelineTd, { flex: 1.2 }]}>
                        {durationDisplay}
                      </Text>
                      <Text style={[styles.timelineTd, { flex: 1.2 }]}>
                        {sc.timezone || 'Asia/Kolkata'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ========================================== */}
          {/* CANDIDATE ASSESSMENT TABLE & FILTERS */}
          {/* ========================================== */}
          <View style={styles.tableCard}>
            <View style={styles.filterBar}>
              {/* Search Bar */}
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search candidate or role..."
                  placeholderTextColor={COLORS.textLight}
                  value={reportSearch}
                  onChangeText={setReportSearch}
                />
              </View>

              {/* Status Filter */}
              <View style={styles.filterDropdownRow}>
                <Text style={styles.filterLabel}>Status:</Text>
                {['All', 'COMPLETED', 'IN_PROGRESS'].map((st) => (
                  <Pressable
                    key={st}
                    style={[styles.filterPill, reportFilterStatus === st && styles.filterPillActive]}
                    onPress={() => setReportFilterStatus(st)}
                  >
                    <Text style={[styles.filterPillText, reportFilterStatus === st && styles.filterPillTextActive]}>
                      {st === 'All' ? 'All' : st === 'COMPLETED' ? 'Completed' : 'In Progress'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Integrity Filter */}
              <View style={styles.filterDropdownRow}>
                <Text style={styles.filterLabel}>Integrity:</Text>
                {['All', 'VERIFIED', 'FLAGGED'].map((it) => (
                  <Pressable
                    key={it}
                    style={[styles.filterPill, reportFilterIntegrity === it && styles.filterPillActive]}
                    onPress={() => setReportFilterIntegrity(it)}
                  >
                    <Text style={[styles.filterPillText, reportFilterIntegrity === it && styles.filterPillTextActive]}>
                      {it === 'All' ? 'All' : it === 'VERIFIED' ? 'Verified' : 'Flagged'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Candidate Table */}
            {candidatesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primaryTeal} />
                <Text style={styles.loadingText}>Loading assessment reports...</Text>
              </View>
            ) : candidatesList.length === 0 ? (
              <View style={styles.emptyTableContainer}>
                <Text style={styles.emptyTableTitle}>No candidate assessments found.</Text>
                <Text style={styles.emptyTableSub}>
                  Candidates will appear here once they start an AI assessment for your openings.
                </Text>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { flex: 2 }]}>Candidate</Text>
                  <Text style={[styles.thCell, { flex: 2 }]}>Internship</Text>
                  <Text style={[styles.thCell, { flex: 1.2 }]}>Status</Text>
                  <Text style={[styles.thCell, { flex: 1 }]}>Score</Text>
                  <Text style={[styles.thCell, { flex: 1.2 }]}>Integrity</Text>
                  <Text style={[styles.thCell, { flex: 1.2 }]}>Completed</Text>
                  <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Action</Text>
                </View>

                {/* Table Rows */}
                {candidatesList.map((item) => (
                  <View key={item.session_id} style={styles.tableBodyRow}>
                    <View style={[styles.tdCell, { flex: 2 }]}>
                      <Text style={styles.candidateName} numberOfLines={1}>{item.candidate_name}</Text>
                      <Text style={styles.candidateEmail} numberOfLines={1}>{item.candidate_email}</Text>
                    </View>

                    <View style={[styles.tdCell, { flex: 2 }]}>
                      <Text style={styles.internshipCellText} numberOfLines={1}>{item.internship_title}</Text>
                    </View>

                    <View style={[styles.tdCell, { flex: 1.2 }]}>
                      <View style={[
                        styles.tableStatusPill,
                        item.status === 'COMPLETED' ? styles.statusGreen : styles.statusAmber,
                      ]}>
                        <Text style={[
                          styles.tableStatusText,
                          item.status === 'COMPLETED' ? styles.statusGreenText : styles.statusAmberText,
                        ]}>
                          {item.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.tdCell, { flex: 1 }]}>
                      <Text style={styles.scoreText}>
                        {item.overall_score !== null ? `${item.overall_score}%` : '—'}
                      </Text>
                    </View>

                    <View style={[styles.tdCell, { flex: 1.2 }]}>
                      <View style={[
                        styles.integrityPill,
                        item.integrity_status === 'VERIFIED' ? styles.integrityVerified : styles.integrityFlagged,
                      ]}>
                        <Text style={[
                          styles.integrityPillText,
                          item.integrity_status === 'VERIFIED' ? styles.integrityVerifiedText : styles.integrityFlaggedText,
                        ]}>
                          {item.integrity_status === 'VERIFIED' ? '✓ Verified' : '🚩 Flagged'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.tdCell, { flex: 1.2 }]}>
                      <Text style={styles.dateText}>
                        {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Active'}
                      </Text>
                    </View>

                    <View style={[styles.tdCell, { flex: 1, alignItems: 'center' }]}>
                      <Pressable
                        style={styles.viewBtn}
                        onPress={() => handleOpenDossier(item.session_id)}
                      >
                        <Text style={styles.viewBtnText}>View Report</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ========================================== */}
      {/* CANDIDATE ASSESSMENT DOSSIER & FORENSICS MODAL */}
      {/* ========================================== */}
      <Modal
        visible={Boolean(selectedCandidateSessionId)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCandidateSessionId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {dossierData?.session?.candidate_name || 'Candidate Assessment Dossier'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {dossierData?.session?.internship_title || 'Role Assessment'} • {dossierData?.session?.candidate_email}
                </Text>
              </View>

              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedCandidateSessionId(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Modal Sub Tabs */}
            <View style={styles.modalTabsRow}>
              {['Performance', 'Integrity & Forensics', 'AI Committee Dossier'].map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.modalTabItem, dossierActiveTab === tab && styles.modalTabItemActive]}
                  onPress={() => setDossierActiveTab(tab)}
                >
                  <Text style={[styles.modalTabText, dossierActiveTab === tab && styles.modalTabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Modal Body */}
            {dossierLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.primaryTeal} />
                <Text style={styles.loadingText}>Retrieving multi-agent dossier & forensics...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScrollBody} contentContainerStyle={styles.modalContent}>
                {/* 1. PERFORMANCE TAB */}
                {dossierActiveTab === 'Performance' && (
                  <View style={styles.dossierSection}>
                    <View style={styles.overallScoreBanner}>
                      <Text style={styles.overallScoreHeading}>Overall Composite Score</Text>
                      <Text style={styles.overallScoreNumber}>
                        {dossierData?.session?.overall_score ?? dossierData?.evaluation?.overallScore ?? '—'}/100
                      </Text>
                    </View>

                    {/* Round Breakdown Cards */}
                    <View style={styles.roundPerfGrid}>
                      {/* Aptitude */}
                      <View style={styles.roundPerfCard}>
                        <Text style={styles.roundPerfTitle}>01 Aptitude Round</Text>
                        <Text style={styles.roundPerfScore}>
                          {dossierData?.performance?.aptitude?.score ?? '—'} / 100
                        </Text>
                        <Text style={styles.roundPerfSummary}>
                          {dossierData?.performance?.aptitude?.evaluation?.summary || 'Completed standard cognitive reasoning evaluation.'}
                        </Text>
                      </View>

                      {/* Technical */}
                      <View style={styles.roundPerfCard}>
                        <Text style={styles.roundPerfTitle}>02 Technical Round</Text>
                        <Text style={styles.roundPerfScore}>
                          {dossierData?.performance?.technical?.score ?? '—'} / 100
                        </Text>
                        <Text style={styles.roundPerfSummary}>
                          Theory: {dossierData?.performance?.technical?.evaluation?.theoryScore || 'N/A'} | Coding: {dossierData?.performance?.technical?.evaluation?.codingScore || 'N/A'}
                        </Text>
                      </View>

                      {/* AI Interview */}
                      <View style={styles.roundPerfCard}>
                        <Text style={styles.roundPerfTitle}>03 AI Voice Interview</Text>
                        <Text style={styles.roundPerfScore}>
                          {dossierData?.performance?.interview?.score ?? '—'} / 100
                        </Text>
                        <Text style={styles.roundPerfSummary}>
                          {dossierData?.performance?.interview?.evaluation?.summary || 'Spoken communication and architectural responses.'}
                        </Text>
                      </View>

                      {/* GD */}
                      <View style={styles.roundPerfCard}>
                        <Text style={styles.roundPerfTitle}>04 Group Discussion</Text>
                        <Text style={styles.roundPerfScore}>
                          {dossierData?.performance?.gd?.score ?? '—'} / 100
                        </Text>
                        <Text style={styles.roundPerfSummary}>
                          {dossierData?.performance?.gd?.evaluation?.summary || 'Multi-participant discussion leadership evaluation.'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 2. INTEGRITY & FORENSICS TAB */}
                {dossierActiveTab === 'Integrity & Forensics' && (
                  <View style={styles.dossierSection}>
                    <View style={styles.integritySummaryCard}>
                      <View style={styles.integrityHeaderRow}>
                        <Text style={styles.integrityHeading}>Integrity Audit Status</Text>
                        <View style={[
                          styles.integrityBadge,
                          dossierData?.session?.integrity_status === 'VERIFIED' ? styles.integrityVerified : styles.integrityFlagged,
                        ]}>
                          <Text style={styles.integrityBadgeText}>
                            {dossierData?.session?.integrity_status || 'VERIFIED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.integrityWarningsText}>
                        Total Telemetry Warnings Recorded: <Text style={{ fontWeight: '800' }}>{dossierData?.session?.warning_count || 0}</Text>
                      </Text>
                    </View>

                    {/* Forensic Timeline */}
                    <Text style={styles.timelineTitle}>Forensic Event Timeline</Text>
                    {(!dossierData?.forensic_timeline || dossierData.forensic_timeline.length === 0) ? (
                      <View style={styles.cleanTimelineBox}>
                        <Text style={styles.cleanTimelineText}>✓ No integrity violations or suspicious signals were detected during this session.</Text>
                      </View>
                    ) : (
                      <View style={styles.timelineList}>
                        {dossierData.forensic_timeline.map((ev, idx) => (
                          <View key={idx} style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineEventHead}>
                                <Text style={styles.timelineType}>{ev.type || 'SIGNAL_DETECTED'}</Text>
                                <Text style={styles.timelineTime}>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}</Text>
                              </View>
                              <Text style={styles.timelineEvidence}>
                                Evidence: {ev.details?.reason || JSON.stringify(ev.details || {})}
                              </Text>
                              {ev.candidateExplanation ? (
                                <Text style={styles.timelineExplanation}>
                                  Candidate Explanation: "{ev.candidateExplanation}"
                                </Text>
                              ) : null}
                              {ev.classification ? (
                                <View style={styles.classificationBadge}>
                                  <Text style={styles.classificationText}>
                                    AI Classification: {ev.classification}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* 3. AI COMMITTEE DOSSIER TAB */}
                {dossierActiveTab === 'AI Committee Dossier' && (
                  <View style={styles.dossierSection}>
                    <View style={styles.recommendationCard}>
                      <Text style={styles.recTitle}>Hiring Recommendation</Text>
                      <Text style={styles.recValue}>
                        {dossierData?.evaluation?.recommendation || 'Hire'}
                      </Text>
                      <Text style={styles.execSummary}>
                        {dossierData?.evaluation?.executiveSummary || 'Candidate demonstrates solid engineering fundamentals and communication skills across assessment rounds.'}
                      </Text>
                    </View>

                    {/* Competencies */}
                    {dossierData?.evaluation?.competencies?.length > 0 && (
                      <View style={styles.compBox}>
                        <Text style={styles.compHeading}>Core Competency Breakdown</Text>
                        {dossierData.evaluation.competencies.map((c, i) => (
                          <View key={i} style={styles.compItem}>
                            <View style={styles.compRow}>
                              <Text style={styles.compName}>{c.name}</Text>
                              <Text style={styles.compScore}>{c.score}/10 • {c.status}</Text>
                            </View>
                            <Text style={styles.compComment}>{c.comment}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* GEMINI GENERATED ASSESSMENT SCHEDULE REVIEW MODAL */}
      {/* ========================================== */}
      <Modal
        visible={scheduleReviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 640 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.modalTitle}>✨ Gemini Generated Schedule</Text>
                  <View style={styles.geminiBadge}>
                    <Text style={styles.geminiBadgeText}>Intelligent Plan</Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  {selectedInternshipObj?.title} • {formatDateDisplay(assessmentWindow.start_date)} → {formatDateDisplay(assessmentWindow.end_date)} ({assessmentWindow.timezone})
                </Text>
              </View>

              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setScheduleReviewModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Modal Body */}
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>
                Gemini has calculated the optimal round sequence and timing inside your assessment window. Review the proposed schedule before activation:
              </Text>

              <View style={styles.reviewScheduleContainer}>
                {scheduleReviewList && scheduleReviewList.length > 0 ? (
                  scheduleReviewList.map((sc, idx) => {
                    const roundName = sc.round_name || sc.display_name || sc.round || 'Round';
                    const isGeminiManaged = sc.schedule_mode === 'GEMINI_MANAGED' || sc.schedule_type === 'Gemini Managed';
                    const isFixed = sc.schedule_mode === 'fixed_session' || sc.schedule_type === 'Fixed Session';
                    const scheduleType = isGeminiManaged ? 'Gemini Managed' : isFixed ? 'Fixed Session' : 'Flexible Window';
                    const durationDisplay = `${sc.duration_minutes || sc.duration_min || (isGeminiManaged ? 20 : 30)} min`;
                    const dateDisplay = isGeminiManaged
                      ? `${formatDateDisplay(sc.start_date || '2026-10-13')} • Dynamically allocated slot`
                      : `${formatDateDisplay(sc.start_date)} ${sc.start_time ? `• ${formatTimeDisplay(sc.start_time)}` : ''}${sc.end_time ? ` – ${formatTimeDisplay(sc.end_time)}` : ''}`;

                    return (
                      <View key={idx} style={[styles.reviewScheduleItem, idx === scheduleReviewList.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.seqBadgeSmall}>
                          <Text style={styles.seqBadgeSmallText}>{sc.sequence || idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={styles.reviewRoundName}>{roundName}</Text>
                            <View style={[
                              styles.timelineModePill,
                              isGeminiManaged && { backgroundColor: '#F3E8FF' },
                              isFixed && { backgroundColor: '#FEF3C7' },
                            ]}>
                              <Text style={[
                                styles.timelineModePillText,
                                isGeminiManaged && { color: '#7C3AED' },
                                isFixed && { color: '#B45309' },
                              ]}>
                                {scheduleType}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.reviewRoundDates}>{dateDisplay}</Text>
                        </View>
                        <View style={styles.reviewRoundDurBadge}>
                          <Text style={styles.reviewRoundDurText}>{durationDisplay}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Schedule generation complete.</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.reviewActionRow}>
                <Pressable
                  style={styles.reviewBackBtn}
                  onPress={() => {
                    setScheduleReviewModalVisible(false);
                    setEditScheduleModalVisible(true);
                  }}
                >
                  <Text style={styles.reviewBackBtnText}>✏️ Fine-Tune Dates</Text>
                </Pressable>

                <Pressable
                  style={[styles.reviewActivateBtn, configSaving && styles.btnDisabled]}
                  onPress={() => handleSaveAssessment(true)}
                  disabled={configSaving}
                >
                  {configSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.reviewActivateBtnText}>Save & Activate Assessment</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* EDIT SCHEDULE MODAL (VISUAL DATE PICKERS) */}
      {/* ========================================== */}
      <Modal
        visible={editScheduleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 680, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>📅 Edit Assessment Schedule</Text>
                <Text style={styles.modalSubtitle}>
                  Adjust specific dates and windows for each round ({assessmentWindow.timezone || 'Asia/Kolkata'}).
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setEditScheduleModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {roundSequence.map((rKey, idx) => {
                const rInfo = pipelineState[rKey];
                if (!rInfo || !rInfo.enabled) return null;
                const roundName = rKey === 'aptitude' ? 'Aptitude' : rKey === 'technical' ? 'Technical Assessment' : rKey === 'interview' ? 'AI Voice Interview' : 'Group Discussion';
                const isGeminiManaged = rKey === 'interview';
                const isFixed = rKey === 'gd';

                return (
                  <View key={rKey} style={styles.editScheduleRoundCard}>
                    <View style={styles.editScheduleRoundHeader}>
                      <View style={styles.sequenceNumberBadge}>
                        <Text style={styles.sequenceNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.editScheduleRoundTitle}>{roundName}</Text>
                      <View style={[
                        styles.timelineModePill,
                        isGeminiManaged && { backgroundColor: '#F3E8FF' },
                        isFixed && { backgroundColor: '#FEF3C7' },
                      ]}>
                        <Text style={[
                          styles.timelineModePillText,
                          isGeminiManaged && { color: '#7C3AED' },
                          isFixed && { color: '#B45309' },
                        ]}>
                          {isGeminiManaged ? 'Gemini Managed' : isFixed ? 'Fixed Session' : 'Flexible Window'}
                        </Text>
                      </View>
                    </View>

                    {isGeminiManaged ? (
                      <View style={styles.editScheduleFieldsRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Scheduled Interview Date</Text>
                          <SkillSetuDatePicker
                            value={rInfo.schedule?.start_date || assessmentWindow.start_date || '2026-10-13'}
                            onChange={(d) => {
                              setPipelineState((prev) => ({
                                ...prev,
                                interview: {
                                  ...prev.interview,
                                  schedule: {
                                    ...prev.interview.schedule,
                                    start_date: d,
                                    end_date: d,
                                  },
                                },
                              }));
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <Text style={styles.fieldLabel}>Time Slot Allocation</Text>
                          <View style={styles.geminiManagedTimeBox}>
                            <Text style={styles.geminiManagedTimeText}>⚡ Automatically allocated by Gemini</Text>
                          </View>
                        </View>
                      </View>
                    ) : isFixed ? (
                      <View style={styles.editScheduleFieldsRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Session Date</Text>
                          <SkillSetuDatePicker
                            value={rInfo.schedule?.start_date || assessmentWindow.end_date || '2026-10-15'}
                            onChange={(d) => {
                              setPipelineState((prev) => ({
                                ...prev,
                                gd: {
                                  ...prev.gd,
                                  schedule: {
                                    ...prev.gd.schedule,
                                    start_date: d,
                                    end_date: d,
                                  },
                                },
                              }));
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <Text style={styles.fieldLabel}>Start Time</Text>
                          <SkillSetuTimePicker
                            value={rInfo.schedule?.start_time || '16:00'}
                            onChange={(t) => {
                              setPipelineState((prev) => ({
                                ...prev,
                                gd: {
                                  ...prev.gd,
                                  schedule: {
                                    ...prev.gd.schedule,
                                    start_time: t,
                                  },
                                },
                              }));
                            }}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.editScheduleFieldsGrid}>
                        <View style={styles.windowFieldItem}>
                          <Text style={styles.fieldLabel}>Window Start Date</Text>
                          <SkillSetuDatePicker
                            value={rInfo.schedule?.start_date || assessmentWindow.start_date}
                            onChange={(d) => {
                              setPipelineState((prev) => ({
                                ...prev,
                                [rKey]: {
                                  ...prev[rKey],
                                  schedule: {
                                    ...prev[rKey].schedule,
                                    start_date: d,
                                  },
                                },
                              }));
                            }}
                          />
                        </View>
                        <View style={styles.windowFieldItem}>
                          <Text style={styles.fieldLabel}>Window End Date</Text>
                          <SkillSetuDatePicker
                            value={rInfo.schedule?.end_date || assessmentWindow.end_date}
                            onChange={(d) => {
                              setPipelineState((prev) => ({
                                ...prev,
                                [rKey]: {
                                  ...prev[rKey],
                                  schedule: {
                                    ...prev[rKey].schedule,
                                    end_date: d,
                                  },
                                },
                              }));
                            }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.modalFooter, { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
              <Pressable
                style={styles.reviewBackBtn}
                onPress={() => setEditScheduleModalVisible(false)}
              >
                <Text style={styles.reviewBackBtnText}>Done / Close</Text>
              </Pressable>
              <Pressable
                style={styles.activateBtn}
                onPress={() => {
                  setEditScheduleModalVisible(false);
                  handleSaveAssessment(true);
                }}
              >
                <Text style={styles.activateBtnText}>Save & Apply Schedule</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* REGENERATE CONFIRMATION MODAL */}
      {/* ========================================== */}
      <Modal
        visible={regenerateConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegenerateConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>🔄 Regenerate Schedule?</Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setRegenerateConfirmModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: COLORS.textMain, lineHeight: 22, marginBottom: 12 }}>
                This will recalculate the intelligent multi-round schedule based on your window (<Text style={styles.boldText}>{formatDateDisplay(assessmentWindow.start_date)} → {formatDateDisplay(assessmentWindow.end_date)}</Text>) and the configured round sequence.
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 20 }}>
                ⚠️ Completed and in-progress candidate assessments will not be modified or reset.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <Pressable
                  style={styles.reviewBackBtn}
                  onPress={() => setRegenerateConfirmModalVisible(false)}
                >
                  <Text style={styles.reviewBackBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.activateBtn}
                  onPress={() => {
                    setRegenerateConfirmModalVisible(false);
                    handleGenerateSchedule();
                  }}
                >
                  <Text style={styles.activateBtnText}>🔄 Regenerate with Gemini</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 60,
  },
  pageHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
    flexDirection: 'column',
    gap: 12,
  },
  headerLeft: {},
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  subTabNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  subTabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    position: 'relative',
  },
  subTabItemActive: {
    backgroundColor: COLORS.mintBg,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subTabTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: -2,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 2,
  },
  tabContent: {
    marginTop: 8,
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  kpiIconBoxTeal: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.mintBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconBoxGreen: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.greenPillBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconBoxBlue: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.bluePillBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconBoxRed: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.redPillBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiEmoji: {
    fontSize: 16,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  kpiSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Banner
  actionBannerCard: {
    backgroundColor: COLORS.darkSurface,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  bannerHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#94A3B8',
    maxWidth: 600,
  },
  bannerBtn: {
    backgroundColor: COLORS.tealAccent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bannerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Benchmarks
  analyticsSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  benchmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  benchmarkCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benchmarkTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  benchmarkVal: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 3,
  },

  // Assessment Management Header
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
    position: 'relative',
    zIndex: 100,
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  managementSub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    zIndex: 1000,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 240,
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    maxWidth: 200,
  },
  dropdownArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 260,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 25,
    zIndex: 9999,
    paddingVertical: 6,
  },
  dropdownMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemActive: {
    backgroundColor: COLORS.mintBg,
  },
  dropdownMenuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  dropdownMenuItemTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  dropdownItemDept: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  noInternshipsPill: {
    backgroundColor: COLORS.orangePillBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noInternshipsPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.orangePillText,
  },

  // Status Summary Card
  statusSummaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    position: 'relative',
    zIndex: 1,
  },
  statusCardLeft: {
    minWidth: 240,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  statusRoleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  statusRoleSub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.mintBadge,
  },
  statusBadgeDraft: {
    backgroundColor: COLORS.orangePillBg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: COLORS.mintBadgeText,
  },
  statusBadgeTextDraft: {
    color: COLORS.orangePillText,
  },
  statusMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  metricItemVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  metricItemLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },

  // Pipeline Container & Cards
  pipelineContainer: {
    gap: 8,
  },
  pipelineHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roundCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  roundCardMuted: {
    opacity: 0.55,
    backgroundColor: '#F8FAFC',
  },
  roundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  roundNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.mintBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  roundName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  roundDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pipelineFlowIndicator: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  pipelineArrowText: {
    fontSize: 18,
    color: COLORS.textLight,
    fontWeight: '800',
  },
  roundConfigBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  formGroup: {
    flex: 1,
    minWidth: 140,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionPillActive: {
    backgroundColor: COLORS.primaryTeal,
    borderColor: COLORS.primaryTeal,
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  optionPillTextActive: {
    color: '#FFFFFF',
  },
  supportedTypesRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  warningAlertBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  warningAlertHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  warningAlertItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },

  // Round Scheduling Box Styles
  scheduleSectionBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  scheduleSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  scheduleSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  scheduleModeBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scheduleModeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.mintBadgeText,
  },
  scheduleSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  scheduleFieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scheduleFieldItem: {
    flex: 1,
    minWidth: 150,
  },

  // Interactive Pickers & Selectors Styles
  pickerWrapper: {
    width: '100%',
    marginTop: 4,
  },
  pickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerTriggerDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  pickerTriggerIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  pickerTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    flex: 1,
  },
  pickerTriggerPlaceholder: {
    color: COLORS.textLight,
    fontWeight: '400',
  },
  pickerChevron: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginLeft: 6,
  },

  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Calendar Modal Card
  calendarModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calMonthYearTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calNavBtnText: {
    fontSize: 13,
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  calDaysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  calDayLabel: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calCellEmpty: {
    width: 38,
    height: 38,
    margin: 2,
  },
  calCell: {
    width: 38,
    height: 38,
    margin: 2,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.tealAccent,
  },
  calCellSelected: {
    backgroundColor: COLORS.primaryTeal,
  },
  calCellDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.35,
  },
  calCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  calCellTextToday: {
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  calCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calCellTextDisabled: {
    color: COLORS.textLight,
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  calTodayBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.mintBg,
  },
  calTodayBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  calDoneBtn: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: COLORS.primaryTeal,
  },
  calDoneBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Time Picker Modal Card
  timeModalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  timeSlotsScroll: {
    maxHeight: 340,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  timeSlotPill: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 6,
  },
  timeSlotPillSelected: {
    backgroundColor: COLORS.primaryTeal,
    borderColor: COLORS.primaryTeal,
  },
  timeSlotPillDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.35,
    borderColor: '#CBD5E1',
  },
  timeSlotPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  timeSlotPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timeSlotPillTextDisabled: {
    color: COLORS.textLight,
  },

  // Select Dropdown Modal Card
  selectModalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectOptionsScroll: {
    maxHeight: 320,
  },
  selectOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectOptionItemSelected: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.tealAccent,
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    flex: 1,
  },
  selectOptionTextSelected: {
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  selectCheckmark: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    marginLeft: 8,
  },

  languagesWrapper: {
    marginTop: 14,
  },
  languagePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langPillActive: {
    backgroundColor: COLORS.mintBadge,
    borderColor: '#A7F3D0',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  langPillTextActive: {
    color: COLORS.mintBadgeText,
  },
  infoStaticText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: 4,
  },

  // Switch styles
  switchContainer: {
    width: 64,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  switchOn: {
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'flex-end',
  },
  switchOff: {
    backgroundColor: '#CBD5E1',
    justifyContent: 'flex-start',
  },
  switchDisabled: {
    opacity: 0.4,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  thumbOn: {
    marginLeft: 4,
  },
  thumbOff: {
    marginRight: 4,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  labelOn: {
    color: '#FFFFFF',
  },
  labelOff: {
    color: COLORS.textMuted,
  },

  // Settings Section Card
  settingsSectionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginTop: 12,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  weightSumBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weightSumValid: {
    backgroundColor: COLORS.mintBadge,
  },
  weightSumInvalid: {
    backgroundColor: COLORS.redPillBg,
  },
  weightSumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  weightSumTextValid: {
    color: COLORS.mintBadgeText,
  },
  weightSumTextInvalid: {
    color: COLORS.redPillText,
  },
  scoringInputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  scoreWeightBox: {
    flex: 1,
    minWidth: 120,
  },
  scoreWeightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  weightInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Integrity Grid
  integrityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  integrityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  integrityCheck: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  integrityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  integrityInfoBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryTeal,
  },
  integrityInfoIcon: {
    fontSize: 14,
  },
  integrityInfoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 16,
  },

  // Action Row
  publishActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  draftBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  draftBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  activateBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Alerts
  successAlert: {
    backgroundColor: COLORS.mintBadge,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.mintBadgeText,
  },
  errorAlert: {
    backgroundColor: COLORS.redPillBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.redPillText,
  },

  // Empty Container
  emptyContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 400,
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Reports Breakdown Row
  reportsStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  reportsStatCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 8,
  },
  statCardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  roundStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  roundStatLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  roundStatVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  roundStatScore: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
  },

  // Schedule Timeline Card
  scheduleTimelineCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 24,
  },
  scheduleTimelineTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timelineTh: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timelineTdName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  timelineModePill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  timelineModePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.mintBadgeText,
  },
  timelineTd: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // Table Card
  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  filterBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textMain,
  },
  filterDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryTeal,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Table Styling
  tableContainer: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  thCell: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdCell: {},
  candidateName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  candidateEmail: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  internshipCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  tableStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusGreen: {
    backgroundColor: COLORS.greenPillBg,
  },
  statusGreenText: {
    color: COLORS.greenPillText,
    fontSize: 11,
    fontWeight: '700',
  },
  statusAmber: {
    backgroundColor: COLORS.orangePillBg,
  },
  statusAmberText: {
    color: COLORS.orangePillText,
    fontSize: 11,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  integrityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  integrityVerified: {
    backgroundColor: COLORS.mintBadge,
  },
  integrityVerifiedText: {
    color: COLORS.mintBadgeText,
    fontSize: 11,
    fontWeight: '700',
  },
  integrityFlagged: {
    backgroundColor: COLORS.orangePillBg,
  },
  integrityFlaggedText: {
    color: COLORS.orangePillText,
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  viewBtn: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  emptyTableContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyTableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptyTableSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 860,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  modalTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 20,
  },
  modalTabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalTabItemActive: {
    borderBottomColor: COLORS.primaryTeal,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalTabTextActive: {
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  modalLoading: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  modalScrollBody: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
  },
  dossierSection: {
    gap: 16,
  },
  overallScoreBanner: {
    backgroundColor: COLORS.darkSurface,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallScoreHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overallScoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.tealAccent,
  },
  roundPerfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  roundPerfCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roundPerfTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  roundPerfScore: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    marginBottom: 6,
  },
  roundPerfSummary: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  integritySummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  integrityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  integrityHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  integrityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  integrityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.mintBadgeText,
  },
  integrityWarningsText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 8,
  },
  cleanTimelineBox: {
    backgroundColor: COLORS.mintBg,
    borderRadius: 8,
    padding: 16,
  },
  cleanTimelineText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mintBadgeText,
  },
  timelineList: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryTeal,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineEventHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineType: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  timelineTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  timelineEvidence: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  timelineExplanation: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMain,
    marginTop: 4,
  },
  classificationBadge: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  classificationText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  recommendationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  recValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    marginVertical: 6,
  },
  execSummary: {
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
  },
  compBox: {
    gap: 10,
  },
  compHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  compItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  compScore: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  compComment: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },

  // Active Assessment Hero Card
  activeWindowHeroCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  activeWindowInfo: {
    flex: 1,
    minWidth: 260,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  activeHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  activeHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeHeroMetaText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '500',
  },
  activeHeroMetaDivider: {
    color: '#86EFAC',
    fontSize: 14,
  },
  boldText: {
    fontWeight: '800',
  },
  editConfigBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  editConfigBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },

  // Timeline Header Row & Badges
  timelineCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  geminiBadge: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  geminiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },

  // Summary Split Grid
  summarySplitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 10,
  },
  summaryWeightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  summaryWeightItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  summaryWeightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  summaryWeightVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },

  // Editing Banner
  editingBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  editingBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  editingBannerSub: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  cancelEditBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },

  // Window Planning Card
  windowPlanningCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  windowPlanningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  windowPlanningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  windowPlanningSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    maxWidth: 600,
  },
  windowFieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
  },
  windowFieldItem: {
    flex: 1,
    minWidth: 200,
  },
  windowActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  geminiGenerateBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  geminiGenerateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Scheduled Pills & Gemini Info
  scheduledPillRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  scheduledPillLabel: {
    fontSize: 12,
    color: COLORS.textMain,
  },
  geminiManagedInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  geminiManagedInfoIcon: {
    fontSize: 14,
  },
  geminiManagedInfoText: {
    fontSize: 12,
    color: '#6B21A8',
  },

  // Schedule Review Modal
  reviewScheduleContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 20,
  },
  reviewScheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  reviewRoundName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  reviewRoundDates: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  reviewRoundDurBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reviewRoundDurText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  reviewActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  reviewBackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: '#FFFFFF',
  },
  reviewBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  reviewActivateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  reviewActivateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Active Assessment Hero Card & Action Bar
  activeWindowHeroCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  activeWindowInfo: {
    flex: 1,
    minWidth: 280,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.2,
  },
  activeHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeHeroMetaText: {
    fontSize: 13,
    color: COLORS.textMain,
  },
  activeHeroMetaDivider: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  activeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  editConfigBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  editConfigBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  editScheduleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editScheduleBtnText: {
    color: COLORS.textMain,
    fontWeight: '700',
    fontSize: 13,
  },
  regenerateBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C084FC',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenerateBtnText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 13,
  },

  // Timeline Card Header & Gemini Badge
  scheduleTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 20,
  },
  timelineCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 10,
  },
  geminiBadge: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  geminiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },

  // Round Sequence & Order Section
  sequenceSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  sequenceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sequenceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  sequenceSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  strictBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  strictBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sequenceList: {
    gap: 10,
  },
  sequenceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  sequenceDragHandle: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dragHandleIcon: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  seqBadgeSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00332C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqBadgeSmallText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  seqRoundInfo: {
    flex: 1,
  },
  seqRoundName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 3,
  },
  seqRoundMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sequenceControls: {
    flexDirection: 'column',
    gap: 4,
  },
  seqArrowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  seqArrowBtnDisabled: {
    opacity: 0.3,
  },
  seqArrowText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },

  // Gemini Generated Assessment Schedule Card
  generatedScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  genSchedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  genSchedHeaderLeft: {
    flex: 1,
    minWidth: 260,
  },
  genSchedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 4,
  },
  genSchedSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  genSchedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genSchedBtn: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genSchedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  genSchedBtnSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genSchedBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  genRoundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genRoundCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    padding: 14,
    gap: 6,
  },
  genRoundTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  genRoundSeq: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9333EA',
  },
  genRoundName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  genRoundDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  genRoundTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  genRoundDuration: {
    fontSize: 11,
    color: '#6B21A8',
    marginTop: 2,
  },

  // Edit Assessment Schedule Modal
  editScheduleModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '90%',
    maxWidth: 620,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    overflow: 'hidden',
  },
  editScheduleRoundCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    gap: 10,
  },
  editScheduleRoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  editScheduleRoundTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    flex: 1,
  },
  editScheduleFieldsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  // Regenerate Confirmation Modal
  confirmModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '90%',
    maxWidth: 480,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  confirmModalIcon: {
    fontSize: 24,
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  confirmModalBody: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  confirmCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: '#FFFFFF',
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  confirmRegenerateBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
  },
  confirmRegenerateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Sequence Section Styles
  sequenceSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  sequenceSectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  sequenceOrderBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sequenceOrderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sequenceListWrap: {
    marginTop: 12,
    gap: 10,
  },
  sequenceItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sequenceNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00332C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sequenceRoundName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 3,
  },
  sequenceRoundMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sequenceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#F1F5F9',
  },
  sequenceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  sequenceBtnTextDisabled: {
    color: COLORS.textMuted,
  },

  // Generated Schedule Section Styles
  generatedScheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  generatedScheduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 4,
  },
  generatedScheduleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  editScheduleBtnSmall: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editScheduleBtnSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  regenerateBtnSmall: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenerateBtnSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  generatedScheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  generatedScheduleCol: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 14,
    gap: 6,
  },
  generatedColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  generatedColSeq: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9333EA',
  },
  generatedColName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  generatedColDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  generatedColTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  generatedColDur: {
    fontSize: 11,
    color: '#6B21A8',
    marginTop: 2,
  },

  // Technical & Language Pills
  codingConfigBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  languagePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },

  // AI Interview & Modals
  aiInterviewScheduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  geminiManagedTimeBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  geminiManagedTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  editScheduleFieldsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  tableStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  integrityPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMain,
  },
});
