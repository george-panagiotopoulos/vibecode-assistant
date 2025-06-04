import React, { useState } from 'react';
import loggingService from '../services/LoggingService';
import ApiService from '../services/ApiService';
import NonFunctionalRequirementsLoader from './NonFunctionalRequirementsLoader';
import ApplicationArchitectureLoader from './ApplicationArchitectureLoader';

const PromptBuilder = ({ selectedFiles, onPromptEnhancement, config }) => {
  const [prompt, setPrompt] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [includeRequirements, setIncludeRequirements] = useState(true);
  const [considerArchitecture, setConsiderArchitecture] = useState(false);
  const [enhancedSpecification, setEnhancedSpecification] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [enhancementMetadata, setEnhancementMetadata] = useState(null);
  const [currentEnhancementType, setCurrentEnhancementType] = useState('');
  const [nfrLoaderOpen, setNfrLoaderOpen] = useState(false);
  const [archLoaderOpen, setArchLoaderOpen] = useState(false);
  const [selectedNFRs, setSelectedNFRs] = useState([]);
  const [selectedArchLayers, setSelectedArchLayers] = useState([]);

  const getSystemPrompt = (enhancementType) => {
    switch (enhancementType) {
      case 'maximum_detail':
        return `You are an expert AI coding assistant. Create a comprehensive step-by-step implementation guide for the user's request. The guide must contain between 15-25 detailed steps that cover all aspects of the development task. Each step should be specific, actionable, and include technical details. 

CRITICAL REQUIREMENT: For each step in your plan, you must provide detailed instructions on how to satisfy the most relevant non-functional requirements from the provided list. Explicitly reference which NFRs apply to each step and provide specific implementation guidance to meet those requirements.

${considerArchitecture && selectedArchLayers.length > 0 ? 
  'ARCHITECTURE CONSIDERATION: When planning the implementation, consider the provided application architecture layers and ensure your steps align with the architectural components and their relationships. Reference specific architectural layers where relevant.' : ''}

Consider all inputs including non-functional requirements, application architecture layers, selected files, and project context. Structure your response as a numbered list with clear, detailed explanations for each step, ensuring NFR compliance and architectural alignment are addressed throughout the implementation.`;
      case 'balanced':
        return `You are an expert AI coding assistant. Create a balanced step-by-step implementation plan for the user's request. The plan should contain approximately 10 steps that cover the key aspects of the development task. Each step should be clear, actionable, and focused on the most important implementation details. 

${considerArchitecture && selectedArchLayers.length > 0 ? 
  'Consider the provided application architecture layers when planning the implementation steps.' : ''}

Consider all inputs including non-functional requirements, application architecture layers, selected files, and project context. Structure your response as a numbered list.`;
      case 'key_requirements':
        return `You are an expert AI coding assistant. Your task is to:
1. Rephrase the user's requirement with enhanced clarity and precision
2. Provide a condensed, comma-separated list of the selected non-functional requirements
${considerArchitecture && selectedArchLayers.length > 0 ? 
  '3. Summarize the relevant application architecture layers and their key components' : ''}

Focus on making the user's intent crystal clear while presenting the NFRs and architecture context in a concise, easily digestible format. Do not provide implementation steps - only clarify what needs to be built and what constraints must be satisfied.`;
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
      nfrCount: selectedNFRs.length,
      archLayerCount: selectedArchLayers.length,
      considerArchitecture
    });

    try {
      const systemPrompt = getSystemPrompt(enhancementType);
      
      // Set token limits based on enhancement type
      let maxTokens;
      switch (enhancementType) {
        case 'full_specification':
          maxTokens = 6000; // Increased for detailed specification
          break;
        case 'enhanced_prompt':
          maxTokens = 3000; // Moderate for enhanced prompt
          break;
        case 'rephrase':
          maxTokens = 2000; // Focused for rephrasing
          break;
        default:
          maxTokens = 4000;
      }
      
      // Check if we should use the architecture-enhanced endpoint
      const useArchitectureEnhancement = considerArchitecture && selectedArchLayers.length > 0;
      
      if (useArchitectureEnhancement) {
        // Use the new architecture-enhanced API endpoint
        loggingService.logInfo('Using architecture-enhanced prompt building', {
          architectureLayersCount: selectedArchLayers.length,
          totalComponents: selectedArchLayers.reduce((sum, layer) => sum + (layer.nodeCount || 0), 0)
        });
        
        try {
          const response = await ApiService.enhancePromptWithArchitecture(prompt, {
            selectedFiles,
            architectureLayers: selectedArchLayers,
            requirements: selectedNFRs,
            enhancementType,
            considerArchitecture
          });
          
          // Ensure we have a valid response with enhanced_prompt
          if (!response || typeof response.enhanced_prompt !== 'string') {
            throw new Error('Invalid response format: enhanced_prompt must be a string');
          }
          
          // Set the enhanced prompt directly from the response
          setEnhancedSpecification(response.enhanced_prompt);
          setIsStreaming(false);
          
          // Set metadata from the architecture-enhanced response
          setEnhancementMetadata({
            ...response.metadata,
            complexity_analysis: response.complexity_analysis,
            integration_status: response.integration_status,
            enhancement_type: enhancementType,
            architecture_enhanced: true
          });
          
          loggingService.logInfo('Architecture-enhanced prompt building completed', {
            responseLength: response.enhanced_prompt?.length || 0,
            complexityLevel: response.complexity_analysis?.estimated_complexity || 'unknown',
            architectureLayersProcessed: response.metadata?.architecture_layers_count || 0
          });
          
          return; // Exit early since we got the response directly
          
        } catch (archError) {
          loggingService.logError('architecture_enhancement_failed', archError.message, {
            fallbackToStreaming: true
          });
          // Fall back to streaming approach if architecture enhancement fails
        }
      }
      
      // Build the enhanced prompt with all available context (fallback or non-architecture mode)
      let enhancedPrompt = prompt;
      
      // Add Non-Functional Requirements if selected
      if (selectedNFRs.length > 0) {
        const nfrSection = '\n\nNon-Functional Requirements:\n' + 
          selectedNFRs.map(nfr => `- ${nfr.name}: ${nfr.description}`).join('\n');
        enhancedPrompt += nfrSection;
      }
      
      // Add Application Architecture Layers if selected and enabled
      if (considerArchitecture && selectedArchLayers.length > 0) {
        const archSection = '\n\nApplication Architecture Layers:\n' + 
          selectedArchLayers.map(layer => {
            const componentList = layer.nodes.slice(0, 10).map(node => node.name).join(', ');
            const moreComponents = layer.nodeCount > 10 ? ` and ${layer.nodeCount - 10} more components` : '';
            return `- ${layer.name} (${layer.nodeCount} components): ${componentList}${moreComponents}`;
          }).join('\n');
        enhancedPrompt += archSection;
      }
      
      // Add selected files context if available
      if (selectedFiles.length > 0) {
        const filesSection = '\n\nSelected Files Context:\n' + 
          selectedFiles.map(file => `- ${file.name} (${file.type || 'file'})`).join('\n');
        enhancedPrompt += filesSection;
      }
      
      // Add specific instructions based on enhancement type
      if (enhancementType === 'full_specification') {
        enhancedPrompt += '\n\nPlease provide a comprehensive specification with detailed implementation steps. For each step, include specific instructions on how to satisfy the most relevant non-functional requirements from the list provided.';
        if (considerArchitecture && selectedArchLayers.length > 0) {
          enhancedPrompt += ' Also ensure each step considers the relevant application architecture layers and their components.';
        }
      } else if (enhancementType === 'enhanced_prompt') {
        enhancedPrompt += '\n\nPlease provide an enhanced version of this prompt with additional context and clarity.';
        if (considerArchitecture && selectedArchLayers.length > 0) {
          enhancedPrompt += ' Consider the application architecture layers when enhancing the prompt.';
        }
      } else if (enhancementType === 'rephrase') {
        enhancedPrompt += '\n\nPlease rephrase this requirement with enhanced clarity and precision.';
        if (selectedNFRs.length > 0) {
          enhancedPrompt += ' Also provide a condensed summary of the selected non-functional requirements.';
        }
        if (considerArchitecture && selectedArchLayers.length > 0) {
          enhancedPrompt += ' Also summarize the relevant application architecture layers and their key components.';
        }
      }
      
      // Use streaming for the response (fallback mode)
      await ApiService.streamResponse(enhancedPrompt, {
        systemPrompt,
        maxTokens,
        temperature: 0.3,
        onChunk: (chunk) => {
          setEnhancedSpecification(prev => prev + chunk);
        },
        onComplete: () => {
          setIsStreaming(false);
          loggingService.logInfo(`${enhancementType} enhancement completed (streaming mode)`);
        },
        onError: (error) => {
          setIsStreaming(false);
          const errorMsg = `Enhancement failed: ${error.message}`;
          setEnhancedSpecification(errorMsg);
          loggingService.logError('streaming_enhancement_error', error.message, {
            prompt: prompt.substring(0, 100) + '...',
            selectedFilesCount: selectedFiles.length,
            enhancementType,
            nfrCount: selectedNFRs.length,
            archLayerCount: selectedArchLayers.length,
            considerArchitecture
          });
        }
      });

      // Also call the original enhancement for logs (if not using architecture enhancement)
      if (!useArchitectureEnhancement) {
        const response = await onPromptEnhancement(enhancedPrompt, 'development', selectedFiles);
        if (response && response.metadata) {
          setEnhancementMetadata(response.metadata);
        }
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
        archLayerCount: selectedArchLayers.length,
        considerArchitecture,
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
      case 'full_specification':
        return 'Full Specification';
      case 'enhanced_prompt':
        return 'Enhanced Prompt';
      case 'rephrase':
        return 'Rephrase';
      case 'maximum_detail':
        return 'Full Specification'; // Legacy support
      case 'balanced':
        return 'Enhanced Prompt'; // Legacy support
      case 'key_requirements':
        return 'Rephrase'; // Legacy support
      default:
        return 'Enhanced Specification';
    }
  };

  const handleNFRSelection = (nodes) => {
    setSelectedNFRs(nodes);
    loggingService.logInfo('Non-Functional Requirements nodes selected for prompt', {
      nodeCount: nodes.length,
      nodeNames: nodes.map(n => n.name)
    });
  };

  const handleArchLayerSelection = (layers) => {
    setSelectedArchLayers(layers);
    loggingService.logInfo('Application Architecture layers selected for prompt', {
      layerCount: layers.length,
      layerNames: layers.map(l => l.name),
      totalComponents: layers.reduce((sum, layer) => sum + layer.nodeCount, 0)
    });
  };

  const removeNFR = (nodeId) => {
    setSelectedNFRs(prev => prev.filter(nfr => nfr.id !== nodeId));
  };

  const removeArchLayer = (layerName) => {
    setSelectedArchLayers(prev => prev.filter(layer => layer.name !== layerName));
  };

  return (
    <div className="h-full flex flex-col bg-vibe-dark">
      {/* Header */}
      <div className="p-6 border-b border-vibe-gray-dark">
        <h2 className="text-xl font-medium text-vibe-gray mb-4">Prompt Builder</h2>
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              Application Architecture
            </label>
            <button
              onClick={() => setArchLoaderOpen(true)}
              className="btn-add w-full"
            >
              🏗️ Load Application Architecture ({selectedArchLayers.length})
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
              <label className="flex items-center text-sm text-vibe-gray">
                <input
                  type="checkbox"
                  checked={considerArchitecture}
                  onChange={(e) => setConsiderArchitecture(e.target.checked)}
                  className="mr-2"
                />
                Consider application architecture
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

        {/* Selected Application Architecture Layers Display */}
        {selectedArchLayers.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-vibe-gray mb-2">
              Selected Application Architecture Layers ({selectedArchLayers.length})
            </label>
            <div className="panel p-3 max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {selectedArchLayers.map((layer) => (
                  <div key={layer.name} className="flex items-start justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-vibe-gray flex items-center space-x-2">
                        <span>🏗️ {layer.name}</span>
                        <span className="text-xs bg-vibe-blue text-white px-2 py-1 rounded">
                          {layer.nodeCount} components
                        </span>
                      </div>
                      <div className="text-vibe-gray opacity-60 text-xs mt-1">
                        {layer.nodes.slice(0, 3).map(node => node.name).join(', ')}
                        {layer.nodeCount > 3 && ` and ${layer.nodeCount - 3} more`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeArchLayer(layer.name)}
                      className="text-vibe-red hover:text-red-400 ml-2"
                      title="Remove Architecture Layer"
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
              onClick={() => enhancePrompt('full_specification')}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Generate a comprehensive functional and non-functional specification with detailed task planning${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
            >
              {isEnhancing && currentEnhancementType === 'full_specification' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Enhancing...') : 
                `📋 Full Specification${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
              }
            </button>
            <button
              onClick={() => enhancePrompt('enhanced_prompt')}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Generate a structured 8-12 step implementation plan with clear requirements${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
            >
              {isEnhancing && currentEnhancementType === 'enhanced_prompt' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Planning...') : 
                `📝 Enhanced Prompt${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
              }
            </button>
            <button
              onClick={() => enhancePrompt('rephrase')}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Rephrase the user prompt for clarity and conciseness without adding new instructions${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
            >
              {isEnhancing && currentEnhancementType === 'rephrase' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Rephrasing...') : 
                `✨ Rephrase${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
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
              <label className="text-sm font-medium text-vibe-gray flex items-center space-x-2">
                <span>🚀 {getEnhancementTypeLabel(currentEnhancementType)}</span>
                {enhancementMetadata?.architecture_enhanced && (
                  <span className="text-xs bg-vibe-blue text-white px-2 py-1 rounded flex items-center space-x-1">
                    <span>🏗️</span>
                    <span>Architecture Enhanced</span>
                  </span>
                )}
              </label>
              <div className="text-xs text-vibe-gray opacity-60 flex items-center space-x-4">
                {enhancementMetadata && (
                  <>
                    <span>Non-Functional Requirements: {enhancementMetadata.requirements_count || selectedNFRs.length || 0}</span>
                    <span>Architecture Layers: {enhancementMetadata.architecture_layers_count || selectedArchLayers.length || 0}</span>
                    {enhancementMetadata.total_components && (
                      <span>Components: {enhancementMetadata.total_components}</span>
                    )}
                    <span>Files: {enhancementMetadata.selected_files_count || enhancementMetadata.file_count || 0}</span>
                    {enhancementMetadata.complexity_analysis?.estimated_complexity && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        enhancementMetadata.complexity_analysis.estimated_complexity === 'high' ? 'bg-vibe-red text-white' :
                        enhancementMetadata.complexity_analysis.estimated_complexity === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-vibe-green text-white'
                      }`}>
                        Complexity: {enhancementMetadata.complexity_analysis.estimated_complexity}
                      </span>
                    )}
                    <span>Model: {enhancementMetadata.model_used || 'Claude'}</span>
                  </>
                )}
                <span>{enhancedSpecification.length} characters</span>
                {isStreaming && <span className="text-vibe-blue">● Streaming...</span>}
              </div>
            </div>
            
            {/* Architecture Integration Status */}
            {enhancementMetadata?.integration_status && (
              <div className="mb-3 p-2 bg-vibe-darker rounded border border-vibe-gray-dark">
                <div className="text-xs text-vibe-gray flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <span className={`w-2 h-2 rounded-full ${enhancementMetadata.integration_status.neo4j_available ? 'bg-vibe-green' : 'bg-vibe-red'}`}></span>
                    <span>Neo4j: {enhancementMetadata.integration_status.neo4j_available ? 'Connected' : 'Unavailable'}</span>
                  </span>
                  {enhancementMetadata.integration_status.architecture_layers_processed && (
                    <span>Processed: {enhancementMetadata.integration_status.architecture_layers_processed} layers</span>
                  )}
                  {enhancementMetadata.complexity_analysis?.recommendations?.length > 0 && (
                    <span className="text-vibe-blue">
                      {enhancementMetadata.complexity_analysis.recommendations.length} recommendations available
                    </span>
                  )}
                </div>
              </div>
            )}
            
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

      {/* Application Architecture Loader Modal */}
      <ApplicationArchitectureLoader
        isOpen={archLoaderOpen}
        onClose={() => setArchLoaderOpen(false)}
        onLayersSelected={handleArchLayerSelection}
      />
    </div>
  );
};

export default PromptBuilder; 