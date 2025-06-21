import React, { useState, useEffect, useRef, useCallback } from 'react';
import loggingService from '../services/LoggingService';
import ApiService from '../services/ApiService';
import NonFunctionalRequirementsLoader from './NonFunctionalRequirementsLoader';
import ApplicationArchitectureLoader from './ApplicationArchitectureLoader';
import autoScrollService from '../services/AutoScrollService';
import './PromptBuilder.css';
import '../styles/PromptBuilderScrollbar.css';

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

  // Enhanced UI State Management for Dynamic Sizing and UX Enhancements
  const [uiState, setUiState] = useState({
    nfrSectionCollapsed: false,        // NFR section collapse state
    archSectionCollapsed: false,       // Architecture section collapse state
    responseBoxExpanded: true,         // Response box expansion state - default to true for dynamic sizing
    autoExpandResponse: true,          // Auto-expand preference - enabled by default
    autoScrollEnabled: true,           // Auto-scroll preference
    dynamicSizing: true,               // Enable dynamic sizing by default
    minHeight: 200,                    // Minimum height for response box
    maxHeight: 800                     // Maximum height for response box (increased from 600)
  });

  // NEW: Ref for dynamic response box sizing (NFR 10: Performance optimization)
  const responseBoxRef = useRef(null);

  // Custom instructions modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [customInstructionsError, setCustomInstructionsError] = useState('');

  // Enhanced auto-scroll integration with performance optimization
  useEffect(() => {
    if (responseBoxRef.current) {
      const success = autoScrollService.registerScrollTarget('response-box', responseBoxRef.current, {
        scrollThreshold: 50,
        scrollBehavior: 'smooth',
        userOverrideTimeout: 3000,
        debounceDelay: 50 // Reduced debounce delay for better responsiveness
      });
      
      if (success) {
        loggingService.logInfo('Response box registered for auto-scrolling', {
          element: 'response-box',
          autoScrollEnabled: uiState.autoScrollEnabled,
          dynamicSizing: uiState.dynamicSizing
        });
      }
    }

    // Cleanup on unmount
    return () => {
      autoScrollService.unregisterScrollTarget('response-box');
    };
  }, [uiState.autoScrollEnabled, uiState.dynamicSizing]);

  // Step 1: Enhanced auto-scroll control based on streaming state
  useEffect(() => {
    if (uiState.autoScrollEnabled && responseBoxRef.current) {
      if (isStreaming) {
        autoScrollService.startStreaming('response-box');
        loggingService.logInfo('Auto-scroll started for streaming content');
      } else {
        autoScrollService.stopStreaming('response-box');
        loggingService.logInfo('Auto-scroll stopped - streaming ended');
      }
    }
  }, [isStreaming, uiState.autoScrollEnabled]);

  // Step 1: Enhanced content updates for auto-scrolling with performance optimization
  useEffect(() => {
    if (uiState.autoScrollEnabled && enhancedSpecification && isStreaming && responseBoxRef.current) {
      // Step 6: Debounced content update to improve performance
      const timeoutId = setTimeout(() => {
        autoScrollService.onContentUpdate('response-box', enhancedSpecification);
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [enhancedSpecification, uiState.autoScrollEnabled, isStreaming]);

  /**
   * Step 1: Auto-check architecture checkbox when architecture layers are loaded
   * NFR 1: Clear and readable code with descriptive function names
   * NFR 6: Clear naming conventions
   */
  useEffect(() => {
    // Auto-enable architecture consideration when layers are loaded
    if (selectedArchLayers.length > 0 && !considerArchitecture) {
      setConsiderArchitecture(true);
      loggingService.logInfo('Auto-enabled architecture consideration', {
        layersCount: selectedArchLayers.length,
        reason: 'architecture_layers_loaded'
      });
    }
  }, [selectedArchLayers, considerArchitecture]);

  /**
   * Enhanced auto-expand response box with improved dynamic sizing
   * Performance optimization with debounced resize and better calculations
   * Responsive design considerations
   */
  useEffect(() => {
    if (uiState.autoExpandResponse && uiState.dynamicSizing && enhancedSpecification && responseBoxRef.current) {
      const element = responseBoxRef.current;
      
      // Debounced resize calculation for better performance
      const timeoutId = setTimeout(() => {
        const lineHeight = 20; // Approximate line height in pixels
        // Ensure enhancedSpecification is a string before calling split
        const specText = typeof enhancedSpecification === 'string' ? enhancedSpecification : String(enhancedSpecification || '');
        const lines = specText.split('\n').length;
        const padding = 32; // Account for padding
        
        // More responsive height calculation
        const calculatedHeight = Math.min(
          Math.max(lines * lineHeight + padding, uiState.minHeight), 
          uiState.maxHeight
        );
        
        // Apply height with smooth transition
        element.style.transition = 'height 0.3s ease';
        element.style.height = `${calculatedHeight}px`;
        
        // Handle auto-scroll during streaming with improved logic
        if (isStreaming && uiState.autoScrollEnabled) {
          // Let AutoScrollService handle scrolling automatically
          autoScrollService.onContentUpdate('response-box', specText);
          
          loggingService.logInfo('Dynamic sizing applied with auto-scroll', {
            calculatedHeight,
            lines,
            isStreaming,
            contentLength: specText.length
          });
        }
      }, 100); // Debounce for performance
      
      return () => clearTimeout(timeoutId);
    }
  }, [enhancedSpecification, uiState.autoExpandResponse, uiState.dynamicSizing, isStreaming, uiState.autoScrollEnabled, uiState.minHeight, uiState.maxHeight]);

  /**
   * Step 2 & 3: Generic toggle function for collapsible sections
   * NFR 2: Generic, flexible code to avoid duplication
   * NFR 7: Easy to refactor and extend
   */
  const toggleSectionCollapse = (sectionKey) => {
    setUiState(prevState => ({
      ...prevState,
      [sectionKey]: !prevState[sectionKey]
    }));
    
    loggingService.logInfo('Section visibility toggled', {
      section: sectionKey,
      newState: !uiState[sectionKey]
    });
  };

  /**
   * Step 4: Toggle response box expansion mode
   * NFR 12: Consistent user experience
   */
  const toggleResponseExpansion = () => {
    setUiState(prevState => {
      const newAutoExpandResponse = !prevState.autoExpandResponse;
      loggingService.logInfo('Response expansion toggled', {
        newState: newAutoExpandResponse,
        dynamicSizing: prevState.dynamicSizing
      });
      
      return {
        ...prevState,
        autoExpandResponse: newAutoExpandResponse,
        responseBoxExpanded: newAutoExpandResponse,
        dynamicSizing: newAutoExpandResponse // Link dynamic sizing to auto-expand
      };
    });
  };

  /**
   * NEW: Toggle auto-scroll functionality
   * Allows users to enable/disable auto-scrolling during streaming
   */
  const toggleAutoScroll = () => {
    setUiState(prevState => {
      const newAutoScrollEnabled = !prevState.autoScrollEnabled;
      
      // Update AutoScrollService based on new state
      if (newAutoScrollEnabled && isStreaming && responseBoxRef.current) {
        autoScrollService.startStreaming('response-box');
      } else if (!newAutoScrollEnabled) {
        autoScrollService.stopStreaming('response-box');
      }
      
      loggingService.logInfo('Auto-scroll toggled', {
        enabled: newAutoScrollEnabled,
        isStreaming,
        hasResponseBox: !!responseBoxRef.current
      });
      
      return {
        ...prevState,
        autoScrollEnabled: newAutoScrollEnabled
      };
    });
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
      // Set token limits based on enhancement type
      let maxTokens;
      switch (enhancementType) {
        case 'full_specification':
          maxTokens = 6000;
          break;
        case 'enhanced_prompt':
          maxTokens = 3000;
          break;
        case 'rephrase':
          maxTokens = 2000;
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
      
      // Use streaming for the response - backend handles system prompt via prompt_config.json
      await ApiService.streamResponse(enhancedPrompt, {
        enhancementType, // Let backend determine system prompt from config
        maxTokens,
        temperature: 0.3,
        timeout: 120000, // 2 minutes timeout
        onChunk: (chunk) => {
          // Ensure chunk is always a string
          const chunkStr = typeof chunk === 'string' ? chunk : String(chunk || '');
          setEnhancedSpecification(prev => {
            const prevStr = typeof prev === 'string' ? prev : String(prev || '');
            return prevStr + chunkStr;
          });
        },
        onComplete: () => {
          setIsStreaming(false);
          loggingService.logInfo(`${enhancementType} enhancement completed (streaming mode)`);
        },
        onError: (error) => {
          setIsStreaming(false);
          const errorMsg = `Enhancement failed: ${error.message || 'Unknown error'}`;
          setEnhancedSpecification(errorMsg);
          loggingService.logError('streaming_enhancement_error', error.message || 'Unknown error', {
            prompt: prompt.substring(0, 100) + '...',
            selectedFilesCount: selectedFiles.length,
            enhancementType,
            nfrCount: selectedNFRs.length,
            archLayerCount: selectedArchLayers.length,
            considerArchitecture
          });
        }
      });

      // Set basic metadata for streaming mode
      setEnhancementMetadata({
        enhancement_type: enhancementType,
        requirements_count: selectedNFRs.length,
        architecture_layers_count: selectedArchLayers.length,
        selected_files_count: selectedFiles.length,
        model_used: 'Claude (Streaming)',
        architecture_enhanced: false
      });

    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      const errorMsg = `Enhancement failed: ${error.message || 'Unknown error'}`;
      setEnhancedSpecification(errorMsg);
      setEnhancementMetadata(null);
      setIsStreaming(false);
      loggingService.logError('enhancement_exception', error.message || 'Unknown error', {
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
        return 'Enhanced Implementation Plan';
      case 'rephrase':
        return 'Rephrased Prompt';
      case 'custom':
        return 'Custom Instructions';
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

  // Custom instructions handlers
  const openCustomModal = () => {
    setShowCustomModal(true);
    setCustomInstructionsError('');
  };

  const closeCustomModal = () => {
    setShowCustomModal(false);
    setCustomInstructions('');
    setCustomInstructionsError('');
  };

  const handleCustomInstructionsSubmit = async () => {
    if (!customInstructions.trim()) {
      setCustomInstructionsError('Custom instructions cannot be empty');
      return;
    }

    if (customInstructions.length > 2000) {
      setCustomInstructionsError('Custom instructions must be 2000 characters or less');
      return;
    }

    try {
      setShowCustomModal(false);
      await enhancePromptWithCustomInstructions(customInstructions);
    } catch (error) {
      setCustomInstructionsError(`Failed to process custom instructions: ${error.message}`);
    }
  };

  const enhancePromptWithCustomInstructions = async (instructions) => {
    if (!prompt.trim()) {
      setEnhancedSpecification('');
      return;
    }

    setIsEnhancing(true);
    setIsStreaming(false); // Custom instructions use regular API, not streaming
    setEnhancedSpecification('');
    setCurrentEnhancementType('custom');
    
    loggingService.logInfo('Starting custom enhancement in PromptBuilder', {
      promptLength: prompt.length,
      selectedFilesCount: selectedFiles.length,
      customInstructionsLength: instructions.length,
      nfrCount: selectedNFRs.length,
      archLayerCount: selectedArchLayers.length,
      considerArchitecture
    });

    try {
      // Prepare requirements for the API - consistent with other buttons
      const requirements = selectedNFRs.map(nfr => `${nfr.name}: ${nfr.description}`);
      
      // For custom instructions, we need to use the architecture-enhanced endpoint
      // if architecture is enabled, otherwise use the regular endpoint
      let result;
      
      if (considerArchitecture && selectedArchLayers.length > 0) {
        // Use architecture-enhanced endpoint for consistency with other buttons
        result = await ApiService.enhancePromptWithArchitecture(prompt, {
          selectedFiles: selectedFiles,
          architectureLayers: selectedArchLayers,
          requirements: requirements,
          enhancementType: 'custom',
          considerArchitecture: considerArchitecture,
          customInstructions: instructions
        });
      } else {
        // Use regular endpoint but with proper data structure
        result = await ApiService.enhancePrompt(
          prompt,
          'custom',
          selectedFiles,
          instructions
        );
      }

      // Handle different response formats from the API
      let enhancedText = '';
      
      if (result.enhanced_specification) {
        // Handle nested response structure
        if (typeof result.enhanced_specification === 'object' && result.enhanced_specification.enhanced_prompt) {
          enhancedText = String(result.enhanced_specification.enhanced_prompt || '');
        } else {
          enhancedText = String(result.enhanced_specification || '');
        }
      } else if (result.enhanced_prompt) {
        // Handle direct enhanced_prompt field
        enhancedText = String(result.enhanced_prompt || '');
      } else {
        // Fallback to the entire result if it's a string
        enhancedText = typeof result === 'string' ? result : String(result || '');
      }

      if (enhancedText.trim()) {
        setEnhancedSpecification(enhancedText);
        
        // Set metadata for custom enhancement - consistent with other buttons
        setEnhancementMetadata({
          enhancement_type: 'custom',
          requirements_count: selectedNFRs.length,
          architecture_layers_count: selectedArchLayers.length,
          selected_files_count: selectedFiles.length,
          model_used: 'Claude (Custom Instructions)',
          architecture_enhanced: considerArchitecture && selectedArchLayers.length > 0,
          custom_instructions_length: instructions.length,
          custom_instructions_used: true,
          nfr_requirements_included: selectedNFRs.length > 0,
          architecture_context_included: considerArchitecture && selectedArchLayers.length > 0,
          ...(result.metadata || {})
        });

        loggingService.logInfo('Custom enhancement completed successfully', {
          enhancedTextLength: enhancedText.length,
          hasMetadata: !!result.metadata,
          nfrIncluded: selectedNFRs.length > 0,
          archIncluded: considerArchitecture && selectedArchLayers.length > 0
        });
      } else {
        throw new Error('No enhanced specification received from API');
      }

    } catch (error) {
      const errorMsg = `Custom enhancement failed: ${error.message || 'Unknown error'}`;
      setEnhancedSpecification(errorMsg);
      loggingService.logError('custom_enhancement_error', error.message || 'Unknown error', {
        prompt: prompt.substring(0, 100) + '...',
        selectedFilesCount: selectedFiles.length,
        customInstructionsLength: instructions.length,
        nfrCount: selectedNFRs.length,
        archLayerCount: selectedArchLayers.length,
        considerArchitecture
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  /**
   * Step 9: Keyboard navigation support for accessibility
   * NFR 9: Accessibility compliance with WCAG guidelines
   */
  const handleKeyboardNavigation = (event) => {
    // Ctrl/Cmd + Enter to enhance prompt
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && prompt.trim() && !isEnhancing) {
      event.preventDefault();
      enhancePrompt('enhanced_prompt');
    }
    
    // Ctrl/Cmd + Shift + Enter for full specification
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Enter' && prompt.trim() && !isEnhancing) {
      event.preventDefault();
      enhancePrompt('full_specification');
    }
    
    // Escape to stop streaming
    if (event.key === 'Escape' && isStreaming) {
      event.preventDefault();
      // Stop streaming logic would go here
      loggingService.logInfo('Streaming stopped via keyboard shortcut');
    }
    
    // Ctrl/Cmd + S to toggle auto-scroll
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      toggleAutoScroll();
    }
  };

  // Step 9: Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [prompt, isEnhancing, isStreaming]);

  /**
   * Step 7: Enhanced error handling for scroll-related edge cases
   * NFR 7: Robust error handling and system reliability
   */
  const handleScrollError = (error, context) => {
    loggingService.logError('Scroll operation failed', {
      error: error.message,
      context,
      autoScrollEnabled: uiState.autoScrollEnabled,
      isStreaming,
      hasResponseBox: !!responseBoxRef.current
    });
    
    // Graceful degradation - disable auto-scroll on persistent errors
    if (context === 'auto-scroll-failure') {
      setUiState(prevState => ({
        ...prevState,
        autoScrollEnabled: false
      }));
    }
  };

  /**
   * Step 6: Performance-optimized auto-scroll with virtual scrolling considerations
   * NFR 10: Performance optimization and resource efficiency
   */
  const optimizedScrollToBottom = useCallback(() => {
    if (!responseBoxRef.current || !uiState.autoScrollEnabled) return;
    
    try {
      const element = responseBoxRef.current;
      const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 100;
      
      // Only scroll if user hasn't manually scrolled up significantly
      if (isNearBottom || isStreaming) {
        // Use requestAnimationFrame for smooth performance
        requestAnimationFrame(() => {
          try {
            element.scrollTop = element.scrollHeight;
          } catch (error) {
            handleScrollError(error, 'scroll-to-bottom');
          }
        });
      }
    } catch (error) {
      handleScrollError(error, 'optimized-scroll');
    }
  }, [uiState.autoScrollEnabled, isStreaming]);

  // Step 6: Performance-optimized content update handler
  useEffect(() => {
    if (uiState.autoScrollEnabled && enhancedSpecification && isStreaming && responseBoxRef.current) {
      // Step 6: Use requestIdleCallback for better performance when available
      const scheduleScroll = window.requestIdleCallback || ((cb) => setTimeout(cb, 16));
      
      scheduleScroll(() => {
        optimizedScrollToBottom();
      });
    }
  }, [enhancedSpecification, uiState.autoScrollEnabled, isStreaming, optimizedScrollToBottom]);

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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-vibe-gray">
                Selected Non-Functional Requirements ({selectedNFRs.length})
              </label>
              {/* Step 2: Collapsible NFR Section Toggle Button */}
              <button
                onClick={() => toggleSectionCollapse('nfrSectionCollapsed')}
                className="text-xs bg-vibe-blue text-white px-3 py-1 rounded hover:bg-opacity-80 transition-colors flex items-center space-x-1 toggle-button"
                title={uiState.nfrSectionCollapsed ? 'Show NFR details' : 'Hide NFR details'}
              >
                <span>{uiState.nfrSectionCollapsed ? '👁️' : '🙈'}</span>
                <span>{uiState.nfrSectionCollapsed ? 'Show' : 'Hide'}</span>
              </button>
            </div>
            
            {/* Collapsible NFR Content */}
            {!uiState.nfrSectionCollapsed && (
              <div className="panel p-3 max-h-32 overflow-y-auto prompt-builder-scrollbar">
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
            )}
            
            {/* Collapsed State Summary */}
            {uiState.nfrSectionCollapsed && (
              <div className="panel p-2 bg-vibe-darker border border-vibe-gray-dark">
                <div className="text-xs text-vibe-gray opacity-75">
                  {selectedNFRs.length} requirement{selectedNFRs.length !== 1 ? 's' : ''} selected: {selectedNFRs.slice(0, 3).map(nfr => nfr.name).join(', ')}
                  {selectedNFRs.length > 3 && ` and ${selectedNFRs.length - 3} more`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Application Architecture Layers Display */}
        {selectedArchLayers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-vibe-gray">
                Selected Application Architecture Layers ({selectedArchLayers.length})
              </label>
              {/* Step 3: Collapsible Architecture Section Toggle Button */}
              <button
                onClick={() => toggleSectionCollapse('archSectionCollapsed')}
                className="text-xs bg-vibe-blue text-white px-3 py-1 rounded hover:bg-opacity-80 transition-colors flex items-center space-x-1 toggle-button"
                title={uiState.archSectionCollapsed ? 'Show architecture details' : 'Hide architecture details'}
              >
                <span>{uiState.archSectionCollapsed ? '👁️' : '🙈'}</span>
                <span>{uiState.archSectionCollapsed ? 'Show' : 'Hide'}</span>
              </button>
            </div>
            
            {/* Collapsible Architecture Content */}
            {!uiState.archSectionCollapsed && (
              <div className="panel p-3 max-h-32 overflow-y-auto prompt-builder-scrollbar">
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
            )}
            
            {/* Collapsed State Summary */}
            {uiState.archSectionCollapsed && (
              <div className="panel p-2 bg-vibe-darker border border-vibe-gray-dark">
                <div className="text-xs text-vibe-gray opacity-75 flex items-center space-x-4">
                  <span>
                    {selectedArchLayers.length} layer{selectedArchLayers.length !== 1 ? 's' : ''}: {selectedArchLayers.slice(0, 2).map(layer => layer.name).join(', ')}
                    {selectedArchLayers.length > 2 && ` and ${selectedArchLayers.length - 2} more`}
                  </span>
                  <span>
                    Total: {selectedArchLayers.reduce((sum, layer) => sum + (layer.nodeCount || 0), 0)} components
                  </span>
                </div>
              </div>
            )}
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
            style={{ minHeight: '120px', maxHeight: '180px' }}
            aria-label="Prompt input for AI enhancement"
            aria-describedby="prompt-help"
          />
          {/* Step 9: Accessibility help text */}
          <div id="prompt-help" className="sr-only">
            Use Ctrl+Enter for enhanced prompt, Ctrl+Shift+Enter for full specification, Ctrl+S to toggle auto-scroll
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => enhancePrompt('full_specification')}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 flex-1 sm:flex-none ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Generate a comprehensive functional and non-functional specification with detailed task planning${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
              aria-label="Generate full specification"
            >
              {isEnhancing && currentEnhancementType === 'full_specification' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Enhancing...') : 
                `📋 Full Spec${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
              }
            </button>
            <button
              onClick={() => enhancePrompt('enhanced_prompt')}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 flex-1 sm:flex-none ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Generate a structured 8-12 step implementation plan with clear requirements${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
              aria-label="Generate enhanced prompt"
            >
              {isEnhancing && currentEnhancementType === 'enhanced_prompt' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Planning...') : 
                `📝 Enhanced${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
              }
            </button>
            <button
              onClick={() => enhancePrompt('rephrase')}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 flex-1 sm:flex-none ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Rephrase the user prompt for clarity and conciseness without adding new instructions${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
              aria-label="Rephrase prompt"
            >
              {isEnhancing && currentEnhancementType === 'rephrase' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Rephrasing...') : 
                `✨ Rephrase${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
              }
            </button>
            <button
              onClick={openCustomModal}
              disabled={!prompt.trim() || isEnhancing}
              className={`btn-standard disabled:opacity-50 flex-1 sm:flex-none ${considerArchitecture && selectedArchLayers.length > 0 ? 'ring-2 ring-vibe-blue ring-opacity-50' : ''}`}
              title={`Use custom prompt building instructions${considerArchitecture && selectedArchLayers.length > 0 ? ' with architecture integration' : ''}`}
              aria-label="Use custom instructions"
            >
              {isEnhancing && currentEnhancementType === 'custom' ? 
                (isStreaming ? '🔄 Streaming...' : '🔄 Processing...') : 
                `🎯 Custom${considerArchitecture && selectedArchLayers.length > 0 ? ' 🏗️' : ''}`
              }
            </button>
            <button
              onClick={() => {
                setPrompt('');
                setEnhancedSpecification('');
                setEnhancementMetadata(null);
                setCurrentEnhancementType('');
              }}
              className="btn-delete flex-1 sm:flex-none"
              aria-label="Clear all content"
            >
              🗑️ Clear
            </button>
          </div>
          
          {enhancedSpecification && (
            <button
              onClick={copyToClipboard}
              className="btn-standard w-full sm:w-auto"
              aria-label="Copy result to clipboard"
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
              
              {/* Step 4 & 5: Response Box Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggleResponseExpansion}
                    className="auto-scroll-toggle"
                    title={uiState.autoExpandResponse ? 'Disable auto-expand' : 'Enable auto-expand'}
                    aria-label={`${uiState.autoExpandResponse ? 'Disable' : 'Enable'} auto-expand response box`}
                  >
                    <span>{uiState.autoExpandResponse ? '📏' : '📐'}</span>
                    <span className="hidden sm:inline">{uiState.autoExpandResponse ? 'Auto-Expand' : 'Fixed Size'}</span>
                  </button>
                  
                  {/* Enhanced Auto-Scroll Control */}
                  <button
                    onClick={toggleAutoScroll}
                    className={`auto-scroll-toggle ${uiState.autoScrollEnabled ? 'active' : ''}`}
                    title={uiState.autoScrollEnabled ? 'Disable auto-scroll during streaming' : 'Enable auto-scroll during streaming'}
                    aria-label={`${uiState.autoScrollEnabled ? 'Disable' : 'Enable'} auto-scroll during streaming`}
                  >
                    <span>{uiState.autoScrollEnabled ? '🔄' : '⏸️'}</span>
                    <span className="hidden sm:inline">{uiState.autoScrollEnabled ? 'Auto-Scroll' : 'Manual'}</span>
                  </button>
                  
                  {/* Enhanced Auto-Scroll Status Indicator */}
                  {isStreaming && (
                    <div className={`auto-scroll-status ${uiState.autoScrollEnabled ? 'enabled' : 'disabled'}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        uiState.autoScrollEnabled ? 'bg-vibe-green animate-pulse' : 'bg-vibe-gray'
                      }`}></div>
                      <span className="hidden sm:inline">
                        {uiState.autoScrollEnabled ? 'Auto-scrolling' : 'Manual mode'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Metadata Display - Responsive */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-vibe-gray opacity-60">
                  {enhancementMetadata && (
                    <>
                      <span className="hidden md:inline">NFRs: {enhancementMetadata.requirements_count || selectedNFRs.length || 0}</span>
                      <span className="hidden lg:inline">Arch: {enhancementMetadata.architecture_layers_count || selectedArchLayers.length || 0}</span>
                      {enhancementMetadata.total_components && (
                        <span className="hidden xl:inline">Components: {enhancementMetadata.total_components}</span>
                      )}
                      <span>Files: {enhancementMetadata.selected_files_count || enhancementMetadata.file_count || 0}</span>
                      {enhancementMetadata.complexity_analysis?.estimated_complexity && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          enhancementMetadata.complexity_analysis.estimated_complexity === 'high' ? 'bg-vibe-red text-white' :
                          enhancementMetadata.complexity_analysis.estimated_complexity === 'medium' ? 'bg-yellow-600 text-white' :
                          'bg-vibe-green text-white'
                        }`}>
                          {enhancementMetadata.complexity_analysis.estimated_complexity}
                        </span>
                      )}
                      <span className="hidden sm:inline">Model: {enhancementMetadata.model_used || 'Claude'}</span>
                    </>
                  )}
                  <span>{typeof enhancedSpecification === 'string' ? enhancedSpecification.length : String(enhancedSpecification || '').length} chars</span>
                  {isStreaming && <span className="text-vibe-blue animate-pulse">● Streaming</span>}
                </div>
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
            
            {/* Step 4 & 5: Enhanced Response Box with Dynamic Sizing and Auto-Expansion */}
            <div className={`panel p-4 ${uiState.dynamicSizing ? 'overflow-visible' : 'max-h-96 overflow-y-auto'} prompt-builder-scrollable`}>
              <pre 
                ref={responseBoxRef}
                className={`text-sm text-vibe-gray whitespace-pre-wrap font-mono ${
                  uiState.dynamicSizing ? 'response-box-dynamic' : 'response-box-fixed'
                } ${isStreaming && uiState.autoScrollEnabled ? 'streaming-indicator' : ''}`}
                style={{
                  minHeight: uiState.dynamicSizing ? `${uiState.minHeight}px` : '300px',
                  maxHeight: uiState.dynamicSizing ? `${uiState.maxHeight}px` : '400px',
                  overflow: uiState.dynamicSizing ? 'auto' : 'hidden',
                  resize: uiState.dynamicSizing ? 'vertical' : 'none'
                }}
              >
                {typeof enhancedSpecification === 'string' ? enhancedSpecification : String(enhancedSpecification || '') || (
                  <span className="text-vibe-gray opacity-50 italic">
                    {isStreaming ? 'Generating response...' : 'Enhanced specification will appear here...'}
                  </span>
                )}
                {isStreaming && <span className="animate-pulse text-vibe-blue">▊</span>}
              </pre>
            </div>
            
            {/* Step 2: Removed overlay text, Step 8: Improved status indicator */}
            {enhancedSpecification && (
              <div className="mt-2 text-xs text-vibe-gray opacity-60 flex items-center justify-between">
                <span className="flex items-center space-x-3">
                  {uiState.autoExpandResponse && (
                    <span className="flex items-center space-x-1">
                      <span>📏</span>
                      <span>Auto-expanding ({typeof enhancedSpecification === 'string' ? enhancedSpecification.split('\n').length : String(enhancedSpecification || '').split('\n').length} lines)</span>
                    </span>
                  )}
                  {uiState.autoScrollEnabled && (
                    <span className="flex items-center space-x-1 text-vibe-green">
                      <span>🔄</span>
                      <span>Auto-scroll active</span>
                    </span>
                  )}
                </span>
                <span className="flex items-center space-x-3">
                  {isStreaming && uiState.autoScrollEnabled && (
                    <span className="text-vibe-blue animate-pulse">Manual scroll pauses auto-scroll</span>
                  )}
                  <span>{typeof enhancedSpecification === 'string' ? enhancedSpecification.length : String(enhancedSpecification || '').length} chars</span>
                </span>
              </div>
            )}
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

      {/* Custom Instructions Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-2xl mx-4">
            <h3 className="text-lg font-medium text-vibe-gray mb-4">Custom Prompt Instructions</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">
                  Custom Instructions
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="input-primary w-full h-32 resize-none"
                  placeholder="Enter your custom prompt building instructions here. For example: 'Create a detailed technical specification with emphasis on security requirements and include specific implementation steps for each component.'"
                  maxLength={2000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-vibe-gray opacity-60">
                    Provide specific instructions for how you want the AI to process your prompt
                  </span>
                  <span className={`text-xs ${customInstructions.length > 1800 ? 'text-vibe-red' : 'text-vibe-gray opacity-60'}`}>
                    {customInstructions.length}/2000
                  </span>
                </div>
              </div>

              {customInstructionsError && (
                <div className="bg-vibe-red bg-opacity-20 border border-vibe-red text-vibe-red p-3 rounded text-sm">
                  {customInstructionsError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-vibe-gray-dark">
                <button
                  onClick={closeCustomModal}
                  className="btn-standard"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomInstructionsSubmit}
                  disabled={!customInstructions.trim() || customInstructions.length > 2000}
                  className="btn-add disabled:opacity-50"
                >
                  Submit Instructions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptBuilder; 