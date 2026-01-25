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

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Pretty JSON</h1>
      <div className="flex gap-4">
        <textarea
          className="flex-1 h-96 p-4 border rounded font-mono"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste JSON here..."
        />
        <textarea
          className="flex-1 h-96 p-4 border rounded font-mono bg-gray-50 text-black"
          value={output}
          readOnly
        />
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <div className="mt-4 flex gap-2">
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