import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { recruiterService } from '../services/recruiterService';

const COLORS = {
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  borderFocus: '#004D40',
  textDark: '#0F172A',
  textMuted: '#64748B',
  primaryTeal: '#004D40',
  primaryTealHover: '#00382E',
  mintBg: '#E6F4F1',
  mintBorder: '#B2DFDB',
  tealText: '#004D40',
  orangePillBg: '#FEF3C7',
  orangePillText: '#D97706',
  greenPillBg: '#DCFCE7',
  greenPillText: '#15803D',
  bluePillBg: '#E0F2FE',
  bluePillText: '#0369A1',
  redPillBg: '#FEE2E2',
  redPillText: '#DC2626',
  grayBg: '#F1F5F9',
};

const SUGGESTED_SKILLS = [
  'React',
  'React Native',
  'JavaScript',
  'TypeScript',
  'Node.js',
  'Python',
  'FastAPI',
  'PostgreSQL',
  'SQL',
  'Tailwind CSS',
  'HTML',
  'CSS',
  'Docker',
  'Git/GitHub',
  'Expo',
  'Machine Learning',
  'NLP',
  'AI/LLMs',
  'REST APIs',
];

export default function InternshipFormModal({
  visible,
  mode = 'create', // 'create' | 'edit'
  internship = null,
  token,
  onClose,
  onSuccess,
}) {
  const isEdit = mode === 'edit';

  // Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [description, setDescription] = useState('');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [location, setLocation] = useState('Pune, India');
  const [stipend, setStipend] = useState('₹15,000/mo');
  const [duration, setDuration] = useState('6 Months');
  const [openings, setOpenings] = useState('2');
  const [skillsList, setSkillsList] = useState(['React', 'Node.js', 'PostgreSQL']);
  const [skillInputText, setSkillInputText] = useState('');
  const [applicationThreshold, setApplicationThreshold] = useState(75);
  const [deadline, setDeadline] = useState('');
  const [statusVal, setStatusVal] = useState('Active');

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Populate or reset form whenever modal opens or internship changes
  useEffect(() => {
    if (!visible) {
      setErrorMsg('');
      setSuccessMsg('');
      return;
    }

    if (isEdit && internship?.id) {
      // Pre-fill from existing object, then fetch latest full record from DB
      populateFromData(internship);
      fetchFullDetail(internship.id);
    } else {
      // Reset to sensible defaults for new posting
      setTitle('');
      setDepartment('Engineering');
      setDescription(
        'Looking for a passionate engineering intern to collaborate on real-world systems, build resilient features, and deliver impactful software.'
      );
      setWorkMode('Hybrid');
      setLocation('Pune, India');
      setStipend('₹15,000/mo');
      setDuration('6 Months');
      setOpenings('2');
      setSkillsList(['React', 'JavaScript', 'TypeScript', 'Node.js', 'REST APIs', 'PostgreSQL', 'Git/GitHub']);
      setSkillInputText('');
      setApplicationThreshold(75);
      const defaultDl = new Date();
      defaultDl.setDate(defaultDl.getDate() + 60);
      setDeadline(defaultDl.toISOString().split('T')[0]);
      setStatusVal('Active');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [visible, isEdit, internship?.id]);

  const populateFromData = (data) => {
    if (!data) return;
    setTitle(data.title || '');
    setDepartment(data.department || 'Engineering');
    setDescription(data.description || '');
    setWorkMode(data.work_mode || 'Hybrid');
    setLocation(data.location || 'Pune, India');
    setStipend(data.stipend || '₹15,000/mo');
    setDuration(data.duration || '6 Months');
    setOpenings(String(data.openings || 1));

    let parsedSkills = [];
    if (Array.isArray(data.required_skills)) {
      parsedSkills = data.required_skills;
    } else if (typeof data.required_skills === 'string') {
      try {
        const parsed = JSON.parse(data.required_skills);
        parsedSkills = Array.isArray(parsed) ? parsed : [data.required_skills];
      } catch {
        parsedSkills = data.required_skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    setSkillsList(parsedSkills.length > 0 ? parsedSkills : ['React', 'JavaScript']);

    const thresh = data.application_threshold ?? data.minimum_match_threshold ?? 75;
    setApplicationThreshold(Number(thresh) || 75);

    if (data.deadline) {
      setDeadline(String(data.deadline).split('T')[0]);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 60);
      setDeadline(d.toISOString().split('T')[0]);
    }

    setStatusVal(data.status || 'Active');
  };

  const fetchFullDetail = async (id) => {
    if (!token || !id) return;
    setLoadingDetail(true);
    try {
      const res = await recruiterService.getInternshipDetail(token, id);
      if (res.internship) {
        populateFromData(res.internship);
      }
    } catch (err) {
      console.warn('Failed to fetch full detail for edit:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddSkillFromInput = () => {
    if (!skillInputText.trim()) return;
    const parts = skillInputText.split(',').map((s) => s.trim()).filter(Boolean);
    const updated = Array.from(new Set([...skillsList, ...parts]));
    setSkillsList(updated);
    setSkillInputText('');
  };

  const handleToggleSuggestedSkill = (skill) => {
    if (skillsList.includes(skill)) {
      setSkillsList(skillsList.filter((s) => s !== skill));
    } else {
      setSkillsList([...skillsList, skill]);
    }
  };

  const handleRemoveSkill = (skill) => {
    setSkillsList(skillsList.filter((s) => s !== skill));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Internship title is required.');
      return;
    }

    if (skillsList.length === 0 && !skillInputText.trim()) {
      setErrorMsg('At least one required skill is needed for candidate matching.');
      return;
    }

    const finalSkills = Array.from(
      new Set([
        ...skillsList,
        ...(skillInputText.trim()
          ? skillInputText.split(',').map((s) => s.trim()).filter(Boolean)
          : []),
      ])
    );

    const threshNum = parseInt(applicationThreshold, 10);
    if (isNaN(threshNum) || threshNum < 50 || threshNum > 100) {
      setErrorMsg('Application threshold must be a percentage between 50% and 100%.');
      return;
    }

    const openingsNum = parseInt(openings, 10);
    if (isNaN(openingsNum) || openingsNum < 1) {
      setErrorMsg('Number of openings must be at least 1.');
      return;
    }

    let deadlineIso = null;
    if (deadline.trim()) {
      try {
        const parsedDate = new Date(deadline.trim());
        if (!isNaN(parsedDate.getTime())) {
          deadlineIso = parsedDate.toISOString();
        }
      } catch {
        // use raw
      }
    }

    const payload = {
      title: title.trim(),
      department: department.trim(),
      description: description.trim(),
      required_skills: finalSkills,
      work_mode: workMode,
      location: location.trim(),
      stipend: stipend.trim(),
      duration: duration.trim(),
      openings: openingsNum,
      application_threshold: threshNum,
      minimum_match_threshold: threshNum,
      deadline: deadlineIso || (deadline.trim() ? deadline.trim() : null),
      status: statusVal,
    };

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let result;
      if (isEdit) {
        result = await recruiterService.updateInternship(token, internship.id, payload);
        setSuccessMsg('✓ Internship updated successfully and synced to PostgreSQL!');
      } else {
        result = await recruiterService.createInternship(token, payload);
        setSuccessMsg('✓ New internship published successfully and saved to PostgreSQL!');
      }

      setTimeout(() => {
        setSubmitting(false);
        if (onSuccess) {
          onSuccess(result?.internship || payload);
        }
        onClose();
      }, 1000);
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err.message || `Failed to ${isEdit ? 'update' : 'publish'} internship.`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>
                  {isEdit ? 'Edit Internship Posting' : 'Post New Internship'}
                </Text>
                {isEdit && internship?.id && (
                  <View style={styles.roleIdBadge}>
                    <Text style={styles.roleIdBadgeText}>ROLE ID: POST-{internship.id}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modalSubtitle}>
                {isEdit
                  ? 'Modify internship requirements, skills, threshold, and details. Changes update PostgreSQL and student matching in real-time.'
                  : 'Define role requirements, canonical skills, compensation, and minimum application gate.'}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Alert Banners */}
          {successMsg ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {loadingDetail && (
            <View style={styles.loadingBanner}>
              <ActivityIndicator size="small" color={COLORS.primaryTeal} />
              <Text style={styles.loadingBannerText}>Loading current database values...</Text>
            </View>
          )}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={true}>
            {/* SECTION 1: BASIC INFORMATION */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>1. Basic Information</Text>

              <Text style={styles.label}>Internship Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Stack Developer Intern"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Department / Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Engineering, AI/ML, Product"
                    placeholderTextColor="#94A3B8"
                    value={department}
                    onChangeText={setDepartment}
                  />
                </View>

                {isEdit && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Posting Status</Text>
                    <View style={styles.statusPickerRow}>
                      {['Active', 'Paused', 'Draft', 'Closed'].map((st) => (
                        <Pressable
                          key={st}
                          onPress={() => setStatusVal(st)}
                          style={[
                            styles.statusChoiceBtn,
                            statusVal === st && styles.statusChoiceBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChoiceText,
                              statusVal === st && styles.statusChoiceTextActive,
                            ]}
                          >
                            {st}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.label}>Role Description & Responsibilities</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Describe role responsibilities, deliverables, and learning outcomes..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* SECTION 2: WORK ARRANGEMENT & COMPENSATION */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>2. Work Arrangement & Compensation</Text>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Work Mode</Text>
                  <View style={styles.pillGroup}>
                    {['Hybrid', 'Remote', 'On-site'].map((modeItem) => (
                      <Pressable
                        key={modeItem}
                        onPress={() => setWorkMode(modeItem)}
                        style={[
                          styles.modePill,
                          workMode === modeItem && styles.modePillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modePillText,
                            workMode === modeItem && styles.modePillTextActive,
                          ]}
                        >
                          {modeItem}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1.2 }}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Pune, India"
                    placeholderTextColor="#94A3B8"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Monthly Stipend</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ₹15,000/mo"
                    placeholderTextColor="#94A3B8"
                    value={stipend}
                    onChangeText={setStipend}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 6 Months"
                    placeholderTextColor="#94A3B8"
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>

                <View style={{ flex: 0.8 }}>
                  <Text style={styles.label}>Openings</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2"
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                    value={openings}
                    onChangeText={setOpenings}
                  />
                </View>
              </View>
            </View>

            {/* SECTION 3: REQUIRED SKILLS */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>3. Required Skills & Canonical Match</Text>
              <Text style={styles.sectionSubDesc}>
                Student match percentage is computed in real-time against these canonical skills.
              </Text>

              <View style={styles.addSkillRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Type skills (comma-separated, e.g. React, PostgreSQL)"
                  placeholderTextColor="#94A3B8"
                  value={skillInputText}
                  onChangeText={setSkillInputText}
                  onSubmitEditing={handleAddSkillFromInput}
                />
                <Pressable
                  style={styles.addSkillBtn}
                  onPress={handleAddSkillFromInput}
                >
                  <Text style={styles.addSkillBtnText}>+ Add Skill</Text>
                </Pressable>
              </View>

              {/* Active Selected Skills Chips */}
              <Text style={[styles.label, { marginTop: 10 }]}>Current Required Skills ({skillsList.length})</Text>
              <View style={styles.skillsWrap}>
                {skillsList.map((skill, idx) => (
                  <View key={idx} style={styles.skillSelectedChip}>
                    <Text style={styles.skillSelectedText}>{skill}</Text>
                    <Pressable
                      onPress={() => handleRemoveSkill(skill)}
                      style={styles.removeSkillBtn}
                    >
                      <Text style={styles.removeSkillText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {/* Suggested Quick Add Chips */}
              <Text style={[styles.label, { marginTop: 12, color: COLORS.textMuted }]}>
                Quick Suggestions:
              </Text>
              <View style={styles.suggestionsWrap}>
                {SUGGESTED_SKILLS.map((skill) => {
                  const isAdded = skillsList.includes(skill);
                  return (
                    <Pressable
                      key={skill}
                      onPress={() => handleToggleSuggestedSkill(skill)}
                      style={[
                        styles.suggestedChip,
                        isAdded && styles.suggestedChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestedChipText,
                          isAdded && styles.suggestedChipTextActive,
                        ]}
                      >
                        {isAdded ? '✓ ' : '+ '}
                        {skill}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* SECTION 4: APPLICATION THRESHOLD & DEADLINE */}
            <View style={styles.sectionCard}>
              <View style={styles.thresholdHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>4. Application Match Threshold</Text>
                <View style={styles.thresholdCurrentBadge}>
                  <Text style={styles.thresholdCurrentBadgeText}>
                    {applicationThreshold}% Match Required
                  </Text>
                </View>
              </View>

              <Text style={styles.thresholdDesc}>
                Students must meet this minimum overall match percentage to apply directly. Candidates below this threshold can follow their personalized skill roadmap to qualify.
              </Text>

              <View style={styles.thresholdPillsRow}>
                {[60, 65, 70, 75, 80, 85, 90].map((pct) => (
                  <Pressable
                    key={pct}
                    onPress={() => setApplicationThreshold(pct)}
                    style={[
                      styles.thresholdPill,
                      applicationThreshold === pct && styles.thresholdPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdPillText,
                        applicationThreshold === pct && styles.thresholdPillTextActive,
                      ]}
                    >
                      {pct}%
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.formRow}>
                <View style={styles.customThresholdRow}>
                  <Text style={styles.customThresholdLabel}>Custom % (50-100):</Text>
                  <TextInput
                    style={styles.customThresholdInput}
                    keyboardType="numeric"
                    maxLength={3}
                    value={String(applicationThreshold)}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setApplicationThreshold(Math.min(100, Math.max(0, num)));
                      } else if (val === '') {
                        setApplicationThreshold('');
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(applicationThreshold, 10);
                      if (isNaN(num) || num < 50) setApplicationThreshold(50);
                      else if (num > 100) setApplicationThreshold(100);
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Application Deadline (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2026-12-02"
                    placeholderTextColor="#94A3B8"
                    value={deadline}
                    onChangeText={setDeadline}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Pressable
              onPress={onClose}
              style={styles.cancelBtn}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
              disabled={submitting}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Saving to PostgreSQL...</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? 'Save Changes' : 'Publish Opening'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modalCard: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FAFCFB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  roleIdBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  roleIdBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderBottomWidth: 1,
    borderBottomColor: '#86EFAC',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  loadingBannerText: {
    fontSize: 12,
    color: COLORS.primaryTeal,
    fontWeight: '600',
  },
  formScroll: {
    padding: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  sectionSubDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textDark,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modePillActive: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.primaryTeal,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modePillTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusChoiceBtnActive: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.primaryTeal,
  },
  statusChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statusChoiceTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  addSkillRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSkillBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addSkillBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  skillSelectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintBg,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  skillSelectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  removeSkillBtn: {
    padding: 2,
  },
  removeSkillText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  suggestedChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestedChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#38BDF8',
  },
  suggestedChipText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  suggestedChipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  thresholdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdCurrentBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  thresholdCurrentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  thresholdDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginVertical: 8,
  },
  thresholdPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  thresholdPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thresholdPillActive: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.primaryTeal,
  },
  thresholdPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  thresholdPillTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  customThresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flex: 1,
  },
  customThresholdLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  customThresholdInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    width: 65,
    height: 38,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
    color: COLORS.primaryTeal,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FAFCFB',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  saveBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
