import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, EmptyState, Inset, Pill, ProgressBar, Ring, Row, SegmentedTabs, Sheet, Stack, Txt } from '../../../../ui/components';
import { colors, radii, space, webOnly } from '../../../../ui/theme';

const scoreTone = (n) => (n >= 75 ? 'success' : n >= 50 ? 'info' : 'warning');

// GitHub skill index: overall score plus the three components that build it.
export function SkillIndexModal({
  isOpen,
  onClose,
  overallGithubScore,
  getEvidenceLevelText,
  skillIndexDetails = {},
  githubState = {},
  activeEvidencePop,
  setActiveEvidencePop,
}) {
  const parts = [
    { id: 'core', label: 'Core skill strength', value: skillIndexDetails.coreSkillStrength || 0, hint: 'Weighted evidence across core languages and frameworks.' },
    { id: 'depth', label: 'Project depth', value: skillIndexDetails.projectDepth || 0, hint: 'Repeated, meaningful usage across your top skills.' },
    { id: 'breadth', label: 'Skill breadth', value: skillIndexDetails.skillBreadth || 0, hint: 'Versatility across distinct engineering domains.' },
  ];
  const active = activeEvidencePop || 'core';
  const listFor = {
    core: [...(skillIndexDetails.tier1Skills || []), ...(skillIndexDetails.tier2Skills || [])],
    depth: skillIndexDetails.topCoreSkills || [],
    breadth: [],
  };
  const domains = Object.entries(skillIndexDetails.domainBreakdown || {});
  return (
    <Sheet visible={!!isOpen} onClose={onClose} title="GitHub skill index" subtitle={`${githubState.reposAnalyzed || 0} repositories analysed`} icon="GitBranch" tone="accent">
      <Card padding={space.lg} tone="accent">
        <Row gap={space.lg}>
          <Ring value={overallGithubScore || 0} size={104} stroke={10} tone="dark" track="rgba(255,255,255,0.6)">
            <Txt variant="display" tone="ink">{overallGithubScore || 0}</Txt>
          </Ring>
          <Stack gap={4} style={{ flex: 1 }}>
            <Txt variant="h3" tone="ink">{getEvidenceLevelText ? getEvidenceLevelText(overallGithubScore || 0) : ''}</Txt>
            <Txt variant="small" color={colors.lilacInk}>{skillIndexDetails.activeDomainCount || 0} active domains · tier {skillIndexDetails.tier || '—'}</Txt>
          </Stack>
        </Row>
      </Card>
      <SegmentedTabs options={parts.map((p) => ({ id: p.id, label: `${p.label.split(' ')[0]} ${p.value}` }))} value={active} onChange={setActiveEvidencePop} size="sm" />
      {parts.filter((p) => p.id === active).map((p) => (
        <Card key={p.id} padding={space.lg}>
          <Row justify="space-between">
            <Txt variant="title" tone="ink">{p.label}</Txt>
            <Txt variant="title" tone="ink">{p.value}/100</Txt>
          </Row>
          <ProgressBar value={p.value} tone={scoreTone(p.value)} style={{ marginVertical: 8 }} />
          <Txt variant="small" tone="muted">{p.hint}</Txt>
          {p.id === 'breadth' ? (
            domains.length ? (
              <Stack gap={8} style={{ marginTop: space.md }}>
                {domains.map(([domain, skills]) => (
                  <Inset key={domain} tone="neutral" padding={space.sm}>
                    <Txt variant="small" weight={700} tone="ink">{domain}</Txt>
                    <Txt variant="caption" tone="muted">{(skills || []).join(', ')}</Txt>
                  </Inset>
                ))}
              </Stack>
            ) : null
          ) : (listFor[p.id] || []).length ? (
            <Row wrap gap={6} style={{ marginTop: space.md }}>
              {listFor[p.id].map((s, i) => <Pill key={`${s.name}-${i}`} label={`${s.name} · ${s.scoreVal ?? s.score ?? 0}`} tone={scoreTone(s.scoreVal ?? s.score ?? 0)} size="sm" />)}
            </Row>
          ) : (
            <Txt variant="small" tone="subtle" style={{ marginTop: space.sm }}>No evidence yet — connect GitHub and analyse repositories.</Txt>
          )}
        </Card>
      ))}
    </Sheet>
  );
}

// Full skill-gap analysis across target careers.
export function SkillGapAnalysisModal({ isOpen, onClose, activeTargetCareers = [], computedGapData = {}, gapAnalysisTab, setGapAnalysisTab }) {
  const gaps = computedGapData.skill_gaps || [];
  const map = computedGapData.career_skills_map || {};
  return (
    <Sheet visible={!!isOpen} onClose={onClose} title="Skill gap analysis" subtitle={activeTargetCareers.join(' · ') || 'Your target careers'} icon="Target" tone="warning" width={720}>
      <SegmentedTabs
        options={[{ id: 'combined', label: `All gaps ${gaps.length}` }, { id: 'breakdown', label: 'By career' }]}
        value={gapAnalysisTab}
        onChange={setGapAnalysisTab}
        size="sm"
      />
      {gapAnalysisTab === 'breakdown' ? (
        Object.keys(map).length ? (
          Object.entries(map).map(([career, skills]) => (
            <Card key={career} padding={space.lg}>
              <Txt variant="title" tone="ink">{career}</Txt>
              <Row wrap gap={6} style={{ marginTop: space.sm }}>
                {(Array.isArray(skills) ? skills : []).map((s, i) => {
                  const name = typeof s === 'string' ? s : s.skill_name || s.name;
                  return <Pill key={`${name}-${i}`} label={name} tone="warning" size="sm" />;
                })}
              </Row>
            </Card>
          ))
        ) : (
          <EmptyState icon="Target" title="No per-career breakdown yet" />
        )
      ) : gaps.length ? (
        <Stack gap={8}>
          {gaps.map((gap, i) => (
            <Card key={`${gap.skill_name}-${i}`} padding={space.md}>
              <Row justify="space-between" gap={8}>
                <Txt variant="small" weight={700} tone="ink" style={{ flex: 1 }}>{gap.skill_name}</Txt>
                {gap.priority ? <Pill label={gap.priority} tone="peach" size="sm" /> : null}
                <Txt variant="caption" tone="muted">{gap.current_level ?? 0}% / {gap.required_level ?? 0}%</Txt>
              </Row>
              <ProgressBar value={gap.current_level || 0} tone="warning" height={6} style={{ marginTop: 6 }} />
              {(gap.required_by_careers || []).length ? <Txt variant="caption" tone="subtle" style={{ marginTop: 4 }}>Needed for {gap.required_by_careers.join(', ')}</Txt> : null}
            </Card>
          ))}
        </Stack>
      ) : (
        <EmptyState icon="CircleCheck" tone="success" title="No gaps found" />
      )}
    </Sheet>
  );
}

// One skill: score, rating and the code signals behind it.
export function SingleSkillModal({ selectedSkillModal, onClose, getEvidenceLevelText }) {
  const s = selectedSkillModal || {};
  const score = s.score ?? s.percentage ?? 0;
  const signals = Array.isArray(s.signals) ? s.signals : [];
  return (
    <Sheet visible={!!selectedSkillModal} onClose={onClose} title={s.name} subtitle={s.repository_count ? `Found in ${s.repository_count} repositories` : 'Skill evidence'} icon="Zap" tone="success" width={560}>
      <Row gap={space.lg}>
        <Ring value={score} size={96} stroke={9} tone={scoreTone(score)}>
          <Txt variant="h2" tone="ink">{score}</Txt>
        </Ring>
        <Stack gap={4} style={{ flex: 1 }}>
          <Txt variant="h3" tone="ink">{s.rating || (getEvidenceLevelText ? getEvidenceLevelText(score) : '')}</Txt>
          <Txt variant="small" tone="muted">Evidence strength from your selected repositories and verified profile.</Txt>
        </Stack>
      </Row>
      {signals.length ? (
        <Stack gap={8}>
          {signals.map((g, i) => (
            <Inset key={i} tone="neutral" padding={space.sm}>
              <Txt variant="small" tone="ink">{g.evidence_description}</Txt>
              <Txt variant="caption" tone="muted">{[g.repository_name, g.file_path].filter(Boolean).join(' / ')}</Txt>
            </Inset>
          ))}
        </Stack>
      ) : null}
    </Sheet>
  );
}

// Every evidenced skill, tap one for detail.
export function AllSkillsModal({ isOpen, onClose, formattedSkills = [], setSelectedSkillModal }) {
  return (
    <Sheet visible={!!isOpen} onClose={onClose} title="All verified skills" subtitle={`${formattedSkills.length} skills`} icon="Zap" tone="success" width={720}>
      <View style={styles.grid}>
        {formattedSkills.map((s) => (
          <Pressable
            key={s.name}
            onPress={() => { onClose(); setSelectedSkillModal && setSelectedSkillModal(s); }}
            style={({ hovered }) => [styles.cell, hovered ? { backgroundColor: colors.surfaceSunken } : null, webOnly({ cursor: 'pointer' })]}
          >
            <Row justify="space-between">
              <Txt variant="small" weight={700} tone="ink" numberOfLines={1} style={{ flex: 1 }}>{s.name}</Txt>
              <Txt variant="small" weight={700} tone="ink">{s.score}</Txt>
            </Row>
            <ProgressBar value={s.score} tone={scoreTone(s.score)} height={5} style={{ marginTop: 6 }} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  cell: {
    flexGrow: 1,
    flexBasis: 200,
    padding: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
});
