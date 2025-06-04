import React, { useState, useRef, useEffect } from 'react';
import ApiService from '../services/ApiService';
import autoScrollService from '../services/AutoScrollService';
import loggingService from '../services/LoggingService';

const StreamingTest = () => {
  const [testPrompt, setTestPrompt] = useState('Create a simple React component that displays "Hello World"');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [dynamicSizing, setDynamicSizing] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const responseBoxRef = useRef(null);

  // Register response box for auto-scrolling
  useEffect(() => {
    if (responseBoxRef.current) {
      autoScrollService.registerScrollTarget('streaming-test', responseBoxRef.current, {
        scrollThreshold: 50,
        scrollBehavior: 'smooth',
        userOverrideTimeout: 3000,
        debounceDelay: 50
      });
    }

    return () => {
      autoScrollService.unregisterScrollTarget('streaming-test');
    };
  }, []);

  // Handle auto-scroll during streaming
  useEffect(() => {
    if (autoScrollEnabled && responseBoxRef.current) {
      if (isStreaming) {
        autoScrollService.startStreaming('streaming-test');
      } else {
        autoScrollService.stopStreaming('streaming-test');
      }
    }
  }, [isStreaming, autoScrollEnabled]);

  // Handle dynamic sizing
  useEffect(() => {
    if (dynamicSizing && streamingResponse && responseBoxRef.current) {
      const element = responseBoxRef.current;
      const lineHeight = 20;
      const lines = streamingResponse.split('\n').length;
      const calculatedHeight = Math.min(Math.max(lines * lineHeight + 32, 200), 600);
      
      element.style.height = `${calculatedHeight}px`;
      
      if (isStreaming && autoScrollEnabled) {
        autoScrollService.onContentUpdate('streaming-test', streamingResponse);
      }
    }
  }, [streamingResponse, dynamicSizing, isStreaming, autoScrollEnabled]);

  const runStreamingTest = async () => {
    if (!testPrompt.trim()) return;

    setIsStreaming(true);
    setStreamingResponse('');
    const startTime = Date.now();
    let chunkCount = 0;
    let totalLength = 0;

    try {
      loggingService.logInfo('Starting streaming test', {
        prompt: testPrompt,
        dynamicSizing,
        autoScrollEnabled
      });

      await ApiService.streamResponse(testPrompt, {
        systemPrompt: 'You are a helpful coding assistant. Provide clear, detailed responses.',
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 120000,
        onChunk: (chunk) => {
          chunkCount++;
          totalLength += chunk.length;
          setStreamingResponse(prev => prev + chunk);
        },
        onComplete: () => {
          const duration = Date.now() - startTime;
          const result = {
            timestamp: new Date().toISOString(),
            success: true,
            duration,
            chunkCount,
            totalLength,
            dynamicSizing,
            autoScrollEnabled,
            promptLength: testPrompt.length
          };
          
          setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
          loggingService.logInfo('Streaming test completed successfully', result);
        },
        onError: (error) => {
          const duration = Date.now() - startTime;
          const result = {
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message,
            duration,
            chunkCount,
            totalLength,
            dynamicSizing,
            autoScrollEnabled,
            promptLength: testPrompt.length
          };
          
          setTestResults(prev => [result, ...prev.slice(0, 9)]);
          loggingService.logError('streaming_test_failed', error.message, result);
        }
      });
    } catch (error) {
      console.error('Streaming test error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const clearResults = () => {
    setStreamingResponse('');
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-vibe-dark text-vibe-gray">
      <h2 className="text-xl font-bold mb-4 text-vibe-blue">🧪 Enhanced Streaming Test</h2>
      
      {/* Test Configuration */}
      <div className="mb-6 p-4 bg-vibe-darker rounded border border-vibe-gray-dark">
        <h3 className="text-lg font-semibold mb-3">Test Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={dynamicSizing}
              onChange={(e) => setDynamicSizing(e.target.checked)}
              className="form-checkbox text-vibe-blue"
            />
            <span>Dynamic Sizing</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoScrollEnabled}
              onChange={(e) => setAutoScrollEnabled(e.target.checked)}
              className="form-checkbox text-vibe-blue"
            />
            <span>Auto-Scroll</span>
          </label>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Test Prompt:</label>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            className="w-full p-3 bg-vibe-dark border border-vibe-gray-dark rounded text-vibe-gray"
            rows={3}
            placeholder="Enter a test prompt..."
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={runStreamingTest}
            disabled={isStreaming || !testPrompt.trim()}
            className="btn-standard disabled:opacity-50"
          >
            {isStreaming ? '🔄 Testing...' : '🚀 Run Test'}
          </button>
          
          <button
            onClick={clearResults}
            className="btn-delete"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Streaming Response */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Streaming Response</h3>
          <div className="flex items-center gap-2 text-xs">
            {dynamicSizing && <span className="text-vibe-green">📏 Dynamic</span>}
            {autoScrollEnabled && <span className="text-vibe-blue">🔄 Auto-scroll</span>}
            {isStreaming && <span className="text-vibe-blue animate-pulse">● Streaming</span>}
          </div>
        </div>
        
        <div className={`panel p-4 ${dynamicSizing ? 'overflow-visible' : 'max-h-96 overflow-y-auto'}`}>
          <pre
            ref={responseBoxRef}
            className={`text-sm text-vibe-gray whitespace-pre-wrap font-mono ${
              dynamicSizing ? 'response-box-dynamic' : 'response-box-fixed'
            } ${isStreaming && autoScrollEnabled ? 'streaming-indicator' : ''}`}
            style={{
              minHeight: dynamicSizing ? '200px' : '300px',
              maxHeight: dynamicSizing ? '600px' : '400px',
              overflow: dynamicSizing ? 'auto' : 'hidden',
              resize: dynamicSizing ? 'vertical' : 'none'
            }}
          >
            {streamingResponse || (
              <span className="text-vibe-gray opacity-50 italic">
                {isStreaming ? 'Generating response...' : 'Response will appear here...'}
              </span>
            )}
            {isStreaming && <span className="animate-pulse text-vibe-blue">▊</span>}
          </pre>
        </div>
        
        {streamingResponse && (
          <div className="mt-2 text-xs text-vibe-gray opacity-60">
            <span>{streamingResponse.length} characters, {streamingResponse.split('\n').length} lines</span>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Test Results</h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  result.success
                    ? 'bg-green-900 border-green-700'
                    : 'bg-red-900 border-red-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {result.success ? '✅ Success' : '❌ Failed'}
                  </span>
                  <span className="text-xs opacity-75">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="text-xs mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <span>Duration: {result.duration}ms</span>
                  <span>Chunks: {result.chunkCount}</span>
                  <span>Length: {result.totalLength}</span>
                  <span>Prompt: {result.promptLength} chars</span>
                </div>
                
                <div className="text-xs mt-1 flex gap-4">
                  <span>Dynamic: {result.dynamicSizing ? '✅' : '❌'}</span>
                  <span>Auto-scroll: {result.autoScrollEnabled ? '✅' : '❌'}</span>
                  {!result.success && (
                    <span className="text-red-400">Error: {result.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingTest; 