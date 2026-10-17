import React, { useEffect, useState } from 'react';
import { recruiterService } from '../services/recruiterService';
import { Button, Card, Chip, ChipGroup, Field, IconButton, Inset, ProgressBar, Row, Sheet, Skeleton, Stack, Txt } from '../../../ui/components';
import { colors, space } from '../../../ui/theme';

import { tl } from '../../../i18n/tl';

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
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [location, setLocation] = useState('');
  const [stipend, setStipend] = useState('');
  const [duration, setDuration] = useState('6 Months');
  const [openings, setOpenings] = useState('1');
  const [skillsList, setSkillsList] = useState([]);
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
      setDepartment('');
      setDescription('');
      setWorkMode('Hybrid');
      setLocation('');
      setStipend('');
      setDuration('6 Months');
      setOpenings('1');
      setSkillsList([]);
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
    setDepartment(data.department || '');
    setDescription(data.description || '');
    setWorkMode(data.work_mode || 'Hybrid');
    setLocation(data.location || '');
    setStipend(data.stipend || '');
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
    setSkillsList(parsedSkills);

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
        setSuccessMsg('Internship updated.');
      } else {
        result = await recruiterService.createInternship(token, payload);
        setSuccessMsg('Internship published.');
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
      setErrorMsg(err.message || (isEdit ? tl('Failed to update internship.') : tl('Failed to publish internship.')));
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit internship' : 'Post an internship'}
      subtitle={isEdit ? internship?.title : 'Only students who meet your match threshold can apply.'}
      icon={isEdit ? 'Pencil' : 'Plus'}
      tone="accent"
      width={760}
      footer={
        <>
          <Button label="Cancel" variant="secondary" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save changes' : statusVal === 'Draft' ? 'Save draft' : 'Publish'} icon={isEdit ? 'Check' : 'Send'} onPress={handleSubmit} loading={submitting} />
        </>
      }
    >
      {loadingDetail ? <Skeleton height={14} width="40%" /> : null}
      {errorMsg ? (
        <Inset tone="danger" padding={space.sm}>
          <Txt variant="small" weight={600} color="#B4232A">{errorMsg}</Txt>
        </Inset>
      ) : null}
      {successMsg ? (
        <Inset tone="success" padding={space.sm}>
          <Txt variant="small" weight={600} color={colors.mintInk}>{successMsg}</Txt>
        </Inset>
      ) : null}

      <Field label="Role title" icon="Briefcase" placeholder="e.g. Frontend Developer Intern" value={title} onChangeText={setTitle} />
      <Row gap={space.sm} align="flex-start" wrap>
        <Field style={{ flex: 1, minWidth: 220 }} label="Team / department" icon="Building" placeholder="e.g. Engineering" value={department} onChangeText={setDepartment} />
        <Field style={{ flex: 1, minWidth: 220 }} label="Location" icon="MapPin" placeholder="e.g. Pune, India" value={location} onChangeText={setLocation} />
      </Row>
      <Stack gap={6}>
        <Txt variant="small" weight={600} tone="ink">Work mode</Txt>
        <ChipGroup options={['Remote', 'Hybrid', 'On-site']} value={workMode} multiple={false} onChange={setWorkMode} />
      </Stack>
      <Row gap={space.sm} align="flex-start" wrap>
        <Field style={{ flex: 1, minWidth: 160 }} label="Stipend" icon="Wallet" placeholder="e.g. ₹15,000/mo" value={stipend} onChangeText={setStipend} />
        <Field style={{ flex: 1, minWidth: 140 }} label="Duration" icon="Clock" placeholder="e.g. 6 Months" value={duration} onChangeText={setDuration} />
        <Field style={{ width: 120 }} label="Openings" keyboardType="number-pad" value={openings} onChangeText={setOpenings} />
      </Row>
      <Field label="Description" multiline placeholder="What will the intern work on? What will they learn?" value={description} onChangeText={setDescription} />

      <Card padding={space.lg}>
        <Txt variant="title" tone="ink">Required skills</Txt>
        <Txt variant="caption" tone="muted">Students are matched against these using verified evidence.</Txt>
        {skillsList.length ? (
          <Row wrap gap={6} style={{ marginTop: space.sm }}>
            {skillsList.map((s) => <Chip key={s} label={s} selected tone="success" onRemove={() => handleRemoveSkill(s)} />)}
          </Row>
        ) : null}
        <Row gap={8} style={{ marginTop: space.sm }}>
          <Field style={{ flex: 1 }} icon="Plus" placeholder="Add skills, comma separated" value={skillInputText} onChangeText={setSkillInputText} onSubmitEditing={handleAddSkillFromInput} />
          <Button label="Add" variant="secondary" onPress={handleAddSkillFromInput} style={{ height: 50 }} />
        </Row>
        <Txt variant="overline" tone="subtle" style={{ marginTop: space.md, marginBottom: 6 }}>Suggestions</Txt>
        <Row wrap gap={6}>
          {SUGGESTED_SKILLS.filter((s) => !skillsList.includes(s)).map((s) => (
            <Chip key={s} label={s} icon="Plus" onPress={() => handleToggleSuggestedSkill(s)} />
          ))}
        </Row>
      </Card>

      <Card padding={space.lg} tone="accent">
        <Row justify="space-between">
          <Txt variant="title" tone="ink">Minimum match to apply</Txt>
          <Txt variant="h2" tone="ink">{applicationThreshold}%</Txt>
        </Row>
        <ProgressBar value={applicationThreshold} tone="dark" track="rgba(255,255,255,0.7)" style={{ marginVertical: space.sm }} />
        <Row gap={6} wrap>
          {[60, 70, 75, 80, 85, 90].map((v) => (
            <Chip key={v} label={`${v}%`} tone="accent" selected={Number(applicationThreshold) === v} onPress={() => setApplicationThreshold(v)} />
          ))}
          <IconButton icon="Minus" size={34} variant="light" onPress={() => setApplicationThreshold((t) => Math.max(50, Number(t) - 1))} />
          <IconButton icon="Plus" size={34} variant="light" onPress={() => setApplicationThreshold((t) => Math.min(100, Number(t) + 1))} />
        </Row>
      </Card>

      <Row gap={space.sm} align="flex-start" wrap>
        <Field style={{ flex: 1, minWidth: 200 }} label="Application deadline" icon="Calendar" placeholder="YYYY-MM-DD" value={deadline} onChangeText={setDeadline} />
        <Stack gap={6} style={{ flex: 1, minWidth: 220 }}>
          <Txt variant="small" weight={600} tone="ink">Status</Txt>
          <ChipGroup options={['Active', 'Draft', 'Paused']} value={statusVal} multiple={false} tone="info" onChange={setStatusVal} />
        </Stack>
      </Row>
    </Sheet>
  );
}
