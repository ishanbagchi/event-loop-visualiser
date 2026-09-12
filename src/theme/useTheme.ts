import { useCallback, useEffect, useState } from 'react'
import {
	DEFAULT_THEME,
	STORAGE_KEY,
	isThemeMode,
	resolveTheme,
	type ThemeMode,
} from './themes'

function readStoredMode(): ThemeMode {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY)
		return stored && isThemeMode(stored) ? stored : 'system'
	} catch {
		return 'system'
	}
}

export function useTheme() {
	const [mode, setModeState] = useState<ThemeMode>(readStoredMode)

	useEffect(() => {
		document.documentElement.dataset.theme = resolveTheme(mode)

		if (mode !== 'system') return

		const media = window.matchMedia('(prefers-color-scheme: light)')
		const onChange = () => {
			document.documentElement.dataset.theme = resolveTheme(mode)
		}
		media.addEventListener('change', onChange)
		return () => media.removeEventListener('change', onChange)
	}, [mode])

	const setMode = useCallback((next: ThemeMode) => {
		setModeState(next)
		try {
			window.localStorage.setItem(STORAGE_KEY, next)
		} catch {
			// Storage may be unavailable (private mode, quota) - the toggle
			// still works for the session, it just won't persist.
		}
	}, [])

	return {
		mode,
		setMode,
		resolved: resolveTheme(mode),
		defaultTheme: DEFAULT_THEME,
	}
}
