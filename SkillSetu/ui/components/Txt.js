import React from 'react';
import { Text } from 'react-native';
import { colors, font, type } from '../theme';

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

// Typography primitive. `variant` picks a preset from theme.type, `weight` overrides the family.
export default function Txt({ variant = 'body', tone = 'default', color, weight, align, style, children, ...rest }) {
  return (
    <Text
      {...rest}
      style={[
        type[variant] || type.body,
        { color: color || TONE_COLORS[tone] || TONE_COLORS.default },
        weight ? font(weight) : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
