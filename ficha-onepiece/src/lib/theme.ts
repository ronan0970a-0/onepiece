import type { CSSProperties } from 'react'
import type { SheetData } from '../types'
import { DEFAULT_ACCENT, onColor } from './sheet'

/** Tema da tela a partir da classe/facção (a classe "Outros" usa a cor e o modo escolhidos). */
export function appTheme(data: Pick<SheetData, 'klass' | 'theme'>): { mode: string; style?: CSSProperties } {
  // classe "Outros": no modo claro, o padrão branco vira quase preto
  const accent =
    data.klass === 'outros'
      ? data.theme.accent === DEFAULT_ACCENT && data.theme.mode === 'light'
        ? '#111111'
        : data.theme.accent
      : undefined
  const style = accent
    ? ({ '--accent': accent, '--accent-2': accent, '--on-accent': onColor(accent) } as CSSProperties)
    : undefined
  return { mode: data.klass === 'outros' ? data.theme.mode : 'auto', style }
}
