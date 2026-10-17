import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, space, webOnly } from '../theme';
import { LANGUAGES } from '../../i18n/languages';
import { tx, useLanguage } from '../../i18n';
import Icon from './Icon';
import Txt from './Txt';
import { Sheet } from './inputs';

// Globe button for the dark top bar that opens the language picker.
export default function LanguageSwitcher({ compact }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(null);
  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const choose = async (code) => {
    if (code === language) return setOpen(false);
    setSwitching(code);
    try {
      await setLanguage(code);
    } finally {
      setSwitching(null);
      setOpen(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={tx('Change language')}
        style={({ hovered }) => [styles.trigger, webOnly({ cursor: 'pointer' }), hovered ? { backgroundColor: colors.frameSoft } : null]}
      >
        <Icon name="Globe" size={18} color={colors.frameText} />
        {!compact ? <Txt variant="small" weight={600} tone="inverse">{current.nativeName}</Txt> : null}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Language" subtitle="Choose the language for SkillSetu" icon="Globe" tone="info" width={460}>
        <View style={{ gap: 8 }}>
          {LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <Pressable
                key={l.code}
                onPress={() => choose(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={({ hovered }) => [styles.option, webOnly({ cursor: 'pointer' }), active ? styles.optionActive : hovered ? { backgroundColor: colors.surfaceMuted } : null]}
              >
                <View style={{ flex: 1 }}>
                  <LangName code={l.code} name={l.nativeName} />
                  <Txt variant="caption" tone="muted">{l.englishName}</Txt>
                </View>
                {switching === l.code ? <ActivityIndicator size="small" color={colors.ink} /> : active ? <Icon name="CircleCheck" size={20} color={colors.mintInk} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

// Native names render in their own script font regardless of the active language.
function LangName({ code, name }) {
  const family = {
    hi: 'NotoSansDevanagari_600SemiBold',
    mr: 'NotoSansDevanagari_600SemiBold',
    ta: 'NotoSansTamil_600SemiBold',
    te: 'NotoSansTelugu_600SemiBold',
    kn: 'NotoSansKannada_600SemiBold',
  }[code];
  return (
    <Txt variant="title" tone="ink" style={family ? { fontFamily: `${family}, PlusJakartaSans_600SemiBold, sans-serif` } : null}>
      {name}
    </Txt>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.frameSoft,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: colors.mintStrong,
    backgroundColor: colors.mint,
  },
});
