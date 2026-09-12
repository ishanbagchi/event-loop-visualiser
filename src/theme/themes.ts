/**
 * Registry of selectable palettes. Add a new [data-theme='id'] block in
 * src/index.css, then append an entry here - the toggle UI and system-theme
 * resolution both read from this list, so nothing else needs to change.
 */
export const THEMES = [
	{ id: 'dark', label: 'Runtime Gazette · Dark' },
	{ id: 'light', label: 'Runtime Gazette · Light' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ThemeMode = ThemeId | 'system'

export const DEFAULT_THEME: ThemeId = 'dark'
export const STORAGE_KEY = 'theme-mode'

export function isThemeId(value: string): value is ThemeId {
	return THEMES.some((theme) => theme.id === value)
}

export function isThemeMode(value: string): value is ThemeMode {
	return value === 'system' || isThemeId(value)
}

export function resolveTheme(mode: ThemeMode): ThemeId {
	if (mode !== 'system') return mode
	return typeof window !== 'undefined' &&
		window.matchMedia('(prefers-color-scheme: light)').matches
		? 'light'
		: DEFAULT_THEME
}
