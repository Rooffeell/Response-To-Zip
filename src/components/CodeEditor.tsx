import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { FileText, Eye, Edit3, Save, X, ChevronRight, ChevronDown, Folder, File } from 'lucide-react';

interface ParsedFile {
  path: string;
  content: string;
}

interface CodeEditorProps {
  files: ParsedFile[];
  onFilesChange: (files: ParsedFile[]) => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  content?: string;
}

export default function CodeEditor({ files, onFilesChange }: CodeEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);

  // Build file tree structure
  useEffect(() => {
    const buildTree = (files: ParsedFile[]): FileTreeNode[] => {
      const tree: FileTreeNode[] = [];
      const folderMap = new Map<string, FileTreeNode>();

      files.forEach(file => {
        const parts = file.path.split('/');
        let currentPath = '';
        
        parts.forEach((part, index) => {
          const isLast = index === parts.length - 1;
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (isLast) {
            // It's a file
            const fileNode: FileTreeNode = {
              name: part,
              path: currentPath,
              type: 'file',
              content: file.content
            };

            if (parentPath) {
              const parent = folderMap.get(parentPath);
              if (parent) {
                parent.children = parent.children || [];
                parent.children.push(fileNode);
              }
            } else {
              tree.push(fileNode);
            }
          } else {
            // It's a folder
            if (!folderMap.has(currentPath)) {
              const folderNode: FileTreeNode = {
                name: part,
                path: currentPath,
                type: 'folder',
                children: []
              };

              folderMap.set(currentPath, folderNode);

              if (parentPath) {
                const parent = folderMap.get(parentPath);
                if (parent) {
                  parent.children = parent.children || [];
                  parent.children.push(folderNode);
                }
              } else {
                tree.push(folderNode);
              }
            }
          }
        });
      });

      return tree;
    };

    setFileTree(buildTree(files));
    // Auto-expand root folders
    const rootFolders = new Set<string>();
    files.forEach(file => {
      const firstFolder = file.path.split('/')[0];
      if (file.path.includes('/')) {
        rootFolders.add(firstFolder);
      }
    });
    setExpandedFolders(rootFolders);
  }, [files]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const selectFile = (path: string, content: string) => {
    if (editMode && selectedFile) {
      // Save current changes before switching
      saveChanges();
    }
    setSelectedFile(path);
    setEditedContent(content);
    setEditMode(false);
  };

  const startEdit = () => {
    setEditMode(true);
  };

  const saveChanges = () => {
    if (selectedFile) {
      const updatedFiles = files.map(file => 
        file.path === selectedFile 
          ? { ...file, content: editedContent }
          : file
      );
      onFilesChange(updatedFiles);
      setEditMode(false);
    }
  };

  const cancelEdit = () => {
    if (selectedFile) {
      const originalFile = files.find(f => f.path === selectedFile);
      if (originalFile) {
        setEditedContent(originalFile.content);
      }
    }
    setEditMode(false);
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'dockerfile'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const renderTreeNode = (node: FileTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-neutral-800 rounded text-sm ${
            isSelected ? 'bg-blue-900/30 text-blue-300' : 'text-neutral-300'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              selectFile(node.path, node.content || '');
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown size={16} className="text-neutral-500" />
              ) : (
                <ChevronRight size={16} className="text-neutral-500" />
              )}
              <Folder size={16} className="text-blue-400" />
              <span>{node.name}</span>
            </>
          ) : (
            <>
              <div className="w-4" />
              <File size={16} className="text-neutral-400" />
              <span>{node.name}</span>
            </>
          )}
        </div>
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (files.length === 0) {
    return null;
  }

  const selectedFileObj = files.find(f => f.path === selectedFile);

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden">
      <div className="border-b border-neutral-700 p-4">
        <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
          <FileText size={20} />
          Code Editor ({files.length} files)
        </h3>
      </div>
      
      <div className="flex h-96">
        {/* File Tree */}
        <div className="w-64 border-r border-neutral-700 bg-neutral-950 overflow-y-auto scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-neutral-600">
          <div className="p-2">
            {fileTree.map(node => renderTreeNode(node))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              {/* Editor Header */}
              <div className="flex items-center justify-between p-3 border-b border-neutral-700 bg-neutral-900">
                <div className="flex items-center gap-2">
                  <File size={16} className="text-neutral-400" />
                  <span className="text-sm font-mono text-neutral-300">{selectedFile}</span>
                </div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={saveChanges}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1 bg-neutral-600 hover:bg-neutral-700 text-white text-sm rounded transition-colors"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getLanguageFromPath(selectedFile)}
                  value={editMode ? editedContent : selectedFileObj?.content || ''}
                  onChange={(value) => editMode && setEditedContent(value || '')}
                  theme="vs-dark"
                  options={{
                    readOnly: !editMode,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    wordWrap: 'on',
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              <div className="text-center">
                <Eye size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a file from the tree to view or edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}