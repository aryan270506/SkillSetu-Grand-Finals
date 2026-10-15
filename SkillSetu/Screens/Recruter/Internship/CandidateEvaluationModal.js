import React, { useState, useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Icon,
  Inset,
  KeyValue,
  Pill,
  ProgressBar,
  Ring,
  Row,
  SegmentedTabs,
  Sheet,
  Skeleton,
  Stack,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';
import { API_ORIGIN } from '../../../ui/config';

export default function CandidateEvaluationModal({
  visible,
  onClose,
  token,
  internshipId,
  applicationId,
  onStatusUpdated
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evalData, setEvalData] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Skills', 'Evidence', 'Resumes'
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showUnshortlistConfirm, setShowUnshortlistConfirm] = useState(false);
  const [previewResumeType, setPreviewResumeType] = useState(null); // 'ORIGINAL' or 'PERSONALIZED'

  useEffect(() => {
    if (visible && internshipId && applicationId) {
      loadEvaluation();
    } else {
      setEvalData(null);
      setError(null);
      setPreviewResumeType(null);
    }
  }, [visible, internshipId, applicationId]);

  const loadEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recruiterService.getCandidateEvaluation(token, internshipId, applicationId);
      setEvalData(res);
    } catch (err) {
      console.warn('Failed to load candidate evaluation:', err);
      setError(err.message || 'Unable to fetch candidate evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!evalData?.application?.id) return;
    setUpdatingStatus(true);
    try {
      await recruiterService.updateApplicationStatus(token, evalData.application.id, newStatus);
      await loadEvaluation();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(`Failed to update application status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProgressCandidate = async (action, notes = '') => {
    if (!evalData?.application?.id || !internshipId) return;
    setUpdatingStatus(true);
    try {
      const res = await recruiterService.progressCandidateRound(token, internshipId, evalData.application.id, {
        action,
        notes,
      });
      await loadEvaluation();
      if (onStatusUpdated) onStatusUpdated();
      alert(res.message || 'Candidate progression updated.');
    } catch (err) {
      alert(`Progression action failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };


  const candidate = evalData?.candidate || {};
  const internship = evalData?.internship || {};
  const application = evalData?.application || {};
  const whyEligible = evalData?.why_eligible || {};
  const matchBreakdown = evalData?.match_breakdown || {};
  const skillMatchTable = evalData?.skill_match_table || [];
  const skillGaps = evalData?.skill_gaps || [];
  const github = evalData?.github || {};
  const originalResume = evalData?.original_resume || {};
  const personalizedResume = evalData?.personalized_resume || {};
  const evalAudit = evalData?.evaluation_audit || {};
  const progression = evalData?.assessment_progression || {};
  const dash = (v, suffix = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`);
  const isSelected = progression.is_selected || application.status === 'SELECTED';
  const hasPipeline = progression.has_pipeline !== false && (progression.round_sequence || []).length > 0;
  const statusTone = application.status === 'SELECTED' ? 'success' : application.status === 'SHORTLISTED' ? 'info' : application.status === 'REJECTED' ? 'danger' : 'warning';
  const openDoc = (path) => {
    if (!path) return;
    const url = /^https?:/.test(path) ? path : `${API_ORIGIN}${path}`;
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer');
    else Linking.openURL(url).catch(() => {});
  };
  const tabs = [
    { id: 'Overview', label: 'Overview', icon: 'ShieldCheck' },
    ...(hasPipeline ? [{ id: 'Progression', label: 'Rounds', icon: 'Route' }] : []),
    { id: 'Skills', label: 'Skills', icon: 'Zap' },
    { id: 'Evidence', label: 'Evidence', icon: 'GitBranch' },
    { id: 'Resumes', label: 'Resumes', icon: 'FileText' },
  ];

  const progressionCard = hasPipeline ? (
    <Card padding={space.lg} tone="accent">
      <Row justify="space-between" wrap gap={8}>
        <Txt variant="h3" tone="ink">Assessment rounds</Txt>
        <Pill
          label={isSelected ? 'Selected' : progression.qualification_status === 'NOT_SELECTED' ? 'Not selected' : progression.is_final_round ? 'Final round' : 'In pipeline'}
          tone={isSelected ? 'success' : progression.qualification_status === 'NOT_SELECTED' ? 'danger' : 'info'}
          size="sm"
        />
      </Row>
      <Row wrap gap={6} style={{ marginTop: space.sm }}>
        {(progression.round_sequence || []).map((rKey, i) => {
          const label = (progression.round_sequence_labels || [])[i] || String(rKey).toUpperCase();
          const done = i < (progression.current_round_index ?? 0) || isSelected;
          const current = i === progression.current_round_index && !isSelected;
          return (
            <React.Fragment key={rKey}>
              <Pill label={`${i + 1}. ${label}`} tone={done ? 'success' : current ? 'dark' : 'neutral'} icon={done ? 'Check' : undefined} size="sm" />
              {i < progression.round_sequence.length - 1 ? <Icon name="ChevronRight" size={14} color={colors.lilacInk} /> : null}
            </React.Fragment>
          );
        })}
      </Row>
      <View style={styles.metricGrid}>
        {[
          ['Current round', dash(progression.current_round_name)],
          ['Round rank', progression.rank ? `#${progression.rank} / ${dash(progression.total_candidates_in_round)}` : '—'],
          ['Score', progression.assessment_score != null ? `${progression.assessment_score}% (pass ${dash(progression.passing_threshold, '%')})` : '—'],
          ['Integrity', dash(progression.integrity_status)],
        ].map(([k, v]) => (
          <Inset key={k} tone="accent" padding={space.sm} style={styles.metricCell}>
            <Txt variant="caption" tone="muted">{k}</Txt>
            <Txt variant="small" weight={700} tone="ink">{v}</Txt>
          </Inset>
        ))}
      </View>
      {!isSelected ? (
        <Row gap={8} wrap style={{ marginTop: space.md }}>
          {progression.is_final_round ? (
            <Button label="Select candidate" icon="Award" onPress={() => handleProgressCandidate('SELECT_CANDIDATE')} loading={updatingStatus} />
          ) : (
            <Button label={`Send to ${progression.next_round_name || 'next round'}`} icon="ArrowRight" onPress={() => handleProgressCandidate('SEND_TO_NEXT_ROUND')} loading={updatingStatus} />
          )}
          <Button label="Not selected" variant="danger" onPress={() => handleProgressCandidate('NOT_SELECTED')} disabled={updatingStatus} />
        </Row>
      ) : null}
      {(progression.progression_history || []).length ? (
        <Stack gap={6} style={{ marginTop: space.md }}>
          {progression.progression_history.map((h, i) => (
            <Row key={h.id || i} gap={8} align="flex-start">
              <View style={styles.dot} />
              <Txt variant="small" tone="ink" style={{ flex: 1 }}>{h.new_status || 'Updated'}{h.notes ? ` — ${h.notes}` : ''}</Txt>
              <Txt variant="caption" tone="muted">{h.timestamp ? h.timestamp.split('T')[0] : ''}</Txt>
            </Row>
          ))}
        </Stack>
      ) : null}
    </Card>
  ) : null;

  let body = null;
  if (loading) {
    body = (
      <Stack gap={12}>
        <Skeleton height={110} radius={radii.lg} />
        <Skeleton height={44} />
        <Skeleton height={200} radius={radii.lg} />
      </Stack>
    );
  } else if (error) {
    body = <EmptyState icon="CircleAlert" tone="danger" title="Couldn't load this evaluation" message={error} action={<Button label="Retry" icon="RefreshCw" onPress={loadEvaluation} />} />;
  } else {
    body = (
      <>
        <Card padding={space.lg}>
          <Row gap={space.md} align="flex-start" wrap>
            <Avatar name={candidate.name} uri={candidate.profile_image || undefined} size={64} />
            <Stack gap={4} style={{ flex: 1, minWidth: 220 }}>
              <Row gap={8} wrap>
                <Txt variant="h2" tone="ink">{candidate.name || 'Candidate'}</Txt>
                {candidate.is_verified ? <Pill label="Verified profile" tone="success" icon="ShieldCheck" size="sm" /> : null}
              </Row>
              {candidate.headline ? <Txt variant="small" tone="muted">{candidate.headline}</Txt> : null}
              <Row wrap gap={6} style={{ marginTop: 4 }}>
                {candidate.university ? <Pill label={candidate.university} icon="Building" size="sm" /> : null}
                {candidate.degree || candidate.branch ? <Pill label={[candidate.degree, candidate.branch].filter(Boolean).join(' · ')} icon="GraduationCap" size="sm" /> : null}
                <Pill label={`CGPA ${dash(candidate.cgpa)}`} size="sm" />
                {candidate.graduation_year ? <Pill label={`Class of ${candidate.graduation_year}`} size="sm" /> : null}
                {candidate.location ? <Pill label={candidate.location} icon="MapPin" size="sm" /> : null}
              </Row>
            </Stack>
            <Stack gap={6} style={{ alignItems: 'center' }}>
              <Ring value={whyEligible.match_score || 0} size={84} stroke={9} tone={whyEligible.is_eligible ? 'success' : 'warning'}>
                <Txt variant="h3" tone="ink">{dash(whyEligible.match_score, '%')}</Txt>
              </Ring>
              <Txt variant="caption" tone="muted">Gate {dash(whyEligible.required_threshold, '%')}</Txt>
            </Stack>
          </Row>
          <Row justify="space-between" wrap gap={8} style={{ marginTop: space.md }}>
            <Pill label={isSelected ? 'Selected' : application.status === 'SHORTLISTED' && progression.current_round_name ? progression.current_round_name : application.status || 'Applied'} tone={statusTone} />
            <Row gap={8}>
              {application.status === 'SHORTLISTED' ? (
                <Button label="Unshortlist" size="sm" variant="secondary" icon="RefreshCw" onPress={() => setShowUnshortlistConfirm(true)} disabled={updatingStatus} />
              ) : (
                <Button label="Shortlist" size="sm" icon="Check" onPress={() => handleUpdateStatus('SHORTLISTED')} loading={updatingStatus} />
              )}
              {application.status !== 'REJECTED' ? <Button label="Reject" size="sm" variant="danger" onPress={() => handleUpdateStatus('REJECTED')} disabled={updatingStatus} /> : null}
            </Row>
          </Row>
          {showUnshortlistConfirm ? (
            <Inset tone="warning" style={{ marginTop: space.md }}>
              <Txt variant="small" weight={700} tone="ink">Remove {candidate.name || 'this candidate'} from the shortlist?</Txt>
              <Txt variant="caption" tone="muted">Their status reverts to the previous stage and they receive an email update.</Txt>
              <Row gap={8} style={{ marginTop: 8 }}>
                <Button label="Cancel" size="sm" variant="light" onPress={() => setShowUnshortlistConfirm(false)} />
                <Button label="Unshortlist" size="sm" onPress={async () => { setShowUnshortlistConfirm(false); await handleUpdateStatus('UNSHORTLIST'); }} loading={updatingStatus} />
              </Row>
            </Inset>
          ) : null}
        </Card>

        <SegmentedTabs options={tabs} value={activeTab} onChange={setActiveTab} size="sm" scrollable />

        {activeTab === 'Overview' ? (
          <>
            <Inset tone={whyEligible.is_eligible ? 'success' : 'warning'}>
              <Row gap={8} align="flex-start">
                <Icon name={whyEligible.is_eligible ? 'CircleCheck' : 'CircleAlert'} size={18} color={whyEligible.is_eligible ? colors.mintInk : colors.butterInk} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Txt variant="small" weight={700} tone="ink">{whyEligible.overall_status || (whyEligible.is_eligible ? 'Eligible' : 'Eligibility not confirmed')}</Txt>
                  {whyEligible.summary_reason ? <Txt variant="small" tone="default">{whyEligible.summary_reason}</Txt> : null}
                </Stack>
              </Row>
            </Inset>
            {progressionCard}
            {(whyEligible.hard_checks || []).length ? (
              <Card padding={space.lg}>
                <Txt variant="h3" tone="ink">Eligibility checks</Txt>
                <Stack gap={8} style={{ marginTop: space.sm }}>
                  {whyEligible.hard_checks.map((c) => (
                    <Row key={c.id || c.name} gap={10} align="flex-start">
                      <Icon name={c.is_met ? 'CircleCheck' : 'X'} size={17} color={c.is_met ? colors.mintInk : '#B4232A'} />
                      <Stack gap={1} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink">{c.name}</Txt>
                        <Txt variant="caption" tone="muted">Required {c.required} · Candidate {c.student_value}</Txt>
                        {c.detail ? <Txt variant="caption" tone="subtle">{c.detail}</Txt> : null}
                      </Stack>
                    </Row>
                  ))}
                </Stack>
              </Card>
            ) : null}
            {(matchBreakdown.components || []).length ? (
              <Card padding={space.lg}>
                <Txt variant="h3" tone="ink">Match breakdown</Txt>
                <Stack gap={10} style={{ marginTop: space.sm }}>
                  {matchBreakdown.components.map((c, i) => (
                    <Stack key={i} gap={4}>
                      <Row justify="space-between">
                        <Txt variant="small" weight={600} tone="ink">{c.component} <Txt variant="caption" tone="muted">· weight {c.weight}</Txt></Txt>
                        <Txt variant="small" weight={700} tone="ink">{c.score}</Txt>
                      </Row>
                      <ProgressBar value={c.score_num ?? 0} tone="accent" height={6} />
                      {c.desc ? <Txt variant="caption" tone="muted">{c.desc}</Txt> : null}
                    </Stack>
                  ))}
                </Stack>
              </Card>
            ) : null}
          </>
        ) : null}

        {activeTab === 'Progression' ? progressionCard : null}

        {activeTab === 'Skills' ? (
          <>
            <Card padding={space.lg}>
              <Txt variant="h3" tone="ink">Required skills</Txt>
              <Stack gap={10} style={{ marginTop: space.sm }}>
                {skillMatchTable.length ? (
                  skillMatchTable.map((r, i) => (
                    <Stack key={i} gap={4}>
                      <Row justify="space-between" gap={8}>
                        <Txt variant="small" weight={700} tone="ink" style={{ flex: 1 }}>{r.skill}</Txt>
                        <Pill label={r.status} tone={r.is_met ? 'success' : 'warning'} size="sm" />
                        <Txt variant="caption" tone="muted">{r.student_level}% / {r.required_level}%</Txt>
                      </Row>
                      <ProgressBar value={r.student_level || 0} tone={r.is_met ? 'success' : 'warning'} height={6} />
                      {(r.evidence || []).length ? <Txt variant="caption" tone="subtle">{r.evidence.join(' · ')}</Txt> : null}
                    </Stack>
                  ))
                ) : (
                  <Txt variant="small" tone="subtle">No skill data.</Txt>
                )}
              </Stack>
            </Card>
            <Card padding={space.lg} tone={skillGaps.length ? 'warning' : 'success'}>
              <Txt variant="h3" tone="ink">{skillGaps.length ? 'Gaps for this role' : 'No critical gaps'}</Txt>
              <Stack gap={8} style={{ marginTop: space.sm }}>
                {skillGaps.map((g, i) => (
                  <Inset key={i} tone="warning" padding={space.sm}>
                    <Row justify="space-between">
                      <Txt variant="small" weight={700} tone="ink">{g.skill}</Txt>
                      <Pill label={`-${g.gap_points} pts`} tone="peach" size="sm" />
                    </Row>
                    <Txt variant="caption" tone="muted">Required {g.required_level}% · current {g.student_level}%</Txt>
                    {g.evidence_reason ? <Txt variant="caption" tone="default">{g.evidence_reason}</Txt> : null}
                    {g.recommended_action ? <Txt variant="caption" color={colors.butterInk}>→ {g.recommended_action}</Txt> : null}
                  </Inset>
                ))}
              </Stack>
            </Card>
          </>
        ) : null}

        {activeTab === 'Evidence' ? (
          <>
            <Card padding={space.lg}>
              <Row justify="space-between" wrap gap={8}>
                <Txt variant="h3" tone="ink">GitHub</Txt>
                <Pill label={github.connected ? `@${github.username}` : 'Not connected'} tone={github.connected ? 'success' : 'neutral'} icon="GitBranch" size="sm" />
              </Row>
              {github.connected && (github.repositories || []).length ? (
                <Stack gap={8} style={{ marginTop: space.sm }}>
                  {github.repositories.slice(0, 6).map((repo, i) => (
                    <Pressable key={i} onPress={() => openDoc(repo.html_url)} style={({ hovered }) => [styles.repoRow, hovered ? { backgroundColor: colors.surfaceSunken } : null, webOnly({ cursor: repo.html_url ? 'pointer' : 'default' })]}>
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink">{repo.name}</Txt>
                        {repo.description ? <Txt variant="caption" tone="muted" numberOfLines={2}>{repo.description}</Txt> : null}
                        {(repo.matched_skills || []).length ? (
                          <Row wrap gap={4} style={{ marginTop: 2 }}>{repo.matched_skills.map((t) => <Pill key={t} label={t} tone="info" size="sm" />)}</Row>
                        ) : null}
                      </Stack>
                      {repo.language ? <Pill label={repo.language} size="sm" /> : null}
                    </Pressable>
                  ))}
                </Stack>
              ) : (
                <Txt variant="small" tone="subtle" style={{ marginTop: 6 }}>No repositories shared.</Txt>
              )}
            </Card>
            <Card padding={space.lg}>
              <Txt variant="h3" tone="ink">Academic record</Txt>
              <Stack gap={0} style={{ marginTop: space.sm }}>
                <KeyValue label="University" value={dash(candidate.university)} />
                <KeyValue label="Degree" value={dash(candidate.degree)} />
                <KeyValue label="Branch" value={dash(candidate.branch)} />
                <KeyValue label="CGPA" value={dash(candidate.cgpa)} />
                <KeyValue label="Graduation" value={dash(candidate.graduation_year)} />
                <KeyValue label="Evaluation audit" value={dash(evalAudit.audit_result)} />
              </Stack>
            </Card>
          </>
        ) : null}

        {activeTab === 'Resumes' ? (
          <>
            <View style={styles.resumeRow}>
              <Card padding={space.lg} style={{ flex: 1, minWidth: 260 }}>
                <Row justify="space-between">
                  <Pill label="Original" icon="FileText" size="sm" />
                  <Txt variant="small" weight={700} tone="ink">ATS {dash(originalResume.ats_score)}</Txt>
                </Row>
                <Txt variant="small" weight={700} tone="ink" style={{ marginTop: 8 }}>{originalResume.filename || 'No resume uploaded'}</Txt>
                <Txt variant="caption" tone="muted">{[originalResume.upload_date, originalResume.status].filter(Boolean).join(' · ')}</Txt>
                {originalResume.download_url ? <Button label="Open resume" size="sm" icon="ExternalLink" variant="secondary" onPress={() => openDoc(originalResume.download_url)} style={{ marginTop: space.sm }} /> : null}
              </Card>
              <Card padding={space.lg} tone="success" style={{ flex: 1, minWidth: 260 }}>
                <Row justify="space-between">
                  <Pill label="Tailored" icon="Sparkles" tone="success" size="sm" />
                  <Txt variant="small" weight={700} tone="ink">Match {dash(personalizedResume.generated_ats_score, '%')}</Txt>
                </Row>
                <Txt variant="small" weight={700} tone="ink" style={{ marginTop: 8 }}>For {personalizedResume.target_role || internship.title}</Txt>
                <Txt variant="caption" tone="muted">Built from verified profile records.</Txt>
                <Button label={previewResumeType === 'PERSONALIZED' ? 'Hide' : 'Preview'} size="sm" variant="light" onPress={() => setPreviewResumeType(previewResumeType === 'PERSONALIZED' ? null : 'PERSONALIZED')} style={{ marginTop: space.sm }} />
              </Card>
            </View>
            {previewResumeType === 'PERSONALIZED' ? (
              <Card padding={space.xl}>
                <Txt variant="h2" tone="ink">{personalizedResume.header?.name}</Txt>
                <Txt variant="caption" tone="muted">{[personalizedResume.header?.email, personalizedResume.header?.phone, personalizedResume.header?.location, personalizedResume.header?.github, personalizedResume.header?.linkedin].filter(Boolean).join(' · ')}</Txt>
                {personalizedResume.professional_summary ? (
                  <>
                    <Txt variant="overline" tone="ink" style={{ marginTop: space.md }}>Summary</Txt>
                    <Txt variant="small" tone="default">{personalizedResume.professional_summary}</Txt>
                  </>
                ) : null}
                <Txt variant="overline" tone="ink" style={{ marginTop: space.md }}>Skills</Txt>
                {[
                  ['Core', personalizedResume.highlighted_skills?.core_required],
                  ['Proficient', personalizedResume.highlighted_skills?.proficient],
                  ['Tools', personalizedResume.highlighted_skills?.tools_and_platforms],
                ].filter(([, v]) => (v || []).length).map(([k, v]) => (
                  <Txt key={k} variant="small" tone="default"><Txt variant="small" weight={700} tone="ink">{k}: </Txt>{v.join(', ')}</Txt>
                ))}
                {(personalizedResume.relevant_projects || []).length ? (
                  <>
                    <Txt variant="overline" tone="ink" style={{ marginTop: space.md }}>Projects</Txt>
                    {personalizedResume.relevant_projects.map((p, i) => (
                      <Stack key={i} gap={1} style={{ marginTop: 4 }}>
                        <Txt variant="small" weight={700} tone="ink">{p.name}{(p.tech_stack || []).length ? ` · ${p.tech_stack.join(', ')}` : ''}</Txt>
                        <Txt variant="small" tone="default">{p.description}</Txt>
                      </Stack>
                    ))}
                  </>
                ) : null}
                {personalizedResume.education ? (
                  <>
                    <Txt variant="overline" tone="ink" style={{ marginTop: space.md }}>Education</Txt>
                    <Txt variant="small" tone="default">
                      {[personalizedResume.education.institution, personalizedResume.education.degree, personalizedResume.education.branch].filter(Boolean).join(' · ')}
                      {personalizedResume.education.cgpa ? ` · CGPA ${personalizedResume.education.cgpa}` : ''}
                    </Txt>
                  </>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : null}
      </>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Candidate evaluation"
      subtitle={`${internship.title || 'Internship'} · ${application.application_id || `APP-${applicationId}`}`}
      icon="User"
      tone="info"
      width={860}
    >
      {body}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
  },
  metricCell: {
    flexGrow: 1,
    flexBasis: 160,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.connector,
    marginTop: 6,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  resumeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
});
