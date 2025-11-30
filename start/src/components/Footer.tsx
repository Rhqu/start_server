import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Footer() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const dark = stored ? stored === 'dark' : true
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDark)
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 p-3 flex justify-center bg-background/80 backdrop-blur border-t border-border">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </footer>
  )
}
