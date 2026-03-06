// Every color is now a CSS variable reference
// When data-theme changes on <html>, these all update automatically
// Zero React re-renders needed
export const C = {
  bgBase:     'var(--bg-base)',
  bgElevated: 'var(--bg-elevated)',
  bgHover:    'var(--bg-hover)',
  text1:      'var(--text1)',
  text2:      'var(--text2)',
  text3:      'var(--text3)',
  text4:      'var(--text4)',
  border:     'var(--border)',
  borderMd:   'var(--border-md)',
  blue:       'var(--blue)',
  green:      'var(--green)',
  red:        'var(--red)',
  gold:       'var(--gold)',
  shadowLg:   'var(--shadow-lg)',
}