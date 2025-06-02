import React, { useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import loggingService from '../services/LoggingService';

const NFRLoader = ({ isOpen, onClose, onNodesSelected }) => {
  const [step, setStep] = useState('graphs'); // 'graphs' or 'nodes'
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [layerData, setLayerData] = useState({});
  const [expandedLayers, setExpandedLayers] = useState(new Set());
  const [selectedNodes, setSelectedNodes] = useState(new Set());
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
      loggingService.logInfo('Loaded saved graphs for NFR selection', {
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
      
      loggingService.logInfo('Loaded graph data for NFR selection', {
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

  const toggleNodeSelection = (nodeId) => {
    const newSelected = new Set(selectedNodes);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedNodes(newSelected);
  };

  const handleAddToPrompt = () => {
    const selectedNodeData = graphData.nodes.filter(node => 
      selectedNodes.has(node.id)
    );
    
    onNodesSelected(selectedNodeData);
    onClose();
    
    loggingService.logInfo('Added NFR nodes to prompt', {
      graphName: selectedGraph,
      nodeCount: selectedNodeData.length,
      nodeIds: Array.from(selectedNodes)
    });
  };

  const handleBack = () => {
    setStep('graphs');
    setSelectedGraph(null);
    setGraphData({ nodes: [], edges: [] });
    setLayerData({});
    setExpandedLayers(new Set());
    setSelectedNodes(new Set());
    setError('');
  };

  const handleClose = () => {
    setStep('graphs');
    setSelectedGraph(null);
    setGraphData({ nodes: [], edges: [] });
    setLayerData({});
    setExpandedLayers(new Set());
    setSelectedNodes(new Set());
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
            {step === 'nodes' && (
              <button
                onClick={handleBack}
                className="btn-secondary text-sm"
              >
                ← Back
              </button>
            )}
            <h2 className="text-xl font-medium text-vibe-gray">
              {step === 'graphs' ? 'Load NFR Graph' : `NFR Selection - ${selectedGraph}`}
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
                  Select a saved graph to load NFR nodes from:
                </p>
              </div>

              {savedGraphs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-vibe-gray opacity-60 mb-2">📊</div>
                  <p className="text-vibe-gray">No saved graphs available</p>
                  <p className="text-vibe-gray text-sm opacity-60">
                    Create and save a graph first to use NFR loading
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
                  <div className="text-xs text-vibe-gray opacity-60">
                    {selectedNodes.size} node(s) selected
                  </div>
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
                        <button
                          onClick={() => toggleLayer(layerName)}
                          className="w-full p-3 text-left flex items-center justify-between hover:bg-vibe-darkest transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-vibe-gray font-medium">
                              {expandedLayers.has(layerName) ? '📂' : '📁'} {layerName}
                            </span>
                            <span className="text-xs text-vibe-gray opacity-60">
                              ({nodes.length} node{nodes.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <span className="text-vibe-gray opacity-60">
                            {expandedLayers.has(layerName) ? '▼' : '▶'}
                          </span>
                        </button>

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
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBack}
                    className="btn-secondary"
                  >
                    Back to Graphs
                  </button>
                  <button
                    onClick={handleAddToPrompt}
                    disabled={selectedNodes.size === 0}
                    className="btn-primary disabled:opacity-50"
                  >
                    Add to Prompt ({selectedNodes.size})
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

export default NFRLoader; 