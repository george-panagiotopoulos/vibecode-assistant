import React, { useState } from 'react';

const Sidebar = ({ 
  activeView, 
  onViewChange, 
  repositoryData, 
  selectedFiles = [], 
  onFileSelect, 
  onRepositoryLoad,
  config 
}) => {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [folderContents, setFolderContents] = useState(new Map());
  const [loadingFolders, setLoadingFolders] = useState(new Set());

  const handleRepositorySubmit = async (e) => {
    e.preventDefault();
    if (!repositoryUrl.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      await onRepositoryLoad(repositoryUrl, config?.github?.token || '');
    } catch (err) {
      setError(err.message || 'Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContents = async (folderPath) => {
    if (folderContents.has(folderPath) || loadingFolders.has(folderPath)) {
      return;
    }

    setLoadingFolders(prev => new Set(prev).add(folderPath));

    try {
      const response = await fetch('/api/repositories/folder-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repositoryData?.files?.repository?.html_url || repositoryUrl,
          folder_path: folderPath,
          github_token: config?.github?.token || ''
        })
      });

      const result = await response.json();
      if (result.success) {
        setFolderContents(prev => new Map(prev).set(folderPath, result.contents));
      } else {
        console.error('Failed to load folder contents:', result.error);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
    } finally {
      setLoadingFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderPath);
        return newSet;
      });
    }
  };

  const toggleFolder = async (folderPath, file) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
      // Load folder contents if not already loaded and it's a directory
      if (!folderContents.has(folderPath) && (file.type === 'directory' || file.type === 'dir' || file.type === 'tree')) {
        await loadFolderContents(folderPath);
      }
    }
    setExpandedFolders(newExpanded);
  };

  const viewFile = async (file) => {
    try {
      // Open a new window to display file content
      const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      newWindow.document.write(`
        <html>
          <head>
            <title>${file.name} - ${repositoryData?.files?.repository?.name || repositoryData?.repository?.name || 'Repository'}</title>
            <style>
              body { 
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
                margin: 20px; 
                background: #1e1e1e; 
                color: #cccccc; 
                line-height: 1.5;
              }
              .header { 
                background: #252526; 
                padding: 15px; 
                border-radius: 5px; 
                margin-bottom: 20px; 
                border: 1px solid #3c3c3c;
              }
              .file-path { 
                color: #007acc; 
                font-weight: bold; 
                margin-bottom: 10px;
              }
              .copy-btn { 
                background: #007acc; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 14px;
              }
              .copy-btn:hover { 
                background: #005a9e; 
              }
              .content { 
                background: #252526; 
                padding: 20px; 
                border-radius: 5px; 
                border: 1px solid #3c3c3c; 
                white-space: pre-wrap; 
                overflow-x: auto;
              }
              .loading { 
                text-align: center; 
                color: #007acc; 
                padding: 40px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="file-path">${file.path || file.name}</div>
              <button class="copy-btn" onclick="copyToClipboard()">📋 Copy to Clipboard</button>
            </div>
            <div id="content" class="loading">Loading file content...</div>
            <script>
              let fileContent = '';
              
              async function loadFileContent() {
                try {
                  const response = await fetch('/api/repositories/file-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      repo_url: '${repositoryData?.files?.repository?.html_url || repositoryUrl}',
                      file_path: '${file.path || file.name}',
                      github_token: '${config?.github?.token || ''}'
                    })
                  });
                  
                  const result = await response.json();
                  if (result.success && result.content) {
                    // Extract the actual content from the response object
                    fileContent = result.content.content || result.content;
                    document.getElementById('content').innerHTML = '<div class="content">' + escapeHtml(fileContent) + '</div>';
                  } else {
                    document.getElementById('content').innerHTML = '<div class="content">Error: ' + (result.error || 'Failed to load file content') + '</div>';
                  }
                } catch (error) {
                  document.getElementById('content').innerHTML = '<div class="content">Error loading file: ' + error.message + '</div>';
                }
              }
              
              function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
              }
              
              function copyToClipboard() {
                if (fileContent) {
                  navigator.clipboard.writeText(fileContent).then(() => {
                    const btn = document.querySelector('.copy-btn');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ Copied!';
                    btn.style.background = '#4caf50';
                    setTimeout(() => {
                      btn.innerHTML = originalText;
                      btn.style.background = '#007acc';
                    }, 2000);
                  }).catch(err => {
                    alert('Failed to copy to clipboard: ' + err.message);
                  });
                } else {
                  alert('No content to copy');
                }
              }
              
              loadFileContent();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Failed to open file viewer: ' + error.message);
    }
  };

  const addFile = (file) => {
    const isSelected = selectedFiles.some(f => f.path === file.path || f === file.path);
    if (!isSelected) {
      onFileSelect(file, true);
    }
  };

  const removeFile = (file) => {
    onFileSelect(file, false);
  };

  const renderFileTree = (files, level = 0, parentPath = '') => {
    // Ensure files is an array
    if (!files) return null;
    
    // Handle different data structures
    let fileArray = files;
    if (files.tree) {
      fileArray = files.tree;
    } else if (!Array.isArray(files)) {
      return null;
    }
    
    if (!Array.isArray(fileArray) || fileArray.length === 0) return null;

    return fileArray.map((file, index) => {
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      const isDirectory = file.type === 'directory' || file.type === 'tree' || file.type === 'dir';
      const isExpanded = expandedFolders.has(file.path || fullPath);
      const isSelected = selectedFiles.some(f => f.path === file.path || f === file.path);
      const isLoadingFolder = loadingFolders.has(file.path || fullPath);

      return (
        <div key={`${file.path || file.name}-${index}`} className="text-sm">
          <div
            className={`flex items-center py-1 px-2 rounded transition-colors group ${
              isSelected ? 'bg-vibe-blue bg-opacity-20 text-vibe-blue' : 'text-vibe-gray hover:bg-vibe-darker'
            }`}
            style={{ paddingLeft: `${(level + 1) * 12}px` }}
          >
            {/* Expand/Collapse button for directories */}
            {isDirectory && (
              <button
                onClick={() => toggleFolder(file.path || fullPath, file)}
                className="mr-1 text-vibe-gray hover:text-vibe-blue transition-colors"
                disabled={isLoadingFolder}
              >
                {isLoadingFolder ? '⏳' : (isExpanded ? '📂' : '📁')}
              </button>
            )}
            
            {/* File/Folder icon and name */}
            <div className="flex items-center flex-1 min-w-0">
              {!isDirectory && <span className="mr-2">📄</span>}
              <span className="truncate">{file.name}</span>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isDirectory && (
                <button
                  onClick={() => viewFile(file)}
                  className="text-xs px-2 py-1 bg-vibe-blue text-white rounded hover:bg-opacity-80 transition-colors"
                  title="View file content"
                >
                  View
                </button>
              )}
              
              {isSelected ? (
                <button
                  onClick={() => removeFile(file)}
                  className="text-xs px-2 py-1 bg-vibe-red text-white rounded hover:bg-opacity-80 transition-colors"
                  title="Remove from selected files"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => addFile(file)}
                  className="text-xs px-2 py-1 bg-vibe-gray-dark text-vibe-gray hover:bg-vibe-gray hover:text-white rounded transition-colors"
                  title="Add to selected files"
                >
                  Add
                </button>
              )}
            </div>
          </div>
          
          {/* Render children if directory is expanded */}
          {isDirectory && isExpanded && (
            <div>
              {/* Prioritize loaded folder contents over existing children to prevent duplication */}
              {folderContents.has(file.path || fullPath) ? 
                renderFileTree(folderContents.get(file.path || fullPath), level + 1, file.path || fullPath) :
                file.children && renderFileTree(file.children, level + 1, file.path || fullPath)
              }
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-vibe-dark">
      {/* Header */}
      <div className="p-4 border-b border-vibe-gray-dark">
        <h1 className="text-lg font-semibold text-vibe-gray">Vibe Assistant</h1>
        <p className="text-xs text-vibe-gray opacity-75">v1.0.0</p>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-vibe-gray-dark">
        <h2 className="text-sm font-medium text-vibe-gray mb-3">Navigation</h2>
        <nav className="space-y-2">
          <button
            onClick={() => onViewChange('prompt')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeView === 'prompt' 
                ? 'bg-vibe-blue text-white' 
                : 'text-vibe-gray hover:bg-vibe-gray-dark hover:text-white'
            }`}
          >
            ✨ Prompt Builder
          </button>
          
          <button
            onClick={() => onViewChange('requirements')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeView === 'requirements' 
                ? 'bg-vibe-blue text-white' 
                : 'text-vibe-gray hover:bg-vibe-gray-dark hover:text-white'
            }`}
          >
            🏗️ Hierarchical Planning
          </button>

          <button
            onClick={() => onViewChange('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeView === 'dashboard' 
                ? 'bg-vibe-blue text-white' 
                : 'text-vibe-gray hover:bg-vibe-gray-dark hover:text-white'
            }`}
          >
            📊 Dashboard & Configuration
          </button>
          
          <button
            onClick={() => onViewChange('streaming')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeView === 'streaming' 
                ? 'bg-vibe-blue text-white' 
                : 'text-vibe-gray hover:bg-vibe-gray-dark hover:text-white'
            }`}
          >
            🔄 Streaming Test
          </button>
        </nav>
      </div>

      {/* Repository Section */}
      <div className="p-4 border-b border-vibe-gray-dark">
        <h2 className="text-sm font-medium text-vibe-gray mb-3">Repository</h2>
        <form onSubmit={handleRepositorySubmit} className="space-y-2">
          <input
            type="text"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="GitHub repository URL"
            className="w-full px-3 py-2 bg-vibe-darker border border-vibe-gray-dark rounded text-vibe-gray placeholder-vibe-gray placeholder-opacity-50 focus:outline-none focus:border-vibe-blue text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !repositoryUrl.trim()}
            className="w-full px-3 py-2 bg-vibe-blue text-white rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            {loading ? 'Loading...' : 'Load Repository'}
          </button>
        </form>
        {error && (
          <div className="mt-2 text-xs text-vibe-red bg-vibe-red bg-opacity-10 border border-vibe-red border-opacity-30 rounded px-2 py-1">
            {error}
          </div>
        )}
      </div>

      {/* Files Section */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <h2 className="text-sm font-medium text-vibe-gray mb-3">Files</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {repositoryData?.files || repositoryData?.tree ? (
            <div className="space-y-1">
              {renderFileTree(repositoryData.files || repositoryData.tree || repositoryData)}
            </div>
          ) : (
            <div className="text-xs text-vibe-gray opacity-75 text-center py-8">
              Load a repository to view files
            </div>
          )}
        </div>
      </div>

      {/* Selected Files Count */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="p-4 border-t border-vibe-gray-dark">
          <div className="text-xs text-vibe-gray">
            <span className="text-vibe-blue">{selectedFiles.length}</span> file{selectedFiles.length !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 