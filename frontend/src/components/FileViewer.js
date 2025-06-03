import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

const FileViewer = ({ file, repositoryData, config, onClose }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFileContent = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const repoUrl = repositoryData?.files?.repository?.html_url || 
                     repositoryData?.repository?.html_url || 
                     repositoryData?.html_url;
      
      const response = await ApiService.getFileContent(
        repoUrl,
        file.path || file.name,
        config
      );
      
      if (response.success && response.content) {
        setContent(response.content.content || response.content);
      } else {
        setError(response.error || 'Failed to load file content');
      }
    } catch (err) {
      setError(`Error loading file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [file, repositoryData, config]);

  useEffect(() => {
    if (file && repositoryData) {
      loadFileContent();
    }
  }, [file, repositoryData, loadFileContent]);

  // Add keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getLanguageFromExtension = (extension) => {
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'cmake': 'cmake',
      'gradle': 'gradle',
      'properties': 'properties',
      'ini': 'ini',
      'toml': 'toml',
      'conf': 'conf',
      'config': 'conf'
    };
    
    return languageMap[extension] || 'text';
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-vibe-dark">
        <div className="p-4 md:p-6 border-b border-vibe-gray-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-medium text-vibe-gray">File Viewer</h2>
            <button
              onClick={onClose}
              className="text-vibe-gray hover:text-vibe-red transition-colors text-xl font-bold p-1 rounded hover:bg-vibe-darker"
              title="Close file viewer"
              aria-label="Close file viewer"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-3xl md:text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-vibe-gray text-sm md:text-base">Loading file content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-vibe-dark">
        <div className="p-4 md:p-6 border-b border-vibe-gray-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-medium text-vibe-gray">File Viewer</h2>
            <button
              onClick={onClose}
              className="text-vibe-gray hover:text-vibe-red transition-colors text-xl font-bold p-1 rounded hover:bg-vibe-darker"
              title="Close file viewer"
              aria-label="Close file viewer"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-3xl md:text-4xl mb-4">❌</div>
            <p className="text-vibe-red mb-4 text-sm md:text-base break-words">{error}</p>
            <button
              onClick={loadFileContent}
              className="btn-standard"
              aria-label="Retry loading file content"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const extension = getFileExtension(file.name);
  const language = getLanguageFromExtension(extension);

  return (
    <div className="h-full flex flex-col bg-vibe-dark">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-vibe-gray-dark">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-medium text-vibe-gray">File Viewer</h2>
          <button
            onClick={onClose}
            className="text-vibe-gray hover:text-vibe-red transition-colors text-xl font-bold p-1 rounded hover:bg-vibe-darker"
            title="Close file viewer"
            aria-label="Close file viewer"
          >
            ✕
          </button>
        </div>
        
        {/* File Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="text-xl md:text-2xl flex-shrink-0">📄</span>
            <div className="min-w-0">
              <div className="text-vibe-blue font-medium truncate">{file.name}</div>
              <div className="text-xs text-vibe-gray opacity-75 truncate">{file.path}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xs text-vibe-gray opacity-60 px-2 py-1 bg-vibe-darker rounded">
              {language.toUpperCase()}
            </span>
            <button
              onClick={copyToClipboard}
              className="btn-standard text-sm whitespace-nowrap"
              title="Copy file content to clipboard"
              aria-label="Copy file content to clipboard"
            >
              📋 Copy
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-vibe-gray">
            File Content
          </label>
          <div className="text-xs text-vibe-gray opacity-60">
            {content.length.toLocaleString()} characters
          </div>
        </div>
        
        <div className="flex-1 panel p-3 md:p-4 overflow-auto min-h-0">
          <pre className="text-xs md:text-sm text-vibe-gray whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FileViewer; 