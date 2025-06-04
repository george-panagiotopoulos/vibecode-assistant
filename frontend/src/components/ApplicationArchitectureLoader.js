import React, { useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import loggingService from '../services/LoggingService';

const ApplicationArchitectureLoader = ({ isOpen, onClose, onLayersSelected }) => {
  const [step, setStep] = useState('graphs'); // 'graphs' or 'layers'
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [layerData, setLayerData] = useState({});
  const [selectedLayers, setSelectedLayers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved application architecture graphs when component opens
  useEffect(() => {
    if (isOpen && step === 'graphs') {
      loadSavedGraphs();
    }
  }, [isOpen, step]);

  const loadSavedGraphs = async () => {
    setLoading(true);
    setError('');
    try {
      // Filter for application_architecture graphs only
      const response = await ApiService.getSavedGraphs('application_architecture');
      setSavedGraphs(response.graphs || []);
      loggingService.logInfo('Loaded saved application architecture graphs', {
        count: response.graphs?.length || 0
      });
    } catch (error) {
      setError(`Failed to load saved graphs: ${error.message}`);
      loggingService.logError('app_arch_loader_graphs_error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGraphData = async (graphName) => {
    setLoading(true);
    setError('');
    try {
      // Load the graph data without affecting the main graph
      const response = await ApiService.getGraphData(graphName);
      setSelectedGraph(graphName);
      
      // Organize nodes by layer and count nodes per layer
      const layers = {};
      (response.data?.nodes || []).forEach(node => {
        const layer = node.layer || 'Uncategorized';
        if (!layers[layer]) {
          layers[layer] = {
            nodes: [],
            description: '' // Could be enhanced to include layer descriptions
          };
        }
        layers[layer].nodes.push(node);
      });
      
      setLayerData(layers);
      setStep('layers');
      
      loggingService.logInfo('Loaded application architecture graph data', {
        graphName,
        nodeCount: response.data?.nodes?.length || 0,
        layerCount: Object.keys(layers).length
      });
    } catch (error) {
      setError(`Failed to load graph data: ${error.message}`);
      loggingService.logError('app_arch_loader_data_error', error.message, { graphName });
    } finally {
      setLoading(false);
    }
  };

  const toggleLayerSelection = (layerName) => {
    const newSelected = new Set(selectedLayers);
    if (newSelected.has(layerName)) {
      newSelected.delete(layerName);
    } else {
      newSelected.add(layerName);
    }
    setSelectedLayers(newSelected);
  };

  const handleAddToPrompt = () => {
    const selectedLayerData = Array.from(selectedLayers).map(layerName => ({
      name: layerName,
      nodes: layerData[layerName]?.nodes || [],
      nodeCount: layerData[layerName]?.nodes?.length || 0
    }));
    
    onLayersSelected(selectedLayerData);
    onClose();
    
    loggingService.logInfo('Added Application Architecture layers to prompt', {
      graphName: selectedGraph,
      layerCount: selectedLayerData.length,
      layerNames: Array.from(selectedLayers),
      totalNodes: selectedLayerData.reduce((sum, layer) => sum + layer.nodeCount, 0)
    });
  };

  const handleBack = () => {
    setStep('graphs');
    setSelectedGraph(null);
    setLayerData({});
    setSelectedLayers(new Set());
    setError('');
  };

  const handleClose = () => {
    setStep('graphs');
    setSelectedGraph(null);
    setLayerData({});
    setSelectedLayers(new Set());
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vibe-darker rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-vibe-gray-dark flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {step === 'layers' && (
              <button
                onClick={handleBack}
                className="btn-standard text-sm"
              >
                ← Back
              </button>
            )}
            <h2 className="text-xl font-medium text-vibe-gray">
              {step === 'graphs' ? 'Load Application Architecture Graph' : `Application Architecture Selection - ${selectedGraph}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-vibe-gray hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-4 bg-vibe-red bg-opacity-20 border border-vibe-red text-vibe-red">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-vibe-gray">Loading...</div>
            </div>
          )}

          {!loading && step === 'graphs' && (
            <div className="p-6">
              <div className="mb-4">
                <p className="text-vibe-gray text-sm mb-4">
                  Select a saved application architecture graph to load layers from:
                </p>
              </div>

              {savedGraphs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-vibe-gray opacity-60 mb-2">🏗️</div>
                  <p className="text-vibe-gray">No application architecture graphs available</p>
                  <p className="text-vibe-gray text-sm opacity-60">
                    Create and save an application architecture graph first to use this feature
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedGraphs.map((graph) => (
                    <div
                      key={graph.name}
                      onClick={() => loadGraphData(graph.name)}
                      className="panel p-4 cursor-pointer hover:bg-vibe-darkest transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-vibe-gray truncate">
                          {graph.name}
                        </h3>
                        <span className="text-xs bg-vibe-blue text-white px-2 py-1 rounded">
                          Architecture
                        </span>
                      </div>
                      <div className="text-sm text-vibe-gray opacity-60 space-y-1">
                        <div>🏗️ {graph.nodes_count} components</div>
                        <div>🔗 {graph.edges_count} connections</div>
                        {graph.created_at && (
                          <div>📅 {new Date(graph.created_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && step === 'layers' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  <p className="text-vibe-gray text-sm mb-2">
                    Select architecture layers to include in your prompt:
                  </p>
                  <div className="text-xs text-vibe-gray opacity-60 mb-3">
                    {selectedLayers.size} layer(s) selected
                  </div>
                </div>

                {Object.keys(layerData).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-vibe-gray opacity-60 mb-2">🏗️</div>
                    <p className="text-vibe-gray">No layers found in this architecture</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(layerData).map(([layerName, layerInfo]) => (
                      <div 
                        key={layerName} 
                        className={`border rounded-lg cursor-pointer transition-colors ${
                          selectedLayers.has(layerName) 
                            ? 'border-vibe-blue bg-vibe-blue bg-opacity-10' 
                            : 'border-vibe-gray-dark hover:border-vibe-gray'
                        }`}
                        onClick={() => toggleLayerSelection(layerName)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedLayers.has(layerName)}
                                onChange={() => toggleLayerSelection(layerName)}
                                className="text-vibe-blue"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <div className="font-medium text-vibe-gray flex items-center space-x-2">
                                  <span>🏗️ {layerName}</span>
                                  {selectedLayers.has(layerName) && (
                                    <span className="text-xs bg-vibe-green text-white px-2 py-1 rounded">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-vibe-gray opacity-60 mt-1">
                                  {layerInfo.nodes.length} component{layerInfo.nodes.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Show sample components */}
                          <div className="mt-3 text-xs text-vibe-gray opacity-60">
                            <div className="font-medium mb-1">Components:</div>
                            <div className="flex flex-wrap gap-1">
                              {layerInfo.nodes.slice(0, 5).map((node, index) => (
                                <span key={node.id} className="bg-vibe-dark px-2 py-1 rounded">
                                  {node.name}
                                </span>
                              ))}
                              {layerInfo.nodes.length > 5 && (
                                <span className="bg-vibe-dark px-2 py-1 rounded">
                                  +{layerInfo.nodes.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-vibe-gray-dark flex justify-between items-center">
                <div className="text-sm text-vibe-gray">
                  {selectedLayers.size} layer(s) selected
                  {selectedLayers.size > 0 && (() => {
                    const totalNodes = Array.from(selectedLayers).reduce((sum, layerName) => 
                      sum + (layerData[layerName]?.nodes?.length || 0), 0);
                    return ` (${totalNodes} components)`;
                  })()}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBack}
                    className="btn-standard"
                  >
                    Back to Graphs
                  </button>
                  <button
                    onClick={handleAddToPrompt}
                    disabled={selectedLayers.size === 0}
                    className="btn-add disabled:opacity-50"
                  >
                    Add to Prompt ({selectedLayers.size})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationArchitectureLoader; 