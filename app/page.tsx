'use client';
import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

interface JsonPathEntry {
  path: string;
  key: string;
  value: unknown;
  depth: number;
  hasChildren: boolean;
  isArrayItem: boolean;
}

function extractPaths(obj: unknown, prefix = '', depth = 0): JsonPathEntry[] {
  const entries: JsonPathEntry[] = [];
  if (obj === null || obj === undefined || typeof obj !== 'object') return entries;

  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);

  for (const key of keys) {
    const value = record[key];
    const isArray = Array.isArray(obj);
    const pathKey = isArray ? `[${key}]` : key;
    const fullPath = isArray
      ? `${prefix}[${key}]`
      : prefix
        ? `${prefix}.${key}`
        : key;
    const hasChildren = value !== null && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0;

    entries.push({
      path: fullPath,
      key: pathKey,
      value,
      depth,
      hasChildren,
      isArrayItem: isArray,
    });

    if (hasChildren) {
      entries.push(...extractPaths(value, fullPath, depth + 1));
    }
  }

  return entries;
}

function findValueLocation(
  outputLines: string[],
  path: string,
  parsedJson: unknown
): { startLine: number; endLine: number } | null {
  // Navigate the parsed JSON to find the value at the given path
  const segments = parsePath(path);
  let current: unknown = parsedJson;

  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[seg];
  }

  // Find matching line(s) in the output
  const lastSegment = segments[segments.length - 1];
  const isArrayIndex = /^\d+$/.test(lastSegment);

  // Build a search strategy based on the key
  for (let i = 0; i < outputLines.length; i++) {
    const line = outputLines[i];
    const trimmed = line.trimStart();

    if (!isArrayIndex) {
      // Look for "key": value pattern
      const keyPattern = `"${lastSegment}":`;
      if (!trimmed.startsWith(keyPattern)) continue;

      // Verify this is the right occurrence by checking the path context
      if (verifyPath(outputLines, i, segments)) {
        if (current !== null && typeof current === 'object') {
          // Find the closing bracket
          const endLine = findClosingBracket(outputLines, i);
          return { startLine: i, endLine };
        }
        return { startLine: i, endLine: i };
      }
    } else {
      // Array items - need to count within parent array context
      const parentSegments = segments.slice(0, -1);
      const arrayIndex = parseInt(lastSegment, 10);

      // Find parent array opening
      const parentLine = findParentArrayLine(outputLines, parentSegments);
      if (parentLine === null) continue;

      // Count to the right array index
      const targetLine = findArrayItemByIndex(outputLines, parentLine, arrayIndex);
      if (targetLine !== null) {
        if (current !== null && typeof current === 'object') {
          const endLine = findClosingBracket(outputLines, targetLine);
          return { startLine: targetLine, endLine };
        }
        return { startLine: targetLine, endLine: targetLine };
      }
      break;
    }
  }

  return null;
}

function parsePath(path: string): string[] {
  const segments: string[] = [];
  let current = '';
  let i = 0;
  while (i < path.length) {
    if (path[i] === '[') {
      if (current) { segments.push(current); current = ''; }
      i++; // skip [
      let idx = '';
      while (i < path.length && path[i] !== ']') { idx += path[i]; i++; }
      segments.push(idx);
      i++; // skip ]
    } else if (path[i] === '.') {
      if (current) { segments.push(current); current = ''; }
      i++;
    } else {
      current += path[i];
      i++;
    }
  }
  if (current) segments.push(current);
  return segments;
}

function verifyPath(outputLines: string[], lineIndex: number, segments: string[]): boolean {
  if (segments.length <= 1) return true;

  // Walk up indentation to verify parent keys
  const targetIndent = outputLines[lineIndex].search(/\S/);
  let segIdx = segments.length - 2;

  for (let i = lineIndex - 1; i >= 0 && segIdx >= 0; i--) {
    const line = outputLines[i];
    const indent = line.search(/\S/);
    if (indent < targetIndent && indent >= 0) {
      const trimmed = line.trimStart();
      const seg = segments[segIdx];
      const isNumeric = /^\d+$/.test(seg);

      if (!isNumeric) {
        if (trimmed.startsWith(`"${seg}":`)) {
          segIdx--;
        }
      } else {
        segIdx--;
      }
      if (segIdx < 0) return true;
    }
  }

  return segIdx < 0;
}

function findClosingBracket(outputLines: string[], startLine: number): number {
  const line = outputLines[startLine];
  const trimmed = line.trimStart();

  // Check if the value opens with { or [
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    // Might be a standalone { or [
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const openChar = trimmed[0];
      const closeChar = openChar === '{' ? '}' : ']';
      let depth = 0;
      for (let i = startLine; i < outputLines.length; i++) {
        for (const ch of outputLines[i]) {
          if (ch === openChar) depth++;
          if (ch === closeChar) depth--;
          if (depth === 0) return i;
        }
      }
    }
    return startLine;
  }

  const afterColon = trimmed.substring(colonIdx + 1).trim();
  if (!afterColon.startsWith('{') && !afterColon.startsWith('[')) {
    return startLine;
  }

  const openChar = afterColon[0];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;

  for (let i = startLine; i < outputLines.length; i++) {
    const searchFrom = i === startLine ? line.indexOf(openChar, line.indexOf(':')) : 0;
    for (let j = searchFrom; j < outputLines[i].length; j++) {
      if (outputLines[i][j] === openChar) depth++;
      if (outputLines[i][j] === closeChar) depth--;
      if (depth === 0) return i;
    }
  }
  return startLine;
}

function findParentArrayLine(outputLines: string[], parentSegments: string[]): number | null {
  if (parentSegments.length === 0) {
    // Root is the array
    for (let i = 0; i < outputLines.length; i++) {
      if (outputLines[i].trimStart().startsWith('[')) return i;
    }
    return null;
  }

  const lastSeg = parentSegments[parentSegments.length - 1];
  for (let i = 0; i < outputLines.length; i++) {
    const trimmed = outputLines[i].trimStart();
    if (trimmed.startsWith(`"${lastSeg}":`)) {
      if (verifyPath(outputLines, i, parentSegments)) {
        // Find the [ on this line or next
        if (trimmed.includes('[')) return i;
        if (i + 1 < outputLines.length && outputLines[i + 1].trimStart().startsWith('[')) return i + 1;
      }
    }
  }
  return null;
}

function findArrayItemByIndex(outputLines: string[], arrayStartLine: number, targetIndex: number): number | null {
  const startLine = outputLines[arrayStartLine];
  const baseIndent = startLine.search(/\S/);

  // Items are at baseIndent + indentSize
  let count = -1;
  for (let i = arrayStartLine + 1; i < outputLines.length; i++) {
    const line = outputLines[i];
    const trimmed = line.trimStart();
    const indent = line.search(/\S/);

    // Closing bracket at same or less indent means array ended
    if (indent <= baseIndent && (trimmed.startsWith(']') || trimmed.startsWith('}'))) break;

    // Direct children of the array (one indent level deeper)
    if (indent === baseIndent + 2 || indent === baseIndent + 4) {
      // Check if it's not a closing bracket
      if (!trimmed.startsWith(']') && !trimmed.startsWith('}')) {
        // Check if this is a new item (not a continuation of previous object)
        const prevLine = outputLines[i - 1]?.trimStart();
        const isPrevClosing = prevLine?.startsWith('}') || prevLine?.startsWith(']');
        const isPrevOpening = prevLine?.endsWith('[') || prevLine?.endsWith('{');
        const isArrayOpening = i === arrayStartLine + 1;

        if (isArrayOpening || isPrevClosing || isPrevOpening) {
          count++;
          if (count === targetIndex) return i;
        }
      }
    }
  }
  return null;
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value.length > 30 ? value.substring(0, 30) + '...' : value}"`;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') return `{${Object.keys(value as object).length} keys}`;
  return String(value);
}

function PathTree({
  entries,
  onSelect,
  selectedPath,
}: {
  entries: JsonPathEntry[];
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedPaths(new Set(entries.filter((e) => e.hasChildren).map((e) => e.path)));
  }, [entries]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  // Filter entries by search text
  const filteredRootEntries = useMemo(() => {
    const roots = entries.filter((e) => e.depth === 0);
    if (!filter) return roots;
    // Show roots that have matching descendants
    const matchingPaths = new Set<string>();
    for (const entry of entries) {
      if (
        entry.key.toLowerCase().includes(filter.toLowerCase()) ||
        entry.path.toLowerCase().includes(filter.toLowerCase())
      ) {
        // Add this entry and all ancestors
        const segments = parsePath(entry.path);
        let p = '';
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const prev = p;
          if (/^\d+$/.test(seg)) {
            p = prev ? `${prev}[${seg}]` : `[${seg}]`;
          } else {
            p = prev ? `${prev}.${seg}` : seg;
          }
          matchingPaths.add(p);
        }
      }
    }
    return roots.filter((r) => matchingPaths.has(r.path));
  }, [entries, filter]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Data Explorer</span>
          <div className="flex-1" />
          <button
            onClick={expandAll}
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Expand All"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Collapse All"
          >
            Collapse
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter keys..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="flex-1 overflow-auto p-1">
        {filteredRootEntries.map((entry) => (
          <PathTreeNodeWrapper
            key={entry.path}
            entry={entry}
            allEntries={entries}
            expandedPaths={expandedPaths}
            onToggle={togglePath}
            onSelect={onSelect}
            selectedPath={selectedPath}
            filter={filter}
          />
        ))}
      </div>
    </div>
  );
}

function PathTreeNodeWrapper({
  entry,
  allEntries,
  expandedPaths,
  onToggle,
  onSelect,
  selectedPath,
  filter,
}: {
  entry: JsonPathEntry;
  allEntries: JsonPathEntry[];
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  filter: string;
}) {
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = selectedPath === entry.path;

  const children = useMemo(
    () =>
      allEntries.filter((e) => {
        if (e.depth !== entry.depth + 1) return false;
        return (
          e.path.startsWith(entry.path) &&
          (e.path[entry.path.length] === '.' || e.path[entry.path.length] === '[')
        );
      }),
    [allEntries, entry.path, entry.depth]
  );

  const hasChildren = children.length > 0;

  // Auto-expand when filter is active
  const isAutoExpanded = filter.length > 0;
  const showExpanded = isExpanded || isAutoExpanded;

  const matchesFilter =
    filter &&
    (entry.key.toLowerCase().includes(filter.toLowerCase()) ||
      entry.path.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-400' : ''
        } ${matchesFilter ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
        style={{ paddingLeft: `${entry.depth * 12 + 4}px` }}
        onClick={() => onSelect(entry.path)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(entry.path);
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="font-semibold text-purple-700 dark:text-purple-400 shrink-0">
          {entry.key}
        </span>
        {!hasChildren && (
          <span className="text-gray-500 dark:text-gray-400 truncate ml-1">
            {formatValue(entry.value)}
          </span>
        )}
        {hasChildren && (
          <span className="text-gray-400 dark:text-gray-500 ml-1 text-[10px]">
            {Array.isArray(entry.value)
              ? `[${(entry.value as unknown[]).length}]`
              : `{${Object.keys(entry.value as object).length}}`}
          </span>
        )}
      </div>
      {hasChildren && showExpanded && (
        <div>
          {children.map((child) => (
            <PathTreeNodeWrapper
              key={child.path}
              entry={child}
              allEntries={allEntries}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [highlightLines, setHighlightLines] = useState<{ startLine: number; endLine: number } | null>(null);
  const [parsedJson, setParsedJson] = useState<unknown>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const prettify = () => {
    try {
      const parsed = JSON.parse(input);
      setParsedJson(parsed);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
      setSelectedPath(null);
      setHighlightLines(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setParsedJson(parsed);
      setOutput(JSON.stringify(parsed));
      setError('');
      setSelectedPath(null);
      setHighlightLines(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  const handleInputScroll = () => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const inputLines = input ? input.split('\n') : [''];
  const outputLines = output ? output.split('\n') : [];

  const pathEntries = useMemo(() => {
    if (!parsedJson) return [];
    return extractPaths(parsedJson);
  }, [parsedJson]);

  const handlePathSelect = useCallback(
    (path: string) => {
      setSelectedPath(path);
      const location = findValueLocation(outputLines, path, parsedJson);
      if (location) {
        setHighlightLines(location);
        // Scroll to highlighted line
        requestAnimationFrame(() => {
          if (outputRef.current) {
            const lineEl = outputRef.current.querySelector(`[data-line="${location.startLine}"]`);
            if (lineEl) {
              lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        });
      }
    },
    [outputLines, parsedJson]
  );

  // Clear highlight when output changes
  useEffect(() => {
    setHighlightLines(null);
    setSelectedPath(null);
  }, [output]);

  return (
    <main className="h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Pretty JSON</h1>
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Input */}
        <div className="flex-1 border rounded bg-slate-50 dark:bg-slate-900 overflow-hidden flex">
          <div
            ref={lineNumberRef}
            className="py-4 pr-2 pl-3 text-right select-none bg-slate-100 dark:bg-slate-800 text-slate-400 border-r border-slate-200 dark:border-slate-700 overflow-hidden font-mono text-sm"
          >
            {inputLines.map((_, i) => (
              <div key={i} className="leading-5">{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 py-4 px-4 font-mono text-sm resize-none bg-transparent text-black dark:text-slate-100 outline-none leading-5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onScroll={handleInputScroll}
            placeholder="Paste JSON here..."
            spellCheck={false}
          />
        </div>

        {/* Center: Output */}
        <div ref={outputRef} className="flex-1 border rounded bg-gray-50 dark:bg-gray-900 overflow-auto">
          <div className="flex font-mono text-sm min-h-full">
            {outputLines.length > 0 && (
              <>
                <div className="py-4 pr-2 pl-3 text-right select-none bg-gray-100 dark:bg-gray-800 text-gray-400 border-r border-gray-200 dark:border-gray-700 sticky left-0">
                  {outputLines.map((_, i) => (
                    <div
                      key={i}
                      className={`leading-5 ${
                        highlightLines && i >= highlightLines.startLine && i <= highlightLines.endLine
                          ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : ''
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <pre className="py-4 px-4 flex-1 text-black dark:text-gray-100">
                  {outputLines.map((line, i) => (
                    <div
                      key={i}
                      data-line={i}
                      className={`leading-5 transition-colors duration-200 ${
                        highlightLines && i >= highlightLines.startLine && i <= highlightLines.endLine
                          ? 'bg-yellow-200/70 dark:bg-yellow-700/40 rounded'
                          : ''
                      }`}
                    >
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              </>
            )}
            {outputLines.length === 0 && (
              <div className="p-4 text-gray-400">Output will appear here...</div>
            )}
          </div>
        </div>

        {/* Right: Data Explorer */}
        {pathEntries.length > 0 && (
          <div className="w-72 border rounded bg-white dark:bg-gray-900 overflow-hidden flex flex-col shrink-0">
            <PathTree
              entries={pathEntries}
              onSelect={handlePathSelect}
              selectedPath={selectedPath}
            />
          </div>
        )}
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <div className="mt-4 flex gap-2 shrink-0 items-center">
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
        {selectedPath && (
          <span className="ml-4 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {selectedPath}
          </span>
        )}
      </div>
    </main>
  );
}
