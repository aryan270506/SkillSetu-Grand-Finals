import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { colors, font, radii, shadows, space, toneOf, webOnly } from '../theme';
import Icon from './Icon';
import Txt from './Txt';
import { IconButton } from './primitives';
import { tx, useLanguage } from '../../i18n';
import { familyForScript } from '../../i18n/fonts';

// Input text uses the active script's font so typed Indic text renders correctly.
function useInputFont() {
  const { script } = useLanguage();
  return script === 'latin' ? null : { fontFamily: familyForScript('PlusJakartaSans_500Medium', script) };
}

const noOutline = webOnly({ outlineStyle: 'none' });

// ---------------------------------------------------------------------------
// SearchField — rounded grey search pill.
// ---------------------------------------------------------------------------
export function SearchField({ value, onChangeText, placeholder = 'Search', onSubmit, style }) {
  const inputFont = useInputFont();
  return (
    <View style={[styles.search, style]}>
      <Icon name="Search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={tx(placeholder)}
        placeholderTextColor={colors.textSubtle}
        style={[styles.searchInput, inputFont, noOutline]}
      />
      {value ? <IconButton icon="X" size={26} variant="ghost" onPress={() => onChangeText && onChangeText('')} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Field — labelled text input. Supports icon, secure toggle, multiline, error/hint.
// ---------------------------------------------------------------------------
export function Field({ label, icon, error, hint, secure, multiline, right, style, inputStyle, ...rest }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  const inputFont = useInputFont();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Txt variant="small" weight={600} tone="ink">{label}</Txt> : null}
      <View
        style={[
          styles.field,
          multiline ? { alignItems: 'flex-start', paddingVertical: 12, minHeight: 96 } : null,
          focused ? { borderColor: colors.ink, backgroundColor: colors.surface } : null,
          error ? { borderColor: colors.danger } : null,
        ]}
      >
        {icon ? <Icon name={icon} size={18} color={focused ? colors.ink : colors.textMuted} /> : null}
        <TextInput
          {...rest}
          placeholder={tx(rest.placeholder)}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e); }}
          style={[styles.fieldInput, inputFont, multiline ? { minHeight: 72, textAlignVertical: 'top' } : null, noOutline, inputStyle]}
        />
        {secure ? (
          <IconButton icon={hidden ? 'Eye' : 'EyeOff'} size={30} variant="ghost" onPress={() => setHidden((h) => !h)} accessibilityLabel="Toggle password visibility" />
        ) : null}
        {right}
      </View>
      {error ? <Txt variant="caption" tone="danger">{error}</Txt> : hint ? <Txt variant="caption" tone="subtle">{hint}</Txt> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SegmentedTabs — pill switcher. options: [{ id, label, icon?, badge? }]
// ---------------------------------------------------------------------------
export function SegmentedTabs({ options = [], value, onChange, dark, size = 'md', scrollable, fill, style }) {
  const content = options.map((opt) => {
    const active = opt.id === value;
    return (
      <Pressable
        key={opt.id}
        onPress={() => onChange && onChange(opt.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={({ hovered }) => [
          styles.segment,
          fill ? { flex: 1, justifyContent: 'center' } : null,
          size === 'sm' ? { paddingVertical: 7, paddingHorizontal: 12 } : null,
          webOnly({ cursor: 'pointer', transitionDuration: '160ms' }),
          active ? [{ backgroundColor: dark ? colors.surface : colors.ink }, shadows.soft] : hovered ? { backgroundColor: dark ? colors.frameSoft : colors.surfaceSunken } : null,
        ]}
      >
        {opt.icon ? <Icon name={opt.icon} size={15} color={active ? (dark ? colors.ink : '#fff') : dark ? colors.frameMuted : colors.textMuted} /> : null}
        <Txt variant="small" weight={600} color={active ? (dark ? colors.ink : '#fff') : dark ? colors.frameMuted : colors.textMuted}>
          {opt.label}
        </Txt>
        {opt.badge != null && opt.badge !== 0 ? (
          <View style={[styles.segBadge, { backgroundColor: active ? colors.mint : colors.surface }]}>
            <Txt variant="caption" weight={700} color={colors.ink}>{opt.badge}</Txt>
          </View>
        ) : null}
      </Pressable>
    );
  });
  const wrapStyle = [styles.segmented, { backgroundColor: dark ? colors.frame : colors.surfaceMuted }, style];
  if (scrollable) {
    return (
      <View style={wrapStyle}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
          {content}
        </ScrollView>
      </View>
    );
  }
  return <View style={[wrapStyle, { flexDirection: 'row', gap: 4 }]}>{content}</View>;
}

// ---------------------------------------------------------------------------
// Chip / ChipGroup — selectable chips (multi or single select).
// ---------------------------------------------------------------------------
export function Chip({ label, selected, onPress, icon, tone = 'success', onRemove }) {
  const t = toneOf(tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }) => [
        styles.chip,
        webOnly({ cursor: onPress ? 'pointer' : 'default' }),
        selected ? { backgroundColor: t.bg, borderColor: t.strong } : hovered ? { backgroundColor: colors.surfaceMuted } : null,
      ]}
    >
      {selected ? <Icon name="Check" size={13} color={t.ink} /> : icon ? <Icon name={icon} size={13} color={colors.textMuted} /> : null}
      <Txt variant="small" weight={600} color={selected ? t.ink : colors.text}>{label}</Txt>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={webOnly({ cursor: 'pointer' })}>
          <Icon name="X" size={13} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function ChipGroup({ options = [], value, onChange, multiple = true, tone, style }) {
  const selected = multiple ? value || [] : [value];
  const toggle = (id) => {
    if (!onChange) return;
    if (!multiple) return onChange(id);
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
  };
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id;
        const label = typeof o === 'string' ? o : o.label;
        return <Chip key={id} label={label} tone={tone} selected={selected.includes(id)} onPress={() => toggle(id)} />;
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sheet — centered dialog on wide screens, bottom sheet on phones.
// ---------------------------------------------------------------------------
export function Sheet({ visible, onClose, title, subtitle, icon, tone = 'accent', width = 640, footer, children, scroll = true }) {
  const { width: w, height: h } = useWindowDimensions();
  const phone = w < 640;
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={!!visible} transparent animationType={phone ? 'slide' : 'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.sheetBackdrop, phone ? { justifyContent: 'flex-end', padding: 0 } : null]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={tx('Close dialog')} />
        <View
          style={[
            styles.sheet,
            shadows.float,
            phone
              ? { width: '100%', maxHeight: h * 0.92, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
              : { width: Math.min(width, w - 48), maxHeight: h - 64 },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
              {icon ? (
                <View style={[styles.sheetIcon, { backgroundColor: toneOf(tone).bg }]}>
                  <Icon name={icon} size={20} color={toneOf(tone).ink} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                {title ? <Txt variant="h2" tone="ink">{title}</Txt> : null}
                {subtitle ? <Txt variant="small" tone="muted">{subtitle}</Txt> : null}
              </View>
            </View>
            <IconButton icon="X" onPress={onClose} accessibilityLabel="Close" />
          </View>
          <Body style={scroll ? { flexGrow: 0 } : { flexShrink: 1 }} contentContainerStyle={scroll ? { padding: space.xl, paddingTop: space.xs, gap: space.md } : undefined}>
            {scroll ? children : <View style={{ padding: space.xl, paddingTop: space.xs, gap: space.md, flexShrink: 1 }}>{children}</View>}
          </Body>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    height: 46,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    ...font(500),
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  fieldInput: {
    flex: 1,
    ...font(500),
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  segmented: {
    borderRadius: radii.pill,
    padding: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
  },
  segBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,11,12,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderRadius: radii.xxl,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    paddingBottom: space.md,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.xs,
    padding: space.lg,
    paddingHorizontal: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

// ---------------------------------------------------------------------------
// TagSearch — selected chips + search box + dropdown of options (taxonomy pickers).
// options: [{ id, name, sub? }]; selected: [{ id, name }]
// ---------------------------------------------------------------------------
export function TagSearch({ label, hint, icon = 'Search', placeholder, query, onQuery, options = [], selected = [], onAdd, onRemove, tone = 'success', error, open, onOpenChange }) {
  const [focused, setFocused] = useState(false);
  const isOpen = open !== undefined ? open : focused;
  const setOpen = (v) => (onOpenChange ? onOpenChange(v) : setFocused(v));
  const selectedIds = selected.map((s) => s.id);
  const visible = options.filter((o) => !selectedIds.includes(o.id)).slice(0, 40);
  return (
    <View style={{ gap: 8, zIndex: isOpen ? 20 : 1 }}>
      {label ? <Txt variant="small" weight={600} tone="ink">{label}</Txt> : null}
      {hint ? <Txt variant="caption" tone="muted">{hint}</Txt> : null}
      {selected.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {selected.map((s) => (
            <Chip key={s.id} label={s.name} selected tone={tone} onRemove={() => onRemove && onRemove(s.id)} />
          ))}
        </View>
      ) : null}
      <View>
        <Field
          icon={icon}
          value={query}
          placeholder={placeholder}
          error={error}
          onChangeText={(v) => { onQuery && onQuery(v); setOpen(true); }}
          onFocus={() => setOpen(true)}
          right={isOpen ? <IconButton icon="ChevronDown" size={28} variant="ghost" onPress={() => setOpen(false)} accessibilityLabel="Close list" /> : null}
        />
        {isOpen && visible.length ? (
          <View style={[styles.dropdown, shadows.raised]}>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
              {visible.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => { onAdd && onAdd(o); onQuery && onQuery(''); setOpen(false); }}
                  style={({ hovered }) => [styles.dropdownItem, webOnly({ cursor: 'pointer' }), hovered ? { backgroundColor: colors.surfaceMuted } : null]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="small" weight={600} tone="ink">{o.name}</Txt>
                    {o.sub ? <Txt variant="caption" tone="muted">{o.sub}</Txt> : null}
                  </View>
                  <Icon name="Plus" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Checkbox row
export function Checkbox({ checked, onChange, label }) {
  return (
    <Pressable onPress={() => onChange && onChange(!checked)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, webOnly({ cursor: 'pointer' })]} accessibilityRole="checkbox" accessibilityState={{ checked: !!checked }}>
      <View style={[styles.checkbox, checked ? { backgroundColor: colors.ink, borderColor: colors.ink } : null]}>
        {checked ? <Icon name="Check" size={14} color="#fff" strokeWidth={3} /> : null}
      </View>
      <Txt variant="small" weight={600} tone="ink" style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );
}
