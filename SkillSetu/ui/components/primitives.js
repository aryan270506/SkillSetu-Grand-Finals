import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { colors, radii, shadows, space, toneOf, webOnly } from '../theme';
import Icon from './Icon';
import Txt from './Txt';

const webPointer = webOnly({ cursor: 'pointer', transitionDuration: '160ms', transitionProperty: 'transform, background-color, box-shadow, opacity' });

// ---------------------------------------------------------------------------
// Card — white rounded surface; `tone` swaps to a pastel fill; `badge` floats an
// icon circle on the top-right corner (as in the reference).
// ---------------------------------------------------------------------------
export function Card({ tone, padding = space.xl, radius = radii.xl, elevated = true, badge, onPress, style, children }) {
  const t = tone ? toneOf(tone) : null;
  const body = (
    <>
      {children}
      {badge ? (
        <View style={[styles.cornerBadge, { backgroundColor: toneOf(badge.tone || 'success').bg }]}>
          <Icon name={badge.icon} size={18} color={toneOf(badge.tone || 'success').ink} />
        </View>
      ) : null}
    </>
  );
  const base = [
    styles.card,
    { padding, borderRadius: radius, backgroundColor: t ? t.bg : colors.surface },
    elevated && !t ? shadows.soft : null,
    style,
  ];
  if (!onPress) return <View style={base}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        ...base,
        webPointer,
        hovered ? [shadows.raised, webOnly({ transform: [{ translateY: -2 }] })] : null,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      {body}
    </Pressable>
  );
}

// Inner pastel panel used inside tone cards (EventCard body etc.).
export function Inset({ tone = 'neutral', padding = space.md, style, children }) {
  return <View style={[{ backgroundColor: toneOf(tone).inner, borderRadius: radii.md, padding }, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// FeatureCard — the lilac "hero" card, slightly tilted on wide screens.
// ---------------------------------------------------------------------------
export function FeatureCard({ tone = 'accent', tilt = false, onPress, style, children }) {
  const t = toneOf(tone);
  return (
    <Card
      tone={tone}
      onPress={onPress}
      style={[
        { backgroundColor: t.bg },
        shadows.raised,
        tilt ? { transform: [{ rotate: '-2deg' }], marginVertical: 12 } : null,
        style,
      ]}
    >
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pill — status chip. tone: success | info | accent | warning | pink | neutral | danger | dark
// ---------------------------------------------------------------------------
export function Pill({ label, tone = 'neutral', icon, iconRight, size = 'md', style }) {
  const t = toneOf(tone);
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: t.bg, paddingHorizontal: small ? 10 : 14, paddingVertical: small ? 4 : 7 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 12 : 14} color={t.ink} /> : null}
      <Txt variant={small ? 'caption' : 'small'} weight={600} color={tone === 'neutral' ? colors.text : t.ink}>
        {label}
      </Txt>
      {iconRight ? <Icon name={iconRight} size={small ? 12 : 14} color={t.ink} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// IconButton — round button. variant: soft | dark | ghost | light | tone
// ---------------------------------------------------------------------------
export function IconButton({ icon, onPress, variant = 'soft', tone, size = 36, iconSize, disabled, accessibilityLabel, style }) {
  const t = tone ? toneOf(tone) : null;
  const palette = {
    soft: { bg: colors.surfaceMuted, fg: colors.text, hover: colors.surfaceSunken },
    dark: { bg: colors.ink, fg: '#fff', hover: '#2A2A2E' },
    ghost: { bg: 'transparent', fg: colors.text, hover: colors.surfaceMuted },
    light: { bg: colors.surface, fg: colors.text, hover: colors.surfaceMuted },
    frame: { bg: 'transparent', fg: colors.frameText, hover: colors.frameSoft },
  }[variant] || {};
  const bg = t ? t.bg : palette.bg;
  const fg = t ? t.ink : palette.fg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
      style={({ hovered, pressed }) => [
        styles.iconBtn,
        webPointer,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: hovered && !t ? palette.hover : bg },
        variant === 'light' ? shadows.soft : null,
        pressed ? { transform: [{ scale: 0.92 }] } : null,
        disabled ? { opacity: 0.4 } : null,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize || Math.round(size * 0.45)} color={fg} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Button — pill button. variant: primary (black) | secondary (grey) | outline | tone | ghost | danger
// ---------------------------------------------------------------------------
export function Button({ label, onPress, variant = 'primary', tone, icon, iconRight, size = 'md', loading, disabled, block, style }) {
  const t = tone ? toneOf(tone) : null;
  const v = {
    primary: { bg: colors.ink, fg: '#fff', hover: '#2A2A2E', border: 'transparent' },
    secondary: { bg: colors.surfaceMuted, fg: colors.text, hover: colors.surfaceSunken, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.text, hover: colors.surfaceMuted, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.text, hover: colors.surfaceMuted, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: '#B4232A', hover: '#FBD0D0', border: 'transparent' },
    light: { bg: colors.surface, fg: colors.text, hover: colors.surfaceMuted, border: 'transparent' },
  }[variant] || {};
  const bg = t ? t.bg : v.bg;
  const fg = t ? t.ink : v.fg;
  const heights = { sm: 34, md: 44, lg: 52 };
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ hovered, pressed }) => [
        styles.button,
        webPointer,
        {
          height: heights[size] || 44,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          backgroundColor: hovered && !t && !isDisabled ? v.hover : bg,
          borderColor: v.border || 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        block ? { alignSelf: 'stretch' } : null,
        pressed ? { transform: [{ scale: 0.98 }] } : null,
        isDisabled ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
      {label ? (
        <Txt variant={size === 'sm' ? 'small' : 'bodyStrong'} color={fg}>
          {label}
        </Txt>
      ) : null}
      {iconRight && !loading ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Avatar / AvatarStack — image or initials on a pastel disc.
// ---------------------------------------------------------------------------
const AVATAR_TONES = ['accent', 'info', 'success', 'warning', 'pink', 'peach'];
const toneForName = (name = '') => AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];

export function Avatar({ name = '', uri, size = 40, tone, ring, style }) {
  const t = toneOf(tone || toneForName(name));
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        ring ? { borderWidth: 3, borderColor: ring } : null,
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Txt weight={700} color={t.ink} style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>
          {initials}
        </Txt>
      )}
    </View>
  );
}

export function AvatarStack({ names = [], size = 34, max = 3, ring = colors.surface }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} ring={ring} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }} />
      ))}
      {extra > 0 ? (
        <View style={[styles.stackExtra, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3, borderColor: ring }]}>
          <Txt variant="caption" weight={700} tone="inverse">+{extra}</Txt>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------
export function ProgressBar({ value = 0, tone = 'success', height = 8, track = colors.surfaceMuted, style }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height, backgroundColor: tone === 'dark' ? colors.ink : toneOf(tone).strong }} />
    </View>
  );
}

// Circular progress ring.
export function Ring({ value = 0, size = 64, stroke = 7, tone = 'success', track = colors.surfaceMuted, children }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = tone === 'dark' ? colors.ink : toneOf(tone).strong;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </Svg>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — pulsing placeholder block.
// ---------------------------------------------------------------------------
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceSunken, opacity }, style]} />;
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({ icon = 'Inbox', title, message, action, tone = 'neutral', style }) {
  const t = toneOf(tone);
  return (
    <View style={[styles.empty, style]}>
      <View style={[styles.emptyIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={24} color={tone === 'neutral' ? colors.textMuted : t.ink} />
      </View>
      {title ? <Txt variant="title" align="center">{title}</Txt> : null}
      {message ? <Txt variant="small" tone="muted" align="center" style={{ maxWidth: 360 }}>{message}</Txt> : null}
      {action ? <View style={{ marginTop: space.xs }}>{action}</View> : null}
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

// Row helper with gap.
export function Row({ gap = space.sm, align = 'center', justify, wrap, style, children }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align, gap }, justify ? { justifyContent: justify } : null, wrap ? { flexWrap: 'wrap' } : null, style]}>
      {children}
    </View>
  );
}

export function Stack({ gap = space.sm, style, children }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
  cornerBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.canvas,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.pill,
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  stackExtra: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
});
