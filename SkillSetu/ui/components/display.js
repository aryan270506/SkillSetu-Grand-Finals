import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, shadows, space, toneOf, webOnly } from '../theme';
import Icon from './Icon';
import Txt from './Txt';
import { Inset } from './primitives';

// ---------------------------------------------------------------------------
// SectionTitle — big bold heading with optional emoji and right-side accessory.
// ---------------------------------------------------------------------------
export function SectionTitle({ title, emoji, subtitle, right, size = 'h1', style }) {
  return (
    <View style={[styles.sectionTitle, style]}>
      <View style={{ flexShrink: 1, gap: 4 }}>
        <Txt variant={size} tone="ink">
          {title}
          {emoji ? <Txt variant={size}>{`  ${emoji}`}</Txt> : null}
        </Txt>
        {subtitle ? <Txt variant="body" tone="muted">{subtitle}</Txt> : null}
      </View>
      {right ? <View style={styles.sectionRight}>{right}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// StatTile / StatTrio — pastel number tiles (the last one can be dashed "upcoming").
// ---------------------------------------------------------------------------
export function StatTile({ value, label, tone = 'info', dashed, icon, onPress, style }) {
  const t = toneOf(tone);
  const content = (
    <>
      {icon ? (
        <View style={styles.statIcon}>
          <Icon name={icon} size={14} color={dashed ? colors.textMuted : t.ink} />
        </View>
      ) : null}
      <Txt variant="stat" tone="ink" align="center">{value ?? '—'}</Txt>
      <Txt variant="small" tone="muted" align="center" numberOfLines={1}>{label}</Txt>
    </>
  );
  const base = [
    styles.statTile,
    dashed
      ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }
      : { backgroundColor: t.bg },
    style,
  ];
  if (!onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ hovered }) => [...base, webOnly({ cursor: 'pointer' }), hovered ? { opacity: 0.85 } : null]}>
      {content}
    </Pressable>
  );
}

export function StatTrio({ items = [], style }) {
  return (
    <View style={[styles.statTrio, style]}>
      {items.map((it, i) => (
        <StatTile key={it.label || i} {...it} style={{ flex: 1 }} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// EventCard — pastel side-panel item: header (icon, type, date), inset body, optional footer action.
// ---------------------------------------------------------------------------
export function EventCard({ tone = 'info', icon = 'Calendar', type, date, title, body, footer, onPress, style }) {
  const t = toneOf(tone);
  const base = [styles.eventCard, { backgroundColor: t.bg }, style];
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={
        onPress
          ? ({ hovered }) => [...base, webOnly({ cursor: 'pointer' }), hovered ? webOnly({ transform: [{ translateY: -2 }] }) : null]
          : base
      }
    >
      <View style={styles.eventHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          <Icon name={icon} size={16} color={colors.ink} />
          <Txt variant="small" weight={600} tone="ink" numberOfLines={1}>{type}</Txt>
        </View>
        {date ? <Txt variant="small" weight={600} tone="ink">{date}</Txt> : null}
      </View>
      <Inset tone={tone}>
        {title ? <Txt variant="bodyStrong" tone="ink" numberOfLines={2}>{title}</Txt> : null}
        {body ? <Txt variant="small" tone="default" numberOfLines={4} style={{ marginTop: title ? 2 : 0 }}>{body}</Txt> : null}
      </Inset>
      {footer ? <View style={[styles.eventFooter, { backgroundColor: t.inner }]}>{footer}</View> : null}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Timeline — vertical roadmap with a dotted green connector and node dots.
// items: [{ key, content: ReactNode, done?: bool }]
// ---------------------------------------------------------------------------
export function Timeline({ items = [], gap = space.lg, style }) {
  return (
    <View style={[{ gap }, style]}>
      {items.map((it, idx) => {
        const last = idx === items.length - 1;
        return (
          <View key={it.key || idx} style={{ flexDirection: 'row' }}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, it.done ? { backgroundColor: colors.connector } : { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.connector }]} />
              {!last ? <View style={[styles.timelineLine, { bottom: -gap }]} /> : null}
            </View>
            <View style={{ flex: 1 }}>{it.content}</View>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// KeyValue — compact label/value row used in detail cards.
// ---------------------------------------------------------------------------
export function KeyValue({ label, value, icon }) {
  return (
    <View style={styles.kv}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={15} color={colors.textMuted} /> : null}
        <Txt variant="small" tone="muted">{label}</Txt>
      </View>
      <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value ?? '—'}
      </Txt>
    </View>
  );
}

// Metric row tile (icon disc + value + label) for dense stat grids.
export function MetricTile({ icon, label, value, hint, tone = 'neutral', style }) {
  const t = toneOf(tone);
  return (
    <View style={[styles.metric, shadows.soft, style]}>
      <View style={[styles.metricIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={18} color={tone === 'neutral' ? colors.text : t.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="caption" tone="muted" numberOfLines={1}>{label}</Txt>
        <Txt variant="h3" tone="ink" numberOfLines={1}>{value ?? '—'}</Txt>
        {hint ? <Txt variant="caption" tone="subtle" numberOfLines={1}>{hint}</Txt> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    flexWrap: 'wrap',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  statTrio: {
    flexDirection: 'row',
    gap: space.xs,
  },
  statTile: {
    borderRadius: radii.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
    gap: 2,
  },
  statIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  eventCard: {
    borderRadius: radii.xl,
    padding: space.sm,
    gap: space.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    paddingTop: space.xs,
    gap: space.xs,
  },
  eventFooter: {
    flexWrap: 'wrap',
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineRail: {
    width: 28,
    alignItems: 'center',
    paddingTop: 26,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 38,
    width: 0,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.connector,
  },
  kv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: 8,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.md,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Stepper — numbered steps; done steps show a check, labels hidden when compact.
// steps: [{ id, label }]
// ---------------------------------------------------------------------------
export function Stepper({ steps = [], active, doneUntil = 0, onStep, compact }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: compact ? 'nowrap' : 'wrap' }}>
      {steps.map((s, i) => {
        const isActive = s.id === active;
        const isDone = s.id <= doneUntil && !isActive;
        const pill = (
          <Pressable
            onPress={onStep ? () => onStep(s.id) : undefined}
            disabled={!onStep}
            style={[
              stepStyles.step,
              isActive ? { backgroundColor: colors.ink } : isDone ? { backgroundColor: colors.mint } : { backgroundColor: colors.surface },
              onStep ? webOnly({ cursor: 'pointer' }) : null,
              compact && !isActive ? { paddingHorizontal: 0, width: 34, justifyContent: 'center' } : null,
            ]}
          >
            <View style={[stepStyles.num, isActive ? { backgroundColor: 'rgba(255,255,255,0.18)' } : isDone ? { backgroundColor: colors.mintStrong } : { backgroundColor: colors.surfaceMuted }]}>
              {isDone ? <Icon name="Check" size={12} color="#fff" strokeWidth={3} /> : <Txt variant="caption" weight={700} color={isActive ? '#fff' : colors.textMuted}>{i + 1}</Txt>}
            </View>
            {!compact || isActive ? (
              <Txt variant="small" weight={600} color={isActive ? '#fff' : isDone ? colors.mintInk : colors.textMuted} numberOfLines={1}>{s.label}</Txt>
            ) : null}
          </Pressable>
        );
        return (
          <React.Fragment key={s.id}>
            {pill}
            {i < steps.length - 1 && !compact ? <View style={stepStyles.join} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 34,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: radii.pill,
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  join: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.connector,
  },
});
