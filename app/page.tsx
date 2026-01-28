'use client';
import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState('');

  const prettify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (e) {
      setError('Invalid JSON');
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError('Invalid JSON');
    }
  };

  const outputLines = output ? output.split('\n') : [];

  return (
    <main className="h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Pretty JSON</h1>
      <div className="flex gap-4 flex-1 min-h-0">
        <textarea
          className="flex-1 p-4 border rounded font-mono text-sm resize-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste JSON here..."
        />
        <div className="flex-1 border rounded bg-gray-50 dark:bg-gray-900 overflow-auto">
          <div className="flex font-mono text-sm min-h-full">
            {outputLines.length > 0 && (
              <>
                <div className="py-4 pr-2 pl-3 text-right select-none bg-gray-100 dark:bg-gray-800 text-gray-400 border-r border-gray-200 dark:border-gray-700 sticky left-0">
                  {outputLines.map((_, i) => (
                    <div key={i} className="leading-5">{i + 1}</div>
                  ))}
                </div>
                <pre className="py-4 px-4 flex-1 text-black dark:text-gray-100">
                  {outputLines.map((line, i) => (
                    <div key={i} className="leading-5">{line || ' '}</div>
                  ))}
                </pre>
              </>
            )}
            {outputLines.length === 0 && (
              <div className="p-4 text-gray-400">Output will appear here...</div>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <div className="mt-4 flex gap-2 shrink-0">
        <button onClick={prettify} className="px-4 py-2 bg-blue-500 text-white rounded">
          Prettify
        </button>
        <button onClick={minify} className="px-4 py-2 bg-gray-500 text-white rounded">
          Minify
        </button>
        <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value={0}>Tab</option>
        </select>
      </div>
    </main>
  );
}