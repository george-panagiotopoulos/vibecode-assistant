import React, { useState, useEffect } from 'react';
import loggingService from '../services/LoggingService';
import ApiService from '../services/ApiService';

const PromptBuilder = ({ selectedFiles, onPromptEnhancement, config }) => {
  const [prompt, setPrompt] = useState('');
  const [taskType, setTaskType] = useState('development');
  const [includeContext, setIncludeContext] = useState(true);
  const [includeRequirements, setIncludeRequirements] = useState(true);
  const [enhancedSpecification, setEnhancedSpecification] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [enhancementMetadata, setEnhancementMetadata] = useState(null);
  const [currentEnhancementType, setCurrentEnhancementType] = useState('');

  const taskTypes = [
    { value: 'development', label: 'Development', icon: '💻' },
    { value: 'refactoring', label: 'Refactoring', icon: '🔧' },
    { value: 'testing', label: 'Testing', icon: '🧪' },
    { value: 'documentation', label: 'Documentation', icon: '📝' },
    { value: 'review', label: 'Code Review', icon: '👀' }
  ];

  useEffect(() => {
    if (config?.preferences?.default_task_type) {
      setTaskType(config.preferences.default_task_type);
    }
  }, [config]);

  const getSystemPrompt = (enhancementType) => {
    switch (enhancementType) {
      case 'full_specification':
        return `You are an expert AI coding assistant. Transform the user's request into a comprehensive Business Requirements Specification for ${taskType} projects. Provide detailed, actionable specifications that serve as complete Business Requirements Documents.`;
      case 'plan':
        return `You are an expert AI coding assistant. Create a step-by-step implementation plan for the user's request. The plan should be clear, actionable, and no more than 500 words. Focus on the key steps needed to implement the ${taskType} task effectively.`;
      case 'clarity':
        return `You are an expert AI coding assistant. Improve the clarity and language of the user's prompt without adding new details or requirements. Make the prompt clearer, more precise, and better structured while maintaining the original intent and scope.`;
      default:
        return `You are an expert AI coding assistant. Transform the user's request into a comprehensive Business Requirements Specification for ${taskType} projects.`;
    }
  };

  const enhancePrompt = async (enhancementType) => {
    if (!prompt.trim()) {
      setEnhancedSpecification('');
      return;
    }

    setIsEnhancing(true);
    setIsStreaming(true);
    setEnhancedSpecification(''); // Clear previous content
    setCurrentEnhancementType(enhancementType);
    
    loggingService.logInfo(`Starting ${enhancementType} enhancement in PromptBuilder`, {
      promptLength: prompt.length,
      taskType,
      selectedFilesCount: selectedFiles.length,
      enhancementType
    });

    try {
      const systemPrompt = getSystemPrompt(enhancementType);
      const maxTokens = enhancementType === 'plan' ? 1000 : 4000; // Limit tokens for plan to ensure 500 words or less
      
      // Use streaming for the response
      await ApiService.streamResponse(prompt, {
        systemPrompt,
        maxTokens,
        temperature: 0.3,
        onChunk: (chunk) => {
          setEnhancedSpecification(prev => prev + chunk);
        },
        onComplete: () => {
          setIsStreaming(false);
          loggingService.logInfo(`${enhancementType} enhancement completed`);
        },
        onError: (error) => {
          setIsStreaming(false);
          const errorMsg = `Enhancement failed: ${error.message}`;
          setEnhancedSpecification(errorMsg);
          loggingService.logError('streaming_enhancement_error', error.message, {
            prompt: prompt.substring(0, 100) + '...',
            taskType,
            selectedFilesCount: selectedFiles.length,
            enhancementType
          });
        }
      });

      // Also call the original enhancement for logs
      const response = await onPromptEnhancement(prompt, taskType, selectedFiles);
      if (response && response.metadata) {
        setEnhancementMetadata(response.metadata);
      }

    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      const errorMsg = `Enhancement failed: ${error.message}`;
      setEnhancedSpecification(errorMsg);
      setEnhancementMetadata(null);
      setIsStreaming(false);
      loggingService.logError('enhancement_exception', error.message, {
        prompt: prompt.substring(0, 100) + '...',
        taskType,
        selectedFilesCount: selectedFiles.length,
        enhancementType,
        error: error.toString(),
        stack: error.stack
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(enhancedSpecification || prompt);
      loggingService.logInfo('Copied to clipboard successfully');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      loggingService.logError('clipboard_copy', error.message);
    }
  };

  const getTaskIcon = (type) => {
    const task = taskTypes.find(t => t.value === type);
    return task ? task.icon : '💻';
  };

  const getSelectedFilesPreview = () => {
    if (selectedFiles.length === 0) return 'No files selected';
    if (selectedFiles.length === 1) return selectedFiles[0].name;
    return `${selectedFiles.length} files selected`;
  };

  const getEnhancementTypeLabel = (type) => {
    switch (type) {
      case 'full_specification':
        return 'Full Specification';
      case 'plan':
        return 'Implementation Plan';
      case 'clarity':
        return 'Clarity Enhancement';
      default:
        return 'Enhanced Prompt';
    }
  };

  return (
    <div className="h-full flex flex-col bg-vibe-dark">
      {/* Header */}
      <div className="p-6 border-b border-vibe-gray-dark">
        <h2 className="text-xl font-medium text-vibe-gray mb-4">Prompt Builder</h2>
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-vibe-gray mb-2">
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="input-primary w-full"
            >
              {taskTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-vibe-gray mb-2">
              Selected Files
            </label>
            <div className="input-primary w-full cursor-default flex items-center">
              <span className="text-vibe-gray opacity-75">
                📁 {getSelectedFilesPreview()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-vibe-gray">
              Options
            </label>
            <div className="flex flex-col space-y-1">
              <label className="flex items-center text-sm text-vibe-gray">
                <input
                  type="checkbox"
                  checked={includeContext}
                  onChange={(e) => setIncludeContext(e.target.checked)}
                  className="mr-2"
                />
                Include file context
              </label>
              <label className="flex items-center text-sm text-vibe-gray">
                <input
                  type="checkbox"
                  checked={includeRequirements}
                  onChange={(e) => setIncludeRequirements(e.target.checked)}
                  className="mr-2"
                />
                Include requirements
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 space-y-6">
        {/* Prompt Input */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-vibe-gray">
              {getTaskIcon(taskType)} Your Prompt
            </label>
            <div className="text-xs text-vibe-gray opacity-60">
              {prompt.length} characters
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe what you want to ${taskType === 'development' ? 'build' : taskType === 'refactoring' ? 'refactor' : taskType === 'testing' ? 'test' : 'do'}...`}
            className="flex-1 input-primary resize-none font-mono text-sm"
            style={{ minHeight: '200px' }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => enhancePrompt('full_specification')}
              disabled={!prompt.trim() || isEnhancing}
              className="btn-primary disabled:opacity-50"
              title="Generate a comprehensive business requirements specification"
            >
              {isEnhancing && currentEnhancementType === 'full_specification' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Enhancing...') : 
                '📋 Full Specification'
              }
            </button>
            <button
              onClick={() => enhancePrompt('plan')}
              disabled={!prompt.trim() || isEnhancing}
              className="btn-primary disabled:opacity-50"
              title="Generate a step-by-step implementation plan (500 words or less)"
            >
              {isEnhancing && currentEnhancementType === 'plan' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Planning...') : 
                '📝 Plan'
              }
            </button>
            <button
              onClick={() => enhancePrompt('clarity')}
              disabled={!prompt.trim() || isEnhancing}
              className="btn-primary disabled:opacity-50"
              title="Improve the clarity and language of your prompt"
            >
              {isEnhancing && currentEnhancementType === 'clarity' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Clarifying...') : 
                '✨ Clarity'
              }
            </button>
            <button
              onClick={() => {
                setPrompt('');
                setEnhancedSpecification('');
                setEnhancementMetadata(null);
                setCurrentEnhancementType('');
              }}
              className="btn-secondary"
            >
              🗑️ Clear
            </button>
          </div>
          
          {enhancedSpecification && (
            <button
              onClick={copyToClipboard}
              className="btn-secondary"
            >
              📋 Copy Result
            </button>
          )}
        </div>

        {/* Enhanced Specification Preview */}
        {enhancedSpecification && (
          <div className="border-t border-vibe-gray-dark pt-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-vibe-gray">
                🚀 {getEnhancementTypeLabel(currentEnhancementType)}
              </label>
              <div className="text-xs text-vibe-gray opacity-60 flex items-center space-x-4">
                {enhancementMetadata && (
                  <>
                    <span>NFRs: {enhancementMetadata.nfr_count || 0}</span>
                    <span>Files: {enhancementMetadata.file_count || 0}</span>
                    <span>Model: {enhancementMetadata.model_used || 'Claude'}</span>
                  </>
                )}
                <span>{enhancedSpecification.length} characters</span>
                {isStreaming && <span className="text-vibe-blue">● Streaming...</span>}
              </div>
            </div>
            <div className="panel p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-vibe-gray whitespace-pre-wrap font-mono">
                {enhancedSpecification}
                {isStreaming && <span className="animate-pulse">▊</span>}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptBuilder; 