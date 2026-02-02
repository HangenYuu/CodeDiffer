import { DiffEditor } from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'

const LANGUAGES = [
  { id: 'plaintext', label: 'Plain text' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'json', label: 'JSON' },
  { id: 'css', label: 'CSS' },
  { id: 'html', label: 'HTML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
  { id: 'java', label: 'Java' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'sql', label: 'SQL' },
  { id: 'yaml', label: 'YAML' }
]

const THEMES = [
  { id: 'vs-dark', label: 'Dark' },
  { id: 'light', label: 'Light' }
]

const SAMPLE_ORIGINAL = `export function formatUser(name) {
  return "Hello " + name + "!"
}

export function toSlug(input) {
  return input.trim().toLowerCase().replaceAll(" ", "-")
}
`

const SAMPLE_MODIFIED = `export function formatUser(name) {
  const clean = name.trim()
  return \`Hello \${clean}!\`
}

export function toSlug(input) {
  return input.trim().toLowerCase().replaceAll(/\\s+/g, "-")
}
`

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return undefined
  }
  return undefined
}

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => readStorage(key, initialValue))
  useEffect(() => writeStorage(key, value), [key, value])
  return [value, setValue]
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function App() {
  const [original, setOriginal] = useLocalStorageState('codeDiff.original', SAMPLE_ORIGINAL)
  const [modified, setModified] = useLocalStorageState('codeDiff.modified', SAMPLE_MODIFIED)
  const [language, setLanguage] = useLocalStorageState('codeDiff.language', 'javascript')
  const [theme, setTheme] = useLocalStorageState('codeDiff.theme', 'vs-dark')
  const [sideBySide, setSideBySide] = useLocalStorageState('codeDiff.sideBySide', true)
  const [ignoreTrimWhitespace, setIgnoreTrimWhitespace] = useLocalStorageState(
    'codeDiff.ignoreTrimWhitespace',
    true
  )
  const [fontSize, setFontSize] = useLocalStorageState('codeDiff.fontSize', 14)
  const [toast, setToast] = useState(null)

  const toastTimer = useRef(0)
  const disposablesRef = useRef([])
  const diffEditorRef = useRef(null)

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => d?.dispose?.())
      disposablesRef.current = []
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const options = useMemo(
    () => ({
      renderSideBySide: Boolean(sideBySide),
      originalEditable: true,
      ignoreTrimWhitespace: Boolean(ignoreTrimWhitespace),
      automaticLayout: true,
      fontSize: Number(fontSize) || 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
    }),
    [sideBySide, ignoreTrimWhitespace, fontSize]
  )

  function showToast(message) {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1200)
  }

  function handleMount(editor) {
    diffEditorRef.current = editor
    disposablesRef.current.forEach((d) => d?.dispose?.())
    disposablesRef.current = []

    const originalEditor = editor.getOriginalEditor()
    const modifiedEditor = editor.getModifiedEditor()

    const d1 = originalEditor.onDidChangeModelContent(() => {
      const v = originalEditor.getValue()
      setOriginal((prev) => (prev === v ? prev : v))
    })
    const d2 = modifiedEditor.onDidChangeModelContent(() => {
      const v = modifiedEditor.getValue()
      setModified((prev) => (prev === v ? prev : v))
    })

    disposablesRef.current.push(d1, d2)
  }

  async function handleCopy(which) {
    const text = which === 'original' ? original : modified
    const ok = await copyToClipboard(text)
    showToast(ok ? 'Copied' : 'Copy failed')
  }

  function handleSwap() {
    setOriginal(modified)
    setModified(original)
  }

  function handleReset() {
    setOriginal(SAMPLE_ORIGINAL)
    setModified(SAMPLE_MODIFIED)
    setLanguage('javascript')
    setTheme('vs-dark')
    setSideBySide(true)
    setIgnoreTrimWhitespace(true)
    setFontSize(14)
    showToast('Reset')
  }

  const frameClasses =
    theme === 'light'
      ? 'bg-white text-neutral-900 ring-black/10'
      : 'bg-neutral-950 text-neutral-100 ring-white/10'

  const chromeClasses =
    theme === 'light' ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900 border-neutral-800'

  const controlClasses =
    theme === 'light'
      ? 'bg-white border-neutral-200 text-neutral-900'
      : 'bg-neutral-900 border-neutral-700 text-neutral-100'

  const buttonClasses =
    theme === 'light'
      ? 'bg-neutral-900 text-white hover:bg-neutral-800'
      : 'bg-white text-neutral-900 hover:bg-neutral-200'

  const subtleButtonClasses =
    theme === 'light'
      ? 'bg-neutral-100 text-neutral-900 border-neutral-200 hover:bg-neutral-200'
      : 'bg-neutral-900 text-neutral-100 border-neutral-700 hover:bg-neutral-800'

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-neutral-900 via-neutral-950 to-black px-4 py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm text-neutral-300">Paste two snippets and compare</div>
            <div className="text-2xl font-semibold tracking-tight text-white">Code Diff</div>
          </div>
          <div className="hidden text-sm text-neutral-400 md:block">
            Monaco DiffEditor • Local-only • Saved to your browser
          </div>
        </div>

        <div className={`overflow-hidden rounded-2xl shadow-2xl ring-1 ${frameClasses}`}>
          <div
            className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${chromeClasses}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="ml-3 flex items-center gap-2 text-sm font-medium opacity-90">
                <span>diff</span>
                <span className="opacity-50">·</span>
                <span className="opacity-70">{language}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`h-9 rounded-lg border px-3 text-sm outline-none ${controlClasses}`}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>

              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className={`h-9 rounded-lg border px-3 text-sm outline-none ${controlClasses}`}
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <div className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm ${controlClasses}`}>
                <span className="opacity-80">Font</span>
                <input
                  type="number"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-14 bg-transparent text-right outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setSideBySide((v) => !v)}
                className={`h-9 rounded-lg border px-3 text-sm ${subtleButtonClasses}`}
              >
                {sideBySide ? 'Side by side' : 'Inline'}
              </button>

              <button
                type="button"
                onClick={() => setIgnoreTrimWhitespace((v) => !v)}
                className={`h-9 rounded-lg border px-3 text-sm ${subtleButtonClasses}`}
              >
                {ignoreTrimWhitespace ? 'Ignore trim' : 'Include trim'}
              </button>

              <button
                type="button"
                onClick={handleSwap}
                className={`h-9 rounded-lg px-3 text-sm ${buttonClasses}`}
              >
                Swap
              </button>

              <button
                type="button"
                onClick={() => handleCopy('original')}
                className={`h-9 rounded-lg border px-3 text-sm ${subtleButtonClasses}`}
              >
                Copy left
              </button>

              <button
                type="button"
                onClick={() => handleCopy('modified')}
                className={`h-9 rounded-lg border px-3 text-sm ${subtleButtonClasses}`}
              >
                Copy right
              </button>

              <button
                type="button"
                onClick={handleReset}
                className={`h-9 rounded-lg border px-3 text-sm ${subtleButtonClasses}`}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="h-[72vh] w-full">
            <DiffEditor
              height="100%"
              language={language}
              theme={theme}
              original={original}
              modified={modified}
              options={options}
              onMount={handleMount}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-neutral-400">
          <div className="opacity-90">Tip: paste on either side; edits update the diff instantly.</div>
          <div className="opacity-90">
            {toast ? <span className="text-neutral-200">{toast}</span> : <span>&nbsp;</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
