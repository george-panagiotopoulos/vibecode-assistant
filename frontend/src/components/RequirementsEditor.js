import React, { useState, useEffect, useCallback, useMemo } from 'react';

const RequirementsEditor = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [showGraphVisualization, setShowGraphVisualization] = useState(false);

  // Form states
  const [newNode, setNewNode] = useState({
    id: '',
    name: '',
    description: '',
    layer: 'Application',
    type: 'requirement'
  });

  const [newEdge, setNewEdge] = useState({
    from_id: '',
    to_id: '',
    type: 'depends_on'
  });

  const [newLayer, setNewLayer] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500'
  });

  const layers = useMemo(() => ['UX', 'Architecture', 'Application', 'Infrastructure', 'Security'], []);
  const [customLayers, setCustomLayers] = useState([]);
  const allLayers = [...layers, ...customLayers];
  const edgeTypes = ['LINKED_TO', 'DEPENDS_ON', 'SUPPORTS', 'CONFLICTS_WITH', 'ENABLES'];

  // Helper function to get layer colors
  const getLayerColor = (layer) => {
    const colorMap = {
      'UX': 'bg-purple-500',
      'Architecture': 'bg-blue-500', 
      'Application': 'bg-green-500',
      'Infrastructure': 'bg-orange-500',
      'Security': 'bg-red-500'
    };
    
    // For custom layers, use a rotating set of colors
    const customColors = ['bg-cyan-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'];
    const customIndex = customLayers.indexOf(layer);
    
    return colorMap[layer] || customColors[customIndex % customColors.length] || 'bg-gray-500';
  };

  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/graph/nodes');
      const result = await response.json();
      
      if (result.success) {
        setNodes(result.data.nodes || []);
        setEdges(result.data.edges || []);
        
        // Update custom layers based on loaded data
        const loadedLayers = [...new Set((result.data.nodes || []).map(node => node.layer))];
        const newCustomLayers = loadedLayers.filter(layer => !layers.includes(layer));
        setCustomLayers(newCustomLayers);
      } else {
        setError(result.error || 'Failed to fetch graph data');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [layers]);

  // Create new node
  const handleCreateNode = async (e) => {
    e.preventDefault();
    if (!newNode.id || !newNode.name) {
      setError('Node ID and name are required');
      return;
    }

    try {
      const response = await fetch('/api/graph/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNode)
      });
      
      const result = await response.json();
      if (result.success) {
        setNewNode({ id: '', name: '', description: '', layer: 'Application', type: 'requirement' });
        setShowAddNode(false);
        fetchGraphData();
      } else {
        setError(result.error || 'Failed to create node');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Create new edge
  const handleCreateEdge = async (e) => {
    e.preventDefault();
    if (!newEdge.from_id || !newEdge.to_id) {
      setError('Both source and target nodes are required');
      return;
    }

    try {
      const response = await fetch('/api/graph/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEdge)
      });
      
      const result = await response.json();
      if (result.success) {
        setNewEdge({ from_id: '', to_id: '', type: 'depends_on' });
        setShowAddEdge(false);
        fetchGraphData();
      } else {
        setError(result.error || 'Failed to create edge');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Load sample data
  const handleLoadSampleData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/graph/sample', {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        fetchGraphData();
      } else {
        setError(result.error || 'Failed to load sample data');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete node
  const handleDeleteNode = async (nodeId) => {
    if (!window.confirm('Are you sure you want to delete this node and all its connections?')) {
      return;
    }

    try {
      const response = await fetch(`/api/graph/nodes/${nodeId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        fetchGraphData();
      } else {
        setError(result.error || 'Failed to delete node');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Delete edge
  const handleDeleteEdge = async (fromId, toId, edgeType) => {
    if (!window.confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    try {
      const response = await fetch('/api/graph/edges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_id: fromId,
          to_id: toId,
          type: edgeType
        })
      });
      
      const result = await response.json();
      if (result.success) {
        fetchGraphData();
      } else {
        setError(result.error || 'Failed to delete relationship');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Delete layer
  const handleDeleteLayer = async (layerName) => {
    if (!window.confirm(`Are you sure you want to delete the entire "${layerName}" layer and all its nodes? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/graph/layers/${encodeURIComponent(layerName)}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setError(null);
        fetchGraphData(); // Refresh the data
      } else {
        setError(result.error || 'Failed to delete layer');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Clear all data
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all graph data? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/graph/clear', {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        fetchGraphData();
      } else {
        setError(result.error || 'Failed to clear data');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Get type badge color
  const getTypeColor = (type) => {
    const colors = {
      'NFR': 'bg-vibe-blue',
      'Standard': 'bg-vibe-green',
      'Requirement': 'bg-yellow-500',
      'Constraint': 'bg-vibe-red'
    };
    return colors[type] || 'bg-vibe-gray-dark';
  };

  // Group nodes by layer
  const nodesByLayer = nodes.reduce((acc, node) => {
    const layer = node.layer || 'Other';
    if (!acc[layer]) acc[layer] = [];
    acc[layer].push(node);
    return acc;
  }, {});

  const handleCreateLayer = async (e) => {
    e.preventDefault();
    
    if (!newLayer.name.trim()) {
      setError('Layer name is required');
      return;
    }
    
    if (allLayers.includes(newLayer.name)) {
      setError('Layer already exists');
      return;
    }
    
    setCustomLayers([...customLayers, newLayer.name]);
    setNewLayer({ name: '', description: '', color: 'bg-blue-500' });
    setShowAddLayer(false);
    setError(null);
  };

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  return (
    <div className="h-full overflow-auto p-6 bg-vibe-dark">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-vibe-gray-dark pb-4">
          <h2 className="text-2xl font-semibold text-vibe-gray mb-2">
            Hierarchical Planning
          </h2>
          <p className="text-sm text-vibe-gray opacity-75">
            Model software concerns as graph nodes and their relationships as edges across multiple abstraction layers
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-vibe-red bg-opacity-20 border border-vibe-red text-vibe-red p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-vibe-red hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAddLayer(true)}
            className="btn-accent"
          >
            📚 Add Layer
          </button>
          <button
            onClick={() => setShowAddNode(true)}
            className="btn-primary"
          >
            ➕ Add Node
          </button>
          <button
            onClick={() => setShowAddEdge(true)}
            className="btn-secondary"
          >
            🔗 Add Edge
          </button>
          <button
            onClick={() => setShowGraphVisualization(true)}
            className="btn-primary"
          >
            🌐 Visualize Graph
          </button>
          <button
            onClick={handleLoadSampleData}
            disabled={loading}
            className="btn-accent"
          >
            📊 Load Sample Data
          </button>
          <button
            onClick={fetchGraphData}
            disabled={loading}
            className="btn-secondary"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleClearAll}
            className="btn-danger"
          >
            🗑️ Clear All
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-vibe-gray">Loading graph data...</div>
          </div>
        )}

        {/* Graph Visualization - Improved Layout */}
        {!loading && (
          <div className="space-y-6">
            {/* Hierarchical Tree View */}
            <div className="panel p-6">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">
                Hierarchical Structure ({nodes.length} nodes, {edges.length} relationships)
              </h3>
              
              <div className="space-y-6">
                {allLayers.map(layer => {
                  const layerNodes = nodesByLayer[layer] || [];
                  
                  return (
                    <div key={layer} className="border border-vibe-gray-dark rounded-lg">
                      {/* Layer Header */}
                      <div className="bg-vibe-darker p-4 rounded-t-lg border-b border-vibe-gray-dark">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${getLayerColor(layer)}`}></div>
                            <h4 className="font-semibold text-vibe-gray text-lg">{layer}</h4>
                            <span className="text-sm text-vibe-gray opacity-60">
                              ({layerNodes.length} node{layerNodes.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(customLayers.includes(layer) || (!layers.includes(layer) && layerNodes.length > 0)) && (
                              <button
                                onClick={() => handleDeleteLayer(layer)}
                                className="text-vibe-red hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-vibe-red hover:bg-opacity-20 transition-colors"
                                title={`Delete ${layer} layer and all its nodes`}
                              >
                                🗑️ Delete Layer
                              </button>
                            )}
                            {layers.includes(layer) && layerNodes.length === 0 && (
                              <span className="text-xs text-vibe-gray opacity-50">
                                Default layer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Layer Nodes */}
                      <div className="p-4">
                        {layerNodes.length === 0 ? (
                          <div className="text-center py-8 text-vibe-gray opacity-60">
                            No nodes in this layer yet
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {layerNodes.map(node => (
                              <div key={node.id} className="bg-vibe-dark p-4 rounded-lg border border-vibe-gray-dark hover:border-vibe-blue transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium text-vibe-gray">{node.name}</span>
                                      <span className={`px-2 py-1 text-xs rounded ${getTypeColor(node.type)} text-white`}>
                                        {node.type}
                                      </span>
                                    </div>
                                    <p className="text-sm text-vibe-gray opacity-75 mb-2 line-clamp-2">{node.description}</p>
                                    <code className="text-xs text-vibe-blue bg-vibe-darker px-2 py-1 rounded">{node.id}</code>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteNode(node.id)}
                                    className="text-vibe-red hover:text-white text-sm ml-2 opacity-60 hover:opacity-100"
                                    title="Delete node"
                                  >
                                    🗑️
                                  </button>
                                </div>
                                
                                {/* Node Relationships */}
                                <div className="mt-3 pt-3 border-t border-vibe-gray-dark">
                                  <div className="text-xs text-vibe-gray opacity-75">
                                    {(() => {
                                      const incomingEdges = edges.filter(e => e.to_id === node.id);
                                      const outgoingEdges = edges.filter(e => e.from_id === node.id);
                                      const totalConnections = incomingEdges.length + outgoingEdges.length;
                                      
                                      if (totalConnections === 0) {
                                        return 'No connections';
                                      }
                                      
                                      return `${totalConnections} connection${totalConnections !== 1 ? 's' : ''} (${incomingEdges.length} in, ${outgoingEdges.length} out)`;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Relationships Overview */}
            <div className="panel p-6">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">
                Relationships Overview ({edges.length} total)
              </h3>
              
              <div className="max-h-64 overflow-y-auto">
                {edges.length === 0 ? (
                  <div className="text-center py-8 text-vibe-gray opacity-60">
                    No relationships defined yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {edges.map((edge, index) => {
                      const fromNode = nodes.find(n => n.id === edge.from_id);
                      const toNode = nodes.find(n => n.id === edge.to_id);
                      
                      return (
                        <div key={index} className="bg-vibe-darker p-3 rounded border border-vibe-gray-dark">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-vibe-gray font-medium truncate">
                                {fromNode?.name || edge.from_id}
                              </span>
                              <span className="text-vibe-blue flex-shrink-0">→</span>
                              <span className="text-vibe-gray font-medium truncate">
                                {toNode?.name || edge.to_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="px-2 py-1 bg-vibe-blue text-white text-xs rounded">
                                {edge.type}
                              </span>
                              <button
                                onClick={() => handleDeleteEdge(edge.from_id, edge.to_id, edge.type)}
                                className="text-vibe-red hover:text-white text-xs px-1 py-1 rounded hover:bg-vibe-red hover:bg-opacity-20 transition-colors"
                                title="Delete relationship"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Layer Modal */}
        {showAddLayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-md">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">Add New Layer</h3>
              
              <form onSubmit={handleCreateLayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Layer Name</label>
                  <input
                    type="text"
                    value={newLayer.name}
                    onChange={(e) => setNewLayer({...newLayer, name: e.target.value})}
                    className="input-primary w-full"
                    placeholder="e.g., Business Logic, Data Layer"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Description (Optional)</label>
                  <textarea
                    value={newLayer.description}
                    onChange={(e) => setNewLayer({...newLayer, description: e.target.value})}
                    className="input-primary w-full h-20 resize-none"
                    placeholder="Describe the purpose of this layer..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Add Layer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLayer(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Node Modal */}
        {showAddNode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-md">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">Add New Node</h3>
              
              <form onSubmit={handleCreateNode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Node ID</label>
                  <input
                    type="text"
                    value={newNode.id}
                    onChange={(e) => setNewNode({...newNode, id: e.target.value})}
                    className="input-primary w-full"
                    placeholder="e.g., app.performance"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Name</label>
                  <input
                    type="text"
                    value={newNode.name}
                    onChange={(e) => setNewNode({...newNode, name: e.target.value})}
                    className="input-primary w-full"
                    placeholder="e.g., Performance Optimization"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Description</label>
                  <textarea
                    value={newNode.description}
                    onChange={(e) => setNewNode({...newNode, description: e.target.value})}
                    className="input-primary w-full h-20 resize-none"
                    placeholder="Describe this requirement..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Layer</label>
                  <select
                    value={newNode.layer}
                    onChange={(e) => setNewNode({...newNode, layer: e.target.value})}
                    className="input-primary w-full"
                  >
                    {allLayers.map(layer => (
                      <option key={layer} value={layer}>{layer}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Type</label>
                  <select
                    value={newNode.type}
                    onChange={(e) => setNewNode({...newNode, type: e.target.value})}
                    className="input-primary w-full"
                  >
                    <option value="requirement">Requirement</option>
                    <option value="constraint">Constraint</option>
                    <option value="goal">Goal</option>
                    <option value="feature">Feature</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Add Node
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNode(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Edge Modal */}
        {showAddEdge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-md">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">Add New Relationship</h3>
              
              <form onSubmit={handleCreateEdge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">From Node</label>
                  <select
                    value={newEdge.from_id}
                    onChange={(e) => setNewEdge({...newEdge, from_id: e.target.value})}
                    className="input-primary w-full"
                    required
                  >
                    <option value="">Select source node...</option>
                    {nodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.name} ({node.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">To Node</label>
                  <select
                    value={newEdge.to_id}
                    onChange={(e) => setNewEdge({...newEdge, to_id: e.target.value})}
                    className="input-primary w-full"
                    required
                  >
                    <option value="">Select target node...</option>
                    {nodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.name} ({node.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">Relationship Type</label>
                  <select
                    value={newEdge.type}
                    onChange={(e) => setNewEdge({...newEdge, type: e.target.value})}
                    className="input-primary w-full"
                  >
                    {edgeTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Create Relationship
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddEdge(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Graph Visualization Modal */}
        {showGraphVisualization && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-vibe-dark border border-vibe-gray-dark rounded-lg w-full h-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-vibe-gray-dark">
                <h3 className="text-xl font-semibold text-vibe-gray">Graph Visualization</h3>
                <button
                  onClick={() => setShowGraphVisualization(false)}
                  className="text-vibe-gray hover:text-white text-2xl leading-none"
                  title="Close visualization"
                >
                  ✕
                </button>
              </div>
              
              {/* Graph Content */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="h-full min-h-[500px] bg-vibe-darker rounded-lg border border-vibe-gray-dark p-4">
                  {nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-vibe-gray opacity-75">
                      <div className="text-center">
                        <div className="text-4xl mb-4">📊</div>
                        <div className="text-lg mb-2">No Graph Data</div>
                        <div className="text-sm">Add some nodes and relationships to visualize the graph</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Graph Statistics */}
                      <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                        <h4 className="text-lg font-medium text-vibe-gray mb-3">Graph Statistics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="bg-vibe-darker p-3 rounded">
                            <div className="text-2xl font-bold text-vibe-blue">{nodes.length}</div>
                            <div className="text-sm text-vibe-gray">Nodes</div>
                          </div>
                          <div className="bg-vibe-darker p-3 rounded">
                            <div className="text-2xl font-bold text-vibe-green">{edges.length}</div>
                            <div className="text-sm text-vibe-gray">Relationships</div>
                          </div>
                          <div className="bg-vibe-darker p-3 rounded">
                            <div className="text-2xl font-bold text-vibe-orange">{allLayers.length}</div>
                            <div className="text-sm text-vibe-gray">Layers</div>
                          </div>
                          <div className="bg-vibe-darker p-3 rounded">
                            <div className="text-2xl font-bold text-vibe-purple">{customLayers.length}</div>
                            <div className="text-sm text-vibe-gray">Custom Layers</div>
                          </div>
                        </div>
                      </div>

                      {/* Visual Graph Representation */}
                      <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                        <h4 className="text-lg font-medium text-vibe-gray mb-4">Network Diagram</h4>
                        <div className="relative bg-vibe-darkest rounded p-6 min-h-[400px] overflow-auto">
                          {/* Layer-based layout */}
                          <div className="space-y-8">
                            {allLayers.map((layer, layerIndex) => {
                              const layerNodes = nodesByLayer[layer] || [];
                              if (layerNodes.length === 0) return null;
                              
                              return (
                                <div key={layer} className="relative">
                                  {/* Layer Label */}
                                  <div className="flex items-center mb-4">
                                    <div className={`w-3 h-3 rounded-full ${getLayerColor(layer)} mr-2`}></div>
                                    <span className="font-medium text-vibe-gray">{layer}</span>
                                  </div>
                                  
                                  {/* Layer Nodes */}
                                  <div className="flex flex-wrap gap-4 ml-5">
                                    {layerNodes.map((node, nodeIndex) => {
                                      const nodeEdges = edges.filter(e => e.from_id === node.id || e.to_id === node.id);
                                      
                                      return (
                                        <div
                                          key={node.id}
                                          className="relative bg-vibe-darker border border-vibe-gray-dark rounded-lg p-3 min-w-[200px] max-w-[250px]"
                                        >
                                          <div className="text-sm font-medium text-vibe-gray mb-1">{node.name}</div>
                                          <div className="text-xs text-vibe-gray opacity-75 mb-2 line-clamp-2">{node.description}</div>
                                          <div className="text-xs text-vibe-blue">{node.id}</div>
                                          <div className="text-xs text-vibe-gray opacity-60 mt-1">
                                            {nodeEdges.length} connection{nodeEdges.length !== 1 ? 's' : ''}
                                          </div>
                                          
                                          {/* Connection indicators */}
                                          {nodeEdges.length > 0 && (
                                            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                                              <div className="w-4 h-4 bg-vibe-blue rounded-full flex items-center justify-center text-white text-xs">
                                                {nodeEdges.length}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Relationship Matrix */}
                      <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                        <h4 className="text-lg font-medium text-vibe-gray mb-4">Relationship Types</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {edgeTypes.map(type => {
                            const typeEdges = edges.filter(e => e.type === type);
                            return (
                              <div key={type} className="bg-vibe-darker p-3 rounded">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-vibe-gray">{type}</span>
                                  <span className="text-xs bg-vibe-blue text-white px-2 py-1 rounded">
                                    {typeEdges.length}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequirementsEditor; 