import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { breakpoints, colors, radii, shadows, space, toneOf, webOnly } from '../theme';
import Icon from './Icon';
import Txt from './Txt';
import { Avatar } from './primitives';

const BAR_HEIGHT = 76;
const NOTCH_W = 150;
const NOTCH_H = 18;
const DOCK_TONES = ['accent', 'info', 'pink', 'warning', 'success', 'peach'];

export const useLayout = () => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isPhone: width < breakpoints.phone,
    isCompact: width < breakpoints.tablet,
    isDesktop: width >= breakpoints.desktop,
  };
};

// ---------------------------------------------------------------------------
// Brand mark
// ---------------------------------------------------------------------------
export function BrandMark({ inverse = true, compact }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.brandDot, { backgroundColor: inverse ? colors.surface : colors.ink }]}>
        <Icon name="Sprout" size={18} color={inverse ? colors.ink : colors.surface} strokeWidth={2.4} />
      </View>
      {!compact ? (
        <Txt variant="h3" weight={800} color={inverse ? colors.frameText : colors.ink} style={{ letterSpacing: -0.6 }}>
          SkillSetu
        </Txt>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notch — the black tab that dips into the content sheet under the active nav item.
// ---------------------------------------------------------------------------
function Notch({ x }) {
  const s = 30; // shoulder width
  const d = `M0 0 C${s * 0.6} 0 ${s * 0.75} ${NOTCH_H} ${s + 8} ${NOTCH_H} L${NOTCH_W - s - 8} ${NOTCH_H} C${NOTCH_W - s * 0.75} ${NOTCH_H} ${NOTCH_W - s * 0.6} 0 ${NOTCH_W} 0 Z`;
  return (
    <Animated.View pointerEvents="none" style={[styles.notch, { transform: [{ translateX: x }] }]}>
      <Svg width={NOTCH_W} height={NOTCH_H}>
        <Path d={d} fill={colors.frame} />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// UserMenu — avatar button with dropdown.
// ---------------------------------------------------------------------------
function UserMenu({ user, items = [], compact }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ zIndex: 50 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        style={({ hovered }) => [styles.userBtn, webOnly({ cursor: 'pointer' }), hovered ? { backgroundColor: colors.frameSoft } : null]}
      >
        <Avatar name={user?.name} uri={user?.avatarUri} size={42} />
        {!compact ? (
          <View style={{ maxWidth: 180 }}>
            <Txt variant="bodyStrong" tone="inverse" numberOfLines={1}>{user?.name}</Txt>
            <Txt variant="caption" tone="inverseMuted" numberOfLines={1}>{user?.subtitle}</Txt>
          </View>
        ) : null}
        <Icon name="ChevronDown" size={18} color={colors.frameText} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? (
        <>
          <Pressable style={styles.menuScrim} onPress={() => setOpen(false)} />
          <View style={[styles.menu, shadows.float]}>
            <View style={styles.menuHead}>
              <Avatar name={user?.name} uri={user?.avatarUri} size={44} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong" tone="ink" numberOfLines={1}>{user?.name}</Txt>
                <Txt variant="caption" tone="muted" numberOfLines={1}>{user?.email || user?.subtitle}</Txt>
              </View>
            </View>
            {items.map((it) => (
              <Pressable
                key={it.label}
                onPress={() => { setOpen(false); it.onPress && it.onPress(); }}
                style={({ hovered }) => [styles.menuItem, webOnly({ cursor: 'pointer' }), hovered ? { backgroundColor: it.danger ? colors.dangerSoft : colors.surfaceMuted } : null]}
              >
                <Icon name={it.icon} size={17} color={it.danger ? colors.danger : colors.text} />
                <Txt variant="small" weight={600} color={it.danger ? colors.danger : colors.text}>{it.label}</Txt>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// NavItem (desktop top bar)
// ---------------------------------------------------------------------------
function NavItem({ item, active, onPress, onLayout }) {
  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={({ hovered }) => [
        styles.navItem,
        webOnly({ cursor: 'pointer', transitionDuration: '180ms' }),
        active ? styles.navItemActive : hovered ? { backgroundColor: colors.frameSoft } : null,
      ]}
    >
      <Icon name={item.locked ? 'Lock' : item.icon} size={19} color={active ? colors.frameText : colors.frameMuted} />
      {active ? <Txt variant="small" weight={600} tone="inverse">{item.label}</Txt> : null}
      {item.badge ? (
        <View style={styles.navBadge}>
          <Txt variant="caption" weight={700} color={colors.ink} style={{ fontSize: 10, lineHeight: 12 }}>{item.badge}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Dock — black bottom dock with pastel round quick actions.
// ---------------------------------------------------------------------------
export function Dock({ items = [] }) {
  if (!items.length) return null;
  return (
    <View style={styles.dockWrap} pointerEvents="box-none">
      <View style={[styles.dock, shadows.raised]}>
        {items.map((it, i) => {
          const t = it.dark ? toneOf('dark') : toneOf(it.tone || DOCK_TONES[i % DOCK_TONES.length]);
          return (
            <Pressable
              key={it.label}
              onPress={it.onPress}
              accessibilityLabel={it.label}
              style={({ hovered, pressed }) => [
                styles.dockBtn,
                { backgroundColor: it.dark ? '#3A3A3F' : t.bg },
                webOnly({ cursor: 'pointer', transitionDuration: '160ms' }),
                hovered ? webOnly({ transform: [{ translateY: -3 }] }) : null,
                pressed ? { transform: [{ scale: 0.92 }] } : null,
              ]}
            >
              <Icon name={it.icon} size={19} color={it.dark ? '#fff' : t.ink} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ToolRail — vertical floating group of round toggles (e.g. view modes).
// ---------------------------------------------------------------------------
export function ToolRail({ items = [], value, onChange, style }) {
  return (
    <View style={[styles.rail, shadows.soft, style]}>
      {items.map((it) => {
        const active = it.id === value;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange && onChange(it.id)}
            accessibilityLabel={it.label}
            style={({ hovered }) => [styles.railBtn, webOnly({ cursor: 'pointer' }), active ? { backgroundColor: colors.ink } : hovered ? { backgroundColor: colors.surfaceMuted } : null]}
          >
            <Icon name={it.icon} size={18} color={active ? '#fff' : colors.text} />
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// MobileTabBar — floating black pill with the primary nav on phones/tablets.
// ---------------------------------------------------------------------------
function MobileTabBar({ nav, activeId, onNavigate }) {
  return (
    <View style={styles.mobileBarWrap} pointerEvents="box-none">
      <View style={[styles.mobileBar, shadows.float]}>
        {nav.map((item) => {
          const active = item.id === activeId;
          return (
            <Pressable
              key={item.id}
              onPress={() => onNavigate(item.id)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              style={[styles.mobileTab, active ? { backgroundColor: colors.surface, flexGrow: 1.6 } : null]}
            >
              <Icon name={item.locked ? 'Lock' : item.icon} size={19} color={active ? colors.ink : colors.frameMuted} />
              {active ? <Txt variant="caption" weight={700} color={colors.ink} numberOfLines={1}>{item.shortLabel || item.label}</Txt> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AppFrame
// ---------------------------------------------------------------------------
export default function AppFrame({ nav = [], activeId, onNavigate, user, menuItems = [], actions, dock = [], banner, children }) {
  const { isCompact, isDesktop } = useLayout();
  const layouts = useRef({});
  const navOffset = useRef(0);
  const notchX = useRef(new Animated.Value(-NOTCH_W * 2)).current;
  const [, force] = useState(0);

  const moveNotch = (animated = true) => {
    const l = layouts.current[activeId];
    if (!l) return;
    const target = navOffset.current + l.x + l.width / 2 - NOTCH_W / 2;
    if (animated) Animated.spring(notchX, { toValue: target, useNativeDriver: false, friction: 9, tension: 80 }).start();
    else notchX.setValue(target);
  };

  useEffect(() => { moveNotch(true); }, [activeId]);

  return (
    <View style={styles.root}>
      <View style={styles.frame}>
        {/* Top bar */}
        <View style={[styles.bar, isCompact ? { paddingHorizontal: space.md } : null]}>
          <View style={styles.barLeft}>
            <BrandMark />
          </View>
          {!isCompact ? (
            <View
              style={styles.navRow}
              onLayout={(e) => { navOffset.current = e.nativeEvent.layout.x; moveNotch(false); }}
            >
              {nav.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onPress={() => onNavigate && onNavigate(item.id)}
                  onLayout={(e) => {
                    layouts.current[item.id] = e.nativeEvent.layout;
                    if (item.id === activeId) { moveNotch(false); force((n) => n + 1); }
                  }}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.barRight}>
            {actions}
            <UserMenu user={user} items={menuItems} compact={isCompact} />
          </View>
        </View>

        {/* Content sheet */}
        <View style={styles.sheet}>
          {banner}
          <View style={{ flex: 1 }}>{children}</View>
          {!isCompact ? <Dock items={dock} /> : null}
        </View>

        {!isCompact ? <Notch x={notchX} /> : null}
        {isCompact ? <MobileTabBar nav={nav} activeId={activeId} onNavigate={onNavigate} /> : null}
        {isCompact && dock[0] ? (
          <Pressable onPress={dock[0].onPress} accessibilityLabel={dock[0].label} style={[styles.fab, shadows.float]}>
            <Icon name={dock[0].icon} size={22} color={toneOf(dock[0].tone || 'accent').ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page — scrollable content area with optional right "aside" panel (My Events).
// ---------------------------------------------------------------------------
export function Page({ children, aside, asideWidth = 340, padBottom = 120, contentStyle, refreshControl, scrollKey }) {
  const { isCompact, width } = useLayout();
  const scrollRef = useRef(null);
  // Jump back to the top when the logical page changes (e.g. wizard step).
  useEffect(() => {
    if (scrollKey !== undefined && scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);
  const stackAside = isCompact || width < 1120;
  const pad = isCompact ? space.md : space.xxl;
  if (!aside || stackAside) {
    return (
      <ScrollView ref={scrollRef} style={{ flex: 1 }} refreshControl={refreshControl} contentContainerStyle={[{ padding: pad, paddingBottom: padBottom, gap: space.xl }, contentStyle]}>
        {children}
        {aside ? <View style={{ gap: space.md }}>{aside}</View> : null}
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} refreshControl={refreshControl} contentContainerStyle={[{ padding: pad, paddingBottom: padBottom, gap: space.xl }, contentStyle]}>
        {children}
      </ScrollView>
      <View style={[styles.aside, { width: asideWidth }]}>
        <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: padBottom, gap: space.md }}>{aside}</ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.frame,
    ...webOnly({ height: '100vh' }),
  },
  frame: {
    flex: 1,
    backgroundColor: colors.frame,
    overflow: 'hidden',
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
    zIndex: 40,
  },
  barLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  barRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.xs,
  },
  brandDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  navItemActive: {
    paddingHorizontal: 16,
  },
  navBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 5,
    paddingRight: 10,
    borderRadius: radii.pill,
  },
  menuScrim: {
    ...webOnly({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }),
  },
  menu: {
    position: 'absolute',
    top: 58,
    right: 0,
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 8,
    zIndex: 60,
  },
  menuHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  notch: {
    position: 'absolute',
    top: BAR_HEIGHT - 1,
    left: 0,
    zIndex: 30,
  },
  aside: {
    backgroundColor: colors.panel,
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.frame,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  dockBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  railBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  mobileBar: {
    flexDirection: 'row',
    backgroundColor: colors.frame,
    borderRadius: radii.pill,
    padding: 6,
    gap: 4,
    width: '100%',
    maxWidth: 520,
  },
  mobileTab: {
    flex: 1,
    height: 46,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  fab: {
    position: 'absolute',
    right: space.md,
    bottom: 86,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
