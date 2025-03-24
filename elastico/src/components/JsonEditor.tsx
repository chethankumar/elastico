import React, { useRef, useEffect, useState } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  readOnly?: boolean;
  error?: string | null;
}

/**
 * A reusable JSON editor component using Monaco editor with syntax highlighting,
 * auto-formatting, and JSON validation.
 */
const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, height = 300, readOnly = false, error = null }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [formattedOnce, setFormattedOnce] = useState(false);

  // Editor options
  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: readOnly,
    cursorStyle: 'line',
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    renderValidationDecorations: 'on',
  };

  // Function to format JSON
  const formatJson = () => {
    if (!editorRef.current) return;

    try {
      // Parse and stringify with formatting
      const jsonObj = JSON.parse(editorRef.current.getValue());
      const formatted = JSON.stringify(jsonObj, null, 2);

      // Set value and maintain cursor position if possible
      const position = editorRef.current.getPosition();
      editorRef.current.setValue(formatted);
      if (position) {
        editorRef.current.setPosition(position);
      }

      // Update the parent component
      onChange(formatted);
    } catch (e) {
      // If not valid JSON, don't format
      console.log('Cannot format invalid JSON');
    }
  };

  // Setup editor on mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Add Format JSON command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, formatJson);

    // Format JSON on initial load
    if (!formattedOnce && value.trim() !== '') {
      try {
        // Only format if it's valid JSON
        JSON.parse(value);
        setTimeout(() => {
          formatJson();
          setFormattedOnce(true);
        }, 300);
      } catch (e) {
        // Invalid JSON, don't format
      }
    }
  };

  // Handle editor change
  const handleEditorChange = (newValue: string) => {
    onChange(newValue);
  };

  // Format JSON with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Format with Alt+Shift+F
      if (e.altKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        formatJson();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className='json-editor-container'>
      <MonacoEditor language='json' theme='vs-light' value={value} options={editorOptions} onChange={handleEditorChange} editorDidMount={handleEditorDidMount} height={height} />
      {error && <div className='mt-1 text-sm text-red-600'>{error}</div>}
      <div className='mt-2 flex justify-end'>
        <button type='button' onClick={formatJson} className='px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500'>
          Format JSON (Alt+Shift+F)
        </button>
      </div>
    </div>
  );
};

export default JsonEditor;
