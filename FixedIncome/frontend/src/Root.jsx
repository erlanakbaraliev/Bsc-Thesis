import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.jsx'
import { createAppTheme } from './theme/theme.js'

const THEME_STORAGE_KEY = 'fi-theme-mode'

export default function Root() {
  const [themeMode, setThemeMode] = useState(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY)
    return savedMode === 'dark' ? 'dark' : 'light'
  })

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  const toggleTheme = useCallback(() => {
    setThemeMode((currentMode) => {
      const nextMode = currentMode === 'light' ? 'dark' : 'light'
      localStorage.setItem(THEME_STORAGE_KEY, nextMode)
      return nextMode
    })
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App themeMode={themeMode} onToggleTheme={toggleTheme} />
    </ThemeProvider>
  )
}
