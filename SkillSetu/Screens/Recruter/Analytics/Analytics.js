import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  ChipGroup,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  ProgressBar,
  Row,
  SearchField,
  SectionTitle,
  SegmentedTabs,
  Sheet,
  Skeleton,
  Stack,
  StatTile,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

const ROUND_KEYS = ['aptitude', 'technical', 'interview', 'gd'];
const ROUND_META = {
  aptitude: { label: 'Aptitude', icon: 'Brain', tone: 'info' },
  technical: { label: 'Technical', icon: 'Code', tone: 'accent' },
  interview: { label: 'AI voice interview', icon: 'Mic', tone: 'pink' },
  gd: { label: 'Group discussion', icon: 'Users', tone: 'warning' },
};

// YYYY-MM-DD for today + n days (local time).
function isoDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
    start_date: isoDays(1),
    end_date: isoDays(7),
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
        start_date: isoDays(1),
        start_time: '10:00',
        end_date: isoDays(2),
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
        start_date: isoDays(2),
        start_time: '10:00',
        end_date: isoDays(3),
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
        start_date: isoDays(4),
        start_time: null,
        end_date: isoDays(4),
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
        start_date: isoDays(6),
        start_time: '16:00',
        end_date: isoDays(6),
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
          start_date: data.config.assessment_window.start_date || isoDays(1),
          end_date: data.config.assessment_window.end_date || isoDays(6),
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
      setConfigSuccessMsg('Schedule generated inside your window — review it before activating.');
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
    // Only enabled rounds count, matching the total shown in the editor.
    const totalWeights = (
      (pipelineState.aptitude.enabled ? Number(scoringWeights.aptitude || 0) : 0) +
      (pipelineState.technical.enabled ? Number(scoringWeights.technical || 0) : 0) +
      (pipelineState.interview.enabled ? Number(scoringWeights.interview || 0) : 0) +
      (pipelineState.gd.enabled ? Number(scoringWeights.gd || 0) : 0)
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
      setConfigSuccessMsg(activate ? 'Assessment pipeline activated.' : 'Draft saved.');
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
  const setRound = (key, patch) => setPipelineState((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setSchedule = (key, patch) => setPipelineState((p) => ({ ...p, [key]: { ...p[key], schedule: { ...(p[key].schedule || {}), ...patch } } }));
  const reports = reportsData || {};
  const kpis = reports.kpis || {};
  const avg = reports.average_scores || {};
  const completion = reports.round_completion || {};
  const integ = reports.integrity_overview || {};
  const isConfigured = !!configData?.is_configured;
  const tabs = [
    { id: 'Overview', label: 'Overview', icon: 'ChartColumn' },
    { id: 'Assessment Management', label: 'Setup', icon: 'Settings' },
    { id: 'Assessment Reports', label: 'Reports', icon: 'FileText' },
  ];
  const integrityTone = (s = '') => (/VERIFIED|CLEAR/i.test(s) ? 'success' : /FLAG|WARN/i.test(s) ? 'warning' : /FAIL/i.test(s) ? 'danger' : 'neutral');

  const scoreBars = (obj) =>
    ROUND_KEYS.map((k) => (
      <Row key={k} gap={10}>
        <Txt variant="small" weight={600} tone="ink" style={{ width: 120 }}>{ROUND_META[k].label}</Txt>
        <ProgressBar value={obj[k] || 0} tone={ROUND_META[k].tone} height={10} style={{ flex: 1 }} />
        <Txt variant="small" weight={700} tone="ink" style={{ width: 44, textAlign: 'right' }}>{obj[k] != null ? `${obj[k]}%` : '—'}</Txt>
      </Row>
    ));

  // ---------------------------------------------------------------- Overview
  const overview = (
    <Stack gap={space.md}>
      <View style={styles.statsRow}>
        <StatTile value={reportsLoading ? '…' : kpis.total_assessments ?? 0} label="Assessments" tone="info" style={styles.stat} />
        <StatTile value={reportsLoading ? '…' : kpis.in_progress ?? 0} label="In progress" tone="accent" style={styles.stat} />
        <StatTile value={reportsLoading ? '…' : kpis.completed ?? 0} label="Completed" tone="success" style={styles.stat} />
        <StatTile value={reportsLoading ? '…' : kpis.flagged ?? 0} label="Flagged" dashed style={styles.stat} />
      </View>
      <View style={[styles.split, isDesktop ? styles.splitRow : null]}>
        <Card style={isDesktop ? { flex: 1 } : null}>
          <Row justify="space-between">
            <Txt variant="h3" tone="ink">Average scores</Txt>
            {avg.overall != null ? <Pill label={`${avg.overall}% overall`} tone="success" size="sm" /> : null}
          </Row>
          <Stack gap={12} style={{ marginTop: space.md }}>{scoreBars(avg)}</Stack>
        </Card>
        <Card style={isDesktop ? { flex: 1 } : null}>
          <Txt variant="h3" tone="ink">Round completion</Txt>
          <Stack gap={12} style={{ marginTop: space.md }}>{scoreBars(completion)}</Stack>
        </Card>
      </View>
      <Card>
        <Txt variant="h3" tone="ink">Integrity</Txt>
        <Row wrap gap={8} style={{ marginTop: space.sm }}>
          <Pill label={`${integ.verified ?? 0} verified`} tone="success" icon="ShieldCheck" />
          <Pill label={`${integ.warnings ?? 0} warnings`} tone="warning" icon="CircleAlert" />
          <Pill label={`${integ.flagged ?? 0} flagged`} tone="peach" />
          <Pill label={`${integ.failed ?? 0} failed`} tone="danger" />
        </Row>
      </Card>
      {(Array.isArray(reports.schedule_timeline) && reports.schedule_timeline.length > 0) ? (
        <Card>
          <Txt variant="h3" tone="ink">Schedule</Txt>
          <Timeline
            gap={space.sm}
            style={{ marginTop: space.sm }}
            items={reports.schedule_timeline.filter(Boolean).map((c, i) => {
              const label = typeof (c.display_name || c.round_name || c.label || c.round) === 'object'
                ? JSON.stringify(c.display_name || c.round_name || c.label || c.round)
                : (c.display_name || c.round_name || c.label || c.round || `Round ${i + 1}`);
              return {
                key: `${c.round_key || c.round_name || c.round || i}`,
                done: c.status === 'COMPLETED',
                content: (
                  <View style={styles.cell}>
                    <Txt variant="small" weight={700} tone="ink">{label}</Txt>
                    <Txt variant="caption" tone="muted">
                      {[
                        c.scheduled_date || c.start_date || c.date,
                        c.start_time && `${c.start_time}${c.end_time ? `–${c.end_time}` : ''}`,
                        c.duration_display || (c.duration_minutes && `${c.duration_minutes} min`),
                        c.schedule_type,
                      ].filter(Boolean).join(' · ')}
                    </Txt>
                  </View>
                ),
              };
            })}
          />
        </Card>
      ) : null}
    </Stack>
  );

  // ---------------------------------------------------------------- Setup
  const enabledRounds = roundSequence.filter((k) => pipelineState[k]?.enabled);
  const setup = (
    <Stack gap={space.md}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {internships.map((p) => (
          <Chip key={p.id} label={p.title} icon="Briefcase" tone="info" selected={p.id === selectedInternshipId} onPress={() => setSelectedInternshipId(p.id)} />
        ))}
      </ScrollView>

      {configErrorMsg ? <Inset tone="danger" padding={space.sm}><Txt variant="small" weight={600} color="#B4232A">{configErrorMsg}</Txt></Inset> : null}
      {configSuccessMsg ? <Inset tone="success" padding={space.sm}><Txt variant="small" weight={600} color={colors.mintInk}>{configSuccessMsg.replace(/^[✓✨]\s*/, '')}</Txt></Inset> : null}
      {configWarnings.length ? (
        <Inset tone="warning" padding={space.sm}>
          {configWarnings.map((w, i) => <Txt key={i} variant="small" color={colors.butterInk}>• {typeof w === 'string' ? w : w.message || JSON.stringify(w)}</Txt>)}
        </Inset>
      ) : null}

      {internshipsLoading || configLoading ? (
        <Skeleton height={260} radius={radii.xl} />
      ) : !selectedInternshipObj ? (
        <Card><EmptyState icon="Briefcase" title="No internships yet" message="Post an internship, then set up its assessment rounds here." action={<Button label="Go to internships" onPress={() => onNavigateTab && onNavigateTab('Internships')} />} /></Card>
      ) : !isEditingConfig && isConfigured ? (
        <Card tone="success">
          <Row justify="space-between" wrap gap={8}>
            <Stack gap={4} style={{ flex: 1, minWidth: 220 }}>
              <Txt variant="overline" color={colors.mintInk}>Active pipeline</Txt>
              <Txt variant="h2" tone="ink">{selectedInternshipObj.title}</Txt>
              <Txt variant="small" color={colors.mintInk}>{assessmentWindow.start_date} → {assessmentWindow.end_date} · {assessmentWindow.timezone} · pass mark {scoringWeights.passing_threshold}%</Txt>
            </Stack>
            <Button label="Edit pipeline" icon="Pencil" variant="light" onPress={() => setIsEditingConfig(true)} />
          </Row>
          <Row wrap gap={6} style={{ marginTop: space.md }}>
            {enabledRounds.map((k, i) => (
              <React.Fragment key={k}>
                <Pill label={`${i + 1}. ${ROUND_META[k].label} · ${scoringWeights[k] ?? 0}%`} tone={ROUND_META[k].tone} icon={ROUND_META[k].icon} />
                {i < enabledRounds.length - 1 ? <Icon name="ChevronRight" size={14} color={colors.mintInk} /> : null}
              </React.Fragment>
            ))}
          </Row>
        </Card>
      ) : (
        <>
          <Card>
            <Txt variant="h3" tone="ink">Assessment window</Txt>
            <Txt variant="small" tone="muted">All rounds must fit inside these dates.</Txt>
            <Row gap={space.sm} wrap style={{ marginTop: space.md }} align="flex-start">
              <Field style={{ flex: 1, minWidth: 160 }} label="Start date" icon="Calendar" placeholder="YYYY-MM-DD" value={assessmentWindow.start_date || ''} onChangeText={(v) => setAssessmentWindow((w) => ({ ...w, start_date: v }))} />
              <Field style={{ flex: 1, minWidth: 160 }} label="End date" icon="Calendar" placeholder="YYYY-MM-DD" value={assessmentWindow.end_date || ''} onChangeText={(v) => setAssessmentWindow((w) => ({ ...w, end_date: v }))} />
            </Row>
            <Txt variant="small" weight={600} tone="ink" style={{ marginTop: space.md, marginBottom: 6 }}>Timezone</Txt>
            <ChipGroup options={TIMEZONE_OPTIONS.map((t) => ({ id: t.value, label: t.value }))} value={assessmentWindow.timezone} multiple={false} tone="info" onChange={(v) => setAssessmentWindow((w) => ({ ...w, timezone: v }))} />
          </Card>

          {roundSequence.map((key, idx) => (
            <RoundEditor
              key={key}
              roundKey={key}
              index={idx}
              total={roundSequence.length}
              round={pipelineState[key] || {}}
              weight={scoringWeights[key]}
              onWeight={(v) => setScoringWeights((w) => ({ ...w, [key]: v }))}
              onChange={(patch) => setRound(key, patch)}
              onSchedule={(patch) => setSchedule(key, patch)}
              onMove={(dir) => moveRoundInSequence(idx, idx + dir)}
            />
          ))}

          <Card tone={currentTotalWeight === 100 ? 'success' : 'warning'}>
            <Row justify="space-between" wrap gap={8}>
              <Stack gap={2}>
                <Txt variant="h3" tone="ink">Scoring</Txt>
                <Txt variant="small" tone="muted">Weights of enabled rounds must add up to 100%.</Txt>
              </Stack>
              <Txt variant="h2" tone="ink">{currentTotalWeight}%</Txt>
            </Row>
            <Row gap={space.sm} align="flex-end" style={{ marginTop: space.md }} wrap>
              <Field style={{ width: 160 }} label="Pass mark (%)" keyboardType="number-pad" value={String(scoringWeights.passing_threshold ?? '')} onChangeText={(v) => setScoringWeights((w) => ({ ...w, passing_threshold: Number(v.replace(/\D/g, '')) || 0 }))} />
            </Row>
          </Card>

          <Card>
            <Txt variant="h3" tone="ink">Integrity & proctoring</Txt>
            <Stack gap={10} style={{ marginTop: space.sm }}>
              {[
                ['camera_required', 'Camera required'],
                ['microphone_required', 'Microphone required'],
                ['continuous_recording', 'Record the full session'],
                ['integrity_monitoring', 'AI integrity monitoring'],
              ].map(([k, label]) => (
                <Checkbox key={k} checked={!!integrityConfig[k]} onChange={(v) => setIntegrityConfig((c) => ({ ...c, [k]: v }))} label={label} />
              ))}
            </Stack>
          </Card>

          <Row gap={8} wrap justify="flex-end">
            {isConfigured ? <Button label="Cancel" variant="ghost" onPress={() => setIsEditingConfig(false)} /> : null}
            <Button label="Generate schedule with AI" icon="Sparkles" variant="secondary" onPress={handleGenerateSchedule} loading={generatingSchedule} />
            <Button label="Save draft" variant="secondary" onPress={() => handleSaveAssessment(false)} disabled={configSaving} />
            <Button label="Activate pipeline" icon="Rocket" onPress={() => handleSaveAssessment(true)} loading={configSaving} />
          </Row>
        </>
      )}
    </Stack>
  );

  // ---------------------------------------------------------------- Reports
  const reportsTab = (
    <Stack gap={space.md}>
      <Row gap={8} wrap>
        <SearchField value={reportSearch} onChangeText={(v) => { setReportSearch(v); setReportPage(1); }} placeholder="Candidate name or email" style={{ flex: 1, minWidth: 220 }} />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="All roles" selected={reportFilterInternship === 'All'} onPress={() => { setReportFilterInternship('All'); setReportPage(1); }} />
        {internships.map((p) => (
          <Chip key={p.id} label={p.title} tone="info" selected={String(reportFilterInternship) === String(p.id)} onPress={() => { setReportFilterInternship(p.id); setReportPage(1); }} />
        ))}
        {['All', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'].map((s) => (
          <Chip key={`s${s}`} label={s === 'All' ? 'Any status' : s.replace('_', ' ').toLowerCase()} tone="accent" selected={reportFilterStatus === s} onPress={() => { setReportFilterStatus(s); setReportPage(1); }} />
        ))}
        {['All', 'VERIFIED', 'FLAGGED', 'FAILED'].map((s) => (
          <Chip key={`i${s}`} label={s === 'All' ? 'Any integrity' : s.toLowerCase()} tone="warning" selected={reportFilterIntegrity === s} onPress={() => { setReportFilterIntegrity(s); setReportPage(1); }} />
        ))}
      </ScrollView>
      <Card padding={space.sm}>
        {candidatesLoading ? (
          <Stack gap={8} style={{ padding: space.sm }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={60} />)}</Stack>
        ) : candidatesList.length ? (
          <Stack gap={4}>
            {candidatesList.map((item) => (
              <Pressable key={item.session_id} onPress={() => handleOpenDossier(item.session_id)} style={({ hovered }) => [styles.row, hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}>
                <Avatar name={item.candidate_name} size={40} />
                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{item.candidate_name}</Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>{[item.internship_title, item.candidate_email].filter(Boolean).join(' · ')}</Txt>
                </Stack>
                <Pill label={item.status} tone={item.status === 'COMPLETED' ? 'success' : 'info'} size="sm" />
                <Pill label={item.integrity_status || '—'} tone={integrityTone(item.integrity_status)} size="sm" />
                <Txt variant="small" weight={700} tone="ink" style={{ width: 48, textAlign: 'right' }}>{item.overall_score != null ? `${item.overall_score}%` : '—'}</Txt>
              </Pressable>
            ))}
          </Stack>
        ) : (
          <EmptyState icon="FileText" title="No assessment sessions yet" message="Completed and in-progress candidate sessions show up here." />
        )}
        {reportTotalPages > 1 ? (
          <Row justify="center" gap={8} style={{ padding: space.sm }}>
            <IconButton icon="ChevronLeft" onPress={() => setReportPage((p) => Math.max(1, p - 1))} disabled={reportPage <= 1} />
            <Txt variant="small" tone="muted">Page {reportPage} of {reportTotalPages}</Txt>
            <IconButton icon="ChevronRight" onPress={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))} disabled={reportPage >= reportTotalPages} />
          </Row>
        ) : null}
      </Card>
    </Stack>
  );

  const ds = dossierData || {};
  return (
    <Page>
      <SectionTitle
        title="Assessment hub"
        emoji="📊"
        subtitle="Configure rounds, monitor sessions and review results."
        right={<IconButton icon="RefreshCw" size={44} onPress={() => (activeSubTab === 'Assessment Management' ? loadAssessmentConfig(selectedInternshipId) : loadReportsAndCandidates())} accessibilityLabel="Refresh" />}
      />
      <SegmentedTabs options={tabs} value={activeSubTab} onChange={setActiveSubTab} />
      {activeSubTab === 'Overview' ? overview : activeSubTab === 'Assessment Reports' ? reportsTab : setup}

      <Sheet
        visible={scheduleReviewModalVisible}
        onClose={() => setScheduleReviewModalVisible(false)}
        title="Review generated schedule"
        subtitle="Check the rounds before activating."
        icon="Sparkles"
        tone="accent"
        footer={
          <>
            <Button label="Adjust" variant="secondary" onPress={() => setScheduleReviewModalVisible(false)} />
            <Button label="Activate pipeline" icon="Rocket" onPress={() => handleSaveAssessment(true)} loading={configSaving} />
          </>
        }
      >
        <Timeline
          gap={space.sm}
          items={scheduleReviewList.map((sc, i) => ({
            key: `${sc.round || sc.round_name}-${i}`,
            done: true,
            content: (
              <Card padding={space.md}>
                <Txt variant="small" weight={700} tone="ink">{sc.sequence ? `${sc.sequence}. ` : ''}{sc.display_name || sc.round_name || sc.round}</Txt>
                <Txt variant="caption" tone="muted">
                  {[sc.start_date, sc.start_time && `${sc.start_time}${sc.end_time ? `–${sc.end_time}` : ''}`, (sc.duration_minutes || sc.duration_min) && `${sc.duration_minutes || sc.duration_min} min`, sc.schedule_type || sc.schedule_mode].filter(Boolean).join(' · ')}
                </Txt>
              </Card>
            ),
          }))}
        />
      </Sheet>

      <Sheet
        visible={!!selectedCandidateSessionId}
        onClose={() => { setSelectedCandidateSessionId(null); setDossierData(null); }}
        title={ds.session?.candidate_name || 'Candidate dossier'}
        subtitle={[ds.session?.internship_title, ds.session?.candidate_email].filter(Boolean).join(' · ')}
        icon="FileText"
        tone="info"
        width={760}
      >
        {dossierLoading || !dossierData ? (
          <Stack gap={10}><Skeleton height={80} /><Skeleton height={160} /></Stack>
        ) : (
          <>
            <Row wrap gap={6}>
              <Pill label={`Overall ${ds.session?.overall_score ?? '—'}%`} tone="success" />
              <Pill label={`Integrity ${ds.session?.integrity_status || '—'}`} tone={integrityTone(ds.session?.integrity_status)} />
              <Pill label={`${ds.session?.warning_count ?? 0} warnings`} tone="warning" />
            </Row>
            <SegmentedTabs options={['Performance', 'Integrity', 'Dossier'].map((x) => ({ id: x, label: x }))} value={dossierActiveTab} onChange={setDossierActiveTab} size="sm" />
            {dossierActiveTab === 'Performance' ? (
              <Card padding={space.lg}><Stack gap={12}>{scoreBars(ds.performance || {})}</Stack></Card>
            ) : dossierActiveTab === 'Integrity' ? (
              (ds.forensic_timeline || []).length ? (
                <Timeline
                  gap={space.sm}
                  items={ds.forensic_timeline.map((ev, i) => ({
                    key: i,
                    done: !/FLAG|FAIL|WARN/i.test(ev.classification || ''),
                    content: (
                      <Card padding={space.md}>
                        <Row justify="space-between" wrap gap={6}>
                          <Txt variant="small" weight={700} tone="ink">{ev.type}</Txt>
                          {ev.classification ? <Pill label={ev.classification} tone={integrityTone(ev.classification)} size="sm" /> : null}
                        </Row>
                        {ev.details?.reason ? <Txt variant="caption" tone="muted">{ev.details.reason}</Txt> : null}
                        {ev.candidateExplanation ? <Txt variant="caption" tone="default">Candidate: {ev.candidateExplanation}</Txt> : null}
                        {ev.timestamp ? <Txt variant="caption" tone="subtle">{String(ev.timestamp).replace('T', ' ').slice(0, 19)}</Txt> : null}
                      </Card>
                    ),
                  }))}
                />
              ) : (
                <EmptyState icon="ShieldCheck" tone="success" title="No integrity events" />
              )
            ) : (
              <Card padding={space.lg}>
                {ds.evaluation?.recommendation ? <Pill label={ds.evaluation.recommendation} tone="accent" /> : null}
                {ds.evaluation?.executive ? <Txt variant="body" tone="default" style={{ marginTop: space.sm }}>{ds.evaluation.executive}</Txt> : null}
                {(ds.evaluation?.competencies || []).length ? (
                  <Stack gap={8} style={{ marginTop: space.md }}>
                    {ds.evaluation.competencies.map((c, i) => (
                      <Stack key={i} gap={4}>
                        <Row justify="space-between">
                          <Txt variant="small" weight={700} tone="ink">{c.name || c.label}</Txt>
                          <Txt variant="small" tone="muted">{c.score != null ? `${c.score}` : ''}</Txt>
                        </Row>
                        {c.comment ? <Txt variant="caption" tone="muted">{c.comment}</Txt> : null}
                      </Stack>
                    ))}
                  </Stack>
                ) : null}
                {!ds.evaluation ? <Txt variant="small" tone="subtle">Evaluation not generated yet.</Txt> : null}
              </Card>
            )}
          </>
        )}
      </Sheet>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Round editor card (module level so inputs keep focus while typing)
// ---------------------------------------------------------------------------
function RoundEditor({ roundKey, index, total, round, weight, onWeight, onChange, onSchedule, onMove }) {
  const meta = ROUND_META[roundKey];
  const sch = round.schedule || {};
  const num = (v) => Number(String(v).replace(/[^\d]/g, '')) || 0;
  return (
    <Card tone={round.enabled ? undefined : 'neutral'} badge={{ icon: meta.icon, tone: round.enabled ? meta.tone : 'neutral' }}>
      <Row justify="space-between" wrap gap={8}>
        <Row gap={10}>
          <Checkbox checked={!!round.enabled} onChange={(v) => onChange({ enabled: v })} label={`${index + 1}. ${meta.label}`} />
        </Row>
        <Row gap={6}>
          <IconButton icon="ChevronLeft" size={32} onPress={() => onMove(-1)} disabled={index === 0} accessibilityLabel="Move earlier" style={{ transform: [{ rotate: '90deg' }] }} />
          <IconButton icon="ChevronRight" size={32} onPress={() => onMove(1)} disabled={index === total - 1} accessibilityLabel="Move later" style={{ transform: [{ rotate: '90deg' }] }} />
        </Row>
      </Row>
      {round.enabled ? (
        <Stack gap={space.md} style={{ marginTop: space.md }}>
          <Row gap={space.sm} wrap align="flex-start">
            <Field style={{ width: 130 }} label="Weight (%)" keyboardType="number-pad" value={String(weight ?? 0)} onChangeText={(v) => onWeight(num(v))} />
            {roundKey === 'aptitude' ? (
              <Field style={{ width: 130 }} label="Questions" keyboardType="number-pad" value={String(round.question_count ?? '')} onChangeText={(v) => onChange({ question_count: num(v) })} />
            ) : null}
            {roundKey === 'gd' ? (
              <>
                <Field style={{ width: 130 }} label="Per room" keyboardType="number-pad" value={String(round.candidates_per_room ?? '')} onChangeText={(v) => onChange({ candidates_per_room: num(v) })} />
                <Field style={{ width: 130 }} label="Prep (min)" keyboardType="number-pad" value={String(round.prep_time_min ?? '')} onChangeText={(v) => onChange({ prep_time_min: num(v) })} />
                <Field style={{ width: 150 }} label="Discussion (min)" keyboardType="number-pad" value={String(round.discussion_time_min ?? '')} onChangeText={(v) => onChange({ discussion_time_min: num(v) })} />
              </>
            ) : (
              <Field style={{ width: 150 }} label="Duration (min)" keyboardType="number-pad" value={String(round.duration_min ?? '')} onChangeText={(v) => { onChange({ duration_min: num(v) }); onSchedule({ duration_minutes: num(v) }); }} />
            )}
          </Row>
          {roundKey === 'aptitude' || roundKey === 'technical' ? (
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Difficulty</Txt>
              <ChipGroup options={['Easy', 'Medium', 'Hard']} value={round.difficulty} multiple={false} tone="warning" onChange={(v) => onChange({ difficulty: v })} />
            </Stack>
          ) : null}
          {roundKey === 'aptitude' ? (
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Question types</Txt>
              <ChipGroup options={['MCQ', 'Numeric', 'Short Written']} value={round.question_types || []} onChange={(v) => onChange({ question_types: v })} />
            </Stack>
          ) : null}
          {roundKey === 'technical' ? (
            <>
              <Row gap={space.lg} wrap>
                <Checkbox checked={!!round.theory_enabled} onChange={(v) => onChange({ theory_enabled: v })} label="Theory questions" />
                <Checkbox checked={!!round.coding_enabled} onChange={(v) => onChange({ coding_enabled: v })} label="Coding sandbox" />
              </Row>
              {round.coding_enabled ? (
                <Stack gap={6}>
                  <Txt variant="small" weight={600} tone="ink">Languages</Txt>
                  <ChipGroup options={CODING_LANGUAGES} value={round.languages || []} tone="info" onChange={(v) => onChange({ languages: v })} />
                </Stack>
              ) : null}
            </>
          ) : null}
          <Inset tone="neutral">
            <Txt variant="small" weight={600} tone="ink" style={{ marginBottom: 6 }}>Schedule</Txt>
            <ChipGroup
              options={[{ id: 'flexible_window', label: 'Flexible window' }, { id: 'fixed_session', label: 'Fixed session' }, { id: 'GEMINI_MANAGED', label: 'AI managed' }]}
              value={sch.schedule_mode}
              multiple={false}
              tone="accent"
              onChange={(v) => onSchedule({ schedule_mode: v })}
            />
            <Row gap={space.sm} wrap align="flex-start" style={{ marginTop: space.sm }}>
              <Field style={{ flex: 1, minWidth: 140 }} label="Start date" placeholder="YYYY-MM-DD" value={sch.start_date || ''} onChangeText={(v) => onSchedule({ start_date: v })} />
              {sch.schedule_mode !== 'GEMINI_MANAGED' ? (
                <Field style={{ width: 110 }} label="Start time" placeholder="HH:MM" value={sch.start_time || ''} onChangeText={(v) => onSchedule({ start_time: v })} />
              ) : null}
              <Field style={{ flex: 1, minWidth: 140 }} label="End date" placeholder="YYYY-MM-DD" value={sch.end_date || ''} onChangeText={(v) => onSchedule({ end_date: v })} />
              {sch.schedule_mode !== 'GEMINI_MANAGED' ? (
                <Field style={{ width: 110 }} label="End time" placeholder="HH:MM" value={sch.end_time || ''} onChangeText={(v) => onSchedule({ end_time: v })} />
              ) : null}
            </Row>
          </Inset>
        </Stack>
      ) : (
        <Txt variant="small" tone="subtle" style={{ marginTop: 6 }}>Disabled — candidates skip this round.</Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 150,
  },
  split: {
    gap: space.md,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cell: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.md,
  },
});
