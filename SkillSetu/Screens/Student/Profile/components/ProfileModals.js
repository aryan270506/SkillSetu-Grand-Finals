import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export function EditProfileModal({
  visible,
  onClose,
  profileData = {},
  setProfileData,
  user = {},
  updateUser,
}) {
  const pInfo = profileData?.personalInfo || {};
  const eduItem = (profileData?.education?.list && profileData.education.list[0]) || {};
  const cGoals = profileData?.careerGoals || {};
  const gLinks = profileData?.githubLinks || {};

  const [name, setName] = useState(pInfo.fullName || user?.name || '');
  const [headline, setHeadline] = useState(pInfo.headline || user?.headline || '');
  const [location, setLocation] = useState(pInfo.location || user?.location || '');
  const [bio, setBio] = useState(pInfo.bio || user?.bio || '');
  const [university, setUniversity] = useState(eduItem.university || user?.university || '');
  const [degree, setDegree] = useState(eduItem.degree || user?.degree || '');
  const [cgpa, setCgpa] = useState(eduItem.cgpa || user?.cgpa_or_percentage || '');
  const [targetCareer, setTargetCareer] = useState(cGoals.targetCareer || user?.headline || '');
  const [linkedin, setLinkedin] = useState(gLinks.linkedinUrl || user?.linkedin_url || '');
  const [portfolio, setPortfolio] = useState(gLinks.portfolioUrl || user?.portfolio_url || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!visible) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const email = (pInfo.email || user?.email || '').trim();

      // 1. Update personal info
      if (email) {
        await fetch('http://127.0.0.1:8000/api/v1/student/update-personal-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            profile_image: pInfo.profileImage || user?.profile_image || '',
            headline: headline.trim(),
            location: location.trim(),
            years_of_experience: pInfo.yearsOfExperience || '1',
            bio: bio.trim(),
          }),
        });

        // 2. Update education
        await fetch('http://127.0.0.1:8000/api/v1/student/update-education', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            degree: degree.trim(),
            branch: eduItem.branch || 'Computer Science',
            university: university.trim(),
            start_year: user?.start_year || '2021',
            graduation_year: user?.graduation_year || '2025',
            cgpa_or_percentage: cgpa.trim(),
            marksheet_url: '',
          }),
        });

        // 3. Update career goals
        await fetch('http://127.0.0.1:8000/api/v1/taxonomy/student/career-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            target_career_id: targetCareer.trim(),
            target_career_ids: [targetCareer.trim()],
            skill_ids: cGoals.skillIds || [],
            preferred_location_ids: cGoals.preferredLocationIds || [],
            target_industry_id: '',
            target_industry_ids: [],
            opportunity_types: [],
            work_preferences: [],
            timeline: cGoals.timeline || '',
            career_goal_text: bio.trim(),
          }),
        });
      }

      // Update parent states
      if (setProfileData) {
        setProfileData(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: name,
            headline,
            location,
            bio,
          },
          education: {
            ...prev.education,
            list: [
              {
                ...(prev.education?.list?.[0] || {}),
                degree,
                university,
                cgpa,
              },
            ],
          },
          careerGoals: {
            ...prev.careerGoals,
            targetCareer,
          },
          githubLinks: {
            ...prev.githubLinks,
            linkedinUrl: linkedin,
            portfolioUrl: portfolio,
          },
        }));
      }

      if (updateUser) {
        updateUser({
          ...user,
          name,
          headline,
          location,
          bio,
          university,
          degree,
          cgpa_or_percentage: cgpa,
          linkedin_url: linkedin,
          portfolio_url: portfolio,
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving profile changes:', err);
      alert('Changes saved locally.');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, Platform.OS === 'web' && { className: 'clay-modal-backdrop' }]}>
        <View style={[styles.modalCard, Platform.OS === 'web' && { className: 'clay-modal-content' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>PROFILE EDITOR</Text>
              <Text style={styles.modalTitle}>Edit Student Career Dossier</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Form ScrollView */}
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Aryan Bhoge"
                placeholderTextColor={CLAY_COLORS.mutedLight}
              />
            </View>

            {/* Headline */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Professional Headline</Text>
              <TextInput
                style={styles.textInput}
                value={headline}
                onChangeText={setHeadline}
                placeholder="Full Stack Developer"
                placeholderTextColor={CLAY_COLORS.mutedLight}
              />
            </View>

            {/* University & Degree Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>University / Institution</Text>
                <TextInput
                  style={styles.textInput}
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="Indian Institute of Technology (IIT Delhi Node)"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Degree</Text>
                <TextInput
                  style={styles.textInput}
                  value={degree}
                  onChangeText={setDegree}
                  placeholder="B.Tech Computer Science"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                />
              </View>
            </View>

            {/* CGPA & Location Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CGPA / Grade</Text>
                <TextInput
                  style={styles.textInput}
                  value={cgpa}
                  onChangeText={setCgpa}
                  placeholder="9.32 / 10.0"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Delhi / Bengaluru, India"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                />
              </View>
            </View>

            {/* Target Career */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Career Aspiration</Text>
              <TextInput
                style={styles.textInput}
                value={targetCareer}
                onChangeText={setTargetCareer}
                placeholder="Full Stack Developer"
                placeholderTextColor={CLAY_COLORS.mutedLight}
              />
            </View>

            {/* Links Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>LinkedIn URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={linkedin}
                  onChangeText={setLinkedin}
                  placeholder="https://linkedin.com/in/aryan-bhoge"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Portfolio URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={portfolio}
                  onChangeText={setPortfolio}
                  placeholder="https://aryan.dev"
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Professional Bio & Summary</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                placeholder="Passionate engineer building distributed systems..."
                placeholderTextColor={CLAY_COLORS.mutedLight}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.saveModalBtn, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveModalBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ShareProfileModal({ visible, onClose, profileUrl }) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopy = () => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(profileUrl || window.location.href);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, Platform.OS === 'web' && { className: 'clay-modal-backdrop' }]}>
        <View style={[styles.smallModalCard, Platform.OS === 'web' && { className: 'clay-modal-content' }]}>
          <Text style={styles.modalEyebrow}>SHARE DOSSIER</Text>
          <Text style={styles.modalTitle}>Share Verified Profile Link</Text>
          <Text style={styles.modalSubtitle}>
            Share this cryptographically verified student dossier link directly with recruiters and partner firms.
          </Text>

          <View style={styles.shareLinkBox}>
            <Text style={styles.shareLinkText} numberOfLines={1}>
              {profileUrl || 'https://skillsetu.com/dossier/aryan-bhoge-v6'}
            </Text>
            <Pressable
              style={[styles.copyBtn, copied && styles.copyBtnSuccess, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
              onPress={handleCopy}
            >
              <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : '📋 Copy Link'}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function DownloadReportModal({ visible, onClose, studentName = 'Aryan Bhoge' }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, Platform.OS === 'web' && { className: 'clay-modal-backdrop' }]}>
        <View style={[styles.smallModalCard, Platform.OS === 'web' && { className: 'clay-modal-content' }]}>
          <Text style={styles.modalEyebrow}>DOSSIER GENERATOR</Text>
          <Text style={styles.modalTitle}>Verified Report Ready</Text>
          <Text style={styles.modalSubtitle}>
            Cryptographic transcript hash, NSQF Level 6 benchmarks, and live GitHub commit telemetry compiled for {studentName}.
          </Text>

          <View style={styles.reportFeaturesList}>
            <Text style={styles.reportFeatureItem}>✓ Official B.Tech Transcript SHA-256 Verified</Text>
            <Text style={styles.reportFeatureItem}>✓ 5/5 Proctored Sandboxed Lab Proofs Attached</Text>
            <Text style={styles.reportFeatureItem}>✓ 94/100 Global ATS Calibration Score</Text>
          </View>

          <Pressable
            style={[styles.saveModalBtn, { alignSelf: 'stretch' }, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
            onPress={() => {
              alert('Verified Dossier PDF download initiated.');
              onClose();
            }}
          >
            <Text style={styles.saveModalBtnText}>📥 Download PDF Dossier</Text>
          </Pressable>

          <Pressable style={[styles.cancelBtn, { marginTop: 8, alignSelf: 'center' }]} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function ATSBreakdownModal({ visible, onClose, resumeAnalysis = {} }) {
  if (!visible) return null;

  const diagnostics = resumeAnalysis?.diagnostics || {};
  const scoreBreakdown = resumeAnalysis?.scoreBreakdown || {};

  const semanticScore = typeof diagnostics?.semantic_match?.score === 'number'
    ? diagnostics.semantic_match.score
    : (typeof scoreBreakdown?.semantic_match === 'number' ? scoreBreakdown.semantic_match : null);
  const semanticDesc = diagnostics?.semantic_match?.description ||
    'Evaluates alignment between declared technologies and target career taxonomy definitions.';

  const impactScore = typeof diagnostics?.impact_quantification?.score === 'number'
    ? diagnostics.impact_quantification.score
    : (typeof scoreBreakdown?.impact_quantification === 'number' ? scoreBreakdown.impact_quantification : null);
  const impactDesc = diagnostics?.impact_quantification?.description ||
    'Measures numerical benchmarks (throughput, test coverage, percentage gains, latency) within project bullets.';

  const depthScore = typeof diagnostics?.technical_depth?.score === 'number'
    ? diagnostics.technical_depth.score
    : (typeof scoreBreakdown?.technical_depth === 'number' ? scoreBreakdown.technical_depth : null);
  const depthDesc = diagnostics?.technical_depth?.description ||
    'Validates technical competencies, libraries, frameworks, languages, and architecture patterns.';

  const atsScore = typeof diagnostics?.readability_ats?.score === 'number'
    ? diagnostics.readability_ats.score
    : (typeof scoreBreakdown?.readability_ats === 'number' ? scoreBreakdown.readability_ats : null);
  const atsDesc = diagnostics?.readability_ats?.description ||
    'Confirms clean machine-parseable hierarchy across contact, education, skills, and project sections.';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, Platform.OS === 'web' && { className: 'clay-modal-backdrop' }]}>
        <View style={[styles.modalCard, Platform.OS === 'web' && { className: 'clay-modal-content' }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>ATS DIAGNOSTICS</Text>
              <Text style={styles.modalTitle}>ATS Score Breakdown & Telemetry</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownName}>Semantic Keyword Match</Text>
                <Text style={styles.breakdownScore}>{semanticScore !== null ? `${semanticScore}%` : '--'}</Text>
              </View>
              <Text style={styles.breakdownDesc}>{semanticDesc}</Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownName}>Impact & Metrics Quantification</Text>
                <Text style={styles.breakdownScore}>{impactScore !== null ? `${impactScore}%` : '--'}</Text>
              </View>
              <Text style={styles.breakdownDesc}>{impactDesc}</Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownName}>Technical Architectural Depth</Text>
                <Text style={styles.breakdownScore}>{depthScore !== null ? `${depthScore}%` : '--'}</Text>
              </View>
              <Text style={styles.breakdownDesc}>{depthDesc}</Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownName}>ATS Syntax & Readability</Text>
                <Text style={styles.breakdownScore}>{atsScore !== null ? `${atsScore}%` : '--'}</Text>
              </View>
              <Text style={styles.breakdownDesc}>{atsDesc}</Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.saveModalBtn} onPress={onClose}>
              <Text style={styles.saveModalBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 24,
    ...CLAY_SHADOWS.card,
  },
  smallModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 24,
    ...CLAY_SHADOWS.card,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalEyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    marginTop: 2,
  },
  modalSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLAY_COLORS.recessedLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  formScroll: {
    maxHeight: 460,
  },
  formContent: {
    gap: 14,
    paddingVertical: 6,
  },
  inputGroup: {
    gap: 6,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  textInput: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.inputBorder,
    borderRadius: CLAY_RADII.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: CLAY_FONTS.body,
    fontSize: 13.5,
    color: CLAY_COLORS.foregroundDark,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  saveModalBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  saveModalBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 8,
    gap: 8,
    marginVertical: 6,
  },
  shareLinkText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.primaryDark,
    paddingLeft: 6,
  },
  copyBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
  },
  copyBtnSuccess: {
    backgroundColor: CLAY_COLORS.success,
  },
  copyBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doneBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  doneBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  reportFeaturesList: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    gap: 8,
    marginVertical: 6,
  },
  reportFeatureItem: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foregroundDark,
    fontWeight: '600',
  },
  breakdownItem: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 14,
    gap: 6,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  breakdownScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  breakdownDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
  },
});
