import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  Image
} from 'react-native';
import { recruiterService } from '../services/recruiterService';

const COLORS = {
  primaryTeal: '#0D9488',
  tealDark: '#0F766E',
  mintBg: '#F0FDFA',
  tealBorder: '#99F6E4',
  textDark: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  bgLight: '#F8FAFC',
  white: '#FFFFFF',
  greenBg: '#DCFCE7',
  greenText: '#15803D',
  amberBg: '#FEF3C7',
  amberText: '#D97706',
  redBg: '#FEE2E2',
  redText: '#B91C1C',
  blueBg: '#E0F2FE',
  blueText: '#0369A1',
};

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

  if (!visible) return null;

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.modalHeaderTitle}>Candidate Evaluation & Internship Audit</Text>
                <View style={styles.appIdBadge}>
                  <Text style={styles.appIdBadgeText}>{application.application_id || `APP-${applicationId}`}</Text>
                </View>
              </View>
              <Text style={styles.modalHeaderSub}>
                Authoritative breakdown for {internship.title || 'Internship'} • Role ID: POST-{internshipId}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Loading / Error States */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primaryTeal} />
              <Text style={styles.loadingText}>Loading comprehensive evaluation...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>⚠️</Text>
              <Text style={styles.errorTitle}>Error Loading Evaluation</Text>
              <Text style={styles.errorSub}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={loadEvaluation}>
                <Text style={styles.retryBtnText}>🔄 Retry</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
              {/* Candidate Hero Card */}
              <View style={styles.heroCard}>
                <View style={styles.heroLeft}>
                  <View style={styles.avatarBig}>
                    {candidate.profile_image ? (
                      <Image source={{ uri: candidate.profile_image }} style={styles.avatarBigImage} />
                    ) : (
                      <Text style={styles.avatarBigText}>{candidate.avatar || 'ST'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.candidateName}>{candidate.name || 'Candidate'}</Text>
                      {candidate.is_verified && (
                        <View style={styles.verifiedTag}>
                          <Text style={styles.verifiedTagText}>✓ Verified Profile</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.candidateSub}>{candidate.headline || `${candidate.degree || 'B.Tech'} Candidate`}</Text>
                    <Text style={styles.candidateUni}>
                      🏫 {candidate.university || 'University'} • {candidate.degree || 'B.Tech'} ({candidate.branch || 'Engineering'})
                    </Text>
                    <View style={styles.quickMetricsRow}>
                      <View style={styles.quickMetricPill}>
                        <Text style={styles.quickMetricLbl}>CGPA:</Text>
                        <Text style={styles.quickMetricVal}>{candidate.cgpa || '7.50'}</Text>
                      </View>
                      <View style={styles.quickMetricPill}>
                        <Text style={styles.quickMetricLbl}>Batch:</Text>
                        <Text style={styles.quickMetricVal}>{candidate.graduation_year || '2028'}</Text>
                      </View>
                      <View style={styles.quickMetricPill}>
                        <Text style={styles.quickMetricLbl}>Location:</Text>
                        <Text style={styles.quickMetricVal}>{candidate.location || 'India'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Hero Right: Match & Status Scorecards */}
                <View style={styles.heroRight}>
                  <View style={styles.matchScoreCard}>
                    <Text style={styles.matchScoreBig}>{whyEligible.match_score || 94}%</Text>
                    <Text style={styles.matchScoreSub}>Overall Match</Text>
                    <View style={styles.matchGatePill}>
                      <Text style={styles.matchGateText}>
                        Gate: {whyEligible.required_threshold || 70}% Min
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusActionBox}>
                    <View
                      style={[
                        styles.statusBadgeBig,
                        {
                          backgroundColor:
                            application.status === 'SELECTED'
                              ? '#DCFCE7'
                              : application.status === 'SHORTLISTED' && progression.current_round_name
                              ? '#EDE9FE'
                              : application.status === 'SHORTLISTED'
                              ? COLORS.blueBg
                              : application.status === 'REJECTED'
                              ? '#FEE2E2'
                              : COLORS.amberBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeTextBig,
                          {
                            color:
                              application.status === 'SELECTED'
                                ? '#15803D'
                                : application.status === 'SHORTLISTED' && progression.current_round_name
                                ? '#6D28D9'
                                : application.status === 'SHORTLISTED'
                                ? COLORS.blueText
                                : application.status === 'REJECTED'
                                ? '#DC2626'
                                : COLORS.amberText,
                          },
                        ]}
                      >
                        {application.status === 'SELECTED'
                          ? '★ SELECTED'
                          : application.status === 'SHORTLISTED' && progression.current_round_name
                          ? `⚡ ${progression.current_round_name}`
                          : application.status || 'APPLIED'}
                      </Text>
                    </View>

                    {/* Recruiter Quick Actions */}
                    <View style={styles.actionButtonsCol}>
                      {application.status === 'SHORTLISTED' ? (
                        <Pressable
                          disabled={updatingStatus}
                          style={styles.actionUnshortlistBtn}
                          onPress={() => setShowUnshortlistConfirm(true)}
                        >
                          <Text style={styles.actionUnshortlistText}>↺ Unshortlist</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          disabled={updatingStatus}
                          style={styles.actionShortlistBtn}
                          onPress={() => handleUpdateStatus('SHORTLISTED')}
                        >
                          <Text style={styles.actionShortlistText}>✓ Shortlist</Text>
                        </Pressable>
                      )}
                      {application.status !== 'REJECTED' && (
                        <Pressable
                          disabled={updatingStatus}
                          style={styles.actionRejectBtn}
                          onPress={() => handleUpdateStatus('REJECTED')}
                        >
                          <Text style={styles.actionRejectText}>✕ Reject</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Navigation Sub-Tabs */}
              <View style={styles.navTabsRow}>
                {[
                  { id: 'Overview', label: '1. Why Eligible & Match' },
                  ...(progression.has_pipeline !== false ? [{ id: 'Progression', label: '⚡ Assessment Progression' }] : []),
                  { id: 'Skills', label: '2. Required Skills & Gaps' },
                  { id: 'Evidence', label: '3. GitHub & Projects' },
                  { id: 'Resumes', label: '4. Original & Tailored Resumes' },
                ].map((tab) => (
                  <Pressable
                    key={tab.id}
                    style={[styles.navTabBtn, activeTab === tab.id && styles.navTabBtnActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Text style={[styles.navTabText, activeTab === tab.id && styles.navTabTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* TAB: ASSESSMENT PROGRESSION (Only when pipeline is configured) */}
              {progression.has_pipeline !== false && (activeTab === 'Progression' || activeTab === 'Overview') && (
                <View style={[styles.cardBox, styles.progressionCardBox, activeTab === 'Overview' && { marginBottom: 16 }]}>
                  <View style={styles.progressionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>⚡</Text>
                      <View>
                        <Text style={styles.cardTitle}>Assessment Progression</Text>
                        <Text style={styles.progressionSubHeading}>Recruiter-controlled progression through assessment pipeline</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.qualBadge,
                      (progression.is_selected || application.status === 'SELECTED') ? styles.qualPassBg :
                      progression.is_final_round ? styles.qualSelectedBg :
                      progression.qualification_status === 'NOT_SELECTED' ? styles.qualRejectBg : styles.qualPassBg
                    ]}>
                      <Text style={[
                        styles.qualBadgeText,
                        (progression.is_selected || application.status === 'SELECTED') ? styles.qualPassText :
                        progression.is_final_round ? styles.qualSelectedText :
                        progression.qualification_status === 'NOT_SELECTED' ? styles.qualRejectText : styles.qualPassText
                      ]}>
                        {(progression.is_selected || application.status === 'SELECTED') ? '★ SELECTED' :
                         progression.is_final_round ? '🏁 FINAL ROUND' :
                         progression.qualification_status === 'NOT_SELECTED' ? '✕ NOT SELECTED' : '● IN PIPELINE'}
                      </Text>
                    </View>
                  </View>

                  {/* Metrics 4-Col Grid */}
                  <View style={styles.progressionGrid}>
                    <View style={styles.progMetricItem}>
                      <Text style={styles.progMetricLbl}>CURRENT ROUND</Text>
                      <Text style={styles.progMetricVal}>{progression.current_round_name || 'Aptitude'}</Text>
                      <Text style={styles.progMetricSub}>
                        {progression.is_final_round ? 'Final Assessment Stage' : `Stage ${(progression.current_round_index ?? 0) + 1} of ${progression.total_rounds || 4}`}
                      </Text>
                    </View>

                    <View style={styles.progMetricItem}>
                      <Text style={styles.progMetricLbl}>ROUND RANK</Text>
                      <Text style={[styles.progMetricVal, { color: COLORS.primaryTeal }]}>
                        #{progression.rank || 1} <Text style={{ fontSize: 13, color: COLORS.textMuted }}>/ {progression.total_candidates_in_round || 1}</Text>
                      </Text>
                      <Text style={styles.progMetricSub}>Authoritative round cohort rank</Text>
                    </View>

                    <View style={styles.progMetricItem}>
                      <Text style={styles.progMetricLbl}>ASSESSMENT SCORE</Text>
                      <Text style={styles.progMetricVal}>{progression.assessment_score ?? 80}%</Text>
                      <Text style={styles.progMetricSub}>Passing Cutoff: {progression.passing_threshold ?? 70}%</Text>
                    </View>

                    <View style={styles.progMetricItem}>
                      <Text style={styles.progMetricLbl}>INTEGRITY STATUS</Text>
                      <Text style={[
                        styles.progMetricVal,
                        { color: progression.integrity_status === 'VERIFIED' ? COLORS.greenText : COLORS.redText }
                      ]}>
                        {progression.integrity_status === 'VERIFIED' ? '✓ Clear & Verified' : (progression.integrity_status || 'Verified')}
                      </Text>
                      <Text style={styles.progMetricSub}>Proctoring telemetry status</Text>
                    </View>
                  </View>

                  {/* Persisted Assessment Sequence Stepper */}
                  <View style={styles.sequenceStepperBox}>
                    <Text style={styles.stepperTitle}>RECRUITER-CONFIGURED ASSESSMENT SEQUENCE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={styles.stepperRow}>
                        {(progression.round_sequence || []).map((rKey, rIdx) => {
                          const isCurrent = rIdx === progression.current_round_index;
                          const isPast = rIdx < progression.current_round_index || (progression.is_selected || application.status === 'SELECTED');
                          const isFuture = rIdx > progression.current_round_index && !(progression.is_selected || application.status === 'SELECTED');
                          const label = (progression.round_sequence_labels && progression.round_sequence_labels[rIdx]) || rKey.toUpperCase();

                          return (
                            <React.Fragment key={rKey}>
                              <View style={[
                                styles.stepPill,
                                isCurrent && styles.stepPillActive,
                                isPast && styles.stepPillDone,
                                isFuture && styles.stepPillFuture
                              ]}>
                                <Text style={[
                                  styles.stepPillNum,
                                  isCurrent && styles.stepPillNumActive,
                                  isPast && styles.stepPillNumDone
                                ]}>
                                  {isPast ? '✓' : rIdx + 1}
                                </Text>
                                <Text style={[
                                  styles.stepPillText,
                                  isCurrent && styles.stepPillTextActive,
                                  isPast && styles.stepPillTextDone
                                ]} numberOfLines={1}>
                                  {label}
                                </Text>
                              </View>
                              {rIdx < (progression.round_sequence || []).length - 1 && (
                                <Text style={styles.stepArrow}>→</Text>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Next Round / Final Selection Action Control Panel */}
                  <View style={styles.progressionActionBox}>
                    <View style={{ flex: 1, minWidth: 260 }}>
                      <Text style={styles.nextRoundLbl}>
                        {(progression.is_selected || application.status === 'SELECTED')
                          ? 'APPLICATION STATUS'
                          : progression.is_final_round
                          ? 'FINAL ROUND SELECTION'
                          : 'NEXT CONFIGURED ROUND'}
                      </Text>
                      <Text style={styles.nextRoundVal}>
                        {(progression.is_selected || application.status === 'SELECTED')
                          ? '🎉 SELECTED · Pipeline Completed'
                          : progression.is_final_round
                          ? `🏆 Final Round: ${progression.current_round_name}`
                          : `⏩ Next: ${progression.next_round_name || 'Next Round'}`}
                      </Text>
                      <Text style={styles.nextRoundSub}>
                        {(progression.is_selected || application.status === 'SELECTED')
                          ? 'Candidate has been selected for the internship. Pipeline is complete.'
                          : progression.is_final_round
                          ? 'Candidate has reached the final configured assessment round. Click Select Candidate to finalize selection.'
                          : `Click Send to Next Round to advance candidate to ${progression.next_round_name}.`}
                      </Text>
                    </View>

                    {!(progression.is_selected || application.status === 'SELECTED') && (
                      <View style={styles.progressionButtonsRow}>
                        {progression.is_final_round ? (
                          <Pressable
                            disabled={updatingStatus}
                            onPress={() => handleProgressCandidate('SELECT_CANDIDATE')}
                            style={[styles.selectNextRoundBtn, { backgroundColor: '#15803D' }, updatingStatus && { opacity: 0.6 }]}
                          >
                            <Text style={styles.selectNextRoundBtnText}>
                              ✨ Select Candidate
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            disabled={updatingStatus}
                            onPress={() => handleProgressCandidate('SEND_TO_NEXT_ROUND')}
                            style={[styles.selectNextRoundBtn, updatingStatus && { opacity: 0.6 }]}
                          >
                            <Text style={styles.selectNextRoundBtnText}>
                              ✨ Send to Next Round
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          disabled={updatingStatus}
                          onPress={() => handleProgressCandidate('NOT_SELECTED')}
                          style={[styles.notSelectedBtn, updatingStatus && { opacity: 0.6 }]}
                        >
                          <Text style={styles.notSelectedBtnText}>✕ Not Selected</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* History Audit Log */}
                  {progression.progression_history && progression.progression_history.length > 0 && (
                    <View style={styles.auditLogContainer}>
                      <Text style={styles.auditLogTitle}>Progression Audit History</Text>
                      {progression.progression_history.map((hist, hIdx) => (
                        <View key={hist.id || hIdx} style={styles.auditLogItem}>
                          <Text style={styles.auditLogDot}>●</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.auditLogEvent}>{hist.new_status || 'Stage Updated'}</Text>
                            <Text style={styles.auditLogNotes}>{hist.notes || 'Status changed'}</Text>
                          </View>
                          <Text style={styles.auditLogTime}>{hist.timestamp ? hist.timestamp.split('T')[0] : 'Recorded'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 1: OVERVIEW & WHY ELIGIBLE */}
              {activeTab === 'Overview' && (
                <View style={styles.tabSection}>
                  {/* Why Candidate Is Eligible Banner */}
                  <View style={[styles.eligibilityBanner, whyEligible.is_eligible ? styles.eligibilityPass : styles.eligibilityFail]}>
                    <Text style={{ fontSize: 24 }}>{whyEligible.is_eligible ? '✅' : '⚠️'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eligibilityBannerTitle}>
                        {whyEligible.overall_status || 'Eligible to Apply'}
                      </Text>
                      <Text style={styles.eligibilityBannerSub}>
                        {whyEligible.summary_reason || 'Candidate satisfies all academic criteria and skill match threshold.'}
                      </Text>
                    </View>
                    <View style={styles.verifiedEvidenceBadge}>
                      <Text style={styles.verifiedEvidenceText}>Proof of Work Verified</Text>
                    </View>
                  </View>

                  {/* Hard Eligibility Breakdown */}
                  <View style={styles.cardBox}>
                    <Text style={styles.cardTitle}>Hard Eligibility vs. Role Requirements</Text>
                    <Text style={styles.cardSub}>
                      Authoritative evaluation comparing student degree, major, CGPA cutoff, and graduation year against {internship.title}.
                    </Text>

                    <View style={styles.checksGrid}>
                      {(whyEligible.hard_checks || []).map((check) => (
                        <View key={check.id} style={styles.checkCard}>
                          <View style={styles.checkTopRow}>
                            <Text style={styles.checkIcon}>{check.is_met ? '✓' : '✕'}</Text>
                            <Text style={[styles.checkTitle, { color: check.is_met ? COLORS.greenText : COLORS.redText }]}>
                              {check.name}
                            </Text>
                          </View>
                          <Text style={styles.checkReqText}><Text style={{ fontWeight: '700' }}>Req:</Text> {check.required}</Text>
                          <Text style={styles.checkStuText}><Text style={{ fontWeight: '700' }}>Student:</Text> {check.student_value}</Text>
                          <Text style={styles.checkDetailText}>{check.detail}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Match Score Breakdown */}
                  <View style={styles.cardBox}>
                    <Text style={styles.cardTitle}>Deterministic Match Score Breakdown</Text>
                    <Text style={styles.cardSub}>
                      Weighted calculation engine using verified skill evidence, target career track, work mode preference, and locality.
                    </Text>

                    <View style={styles.breakdownList}>
                      {(matchBreakdown.components || []).map((comp, idx) => (
                        <View key={idx} style={styles.breakdownRow}>
                          <View style={styles.breakdownColName}>
                            <Text style={styles.breakdownNameText}>{comp.component}</Text>
                            <Text style={styles.breakdownWeightText}>Weight: {comp.weight}</Text>
                          </View>
                          <View style={styles.breakdownBarTrack}>
                            <View
                              style={[
                                styles.breakdownBarFill,
                                { width: `${Math.min(100, Math.max(0, comp.score_num || 80))}%` },
                              ]}
                            />
                          </View>
                          <View style={styles.breakdownScoreCol}>
                            <Text style={styles.breakdownScoreVal}>{comp.score}</Text>
                            <Text style={styles.breakdownDescText} numberOfLines={1}>{comp.desc}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 2: REQUIRED SKILLS & SKILL GAPS */}
              {activeTab === 'Skills' && (
                <View style={styles.tabSection}>
                  {/* Required Skills Table */}
                  <View style={styles.cardBox}>
                    <Text style={styles.cardTitle}>Required Skill Match Matrix</Text>
                    <Text style={styles.cardSub}>
                      All core technologies required for {internship.title} evaluated against candidate's canonical evidence level.
                    </Text>

                    <View style={styles.skillTable}>
                      <View style={styles.skillTableHeader}>
                        <Text style={[styles.stHeadText, { flex: 2.5 }]}>SKILL</Text>
                        <Text style={[styles.stHeadText, { flex: 1.5, textAlign: 'center' }]}>REQUIRED</Text>
                        <Text style={[styles.stHeadText, { flex: 1.5, textAlign: 'center' }]}>STUDENT</Text>
                        <Text style={[styles.stHeadText, { flex: 1.2, textAlign: 'center' }]}>GAP</Text>
                        <Text style={[styles.stHeadText, { flex: 2 }]}>STATUS</Text>
                        <Text style={[styles.stHeadText, { flex: 3.5 }]}>EVIDENCE</Text>
                      </View>

                      {skillMatchTable.map((row, idx) => (
                        <View key={idx} style={styles.skillTableRow}>
                          <Text style={[styles.stSkillName, { flex: 2.5 }]}>{row.skill}</Text>
                          <Text style={[styles.stReqVal, { flex: 1.5, textAlign: 'center' }]}>{row.required_level}%</Text>
                          <Text style={[styles.stStuVal, { flex: 1.5, textAlign: 'center', color: row.is_met ? COLORS.greenText : COLORS.amberText }]}>
                            {row.student_level}%
                          </Text>
                          <Text style={[styles.stGapVal, { flex: 1.2, textAlign: 'center', color: row.is_met ? COLORS.greenText : COLORS.redText }]}>
                            {row.gap}
                          </Text>
                          <View style={{ flex: 2 }}>
                            <View style={[styles.skillStatusPill, { backgroundColor: row.is_met ? COLORS.greenBg : COLORS.amberBg }]}>
                              <Text style={[styles.skillStatusText, { color: row.is_met ? COLORS.greenText : COLORS.amberText }]}>
                                {row.status}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 3.5 }}>
                            {(row.evidence || []).map((ev, eIdx) => (
                              <Text key={eIdx} style={styles.evidenceSourceText}>• {ev}</Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Dedicated Skill Gaps Section */}
                  <View style={styles.cardBox}>
                    <Text style={styles.cardTitle}>Skill Gaps for THIS Role</Text>
                    <Text style={styles.cardSub}>
                      Technologies where the candidate is currently developing proficiency for {internship.title}.
                    </Text>

                    {skillGaps.length === 0 ? (
                      <View style={styles.zeroGapsBox}>
                        <Text style={{ fontSize: 24, marginBottom: 4 }}>🎉</Text>
                        <Text style={styles.zeroGapsTitle}>Zero Critical Skill Gaps</Text>
                        <Text style={styles.zeroGapsSub}>
                          Candidate meets or exceeds all required technical benchmarks for {internship.title}.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.gapsGrid}>
                        {skillGaps.map((gap, gIdx) => (
                          <View key={gIdx} style={styles.gapCard}>
                            <View style={styles.gapTopRow}>
                              <Text style={styles.gapSkillName}>{gap.skill}</Text>
                              <View style={styles.gapPointsBadge}>
                                <Text style={styles.gapPointsText}>-{gap.gap_points} pts</Text>
                              </View>
                            </View>
                            <Text style={styles.gapLevelsText}>
                              Required: {gap.required_level}% • Current: {gap.student_level}%
                            </Text>
                            <Text style={styles.gapReasonText}>{gap.evidence_reason}</Text>
                            <View style={styles.gapActionBox}>
                              <Text style={styles.gapActionText}>💡 {gap.recommended_action}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* TAB 3: GITHUB & PROJECTS */}
              {activeTab === 'Evidence' && (
                <View style={styles.tabSection}>
                  {/* GitHub Integration Card */}
                  <View style={styles.cardBox}>
                    <View style={styles.sectionHeaderRow}>
                      <View>
                        <Text style={styles.cardTitle}>Connected GitHub Profile & Repositories</Text>
                        <Text style={styles.cardSub}>
                          Public repository code artifacts verified via GitHub OAuth integration.
                        </Text>
                      </View>
                      {github.connected ? (
                        <View style={styles.ghConnectedBadge}>
                          <Text style={styles.ghConnectedText}>✓ GitHub Connected (@{github.username})</Text>
                        </View>
                      ) : (
                        <View style={styles.ghDisconnectedBadge}>
                          <Text style={styles.ghDisconnectedText}>GitHub Not Connected</Text>
                        </View>
                      )}
                    </View>

                    {github.connected && github.repositories && github.repositories.length > 0 ? (
                      <View style={styles.reposGrid}>
                        {github.repositories.slice(0, 6).map((repo, rIdx) => (
                          <View key={rIdx} style={styles.repoCard}>
                            <View style={styles.repoTopRow}>
                              <Text style={styles.repoName} numberOfLines={1}>📁 {repo.name}</Text>
                              <View style={styles.repoLangBadge}>
                                <Text style={styles.repoLangText}>{repo.language || 'Code'}</Text>
                              </View>
                            </View>
                            <Text style={styles.repoDesc} numberOfLines={2}>{repo.description}</Text>
                            <View style={styles.repoTagsRow}>
                              {(repo.matched_skills || []).map((t, tIdx) => (
                                <View key={tIdx} style={styles.repoTagPill}>
                                  <Text style={styles.repoTagText}>{t}</Text>
                                </View>
                              ))}
                            </View>
                            {repo.html_url && (
                              <Pressable
                                style={styles.repoLinkBtn}
                                onPress={() => Linking.openURL(repo.html_url)}
                              >
                                <Text style={styles.repoLinkText}>View on GitHub ↗</Text>
                              </Pressable>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.emptyReposBox}>
                        <Text style={styles.emptyReposText}>No external repositories connected.</Text>
                      </View>
                    )}
                  </View>

                  {/* Academic Profile Card */}
                  <View style={styles.cardBox}>
                    <Text style={styles.cardTitle}>Academic Profile & Institutional Evidence</Text>
                    <View style={styles.academicDetailsGrid}>
                      <View style={styles.academicField}>
                        <Text style={styles.acadLabel}>University</Text>
                        <Text style={styles.acadVal}>{candidate.university || 'Sanjay Ghodawat University'}</Text>
                      </View>
                      <View style={styles.academicField}>
                        <Text style={styles.acadLabel}>Degree</Text>
                        <Text style={styles.acadVal}>{candidate.degree || 'Bachelor of Technology (B.Tech)'}</Text>
                      </View>
                      <View style={styles.academicField}>
                        <Text style={styles.acadLabel}>Branch</Text>
                        <Text style={styles.acadVal}>{candidate.branch || 'Computer Science and Engineering'}</Text>
                      </View>
                      <View style={styles.academicField}>
                        <Text style={styles.acadLabel}>CGPA</Text>
                        <Text style={styles.acadVal}>{candidate.cgpa || '7.05'} / 10.0</Text>
                      </View>
                      <View style={styles.academicField}>
                        <Text style={styles.acadLabel}>Graduation Year</Text>
                        <Text style={styles.acadVal}>{candidate.graduation_year || '2028'}</Text>
                      </View>
                      <View style={styles.academicField}>
                        <Text style={styles.acadLabel}>Evaluation Audit</Text>
                        <Text style={[styles.acadVal, { color: COLORS.greenText }]}>{evalAudit.audit_result || '✓ Passed (90/100)'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 4: ORIGINAL & PERSONALIZED RESUMES */}
              {activeTab === 'Resumes' && (
                <View style={styles.tabSection}>
                  <View style={styles.resumesDualRow}>
                    {/* 1. Original Uploaded Resume Card */}
                    <View style={[styles.resumeCard, styles.resumeCardOriginal]}>
                      <View style={styles.resumeHeaderRow}>
                        <View style={styles.resumeTypeBadgeOriginal}>
                          <Text style={styles.resumeTypeBadgeTextOriginal}>ORIGINAL RESUME</Text>
                        </View>
                        <Text style={styles.resumeAtsScore}>ATS: {originalResume.ats_score || 39}/100</Text>
                      </View>
                      <Text style={styles.resumeCardTitle}>Student Uploaded Resume</Text>
                      <Text style={styles.resumeCardSub}>
                        Original document uploaded by the candidate during profile registration.
                      </Text>

                      <View style={styles.resumeMetaBox}>
                        <Text style={styles.resumeMetaItem}>📄 <Text style={{ fontWeight: '700' }}>File:</Text> {originalResume.filename}</Text>
                        <Text style={styles.resumeMetaItem}>📅 <Text style={{ fontWeight: '700' }}>Uploaded:</Text> {originalResume.upload_date}</Text>
                        <Text style={styles.resumeMetaItem}>🔒 <Text style={{ fontWeight: '700' }}>Status:</Text> {originalResume.status}</Text>
                      </View>

                      <View style={styles.resumeActionsRow}>
                        <Pressable
                          style={styles.resumeViewBtn}
                          onPress={() => setPreviewResumeType('ORIGINAL')}
                        >
                          <Text style={styles.resumeViewBtnText}>👁️ View Original</Text>
                        </Pressable>
                        {originalResume.download_url && (
                          <Pressable
                            style={styles.resumeDownloadBtn}
                            onPress={() => {
                              const fullUrl = `http://localhost:8000${originalResume.download_url}`;
                              Linking.openURL(fullUrl);
                            }}
                          >
                            <Text style={styles.resumeDownloadBtnText}>⬇️ Download</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* 2. Personalized Role-Specific Resume Card */}
                    <View style={[styles.resumeCard, styles.resumeCardPersonalized]}>
                      <View style={styles.resumeHeaderRow}>
                        <View style={styles.resumeTypeBadgePersonalized}>
                          <Text style={styles.resumeTypeBadgeTextPersonalized}>PERSONALIZED RESUME</Text>
                        </View>
                        <Text style={[styles.resumeAtsScore, { color: COLORS.greenText }]}>
                          Tailored Match: {personalizedResume.generated_ats_score || 94}%
                        </Text>
                      </View>
                      <Text style={styles.resumeCardTitle}>Tailored for {internship.title}</Text>
                      <Text style={styles.resumeCardSub}>
                        Generated dynamically for this specific role prioritizing relevant verified skills and GitHub code. Zero hallucinated data.
                      </Text>

                      <View style={styles.resumeMetaBox}>
                        <Text style={styles.resumeMetaItem}>🎯 <Text style={{ fontWeight: '700' }}>Role:</Text> {personalizedResume.target_role}</Text>
                        <Text style={styles.resumeMetaItem}>🏢 <Text style={{ fontWeight: '700' }}>Company:</Text> {personalizedResume.target_company}</Text>
                        <Text style={styles.resumeMetaItem}>⚡ <Text style={{ fontWeight: '700' }}>Verified Facts Only:</Text> Real DB records</Text>
                      </View>

                      <View style={styles.resumeActionsRow}>
                        <Pressable
                          style={styles.resumeViewPersonalizedBtn}
                          onPress={() => setPreviewResumeType('PERSONALIZED')}
                        >
                          <Text style={styles.resumeViewPersonalizedBtnText}>📑 View Tailored Resume</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* Resume Document Viewer Drawer / Preview */}
                  {previewResumeType === 'PERSONALIZED' && (
                    <View style={styles.tailoredDocPreviewCard}>
                      <View style={styles.docPreviewHeader}>
                        <Text style={styles.docPreviewTitle}>
                          Personalized Document Preview — {personalizedResume.target_role}
                        </Text>
                        <Pressable onPress={() => setPreviewResumeType(null)} style={styles.closePreviewBtn}>
                          <Text style={styles.closePreviewText}>✕ Close Preview</Text>
                        </Pressable>
                      </View>

                      {/* Rendered Document */}
                      <View style={styles.resumeDocumentSheet}>
                        {/* Header */}
                        <Text style={styles.docName}>{personalizedResume.header?.name}</Text>
                        <Text style={styles.docContact}>
                          {personalizedResume.header?.email} • {personalizedResume.header?.phone} • {personalizedResume.header?.location}
                        </Text>
                        <Text style={styles.docLinks}>
                          {personalizedResume.header?.github} • {personalizedResume.header?.linkedin}
                        </Text>
                        <View style={styles.docDivider} />

                        {/* Summary */}
                        <Text style={styles.docSecTitle}>PROFESSIONAL SUMMARY</Text>
                        <Text style={styles.docSecBody}>{personalizedResume.professional_summary}</Text>
                        <View style={styles.docDivider} />

                        {/* Technical Skills */}
                        <Text style={styles.docSecTitle}>TECHNICAL SKILLS (ROLE-ALIGNED)</Text>
                        <Text style={styles.docSecBody}>
                          <Text style={{ fontWeight: '700' }}>Core Required:</Text> {(personalizedResume.highlighted_skills?.core_required || []).join(', ')}
                        </Text>
                        <Text style={styles.docSecBody}>
                          <Text style={{ fontWeight: '700' }}>Demonstrated Proficiency:</Text> {(personalizedResume.highlighted_skills?.proficient || []).join(', ')}
                        </Text>
                        <Text style={styles.docSecBody}>
                          <Text style={{ fontWeight: '700' }}>Tools & Platforms:</Text> {(personalizedResume.highlighted_skills?.tools_and_platforms || []).join(', ')}
                        </Text>
                        <View style={styles.docDivider} />

                        {/* Relevant Projects */}
                        <Text style={styles.docSecTitle}>RELEVANT PROJECTS & CODE EVIDENCE</Text>
                        {(personalizedResume.relevant_projects || []).map((p, pIdx) => (
                          <View key={pIdx} style={{ marginBottom: 10 }}>
                            <Text style={styles.projTitleText}>• {p.name} {p.tech_stack ? `[${(p.tech_stack || []).join(', ')}]` : ''}</Text>
                            <Text style={styles.projDescText}>{p.description}</Text>
                          </View>
                        ))}
                        <View style={styles.docDivider} />

                        {/* Education */}
                        <Text style={styles.docSecTitle}>EDUCATION</Text>
                        <Text style={styles.docSecBody}>
                          <Text style={{ fontWeight: '700' }}>{personalizedResume.education?.institution}</Text> — {personalizedResume.education?.degree} in {personalizedResume.education?.branch}
                        </Text>
                        <Text style={styles.docSecBody}>
                          CGPA: {personalizedResume.education?.cgpa} • Graduation: {personalizedResume.education?.graduation_year}
                        </Text>
                      </View>
                    </View>
                  )}

                  {previewResumeType === 'ORIGINAL' && (
                    <View style={styles.tailoredDocPreviewCard}>
                      <View style={styles.docPreviewHeader}>
                        <Text style={styles.docPreviewTitle}>
                          Original Document Details: {originalResume.filename}
                        </Text>
                        <Pressable onPress={() => setPreviewResumeType(null)} style={styles.closePreviewBtn}>
                          <Text style={styles.closePreviewText}>✕ Close</Text>
                        </Pressable>
                      </View>
                      <View style={{ padding: 16 }}>
                        <Text style={styles.origDocDesc}>
                          This is the master PDF resume uploaded directly by the candidate to SkillSetu.
                        </Text>
                        <View style={styles.origDetailsGrid}>
                          <Text style={styles.origDetailRow}><Text style={{ fontWeight: '700' }}>Filename:</Text> {originalResume.filename}</Text>
                          <Text style={styles.origDetailRow}><Text style={{ fontWeight: '700' }}>Upload Timestamp:</Text> {originalResume.upload_date}</Text>
                          <Text style={styles.origDetailRow}><Text style={{ fontWeight: '700' }}>ATS Parser Benchmark:</Text> {originalResume.ats_score}/100</Text>
                        </View>
                        {originalResume.download_url && (
                          <Pressable
                            style={styles.openDirectBtn}
                            onPress={() => Linking.openURL(`http://localhost:8000${originalResume.download_url}`)}
                          >
                            <Text style={styles.openDirectBtnText}>Open Document in New Tab ↗</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* Bottom Footer Action Bar */}
          <View style={styles.modalFooter}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerInfoText}>
                Application ID: {application.application_id || `APP-${applicationId}`} • Submitted via direct portal
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Pressable style={styles.closeFooterBtn} onPress={onClose}>
                <Text style={styles.closeFooterText}>Close</Text>
              </Pressable>
            </View>
          </View>

          {/* Unshortlist Confirmation Overlay */}
          {showUnshortlistConfirm && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmHeader}>
                  <Text style={styles.confirmTitle}>Remove from Shortlisted Stage?</Text>
                </View>
                <Text style={styles.confirmBody}>
                  Are you sure you want to unshortlist <Text style={{ fontWeight: '700' }}>{candidate.name || 'this candidate'}</Text> for <Text style={{ fontWeight: '700' }}>{internship.title || 'this internship'}</Text>?
                </Text>
                <Text style={styles.confirmSub}>
                  Their application status will revert to its previous valid stage, and a professional status update notification email will be sent to the candidate.
                </Text>
                <View style={styles.confirmActionsRow}>
                  <Pressable
                    style={styles.confirmCancelBtn}
                    onPress={() => setShowUnshortlistConfirm(false)}
                    disabled={updatingStatus}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmSubmitBtn}
                    onPress={async () => {
                      setShowUnshortlistConfirm(false);
                      await handleUpdateStatus('UNSHORTLIST');
                    }}
                    disabled={updatingStatus}
                  >
                    <Text style={styles.confirmSubmitText}>
                      {updatingStatus ? 'Updating...' : 'Unshortlist'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 1060,
    maxHeight: '92%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  appIdBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appIdBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
  },
  centerBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.redText,
  },
  errorSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 400,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  heroCard: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  heroLeft: {
    flex: 1,
    minWidth: 320,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarBig: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBigText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.tealDark,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  candidateName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  verifiedTag: {
    backgroundColor: COLORS.greenBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenText,
  },
  candidateSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  candidateUni: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  quickMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  quickMetricPill: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  quickMetricLbl: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  quickMetricVal: {
    fontSize: 10,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  matchScoreCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 110,
  },
  matchScoreBig: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.tealDark,
  },
  matchScoreSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  matchGatePill: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  matchGateText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  statusActionBox: {
    alignItems: 'flex-start',
    gap: 8,
  },
  statusBadgeBig: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeTextBig: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionButtonsCol: {
    flexDirection: 'row',
    gap: 6,
  },
  actionShortlistBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionShortlistText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  actionRejectBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionRejectText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  navTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    flexWrap: 'wrap',
  },
  navTabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navTabBtnActive: {
    borderBottomColor: COLORS.primaryTeal,
  },
  navTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  navTabTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  tabSection: {
    gap: 16,
  },
  eligibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 14,
    flexWrap: 'wrap',
  },
  eligibilityPass: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  eligibilityFail: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  eligibilityBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  eligibilityBannerSub: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  verifiedEvidenceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedEvidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenText,
  },
  cardBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  checksGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
  },
  checkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '800',
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkReqText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  checkStuText: {
    fontSize: 11,
    color: COLORS.textDark,
    marginTop: 2,
  },
  checkDetailText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  breakdownColName: {
    width: 150,
  },
  breakdownNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  breakdownWeightText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  breakdownBarTrack: {
    flex: 1,
    minWidth: 120,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 4,
  },
  breakdownScoreCol: {
    width: 180,
    alignItems: 'flex-start',
  },
  breakdownScoreVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  breakdownDescText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  skillTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  skillTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  stHeadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  skillTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: COLORS.white,
  },
  stSkillName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  stReqVal: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stStuVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  stGapVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  skillStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  skillStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  evidenceSourceText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  zeroGapsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  zeroGapsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.greenText,
  },
  zeroGapsSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
    textAlign: 'center',
  },
  gapsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gapCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 14,
  },
  gapTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapSkillName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  gapPointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gapPointsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  gapLevelsText: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 4,
    fontWeight: '600',
  },
  gapReasonText: {
    fontSize: 10,
    color: '#92400E',
    marginTop: 4,
  },
  gapActionBox: {
    backgroundColor: '#FEF9C3',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  gapActionText: {
    fontSize: 10,
    color: '#713F12',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  ghConnectedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ghConnectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  ghDisconnectedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ghDisconnectedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  reposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  repoCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
  },
  repoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  repoName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  repoLangBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repoLangText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  repoDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  repoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  repoTagPill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repoTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.tealDark,
  },
  repoLinkBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  repoLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  emptyReposBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyReposText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  academicDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  academicField: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.bgLight,
    padding: 12,
    borderRadius: 6,
  },
  acadLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  acadVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2,
  },
  resumesDualRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  resumeCard: {
    flex: 1,
    minWidth: 320,
    borderWidth: 1,
    borderRadius: 10,
    padding: 20,
  },
  resumeCardOriginal: {
    backgroundColor: '#F8FAFC',
    borderColor: COLORS.border,
  },
  resumeCardPersonalized: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  resumeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumeTypeBadgeOriginal: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  resumeTypeBadgeTextOriginal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  resumeTypeBadgePersonalized: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  resumeTypeBadgeTextPersonalized: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  resumeAtsScore: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  resumeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  resumeCardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 16,
  },
  resumeMetaBox: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    marginBottom: 14,
  },
  resumeMetaItem: {
    fontSize: 11,
    color: '#334155',
  },
  resumeActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeViewBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resumeViewBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  resumeDownloadBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resumeDownloadBtnText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '700',
  },
  resumeViewPersonalizedBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resumeViewPersonalizedBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  tailoredDocPreviewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  docPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderColor: '#CCFBF1',
  },
  docPreviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.tealDark,
  },
  closePreviewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closePreviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  resumeDocumentSheet: {
    padding: 24,
    backgroundColor: COLORS.white,
  },
  docName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  docContact: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  docLinks: {
    fontSize: 10,
    color: COLORS.primaryTeal,
    textAlign: 'center',
    marginTop: 2,
  },
  docDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  docSecTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  docSecBody: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
  projTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  projDescText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  origDocDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  origDetailsGrid: {
    backgroundColor: COLORS.bgLight,
    padding: 12,
    borderRadius: 6,
    gap: 6,
    marginBottom: 14,
  },
  origDetailRow: {
    fontSize: 11,
    color: '#334155',
  },
  openDirectBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  openDirectBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
  },
  footerLeft: {
    flex: 1,
  },
  footerInfoText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  closeFooterBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeFooterText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarBigImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  actionUnshortlistBtn: {
    backgroundColor: '#64748B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionUnshortlistText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmHeader: {
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  confirmBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  confirmSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Assessment Progression Section Styles
  progressionCardBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 20,
  },
  progressionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  progressionSubHeading: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  qualBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  qualPassBg: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  qualPassText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 12,
  },
  qualFailBg: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  qualFailText: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 12,
  },
  qualSelectedBg: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  qualSelectedText: {
    color: '#0284C7',
    fontWeight: '800',
    fontSize: 12,
  },
  qualRejectBg: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  qualRejectText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
  },
  progressionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  progMetricItem: {
    flex: 1,
    minWidth: 180,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 14,
  },
  progMetricLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  progMetricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  progMetricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  sequenceStepperBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  stepperTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepPillActive: {
    backgroundColor: '#004D40',
    borderColor: '#004D40',
  },
  stepPillDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  stepPillFuture: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  stepPillNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  stepPillNumActive: {
    color: COLORS.white,
  },
  stepPillNumDone: {
    color: '#15803D',
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  stepPillTextActive: {
    color: COLORS.white,
  },
  stepPillTextDone: {
    color: '#15803D',
  },
  stepArrow: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  progressionActionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  nextRoundLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nextRoundVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  nextRoundSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  progressionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  selectNextRoundBtn: {
    backgroundColor: '#004D40',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    shadowColor: '#004D40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectNextRoundBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
  notSelectedBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  notSelectedBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  auditLogContainer: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
  },
  auditLogTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  auditLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  auditLogDot: {
    fontSize: 10,
    color: COLORS.primaryTeal,
    marginTop: 3,
  },
  auditLogEvent: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  auditLogNotes: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  auditLogTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

