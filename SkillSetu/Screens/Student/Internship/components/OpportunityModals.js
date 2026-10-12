import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, cleanJobDescription } from './DesignTokens';

export default function OpportunityModals({
  // Details Modal
  selectedDetailJob,
  showDetailsModal,
  setShowDetailsModal,
  onApply,
  onOpenPlan,
  onToggleSave,
  savingId,

  // Roadmap Plan Modal
  selectedPlanJob,
  showPlanModal,
  setShowPlanModal,
  planSuccessNotice,
  enrollingCourseId,
  handleEnrollCourse,
  handleCompleteCourse,
  handleStartAssessment,
  handleStartProject,
  onNavigate,

  // Assessment Runner Modal
  showAssessmentModal,
  closeAssessmentModal,
  activeAssessment,
  assessmentLoading,
  assessmentSubmitting,
  assessmentResult,
  assessmentAnswers,
  assessmentCurrentIdx,
  setAssessmentCurrentIdx,
  handleSelectOption,
  handleSubmitAssessment,
  assessmentError,

  // Project Runner Modal
  showProjectModal,
  closeProjectModal,
  activeProject,
  projectSubmitting,
  projectResult,
  projectRepoUrl,
  setProjectRepoUrl,
  projectNotes,
  setProjectNotes,
  projectError,
  availableRepos,
  loadingRepos,
  selectedRepoId,
  setSelectedRepoId,
  handleSubmitProject,

  // Applied Confirmation Modal
  showAppliedModal,
  setShowAppliedModal,
  appliedJob,

  // Certificate Upload & Verification Modal
  showUploadModal,
  activeUploadCourse,
  uploadingCertificate,
  uploadResult,
  uploadError,
  handleStartUploadCertificate,
  handleCloseUploadModal,
  handleSubmitCertificate,
}) {
  const [certFileName, setCertFileName] = React.useState('verified_course_certificate.pdf');
  const [certIssuer, setCertIssuer] = React.useState('');
  return (
    <>
      {/* ================================================================ */}
      {/* 1. OFFICIAL PORTAL LAUNCHED CONFIRMATION MODAL                   */}
      {/* ================================================================ */}
      {appliedJob && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showAppliedModal}
          onRequestClose={() => setShowAppliedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmationModalCard}>
              <View style={styles.rocketIconBox}>
                <Text style={styles.rocketIcon}>🚀</Text>
              </View>
              <Text style={styles.modalTitle}>Official Portal Launched</Text>
              <Text style={styles.modalMessage}>
                We tracked your application for <Text style={styles.bold}>{appliedJob.title}</Text> at <Text style={styles.bold}>{appliedJob.company}</Text> and registered your verified student credentials with the employer.
              </Text>
              <View style={styles.modalDetailsBox}>
                <Text style={styles.modalDetailsLabel}>
                  Match Score: <Text style={styles.bold}>{Math.round(appliedJob.match_score || 0)}%</Text>
                </Text>
                <Text style={styles.modalDetailsLabel}>
                  Provenance: <Text style={styles.bold}>{appliedJob.verification_status === 'VERIFIED' ? '✓ Verified Partner' : `External (${appliedJob.source || 'Aggregator'})`}</Text>
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.primaryModalBtn, pressed && styles.btnPressed]}
                onPress={() => setShowAppliedModal(false)}
              >
                <Text style={styles.primaryModalBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 2. OPPORTUNITY DETAILS MODAL                                     */}
      {/* ================================================================ */}
      {selectedDetailJob && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDetailsModal}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.detailsCard]}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>
                    {selectedDetailJob.company ? selectedDetailJob.company.substring(0, 2).toUpperCase() : 'SK'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    style={styles.bookmarkBtn}
                    onPress={() => onToggleSave(selectedDetailJob)}
                    disabled={savingId === selectedDetailJob.id}
                  >
                    <Text style={[styles.bookmarkIcon, selectedDetailJob.is_saved && { color: '#EAB308' }]}>
                      {selectedDetailJob.is_saved ? '★ Saved' : '☆ Save Role'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.closeBtn} onPress={() => setShowDetailsModal(false)}>
                    <Text style={styles.closeBtnText}>×</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.detailsTitle}>{selectedDetailJob.title}</Text>
              <Text style={styles.detailsCompany}>
                {selectedDetailJob.company} • {selectedDetailJob.location || 'Pan-India'} ({selectedDetailJob.work_mode || (selectedDetailJob.is_remote ? 'Remote' : 'On-site')})
              </Text>

              {/* 4 Metadata Tiles */}
              <View style={styles.metaTilesRow}>
                <View style={styles.metaTile}>
                  <Text style={styles.metaTileLabel}>STIPEND</Text>
                  <Text style={styles.metaTileVal}>{selectedDetailJob.stipend || 'Competitive'}</Text>
                </View>
                <View style={styles.metaTile}>
                  <Text style={styles.metaTileLabel}>PROVENANCE</Text>
                  <Text style={[
                    styles.metaTileVal,
                    selectedDetailJob.verification_status === 'VERIFIED' ? { color: CLAY_COLORS.successText } : { color: CLAY_COLORS.warningText }
                  ]}>
                    {selectedDetailJob.verification_status === 'VERIFIED' ? '✓ Verified Partner' : (selectedDetailJob.source ? selectedDetailJob.source.toUpperCase() : 'External')}
                  </Text>
                </View>
                <View style={styles.metaTile}>
                  <Text style={styles.metaTileLabel}>MATCH / MIN</Text>
                  <Text style={[
                    styles.metaTileVal,
                    (selectedDetailJob.match_score || 0) >= (selectedDetailJob.application_threshold ?? 80) ? { color: CLAY_COLORS.successText } : { color: CLAY_COLORS.warningText }
                  ]}>
                    {Math.round(selectedDetailJob.match_score || 0)}% / {selectedDetailJob.application_threshold ?? 80}%
                  </Text>
                </View>
                <View style={styles.metaTile}>
                  <Text style={styles.metaTileLabel}>READINESS</Text>
                  <Text style={[
                    styles.metaTileVal,
                    (selectedDetailJob.match_score || 0) >= (selectedDetailJob.application_threshold ?? 80) ? { color: CLAY_COLORS.successText } : { color: CLAY_COLORS.warningText }
                  ]}>
                    {(selectedDetailJob.match_score || 0) >= (selectedDetailJob.application_threshold ?? 80) ? 'Ready to Apply' : 'Needs Dev'}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.sectionLabel}>Role Description</Text>
              <ScrollView style={{ maxHeight: 100, width: '100%', marginBottom: 12 }}>
                <Text style={styles.descriptionBody}>{cleanJobDescription(selectedDetailJob.description)}</Text>
              </ScrollView>

              {/* 3-Way Preparation Status */}
              <Text style={styles.sectionLabel}>Your Preparation Status (3-Way Evidence)</Text>
              <View style={styles.prepMatrixContainer}>
                {((selectedDetailJob.preparation_skills && selectedDetailJob.preparation_skills.length > 0)
                  ? selectedDetailJob.preparation_skills
                  : (selectedDetailJob.skills || []).map(s => ({
                      skill_name: s,
                      progress_percent: 0,
                      is_verified: false,
                      course: { completed: false },
                      test: { passed: false, attempted: false, score: null },
                      assignment: { verified: false, status: 'PENDING' },
                      github: { evidence: false }
                    }))
                ).slice(0, 3).map((sk, idx) => {
                  const isVerified = Boolean(sk.is_verified || sk.status === 'VERIFIED' || sk.status === 'Verified');
                  const scoreVal = Math.round(sk.current_score || sk.score || 0);
                  const courseProgress = Math.round(sk.progress_percent || sk.course_progress || (sk.course?.completed ? 100 : 0));
                  return (
                    <View key={idx} style={styles.prepCard}>
                      <View style={styles.prepCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.prepCardTitle}>{sk.skill_name}</Text>
                          <View style={[styles.prepBadge, isVerified ? styles.prepBadgeSuccess : styles.prepBadgeDev]}>
                            <Text style={styles.prepBadgeText}>{isVerified ? 'VERIFIED' : 'EVIDENCE REQUIRED'}</Text>
                          </View>
                        </View>
                        <Text style={{ fontFamily: CLAY_FONTS.heading, fontSize: 11, fontWeight: '800', color: isVerified ? CLAY_COLORS.successText : CLAY_COLORS.warningText }}>
                          {isVerified ? '✓ Verified' : `${scoreVal}% Competency`}
                        </Text>
                      </View>
                      <View style={styles.prepGrid}>
                        <Text style={styles.prepItemValMini}>Learning: {sk.course?.completed ? `✅ Complete (${courseProgress}%)` : `○ In Progress (${courseProgress}%)`}</Text>
                        <Text style={styles.prepItemValMini}>Test: {sk.test?.passed ? `✅ Passed (${sk.test?.score}%)` : '○ Pending'}</Text>
                        <Text style={styles.prepItemValMini}>Project: {sk.assignment?.verified ? '✅ Verified' : '○ Pending'}</Text>
                        <Text style={styles.prepItemValMini}>GitHub: {sk.github?.evidence ? '✅ Evidence' : '○ None'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Actions */}
              <View style={styles.modalActionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryModalBtn, pressed && styles.btnPressed]}
                  onPress={() => setShowDetailsModal(false)}
                >
                  <Text style={styles.secondaryModalBtnText}>Close</Text>
                </Pressable>

                {(selectedDetailJob.match_score || 0) < (selectedDetailJob.application_threshold ?? 80) ? (
                  <Pressable
                    style={({ pressed }) => [styles.planModalActionBtn, pressed && styles.btnPressed]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      onOpenPlan(selectedDetailJob);
                    }}
                  >
                    <Text style={styles.planModalActionBtnText}>View Development Roadmap</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.primaryModalBtn, pressed && styles.btnPressed]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      onApply(selectedDetailJob);
                    }}
                  >
                    <Text style={styles.primaryModalBtnText}>Apply on Official Portal</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 3. TARGETED DEVELOPMENT ROADMAP MODAL                            */}
      {/* ================================================================ */}
      {selectedPlanJob && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPlanModal}
          onRequestClose={() => setShowPlanModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.planCard]}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.planHeaderIconBox}>
                  <Text style={styles.planHeaderIcon}>
                    {(selectedPlanJob.match_score || 0) >= 80 ? '🎉' : '⚡'}
                  </Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setShowPlanModal(false)}>
                  <Text style={styles.closeBtnText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.detailsTitle}>Targeted Development Plan</Text>
              <Text style={styles.detailsCompany}>{selectedPlanJob.title} at {selectedPlanJob.company}</Text>

              {/* Success Notification */}
              {planSuccessNotice && (
                <View style={styles.planSuccessBanner}>
                  <Text style={styles.planSuccessBannerText}>✓ {planSuccessNotice}</Text>
                </View>
              )}

              {/* Dynamic Target Banner */}
              {(() => {
                const planThresh = selectedPlanJob.application_threshold ?? 80;
                const planScore = Math.round(selectedPlanJob.match_score || 0);
                const isPlanReady = planScore >= planThresh;
                const remainingPoints = Math.max(0, planThresh - planScore);

                return (
                  <View style={[
                    styles.planTargetBanner,
                    isPlanReady && { backgroundColor: CLAY_COLORS.successLight, borderColor: 'rgba(16, 185, 129, 0.3)' }
                  ]}>
                    <View style={styles.planTargetHeader}>
                      <Text style={[styles.planTargetTitle, isPlanReady && { color: CLAY_COLORS.successText }]}>
                        Current Match: {planScore}%
                      </Text>
                      <Text style={styles.planTargetGoal}>
                        {isPlanReady ? `✓ Ready to Apply (>=${planThresh}%)` : `Target: ${planThresh}% (Minimum to Apply)`}
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(5, planScore))}%`,
                          backgroundColor: isPlanReady ? CLAY_COLORS.success : CLAY_COLORS.warning
                        }
                      ]} />
                    </View>
                    {isPlanReady ? (
                      <Text style={[styles.planTargetHelp, { color: CLAY_COLORS.successText, fontWeight: '700' }]}>
                        🎉 Your profile meets the {planThresh}% threshold! You are fully eligible to apply.
                      </Text>
                    ) : (
                      <Text style={styles.planTargetHelp}>
                        Remaining Gap: {remainingPoints} percentage points. Complete verified activities below to earn instant skill proofs.
                      </Text>
                    )}
                  </View>
                );
              })()}

              <ScrollView style={{ maxHeight: 360, width: '100%' }}>
                {/* 1. Skill Gaps */}
                <Text style={styles.sectionLabel}>1. Identified Competency Gaps</Text>
                <View style={styles.gapsBox}>
                  {(selectedPlanJob.skill_gaps && selectedPlanJob.skill_gaps.length > 0 
                    ? selectedPlanJob.skill_gaps 
                    : (selectedPlanJob.missing_skills || []).map(s => ({ skill_name: s, student_level: 0.0, required_level: 0.8, gap: 0.8 }))
                  ).map((g, idx) => (
                    <View key={idx} style={styles.gapRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gapSkillName}>{g.skill_name}</Text>
                        <Text style={styles.gapMeta}>Required: {Math.round((g.required_level || 0.8) * 100)}%</Text>
                      </View>
                      <View style={styles.gapBadge}>
                        <Text style={styles.gapBadgeText}>+{Math.round((g.gap || 0.25) * 100)}% Needed</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 2. Recommended Courses */}
                <Text style={styles.sectionLabel}>2. Recommended Courses & Curriculum</Text>
                {(selectedPlanJob.recommended_courses && selectedPlanJob.recommended_courses.length > 0 ? selectedPlanJob.recommended_courses : [
                  { title: `Complete ${selectedPlanJob.missing_skills?.[0] || 'Core Skill'} Masterclass`, provider: 'SkillSetu', duration: '3-4 Weeks', status: 'NOT_STARTED' }
                ]).map((c, idx) => (
                  <View key={idx} style={styles.recItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recItemTitle}>{c.title}</Text>
                      <Text style={styles.recItemMeta}>{c.provider || 'SkillSetu'} • {c.duration || 'Self-Paced'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {c.status === 'COMPLETED' ? (
                        <View style={[styles.recItemBtn, { backgroundColor: CLAY_COLORS.success }]}>
                          <Text style={styles.recItemBtnText}>✓ Verified</Text>
                        </View>
                      ) : (
                        <>
                          <Pressable
                            style={[styles.recItemBtn, { backgroundColor: CLAY_COLORS.primary }]}
                            onPress={() => handleEnrollCourse(c)}
                            disabled={enrollingCourseId === (c.id || c.title)}
                          >
                            {enrollingCourseId === (c.id || c.title) ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.recItemBtnText}>
                                {c.status === 'IN_PROGRESS' ? 'Enrolled ⤹' : 'Enroll Free'}
                              </Text>
                            )}
                          </Pressable>
                          <Pressable
                            style={[styles.recItemBtn, { backgroundColor: '#059669' }]}
                            onPress={() => handleStartUploadCertificate(c)}
                          >
                            <Text style={styles.recItemBtnText}>Upload Certificate ⤹</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                ))}

                {/* 3. Verified Diagnostic Assessments */}
                <Text style={styles.sectionLabel}>3. Verified Benchmark Assessments</Text>
                {(selectedPlanJob.recommended_tests && selectedPlanJob.recommended_tests.length > 0 ? selectedPlanJob.recommended_tests : [
                  { id: 'test_git_01', title: `${selectedPlanJob.missing_skills?.[0] || 'Technical'} Skill Diagnostic`, duration: '35 Mins', question_count: 20 }
                ]).map((t, idx) => (
                  <View key={idx} style={styles.recItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recItemTitle}>{t.title}</Text>
                      <Text style={styles.recItemMeta}>{t.duration || '30 Mins'} • {t.question_count || 20} Questions</Text>
                    </View>
                    <Pressable
                      style={[styles.recItemBtn, { backgroundColor: CLAY_COLORS.primary }]}
                      onPress={() => handleStartAssessment(t)}
                    >
                      <Text style={styles.recItemBtnText}>Take Test →</Text>
                    </Pressable>
                  </View>
                ))}

                {/* 4. Practical Codebase Challenges */}
                <Text style={styles.sectionLabel}>4. Practical Codebase Challenges</Text>
                {(selectedPlanJob.recommended_projects && selectedPlanJob.recommended_projects.length > 0 ? selectedPlanJob.recommended_projects : [
                  { id: 'ch_git_01', title: `Hands-On ${selectedPlanJob.missing_skills?.[0] || 'Engineering'} Project`, xp: 50 }
                ]).map((p, idx) => (
                  <View key={idx} style={styles.recItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recItemTitle}>{p.title}</Text>
                      <Text style={styles.recItemMeta}>+{p.xp || 50} XP Evidence</Text>
                    </View>
                    <Pressable
                      style={[styles.recItemBtn, { backgroundColor: CLAY_COLORS.primaryDark }]}
                      onPress={() => handleStartProject(p)}
                    >
                      <Text style={styles.recItemBtnText}>Start Project →</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryModalBtn, pressed && styles.btnPressed]}
                  onPress={() => setShowPlanModal(false)}
                >
                  <Text style={styles.secondaryModalBtnText}>Close Plan</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primaryModalBtn, pressed && styles.btnPressed]}
                  onPress={() => {
                    setShowPlanModal(false);
                    if (onNavigate) onNavigate('Learning');
                  }}
                >
                  <Text style={styles.primaryModalBtnText}>Go to Learning Dashboard →</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 4. INTERACTIVE ASSESSMENT RUNNER MODAL                           */}
      {/* ================================================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAssessmentModal}
        onRequestClose={() => {
          if (!assessmentSubmitting) closeAssessmentModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.runnerCard]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.runnerIconBox}>
                  <Text style={styles.runnerIcon}>📝</Text>
                </View>
                <View>
                  <Text style={styles.runnerHeaderTitle}>{activeAssessment?.title || 'Skill Diagnostic Assessment'}</Text>
                  <Text style={styles.runnerHeaderSubtitle}>Target: {activeAssessment?.skill || 'Technical Competency'}</Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={closeAssessmentModal} disabled={assessmentSubmitting}>
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            {assessmentLoading ? (
              <View style={styles.runnerLoadingContainer}>
                <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
                <Text style={styles.loadingText}>Loading verified assessment questions...</Text>
              </View>
            ) : assessmentError ? (
              <View style={styles.runnerErrorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{assessmentError}</Text>
                <Pressable style={styles.secondaryModalBtn} onPress={closeAssessmentModal}>
                  <Text style={styles.secondaryModalBtnText}>Return to Plan</Text>
                </Pressable>
              </View>
            ) : assessmentResult ? (
              /* Assessment Evaluation Result */
              <ScrollView style={{ width: '100%', maxHeight: 420 }}>
                <View style={[
                  styles.resultCard,
                  assessmentResult.passed ? styles.resultCardPassed : styles.resultCardFailed
                ]}>
                  <Text style={styles.resultBadge}>
                    {assessmentResult.passed ? '🎉 ASSESSMENT PASSED' : '⚡ NEEDS RETAKE'}
                  </Text>
                  <Text style={styles.resultScoreNum}>
                    {assessmentResult.score !== undefined ? `${assessmentResult.score}%` : 'Complete'}
                  </Text>
                  <Text style={styles.resultScoreDetail}>
                    {assessmentResult.correct_count ?? 0} Questions Correct
                  </Text>

                  {/* Growth Pill */}
                  <View style={styles.evidenceGrowthRow}>
                    <Text style={styles.growthText}>
                      Evidence: {Math.round(assessmentResult.previous_evidence || 0)}% → {Math.round(assessmentResult.updated_evidence || 0)}%
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.primaryModalBtn} onPress={closeAssessmentModal}>
                  <Text style={styles.primaryModalBtnText}>Return to Roadmap & Recalculate</Text>
                </Pressable>
              </ScrollView>
            ) : activeAssessment && activeAssessment.questions && activeAssessment.questions.length > 0 ? (
              /* Active Stepper */
              <View style={{ width: '100%' }}>
                <View style={styles.stepperHeader}>
                  <Text style={styles.stepperCount}>
                    Question {assessmentCurrentIdx + 1} of {activeAssessment.questions.length}
                  </Text>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>{activeAssessment.questions[assessmentCurrentIdx]?.difficulty || 'Standard'}</Text>
                  </View>
                </View>

                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      width: `${((assessmentCurrentIdx + 1) / activeAssessment.questions.length) * 100}%`,
                      backgroundColor: CLAY_COLORS.primary
                    }
                  ]} />
                </View>

                <ScrollView style={{ maxHeight: 260, marginVertical: 12 }}>
                  <Text style={styles.questionText}>
                    {activeAssessment.questions[assessmentCurrentIdx]?.question}
                  </Text>

                  <View style={styles.optionsList}>
                    {activeAssessment.questions[assessmentCurrentIdx]?.options &&
                      Object.entries(activeAssessment.questions[assessmentCurrentIdx].options).map(([optKey, optText]) => {
                        const qId = activeAssessment.questions[assessmentCurrentIdx].id;
                        const isSelected = assessmentAnswers[qId] === optKey;
                        return (
                          <Pressable
                            key={optKey}
                            style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                            onPress={() => handleSelectOption(qId, optKey)}
                          >
                            <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                              <Text style={[styles.optionRadioText, isSelected && styles.optionRadioTextSelected]}>
                                {optKey}
                              </Text>
                            </View>
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                              {optText}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </ScrollView>

                <View style={styles.stepperActionsRow}>
                  <Pressable
                    style={[styles.secondaryModalBtn, assessmentCurrentIdx === 0 && { opacity: 0.4 }]}
                    onPress={() => setAssessmentCurrentIdx(prev => Math.max(0, prev - 1))}
                    disabled={assessmentCurrentIdx === 0}
                  >
                    <Text style={styles.secondaryModalBtnText}>← Previous</Text>
                  </Pressable>

                  {assessmentCurrentIdx < activeAssessment.questions.length - 1 ? (
                    <Pressable
                      style={styles.primaryModalBtn}
                      onPress={() => setAssessmentCurrentIdx(prev => Math.min(activeAssessment.questions.length - 1, prev + 1))}
                    >
                      <Text style={styles.primaryModalBtnText}>Next →</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.primaryModalBtn, { backgroundColor: CLAY_COLORS.success }]}
                      onPress={handleSubmitAssessment}
                      disabled={assessmentSubmitting}
                    >
                      {assessmentSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.primaryModalBtnText}>Submit Assessment</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* 5. INTERACTIVE PROJECT RUNNER MODAL                              */}
      {/* ================================================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProjectModal}
        onRequestClose={() => {
          if (!projectSubmitting) closeProjectModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.runnerCard]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.runnerIconBox, { backgroundColor: CLAY_COLORS.primaryLight }]}>
                  <Text style={styles.runnerIcon}>💻</Text>
                </View>
                <View>
                  <Text style={styles.runnerHeaderTitle}>{activeProject?.title || 'Codebase Challenge'}</Text>
                  <Text style={styles.runnerHeaderSubtitle}>+{activeProject?.xp || 50} XP Evidence</Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={closeProjectModal} disabled={projectSubmitting}>
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            {projectResult ? (
              <ScrollView style={{ width: '100%', maxHeight: 380 }}>
                <View style={[styles.resultCard, styles.resultCardPassed]}>
                  <Text style={styles.resultBadge}>🎉 DELIVERABLES VERIFIED</Text>
                  <Text style={styles.resultScoreNum}>+{activeProject?.xp || 50} XP</Text>
                  <Text style={styles.resultScoreDetail}>
                    Authentic codebase evidence verified and attributed to your student ledger.
                  </Text>
                </View>
                <Pressable style={styles.primaryModalBtn} onPress={closeProjectModal}>
                  <Text style={styles.primaryModalBtnText}>Return to Roadmap & Recalculate</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                <Text style={styles.sectionLabel}>Requirements & Deliverables</Text>
                <View style={styles.projectReqBox}>
                  <Text style={styles.projectReqText}>• Public GitHub repository with clean commit history.</Text>
                  <Text style={styles.projectReqText}>• Architecture README and unit test suite.</Text>
                </View>

                {projectError && (
                  <View style={styles.projectErrorBanner}>
                    <Text style={styles.projectErrorText}>{projectError}</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>GitHub Repository URL *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://github.com/username/project-repo"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                  value={projectRepoUrl}
                  onChangeText={setProjectRepoUrl}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Notes & Deployment Link (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  placeholder="Key notes, test coverage, or live demo..."
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                  value={projectNotes}
                  onChangeText={setProjectNotes}
                  multiline={true}
                />

                <View style={styles.modalActionsRow}>
                  <Pressable style={styles.secondaryModalBtn} onPress={closeProjectModal} disabled={projectSubmitting}>
                    <Text style={styles.secondaryModalBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryModalBtn}
                    onPress={handleSubmitProject}
                    disabled={projectSubmitting}
                  >
                    {projectSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryModalBtnText}>Submit Deliverables</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* 6. REAL CERTIFICATE UPLOAD & VERIFICATION MODAL                  */}
      {/* ================================================================ */}
      {activeUploadCourse && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showUploadModal}
          onRequestClose={handleCloseUploadModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.runnerCard]}>
              <View style={styles.modalHeaderRow}>
                <View style={[styles.avatarMini, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.avatarMiniText, { color: '#059669' }]}>📜</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={handleCloseUploadModal} disabled={uploadingCertificate}>
                  <Text style={styles.closeBtnText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.detailsTitle}>Attest Course Certificate</Text>
              <Text style={styles.detailsCompany}>
                {activeUploadCourse.title} • {activeUploadCourse.provider || 'Course Provider'}
              </Text>

              {uploadError && (
                <View style={styles.assessmentErrorBanner}>
                  <Text style={styles.assessmentErrorText}>⚠️ {uploadError}</Text>
                </View>
              )}

              {uploadResult ? (
                /* Verification Success Proof State */
                <View style={styles.assessmentResultBox}>
                  <Text style={styles.resultEmoji}>🎉</Text>
                  <Text style={styles.resultTitle}>Certificate Cryptographically Attested!</Text>
                  <Text style={styles.resultScoreText}>Status: VERIFIED (100%)</Text>
                  <Text style={styles.resultFeedback}>
                    {uploadResult.message || 'Your completion has been validated and recorded on your cryptographic student ledger.'}
                  </Text>

                  {uploadResult.data?.proof_hash && (
                    <View style={styles.hashProofBox}>
                      <Text style={styles.hashProofLabel}>IMMUTABLE PROOF HASH</Text>
                      <Text style={styles.hashProofText} numberOfLines={1}>
                        {uploadResult.data.proof_hash}
                      </Text>
                    </View>
                  )}

                  {uploadResult.data?.skills_verified && (
                    <View style={{ marginTop: 12, width: '100%' }}>
                      <Text style={styles.sectionLabel}>Skills Attested & Upgraded:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {uploadResult.data.skills_verified.map((sk, idx) => (
                          <View key={idx} style={[styles.prepBadge, styles.prepBadgeSuccess]}>
                            <Text style={styles.prepBadgeText}>✓ {sk}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <Pressable
                    style={[styles.primaryModalBtn, { marginTop: 20 }]}
                    onPress={handleCloseUploadModal}
                  >
                    <Text style={styles.primaryModalBtnText}>Done & Update Readiness</Text>
                  </Pressable>
                </View>
              ) : uploadingCertificate ? (
                /* Verifying Loading State */
                <View style={styles.assessmentLoadingBox}>
                  <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
                  <Text style={styles.assessmentLoadingText}>Verifying certificate document with cryptographic attestation...</Text>
                  <Text style={{ fontFamily: CLAY_FONTS.body, fontSize: 12, color: CLAY_COLORS.muted, textAlign: 'center', marginTop: 6 }}>
                    Aligning ESCO competence ontology, validating course provider credentials, and recording immutable skill proof.
                  </Text>
                </View>
              ) : (
                /* Upload Form */
                <ScrollView style={{ maxHeight: 380, width: '100%' }}>
                  <Text style={{ fontFamily: CLAY_FONTS.body, fontSize: 13, color: CLAY_COLORS.muted, marginBottom: 16 }}>
                    Upload your completion certificate or statement of accomplishment (PDF, PNG, JPG). Our engine extracts credentials and updates your candidate readiness score.
                  </Text>

                  {/* Upload Box Preview */}
                  <View style={styles.uploadDropzone}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>📄</Text>
                    <Text style={{ fontFamily: CLAY_FONTS.heading, fontSize: 14, fontWeight: '800', color: CLAY_COLORS.foreground }}>
                      {certFileName}
                    </Text>
                    <Text style={{ fontFamily: CLAY_FONTS.body, fontSize: 11, color: CLAY_COLORS.muted, marginTop: 2 }}>
                      PDF Document • Cryptographic SHA-256 Hash Generated upon Submission
                    </Text>
                  </View>

                  {/* Issuer Input */}
                  <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Issuing Institution / Academy</Text>
                  <TextInput
                    style={styles.projectInput}
                    placeholder={activeUploadCourse.provider || 'e.g. NPTEL, Coursera, freeCodeCamp, IIT Delhi'}
                    value={certIssuer}
                    onChangeText={setCertIssuer}
                    placeholderTextColor={CLAY_COLORS.mutedLight}
                  />

                  {/* Actions */}
                  <View style={[styles.modalActionsRow, { marginTop: 20 }]}>
                    <Pressable style={styles.secondaryModalBtn} onPress={handleCloseUploadModal}>
                      <Text style={styles.secondaryModalBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryModalBtn, { backgroundColor: '#059669' }]}
                      onPress={() => handleSubmitCertificate({
                        filename: certFileName,
                        issuer: certIssuer || activeUploadCourse.provider || 'Verified Academy'
                      })}
                    >
                      <Text style={styles.primaryModalBtnText}>Verify & Record Skill Proof</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 9999,
  },
  confirmationModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.card,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.9)',
    ...CLAY_SHADOWS.card,
  },
  rocketIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: CLAY_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  rocketIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalDetailsBox: {
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 18,
    gap: 4,
  },
  modalDetailsLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.card,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.9)',
    ...CLAY_SHADOWS.card,
  },
  detailsCard: {
    maxWidth: 540,
  },
  planCard: {
    maxWidth: 620,
  },
  runnerCard: {
    maxWidth: 600,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  bookmarkBtn: {
    backgroundColor: CLAY_COLORS.recessed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
  },
  bookmarkIcon: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLAY_COLORS.recessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CLAY_COLORS.muted,
    lineHeight: 22,
  },
  detailsTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginBottom: 2,
  },
  detailsCompany: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    marginBottom: 14,
  },
  metaTilesRow: {
    flexDirection: 'row',
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  metaTile: {
    flex: 1,
    alignItems: 'center',
  },
  metaTileLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  metaTileVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '900',
    color: CLAY_COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  descriptionBody: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
  },
  prepMatrixContainer: {
    gap: 8,
    marginBottom: 14,
  },
  prepCard: {
    backgroundColor: '#FAF8FE',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  prepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  prepCardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  prepBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prepBadgeSuccess: {
    backgroundColor: CLAY_COLORS.successLight,
  },
  prepBadgeDev: {
    backgroundColor: CLAY_COLORS.warningLight,
  },
  prepBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
  },
  prepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  prepItemValMini: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    color: CLAY_COLORS.foreground,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 12,
  },
  secondaryModalBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonSecondary,
    cursor: 'pointer',
  },
  secondaryModalBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  primaryModalBtn: {
    flex: 1.5,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  primaryModalBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  planModalActionBtn: {
    flex: 1.5,
    backgroundColor: CLAY_COLORS.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  planModalActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  planHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderIcon: {
    fontSize: 18,
  },
  planSuccessBanner: {
    backgroundColor: CLAY_COLORS.successLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  planSuccessBannerText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.successText,
  },
  planTargetBanner: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  planTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planTargetTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  planTargetGoal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.successText,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  planTargetHelp: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  gapsBox: {
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  gapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  gapMeta: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  gapBadge: {
    backgroundColor: CLAY_COLORS.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gapBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  recItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8FE',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  recItemTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  recItemMeta: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    color: CLAY_COLORS.muted,
  },
  recItemBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  recItemBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  runnerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CLAY_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerIcon: {
    fontSize: 18,
  },
  runnerHeaderTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  runnerHeaderSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  runnerLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
  },
  runnerErrorBox: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    fontSize: 28,
  },
  errorText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.danger,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  resultCardPassed: {
    backgroundColor: CLAY_COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultCardFailed: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  resultBadge: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  resultScoreNum: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 28,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  resultScoreDetail: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    marginBottom: 8,
  },
  evidenceGrowthRow: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  growthText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepperCount: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  difficultyBadge: {
    backgroundColor: CLAY_COLORS.recessed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  questionText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 20,
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#FAF5FF',
    borderColor: CLAY_COLORS.primary,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    backgroundColor: CLAY_COLORS.primary,
  },
  optionRadioText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  optionRadioTextSelected: {
    color: '#ffffff',
  },
  optionText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.foreground,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  stepperActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 10,
  },
  projectReqBox: {
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 10,
  },
  projectReqText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  projectErrorBanner: {
    backgroundColor: CLAY_COLORS.dangerLight,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  projectErrorText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.danger,
    fontWeight: '600',
  },
  inputLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: CLAY_COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    marginBottom: 10,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
  uploadDropzone: {
    backgroundColor: '#F3EEFA',
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderStyle: 'dashed',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.recessed,
  },
  hashProofBox: {
    backgroundColor: '#1E1B24',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    width: '100%',
  },
  hashProofLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#A78BFA',
    letterSpacing: 0.5,
  },
  hashProofText: {
    fontFamily: Platform.OS === 'web' ? 'Courier New, monospace' : 'monospace',
    fontSize: 11,
    color: '#34D399',
    marginTop: 3,
  },
});
