import React, { useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import loggingService from '../services/LoggingService';

const NonFunctionalRequirementsLoader = ({ isOpen, onClose, onNodesSelected }) => {
  const [step, setStep] = useState('graphs'); // 'graphs' or 'nodes'
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [layerData, setLayerData] = useState({});
  const [expandedLayers, setExpandedLayers] = useState(new Set());
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [includeAdjacent, setIncludeAdjacent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved graphs when component opens
  useEffect(() => {
    if (isOpen && step === 'graphs') {
      loadSavedGraphs();
    }
  }, [isOpen, step]);

  const loadSavedGraphs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ApiService.getSavedGraphs();
      setSavedGraphs(response.graphs || []);
      loggingService.logInfo('Loaded saved graphs for Non-Functional Requirements selection', {
        count: response.graphs?.length || 0
      });
    } catch (error) {
      setError(`Failed to load saved graphs: ${error.message}`);
      loggingService.logError('nfr_loader_graphs_error', error.message);
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
      setGraphData(response.data || { nodes: [], edges: [] });
      setSelectedGraph(graphName);
      
      // Organize nodes by layer
      const layers = {};
      (response.data?.nodes || []).forEach(node => {
        const layer = node.layer || 'Uncategorized';
        if (!layers[layer]) {
          layers[layer] = [];
        }
        layers[layer].push(node);
      });
      
      setLayerData(layers);
      setStep('nodes');
      
      loggingService.logInfo('Loaded graph data for Non-Functional Requirements selection', {
        graphName,
        nodeCount: response.data?.nodes?.length || 0,
        layerCount: Object.keys(layers).length
      });
    } catch (error) {
      setError(`Failed to load graph data: ${error.message}`);
      loggingService.logError('nfr_loader_data_error', error.message, { graphName });
    } finally {
      setLoading(false);
    }
  };

  const toggleLayer = (layerName) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerName)) {
      newExpanded.delete(layerName);
    } else {
      newExpanded.add(layerName);
    }
    setExpandedLayers(newExpanded);
  };

  // NEW: Bulk import entire layer
  const importEntireLayer = (layerName) => {
    const layerNodes = layerData[layerName] || [];
    const newSelected = new Set(selectedNodes);
    
    // Check if all nodes in layer are already selected
    const allSelected = layerNodes.every(node => newSelected.has(node.id));
    
    if (allSelected) {
      // Deselect all nodes in layer
      layerNodes.forEach(node => newSelected.delete(node.id));
    } else {
      // Select all nodes in layer
      layerNodes.forEach(node => newSelected.add(node.id));
    }
    
    setSelectedNodes(newSelected);
    
    loggingService.logInfo('Bulk layer import toggled', {
      layerName,
      nodeCount: layerNodes.length,
      action: allSelected ? 'deselected' : 'selected'
    });
  };

  const toggleNodeSelection = (nodeId) => {
    const newSelected = new Set(selectedNodes);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedNodes(newSelected);
  };

  // NEW: Get adjacent requirements based on graph edges
  const getAdjacentRequirements = (selectedNodeIds) => {
    const adjacentNodes = new Set();
    const edges = graphData.edges || [];
    
    selectedNodeIds.forEach(nodeId => {
      edges.forEach(edge => {
        // If the selected node is the source, add the target
        if (edge.from_id === nodeId) {
          adjacentNodes.add(edge.to_id);
        }
        // If the selected node is the target, add the source
        if (edge.to_id === nodeId) {
          adjacentNodes.add(edge.from_id);
        }
      });
    });
    
    // Remove nodes that are already selected
    selectedNodeIds.forEach(nodeId => adjacentNodes.delete(nodeId));
    
    return Array.from(adjacentNodes);
  };

  const handleAddToPrompt = () => {
    let finalSelectedNodes = new Set(selectedNodes);
    
    // If include adjacent is checked, add adjacent requirements
    if (includeAdjacent && selectedNodes.size > 0) {
      const adjacentNodeIds = getAdjacentRequirements(Array.from(selectedNodes));
      adjacentNodeIds.forEach(nodeId => finalSelectedNodes.add(nodeId));
      
      loggingService.logInfo('Added adjacent requirements', {
        originalCount: selectedNodes.size,
        adjacentCount: adjacentNodeIds.length,
        totalCount: finalSelectedNodes.size
      });
    }
    
    const selectedNodeData = graphData.nodes.filter(node => 
      finalSelectedNodes.has(node.id)
    );
    
    onNodesSelected(selectedNodeData);
    onClose();
    
    loggingService.logInfo('Added Non-Functional Requirements nodes to prompt', {
      graphName: selectedGraph,
      nodeCount: selectedNodeData.length,
      nodeIds: Array.from(finalSelectedNodes),
      includeAdjacent
    });
  };

  const handleBack = () => {
    setStep('graphs');
    setSelectedGraph(null);
    setGraphData({ nodes: [], edges: [] });
    setLayerData({});
    setExpandedLayers(new Set());
    setSelectedNodes(new Set());
    setIncludeAdjacent(false);
    setError('');
  };

  const handleClose = () => {
    setStep('graphs');
    setSelectedGraph(null);
    setGraphData({ nodes: [], edges: [] });
    setLayerData({});
    setExpandedLayers(new Set());
    setSelectedNodes(new Set());
    setIncludeAdjacent(false);
    setError('');
    onClose();
  };

  // Helper function to check if all nodes in a layer are selected
  const isLayerFullySelected = (layerName) => {
    const layerNodes = layerData[layerName] || [];
    return layerNodes.length > 0 && layerNodes.every(node => selectedNodes.has(node.id));
  };

  // Helper function to check if some nodes in a layer are selected
  const isLayerPartiallySelected = (layerName) => {
    const layerNodes = layerData[layerName] || [];
    return layerNodes.some(node => selectedNodes.has(node.id)) && !isLayerFullySelected(layerName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vibe-darker rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-vibe-gray-dark flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {step === 'nodes' && (
              <button
                onClick={handleBack}
                className="btn-standard text-sm"
              >
                ← Back
              </button>
            )}
            <h2 className="text-xl font-medium text-vibe-gray">
              {step === 'graphs' ? 'Load Non-Functional Requirements Graph' : `Non-Functional Requirements Selection - ${selectedGraph}`}
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
                  Select a saved graph to load Non-Functional Requirements nodes from:
                </p>
              </div>

              {savedGraphs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-vibe-gray opacity-60 mb-2">📊</div>
                  <p className="text-vibe-gray">No saved graphs available</p>
                  <p className="text-vibe-gray text-sm opacity-60">
                    Create and save a graph first to use Non-Functional Requirements loading
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
                      </div>
                      <div className="text-sm text-vibe-gray opacity-60 space-y-1">
                        <div>📊 {graph.nodes_count} nodes</div>
                        <div>🔗 {graph.edges_count} edges</div>
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

          {!loading && step === 'nodes' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  <p className="text-vibe-gray text-sm mb-2">
                    Select nodes to add to your prompt requirements:
                  </p>
                  <div className="text-xs text-vibe-gray opacity-60 mb-3">
                    {selectedNodes.size} node(s) selected
                  </div>
                  
                  {/* Adjacent Requirements Checkbox */}
                  {selectedNodes.size > 0 && (
                    <div className="mb-4 p-3 bg-vibe-dark rounded border border-vibe-gray-dark">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeAdjacent}
                          onChange={(e) => setIncludeAdjacent(e.target.checked)}
                          className="text-vibe-blue"
                        />
                        <span className="text-sm text-vibe-gray">
                          Include adjacent requirements
                        </span>
                      </label>
                      <p className="text-xs text-vibe-gray opacity-60 mt-1">
                        Automatically include requirements that share graph edges with selected nodes
                        {includeAdjacent && (() => {
                          const adjacentCount = getAdjacentRequirements(Array.from(selectedNodes)).length;
                          return adjacentCount > 0 ? ` (+${adjacentCount} additional)` : ' (no additional found)';
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                {Object.keys(layerData).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-vibe-gray opacity-60 mb-2">📋</div>
                    <p className="text-vibe-gray">No nodes found in this graph</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(layerData).map(([layerName, nodes]) => (
                      <div key={layerName} className="border border-vibe-gray-dark rounded-lg">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleLayer(layerName)}
                            className="flex-1 p-3 text-left flex items-center justify-between hover:bg-vibe-darkest transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-vibe-gray font-medium">
                                {expandedLayers.has(layerName) ? '📂' : '📁'} {layerName}
                              </span>
                              <span className="text-xs text-vibe-gray opacity-60">
                                ({nodes.length} node{nodes.length !== 1 ? 's' : ''})
                              </span>
                              {isLayerFullySelected(layerName) && (
                                <span className="text-xs bg-vibe-green text-white px-2 py-1 rounded">
                                  All Selected
                                </span>
                              )}
                              {isLayerPartiallySelected(layerName) && (
                                <span className="text-xs bg-vibe-blue text-white px-2 py-1 rounded">
                                  Partial
                                </span>
                              )}
                            </div>
                            <span className="text-vibe-gray opacity-60">
                              {expandedLayers.has(layerName) ? '▼' : '▶'}
                            </span>
                          </button>
                          
                          {/* Bulk Import Button */}
                          <div className="p-3 border-l border-vibe-gray-dark">
                            <button
                              onClick={() => importEntireLayer(layerName)}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                isLayerFullySelected(layerName)
                                  ? 'bg-vibe-red text-white hover:bg-red-600'
                                  : 'bg-vibe-green text-white hover:bg-green-600'
                              }`}
                              title={isLayerFullySelected(layerName) ? 'Deselect entire layer' : 'Select entire layer'}
                            >
                              {isLayerFullySelected(layerName) ? '✕ Deselect All' : '✓ Select All'}
                            </button>
                          </div>
                        </div>

                        {expandedLayers.has(layerName) && (
                          <div className="border-t border-vibe-gray-dark">
                            {nodes.map((node) => (
                              <div
                                key={node.id}
                                className="p-3 border-b border-vibe-gray-dark last:border-b-0 hover:bg-vibe-darkest transition-colors"
                              >
                                <label className="flex items-start space-x-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedNodes.has(node.id)}
                                    onChange={() => toggleNodeSelection(node.id)}
                                    className="mt-1 text-vibe-blue"
                                  />
                                  <div className="flex-1">
                                    <div 
                                      className="font-medium text-vibe-gray hover:text-white transition-colors"
                                      title={node.description || 'No description available'}
                                    >
                                      {node.name}
                                    </div>
                                    {node.description && (
                                      <div className="text-sm text-vibe-gray opacity-60 mt-1">
                                        {node.description}
                                      </div>
                                    )}
                                    <div className="text-xs text-vibe-gray opacity-40 mt-1">
                                      {node.type} • {node.id}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-vibe-gray-dark flex justify-between items-center">
                <div className="text-sm text-vibe-gray">
                  {selectedNodes.size} node(s) selected
                  {includeAdjacent && selectedNodes.size > 0 && (() => {
                    const adjacentCount = getAdjacentRequirements(Array.from(selectedNodes)).length;
                    return adjacentCount > 0 ? ` (+${adjacentCount} adjacent)` : '';
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
                    disabled={selectedNodes.size === 0}
                    className="btn-add disabled:opacity-50"
                  >
                    Add to Prompt ({selectedNodes.size}{includeAdjacent && selectedNodes.size > 0 ? `+${getAdjacentRequirements(Array.from(selectedNodes)).length}` : ''})
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

export default NonFunctionalRequirementsLoader; 