import React, { useState, useEffect } from 'react';
import loggingService from '../services/LoggingService';
import ApiService from '../services/ApiService';
import NonFunctionalRequirementsLoader from './NonFunctionalRequirementsLoader';

const PromptBuilder = ({ selectedFiles, onPromptEnhancement, config }) => {
  const [prompt, setPrompt] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [includeRequirements, setIncludeRequirements] = useState(true);
  const [enhancedSpecification, setEnhancedSpecification] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [enhancementMetadata, setEnhancementMetadata] = useState(null);
  const [currentEnhancementType, setCurrentEnhancementType] = useState('');
  const [nfrLoaderOpen, setNfrLoaderOpen] = useState(false);
  const [selectedNFRs, setSelectedNFRs] = useState([]);

  const getSystemPrompt = (enhancementType) => {
    switch (enhancementType) {
      case 'maximum_detail':
        return `You are an expert AI coding assistant. Create a comprehensive step-by-step implementation guide for the user's request. The guide must contain between 15-25 detailed steps that cover all aspects of the development task. Each step should be specific, actionable, and include technical details. 

CRITICAL REQUIREMENT: For each step in your plan, you must provide detailed instructions on how to satisfy the most relevant non-functional requirements from the provided list. Explicitly reference which NFRs apply to each step and provide specific implementation guidance to meet those requirements.

Consider all inputs including non-functional requirements, selected files, and project context. Structure your response as a numbered list with clear, detailed explanations for each step, ensuring NFR compliance is addressed throughout the implementation.`;
      case 'balanced':
        return `You are an expert AI coding assistant. Create a balanced step-by-step implementation plan for the user's request. The plan should contain approximately 10 steps that cover the key aspects of the development task. Each step should be clear, actionable, and focused on the most important implementation details. Consider all inputs including non-functional requirements, selected files, and project context. Structure your response as a numbered list.`;
      case 'key_requirements':
        return `You are an expert AI coding assistant. Your task is to:
1. Rephrase the user's requirement with enhanced clarity and precision
2. Provide a condensed, comma-separated list of the selected non-functional requirements

Focus on making the user's intent crystal clear while presenting the NFRs in a concise, easily digestible format. Do not provide implementation steps - only clarify what needs to be built and what constraints must be satisfied.`;
      default:
        return `You are an expert AI coding assistant. Transform the user's request into a comprehensive Business Requirements Specification for development projects.`;
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
      selectedFilesCount: selectedFiles.length,
      enhancementType,
      nfrCount: selectedNFRs.length
    });

    try {
      const systemPrompt = getSystemPrompt(enhancementType);
      
      // Set token limits based on enhancement type
      let maxTokens;
      switch (enhancementType) {
        case 'maximum_detail':
          maxTokens = 6000; // Increased for detailed step-by-step guide
          break;
        case 'balanced':
          maxTokens = 3000; // Moderate for balanced plan
          break;
        case 'key_requirements':
          maxTokens = 2000; // Focused for key requirements
          break;
        default:
          maxTokens = 4000;
      }
      
      // Build the enhanced prompt with all available context
      let enhancedPrompt = prompt;
      
      // Add Non-Functional Requirements if selected
      if (selectedNFRs.length > 0) {
        const nfrSection = '\n\nNon-Functional Requirements:\n' + 
          selectedNFRs.map(nfr => `- ${nfr.name}: ${nfr.description}`).join('\n');
        enhancedPrompt += nfrSection;
      }
      
      // Add selected files context if available
      if (selectedFiles.length > 0) {
        const filesSection = '\n\nSelected Files Context:\n' + 
          selectedFiles.map(file => `- ${file.name} (${file.type || 'file'})`).join('\n');
        enhancedPrompt += filesSection;
      }
      
      // Add specific instructions based on enhancement type
      if (enhancementType === 'maximum_detail') {
        enhancedPrompt += '\n\nPlease provide a detailed step-by-step implementation guide with 15-25 comprehensive steps. For each step, include specific instructions on how to satisfy the most relevant non-functional requirements from the list provided.';
      } else if (enhancementType === 'balanced') {
        enhancedPrompt += '\n\nPlease provide a balanced step-by-step plan with approximately 10 key steps.';
      } else if (enhancementType === 'key_requirements') {
        enhancedPrompt += '\n\nPlease rephrase my requirement with enhanced clarity and precision, then provide a condensed comma-separated list of the selected non-functional requirements.';
      }
      
      // Use streaming for the response
      await ApiService.streamResponse(enhancedPrompt, {
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
            selectedFilesCount: selectedFiles.length,
            enhancementType,
            nfrCount: selectedNFRs.length
          });
        }
      });

      // Also call the original enhancement for logs
      const response = await onPromptEnhancement(enhancedPrompt, 'development', selectedFiles);
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
        selectedFilesCount: selectedFiles.length,
        enhancementType,
        nfrCount: selectedNFRs.length,
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

  const getSelectedFilesPreview = () => {
    if (selectedFiles.length === 0) return 'No files selected';
    if (selectedFiles.length === 1) return selectedFiles[0].name;
    return `${selectedFiles.length} files selected`;
  };

  const getEnhancementTypeLabel = (type) => {
    switch (type) {
      case 'maximum_detail':
        return 'Maximum Detail Guide';
      case 'balanced':
        return 'Balanced Plan';
      case 'key_requirements':
        return 'Key Requirements Analysis';
      default:
        return 'Enhanced Prompt';
    }
  };

  const handleNFRSelection = (nodes) => {
    setSelectedNFRs(nodes);
    loggingService.logInfo('Non-Functional Requirements nodes selected for prompt', {
      nodeCount: nodes.length,
      nodeNames: nodes.map(n => n.name)
    });
  };

  const removeNFR = (nodeId) => {
    setSelectedNFRs(prev => prev.filter(nfr => nfr.id !== nodeId));
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
              Non-Functional Requirements
            </label>
            <button
              onClick={() => setNfrLoaderOpen(true)}
              className="btn-add w-full"
            >
              📋 Load Non-Functional Requirements ({selectedNFRs.length})
            </button>
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

        {/* Selected Non-Functional Requirements Display */}
        {selectedNFRs.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-vibe-gray mb-2">
              Selected Non-Functional Requirements ({selectedNFRs.length})
            </label>
            <div className="panel p-3 max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {selectedNFRs.map((nfr) => (
                  <div key={nfr.id} className="flex items-start justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-vibe-gray">{nfr.name}</div>
                      <div className="text-vibe-gray opacity-60 text-xs">{nfr.description}</div>
                    </div>
                    <button
                      onClick={() => removeNFR(nfr.id)}
                      className="text-vibe-red hover:text-red-400 ml-2"
                      title="Remove Non-Functional Requirement"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 space-y-6">
        {/* Prompt Input */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-vibe-gray">
              Your Prompt
            </label>
            <div className="text-xs text-vibe-gray opacity-60">
              {prompt.length} characters
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe what you want to build...`}
            className="flex-1 input-primary resize-none font-mono text-sm"
            style={{ minHeight: '200px' }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => enhancePrompt('maximum_detail')}
              disabled={!prompt.trim() || isEnhancing}
              className="btn-standard disabled:opacity-50"
              title="Generate a comprehensive step-by-step implementation guide (15-25 detailed steps)"
            >
              {isEnhancing && currentEnhancementType === 'maximum_detail' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Enhancing...') : 
                '📋 Maximum Detail'
              }
            </button>
            <button
              onClick={() => enhancePrompt('balanced')}
              disabled={!prompt.trim() || isEnhancing}
              className="btn-standard disabled:opacity-50"
              title="Generate a balanced step-by-step implementation plan (approximately 10 steps)"
            >
              {isEnhancing && currentEnhancementType === 'balanced' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Planning...') : 
                '📝 Balanced'
              }
            </button>
            <button
              onClick={() => enhancePrompt('key_requirements')}
              disabled={!prompt.trim() || isEnhancing}
              className="btn-standard disabled:opacity-50"
              title="Analyze and extract key requirements and essential components"
            >
              {isEnhancing && currentEnhancementType === 'key_requirements' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Analyzing...') : 
                '✨ Key Requirements'
              }
            </button>
            <button
              onClick={() => {
                setPrompt('');
                setEnhancedSpecification('');
                setEnhancementMetadata(null);
                setCurrentEnhancementType('');
              }}
              className="btn-delete"
            >
              🗑️ Clear
            </button>
          </div>
          
          {enhancedSpecification && (
            <button
              onClick={copyToClipboard}
              className="btn-standard"
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
                    <span>Non-Functional Requirements: {enhancementMetadata.nfr_count || 0}</span>
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

      {/* Non-Functional Requirements Loader Modal */}
      <NonFunctionalRequirementsLoader
        isOpen={nfrLoaderOpen}
        onClose={() => setNfrLoaderOpen(false)}
        onNodesSelected={handleNFRSelection}
      />
    </div>
  );
};

export default PromptBuilder; 