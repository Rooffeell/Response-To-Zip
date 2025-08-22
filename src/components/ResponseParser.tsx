import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, FileText, Copy, Check } from 'lucide-react';
import JSZip from 'jszip';
import { MultiStepLoader } from './ui/multi-step-loader';
import CodeEditor from './CodeEditor';

interface ParsedFile {
  path: string;
  content: string;
}

export default function ResponseParser() {
  const [input, setInput] = useState('');
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadingStates = [
    { text: "Parsing AI response..." },
    { text: "Extracting file structure..." },
    { text: "Creating folder hierarchy..." },
    { text: "Processing file contents..." },
    { text: "Generating ZIP archive..." },
    { text: "Finalizing download..." }
  ];

  const promptText = `You are a highly skilled software engineer AI that generates complete application codebases from scratch.

Your task is to create a fully working app based on the following IDEA:
<PASTE THE USER'S APP OR WEBSITE IDEA HERE>

Follow these instructions strictly:

1. Generate the entire folder structure first. Use clear indentation and show folders and files with their full names and extensions.

2. After the folder structure, generate the full content of each file in the project. Present each file as:

--- [relative/path/to/file.extension] ---
<complete code content here>

3. Do NOT provide any explanations, comments, instructions, or summaries before, between, or after your outputs.

4. Do NOT provide any instructions on how to run the app or anything beyond the code itself.

5. Respond with the entire output in code blocks for readability.

6. Continue generating without stopping until the full app code is complete, no matter how long it is.

Begin now.`;

  // Auto-save to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('responseToZip_content');
    if (saved) {
      setInput(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('responseToZip_content', input);
  }, [input]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      showStatus('Prompt copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showStatus('Failed to copy prompt', 'error');
    }
  };

  const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 5000);
  };

  const parseResponse = (content: string): ParsedFile[] => {
    const files: ParsedFile[] = [];
    const lines = content.split('\n');
    let currentFile: string | null = null;
    let currentContent: string[] = [];
    let inCodeBlock = false;
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines at start of content blocks
      if (skipNext && line.trim() === '') {
        continue;
      }
      skipNext = false;

      // Detect code block boundaries
      const codeBlockMatch = line.trim().match(/^```(\w+)?/);
      if (codeBlockMatch) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip folder structure lines
      if (line.match(/^[\s]*[├└│]\s*/) || 
          line.match(/^[\s]*[├└]\─\─/) ||
          line.match(/^[\s]*[│]\s*$/) ||
          (line.trim().endsWith('/') && !line.includes('---'))) {
        continue;
      }

      // Detect Claude's comment-style file markers: // filename
      const commentFileMatch = line.match(/^\s*\/\/\s+(.+\.\w+)\s*$/);
      if (commentFileMatch) {
        // Save previous file if exists
        if (currentFile) {
          files.push({
            path: currentFile,
            content: currentContent.join('\n').trim()
          });
        }
        
        // Start new file
        currentFile = commentFileMatch[1].trim();
        currentContent = [];
        skipNext = true;
        continue;
      }

      // Detect file markers: --- [path] --- or \--- [path] ---
      const fileMarkerMatch = line.match(/^\s*\\?---\s*\[?([^\[\]]+?)\]?\s*---\s*$/);
      if (fileMarkerMatch) {
        // Save previous file if exists
        if (currentFile) {
          files.push({
            path: currentFile,
            content: currentContent.join('\n').trim()
          });
        }
        
        // Start new file
        currentFile = fileMarkerMatch[1].trim();
        currentContent = [];
        skipNext = true;
        continue;
      }

      // Alternative file marker format: just --- filepath ---
      const altFileMarkerMatch = line.match(/^\s*\\?---\s*([^\-]+?)\s*---\s*$/);
      if (altFileMarkerMatch && altFileMarkerMatch[1].includes('.')) {
        // Save previous file if exists
        if (currentFile) {
          files.push({
            path: currentFile,
            content: currentContent.join('\n').trim()
          });
        }
        
        // Start new file
        currentFile = altFileMarkerMatch[1].trim();
        currentContent = [];
        skipNext = true;
        continue;
      }

      // Add content to current file
      if (currentFile) {
        currentContent.push(line);
      }
    }

    // Don't forget the last file
    if (currentFile) {
      files.push({
        path: currentFile,
        content: currentContent.join('\n').trim()
      });
    }

    return files;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInput(content);
      showStatus('File uploaded successfully!', 'success');
    };
    reader.readAsText(file);
  };

  const clearInput = () => {
    setInput('');
    setParsedFiles([]);
    setStatus(null);
    localStorage.removeItem('responseToZip_content');
  };

  const generateZip = async () => {
    if (!input.trim()) {
      showStatus('Please paste your AI code response first!', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      // Parse the response
      const files = parseResponse(input);
      
      if (files.length === 0) {
        throw new Error('No files found in the response. Please check the format.');
      }

      setParsedFiles(files);

      // Create ZIP
      const zip = new JSZip();
      
      files.forEach(file => {
        // Ensure the path doesn't start with /
        const normalizedPath = file.path.replace(/^\/+/, '');
        
        // Create folders if the path contains directories
        const pathParts = normalizedPath.split('/');
        if (pathParts.length > 1) {
          // Create intermediate folders
          let currentPath = '';
          for (let i = 0; i < pathParts.length - 1; i++) {
            currentPath += pathParts[i] + '/';
            if (!zip.files[currentPath]) {
              zip.folder(pathParts[i]);
            }
          }
        }
        
        // Add the file with proper folder structure
        zip.file(normalizedPath, file.content);
      });

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({type: "blob"});
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-generated-project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus(`✅ ZIP file generated successfully! ${files.length} files included.`, 'success');

    } catch (error) {
      console.error('Error generating ZIP:', error);
      showStatus(`❌ Error: ${(error as Error).message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFilesChange = (updatedFiles: ParsedFile[]) => {
    setParsedFiles(updatedFiles);
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Input Section */}
      <div className="space-y-4">
        <label htmlFor="codeInput" className="block text-lg font-semibold text-neutral-200">
          Paste your AI code generation response here:
        </label>
        <textarea
          id="codeInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-96 p-4 bg-neutral-900 border border-neutral-700 rounded-lg font-mono text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-neutral-600 hover:scrollbar-thumb-neutral-500"
          className="w-full h-96 p-4 bg-neutral-900 border border-neutral-700 rounded-lg font-mono text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-neutral-600 hover:scrollbar-thumb-neutral-500"
          placeholder={`Paste the complete AI response including folder structure and file contents...

Claude's comment format:
// package.json
{
  "name": "my-app",
  "version": "1.0.0"
}

// src/App.tsx
import React from 'react';
export default function App() {
  return <div>Hello World</div>;
}

Or traditional format:
Example format:
project-folder/
├── index.html
├── styles.css
└── script.js

\\--- index.html ---
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
\`\`\`

\\--- styles.css ---
\`\`\`css
body {
  margin: 0;
  font-family: Arial;
}
\`\`\``}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={copyPrompt}
          className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-semibold leading-6 text-white inline-block"
        >
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
          </span>
          <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-2 px-6 ring-1 ring-white/10">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Copied!' : 'Copy AI Prompt'}</span>
          </div>
          <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40"></span>
        </button>
        
        <input
          type="file"
          accept=".txt,.md"
          onChange={handleFileUpload}
          className="hidden"
          id="fileInput"
        />
        <button
          onClick={() => document.getElementById('fileInput')?.click()}
          className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-semibold leading-6 text-white inline-block"
        >
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
          </span>
          <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-2 px-6 ring-1 ring-white/10">
            <Upload size={18} />
            <span>Upload Text File</span>
          </div>
          <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40"></span>
        </button>
        
        <button
          onClick={generateZip}
          className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-semibold leading-6 text-white inline-block"
        >
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
          </span>
          <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-2 px-6 ring-1 ring-white/10">
            <Download size={18} />
            <span>Generate ZIP</span>
          </div>
          <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40"></span>
        </button>
        
        <button
          onClick={clearInput}
          className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-semibold leading-6 text-white inline-block"
        >
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
          </span>
          <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-2 px-6 ring-1 ring-white/10">
            <Trash2 size={18} />
            <span>Clear</span>
          </div>
          <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40"></span>
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className={`p-4 rounded-lg border ${
          status.type === 'success' ? 'bg-green-900/20 border-green-700 text-green-200' :
          status.type === 'error' ? 'bg-red-900/20 border-red-700 text-red-200' :
          'bg-blue-900/20 border-blue-700 text-blue-200'
        }`}>
          {status.message}
        </div>
      )}

      {/* File List */}
      <CodeEditor files={parsedFiles} onFilesChange={handleFilesChange} />
      </div>
      
      <MultiStepLoader loadingStates={loadingStates} loading={isGenerating} duration={600} loop={false} />
    </>
  );
}