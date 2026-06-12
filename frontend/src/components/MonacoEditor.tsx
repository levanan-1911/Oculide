'use client'

import Editor from '@monaco-editor/react'
import { useRef } from 'react'

interface MonacoEditorProps {
  language?: string
  value?: string
  onChange?: (value: string | undefined) => void
  height?: string
  readOnly?: boolean
  theme?: 'light' | 'dark'
}

export default function MonacoEditor({
  language = 'python',
  value = '',
  onChange,
  height = '500px',
  readOnly = false,
  theme = 'light',
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      readOnly,
    })

    // Disable copy-paste if in exam mode (can be controlled via props)
    if (readOnly) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        // Prevent copy
      })
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        // Prevent paste
      })
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme={theme}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          readOnly,
        }}
      />
    </div>
  )
}
