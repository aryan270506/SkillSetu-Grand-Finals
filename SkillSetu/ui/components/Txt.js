import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, font, type } from '../theme';
import { translateChildren, useLanguage } from '../../i18n';
import { familyForScript } from '../../i18n/fonts';

const TONE_COLORS = {
  default: colors.text,
  ink: colors.ink,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  inverse: colors.frameText,
  inverseMuted: colors.frameMuted,
  danger: colors.danger,
  success: colors.mintInk,
};

// Indic scripts need extra vertical room for matras and conjuncts.
const INDIC_LINE_HEIGHT = 1.18;

// Typography primitive. `variant` picks a preset from theme.type, `weight` overrides the family.
// String children are translated and rendered in the active script's font.
export default function Txt({ variant = 'body', tone = 'default', color, weight, align, style, children, ...rest }) {
  const { script } = useLanguage();
  const flat = StyleSheet.flatten([
    type[variant] || type.body,
    { color: color || TONE_COLORS[tone] || TONE_COLORS.default },
    weight ? font(weight) : null,
    align ? { textAlign: align } : null,
    style,
  ]);
  const scripted =
    script === 'latin'
      ? flat
      : {
          ...flat,
          fontFamily: familyForScript(flat.fontFamily, script),
          lineHeight: flat.lineHeight ? Math.round(flat.lineHeight * INDIC_LINE_HEIGHT) : undefined,
          letterSpacing: 0,
        };
  return (
    <Text {...rest} style={scripted}>
      {translateChildren(children)}
    </Text>
  );
}
