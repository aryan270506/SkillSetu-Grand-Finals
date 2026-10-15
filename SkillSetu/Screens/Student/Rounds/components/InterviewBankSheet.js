import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchRoleQuestionBank } from '../../services/applicationService';
import { Button, Card, Chip, ChipGroup, EmptyState, Pill, Row, SearchField, SegmentedTabs, Sheet, Skeleton, Stack, Txt } from '../../../../ui/components';
import { space } from '../../../../ui/theme';

function sanitizeRoleTitle(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') return 'Backend Developer';
  const clean = rawRole.trim();
  if (clean.length <= 30 && !clean.endsWith('.') && !clean.toLowerCase().startsWith('to ')) return clean;
  const lower = clean.toLowerCase();
  if (lower.includes('back') || lower.includes('scalable') || lower.includes('api') || lower.includes('database')) return 'Backend Developer';
  if (lower.includes('front') || lower.includes('ui') || lower.includes('web')) return 'Frontend Developer';
  if (lower.includes('full') || lower.includes('stack')) return 'Full Stack Developer';
  if (lower.includes('data') || lower.includes('ai') || lower.includes('ml') || lower.includes('learning')) return 'Data Analyst / ML Engineer';
  if (lower.includes('cloud') || lower.includes('devops') || lower.includes('infrastructure')) return 'DevOps / Cloud Engineer';
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios') || lower.includes('react native')) return 'Mobile App Developer';
  return 'Backend Developer';
}

// Role-specific interview question bank with filters; each question can be practised with AI feedback.
export default function InterviewBankSheet({
  visible,
  onClose,
  initialRole,
  studentEmail,
  availableRoles = [],
  onPracticeSingleQuestion,
  onStartFullMock,
}) {

  const defaultCleanRole = useMemo(() => sanitizeRoleTitle(initialRole), [initialRole]);

  // Clean, unique available roles list
  const cleanRolesList = useMemo(() => {
    const rolesSet = new Set();
    rolesSet.add(defaultCleanRole);
    (availableRoles || []).forEach((r) => {
      const title = typeof r === 'object' ? r.title || r.name : r;
      if (title) rolesSet.add(sanitizeRoleTitle(title));
    });
    [
      'Backend Developer',
      'Frontend Developer',
      'Full Stack Developer',
      'Data Analyst / ML Engineer',
      'DevOps / Cloud Engineer',
      'Mobile App Developer',
    ].forEach((r) => rolesSet.add(r));
    return Array.from(rolesSet);
  }, [defaultCleanRole, availableRoles]);

  // Selected Role State
  const [selectedRole, setSelectedRole] = useState(defaultCleanRole);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [practiceMode, setPracticeMode] = useState('practice'); // 'practice' | 'review'

  // Question Bank State
  const [questionData, setQuestionData] = useState(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [visibleCount, setVisibleCount] = useState(20);

  // Load questions for the selected role and mode
  const loadQuestions = useCallback(async (roleToLoad, modeToLoad = 'practice') => {
    setIsLoadingQuestions(true);
    try {
      const data = await fetchRoleQuestionBank(studentEmail, roleToLoad, modeToLoad);
      if (data) {
        setQuestionData(data);
      }
    } catch (err) {
      console.error('[AIInterviewPracticeModal] Error loading question bank:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    if (visible) {
      const clean = sanitizeRoleTitle(initialRole);
      setSelectedRole(clean);
      setPracticeMode('practice');
      loadQuestions(clean, 'practice');
      setVisibleCount(20);
      setIsRoleDropdownOpen(false);
    }
  }, [visible, initialRole, loadQuestions]);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setIsRoleDropdownOpen(false);
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSelectedPriority('All');
    setSearchQuery('');
    setVisibleCount(20);
    loadQuestions(newRole, practiceMode);
  };

  const handleModeChange = (newMode) => {
    setPracticeMode(newMode);
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSelectedPriority('All');
    setSearchQuery('');
    setVisibleCount(20);
    loadQuestions(selectedRole, newMode);
  };

  const rawQuestions = useMemo(() => {
    return questionData?.questions || [];
  }, [questionData]);

  // Dynamic category tabs with real counts
  const categoriesList = useMemo(() => {
    const cats = ['All'];
    const counts = questionData?.category_counts || {};
    Object.keys(counts).forEach((c) => {
      if (!cats.includes(c)) cats.push(c);
    });
    return { cats, counts };
  }, [questionData]);

  // Filter & Search computation
  const filteredQuestions = useMemo(() => {
    let result = rawQuestions;

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((q) => q.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'All') {
      result = result.filter((q) => (q.difficulty || '').toLowerCase() === selectedDifficulty.toLowerCase());
    }

    // Priority filter
    if (selectedPriority !== 'All') {
      result = result.filter((q) => (q.priority || '').includes(selectedPriority));
    }

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      result = result.filter(
        (q) =>
          (q.question && q.question.toLowerCase().includes(qLower)) ||
          (q.skill && q.skill.toLowerCase().includes(qLower)) ||
          (q.category && q.category.toLowerCase().includes(qLower)) ||
          (q.explanation && q.explanation.toLowerCase().includes(qLower))
      );
    }

    return result;
  }, [rawQuestions, selectedCategory, selectedDifficulty, selectedPriority, searchQuery]);

  // Paginated visible list
  const visibleQuestions = useMemo(() => {
    return filteredQuestions.slice(0, visibleCount);
  }, [filteredQuestions, visibleCount]);


  const diffs = ['All', 'Easy', 'Medium', 'Hard'];
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Interview question bank"
      subtitle={`${questionData?.total_questions || 0} questions for ${selectedRole}`}
      icon="MessageCircle"
      tone="accent"
      width={860}
      footer={
        <>
          <Button label="Close" variant="secondary" onPress={onClose} />
          <Button label="Start full AI mock" icon="Play" onPress={() => onStartFullMock && onStartFullMock(selectedRole)} />
        </>
      }
    >
      <ChipGroup options={cleanRolesList} value={selectedRole} multiple={false} tone="accent" onChange={handleRoleChange} />
      <Row gap={8} wrap>
        <SegmentedTabs options={[{ id: 'practice', label: 'To practise' }, { id: 'review', label: 'Answered' }]} value={practiceMode} onChange={handleModeChange} size="sm" />
        <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search questions" style={{ flex: 1, minWidth: 200 }} />
      </Row>
      <Row wrap gap={6}>
        {categoriesList.cats.map((c) => (
          <Chip key={c} label={c === 'All' ? 'All' : `${c} · ${categoriesList.counts[c] || 0}`} tone="info" selected={selectedCategory === c} onPress={() => setSelectedCategory(c)} />
        ))}
      </Row>
      <Row wrap gap={6}>
        {diffs.map((d) => <Chip key={d} label={d} tone="warning" selected={selectedDifficulty === d} onPress={() => setSelectedDifficulty(d)} />)}
      </Row>
      {isLoadingQuestions ? (
        <Stack gap={8}>{[0, 1, 2].map((i) => <Skeleton key={i} height={84} />)}</Stack>
      ) : visibleQuestions.length ? (
        <Stack gap={8}>
          {visibleQuestions.map((q) => (
            <Card key={q.id} padding={space.md}>
              <Row gap={6} wrap>
                {q.category ? <Pill label={q.category} tone="info" size="sm" /> : null}
                {q.difficulty ? <Pill label={q.difficulty} tone="warning" size="sm" /> : null}
                {q.skill ? <Pill label={q.skill} size="sm" /> : null}
                {q.is_submitted ? <Pill label={`Answered${q.last_score != null ? ` · ${q.last_score}%` : ''}`} tone="success" icon="Check" size="sm" /> : null}
              </Row>
              <Txt variant="bodyStrong" tone="ink" style={{ marginTop: 8 }}>{q.question}</Txt>
              {q.is_submitted && q.last_verdict ? <Txt variant="caption" tone="muted" style={{ marginTop: 4 }}>Last verdict: {q.last_verdict}</Txt> : null}
              <Row justify="flex-end" style={{ marginTop: 8 }}>
                <Button label={q.is_submitted ? 'Practise again' : 'Practise'} size="sm" icon="Mic" onPress={() => onPracticeSingleQuestion && onPracticeSingleQuestion(q)} />
              </Row>
            </Card>
          ))}
          {filteredQuestions.length > visibleCount ? (
            <Button label={`Show more (${filteredQuestions.length - visibleCount} left)`} variant="secondary" onPress={() => setVisibleCount((c) => c + 20)} style={{ alignSelf: 'center' }} />
          ) : null}
        </Stack>
      ) : (
        <EmptyState icon="MessageCircle" title="No questions match" message="Try another category, difficulty or search term." />
      )}
    </Sheet>
  );
}
