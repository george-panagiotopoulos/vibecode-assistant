import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/ApiService';

const RequirementsEditor = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [showEditNode, setShowEditNode] = useState(false);
  const [showEditLayer, setShowEditLayer] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [editingLayer, setEditingLayer] = useState(null);
  const [showGraphVisualization, setShowGraphVisualization] = useState(false);
  const [showSaveGraph, setShowSaveGraph] = useState(false);
  const [showLoadGraph, setShowLoadGraph] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [graphName, setGraphName] = useState('');
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [loadingGraphs, setLoadingGraphs] = useState(false);

  // Export/Import state
  const [exportInfo, setExportInfo] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [importValidation, setImportValidation] = useState(null);
  const [importOptions, setImportOptions] = useState({
    graph_name: '',
    clear_existing: false,
    include_metadata: true
  });

  // NEW: Layer visibility state management
  // By default, all layers are collapsed (nodes hidden)
  const [collapsedLayers, setCollapsedLayers] = useState(new Set());

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

  const [editNodeForm, setEditNodeForm] = useState({
    id: '',
    name: '',
    description: '',
    layer: '',
    type: 'requirement'
  });

  const [editLayerForm, setEditLayerForm] = useState({
    name: '',
    description: ''
  });

  // NEW LAYER MANAGEMENT SYSTEM - Backend Only
  const [layers, setLayers] = useState([]);

  /**
   * Toggle visibility of nodes for a specific layer
   * @param {string} layerName - The name of the layer to toggle
   */
  const toggleLayerVisibility = useCallback((layerName) => {
    setCollapsedLayers(prevCollapsed => {
      const newCollapsed = new Set(prevCollapsed);
      if (newCollapsed.has(layerName)) {
        newCollapsed.delete(layerName);
      } else {
        newCollapsed.add(layerName);
      }
      return newCollapsed;
    });
  }, []);

  /**
   * Check if a layer is currently collapsed (nodes hidden)
   * @param {string} layerName - The name of the layer to check
   * @returns {boolean} True if layer is collapsed, false if expanded
   */
  const isLayerCollapsed = useCallback((layerName) => {
    return collapsedLayers.has(layerName);
  }, [collapsedLayers]);

  /**
   * Initialize all layers as collapsed when layers are first loaded
   * This ensures the default behavior of hiding nodes
   */
  const initializeLayerVisibility = useCallback((layerList) => {
    const allLayersCollapsed = new Set(layerList);
    setCollapsedLayers(allLayersCollapsed);
  }, []);

  const edgeTypes = ['LINKED_TO', 'DEPENDS_ON', 'SUPPORTS', 'CONFLICTS_WITH', 'ENABLES'];

  // Dynamic layer color assignment
  const getLayerColor = (layer) => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500',
      'bg-cyan-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    // Use layer name hash to consistently assign colors
    let hash = 0;
    for (let i = 0; i < layer.length; i++) {
      hash = layer.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  // NEW LAYER MANAGEMENT FUNCTIONS
  
  // Fetch layers from backend
  const fetchLayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/graph/layers');
      const result = await response.json();
      
      if (result.success) {
        const layerList = result.layers || [];
        setLayers(layerList);
        
        // Initialize all layers as collapsed (nodes hidden) by default
        initializeLayerVisibility(layerList);
      } else {
        setError(result.error || 'Failed to fetch layers');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [initializeLayerVisibility]);

  // Validate layer name
  const validateLayerName = (name) => {
    if (!name || !name.trim()) {
      return 'Layer name is required';
    }
    
    if (name.trim().length < 2) {
      return 'Layer name must be at least 2 characters';
    }
    
    if (layers.includes(name.trim())) {
      return 'Layer already exists';
    }
    
    return null;
  };

  // Create new layer
  const createLayer = async (name, description = '') => {
    const validationError = validateLayerName(name);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/graph/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchLayers(); // Refresh layers
        return true;
      } else {
        setError(result.error || 'Failed to create layer');
        return false;
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete layer
  const deleteLayer = async (layerName) => {
    if (!window.confirm(`Are you sure you want to delete the entire "${layerName}" layer and all its nodes? This action cannot be undone.`)) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/graph/layers/${encodeURIComponent(layerName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchLayers(); // Refresh layers
        await fetchGraphData(); // Refresh nodes/edges
        return true;
      } else {
        setError(result.error || 'Failed to delete layer');
        return false;
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch nodes and edges
      const response = await fetch('/api/graph/nodes');
      const result = await response.json();
      
      if (result.success) {
        setNodes(result.data.nodes || []);
        setEdges(result.data.edges || []);
      } else {
        setError(result.error || 'Failed to fetch graph data');
      }

      // Fetch layers using the new function
      await fetchLayers();
      
    } catch (err) {
      console.error('Network error in fetchGraphData:', err);
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchLayers]);

  // Create new node
  const handleCreateNode = async (e) => {
    e.preventDefault();
    if (!newNode.id || !newNode.name) {
      setError('Node ID and name are required');
      return;
    }

    if (layers.length === 0) {
      setError('No layers available. Please create a layer first.');
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
        setNewNode({ 
          id: '', 
          name: '', 
          description: '', 
          layer: layers[0] || '', 
          type: 'requirement' 
        });
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

  // Save graph
  const handleSaveGraph = async (e) => {
    e.preventDefault();
    if (!graphName.trim()) {
      setError('Graph name is required');
      return;
    }

    try {
      const response = await fetch('/api/graph/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph_name: graphName.trim() })
      });
      
      const result = await response.json();
      if (result.success) {
        setGraphName('');
        setShowSaveGraph(false);
        setError(null);
        alert(`Graph "${graphName}" saved successfully!`);
      } else {
        setError(result.error || 'Failed to save graph');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Load saved graphs list
  const loadSavedGraphs = async () => {
    setLoadingGraphs(true);
    try {
      const response = await fetch('/api/graph/saved');
      const result = await response.json();
      if (result.success) {
        setSavedGraphs(result.graphs || []);
      } else {
        setError(result.error || 'Failed to load saved graphs');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoadingGraphs(false);
    }
  };

  // Load specific graph
  const handleLoadGraph = async (graphName) => {
    if (!window.confirm(`Are you sure you want to load "${graphName}"? This will replace the current graph data.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/graph/load/${encodeURIComponent(graphName)}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        setShowLoadGraph(false);
        setError(null);
        fetchGraphData(); // Refresh the data
        alert(`Graph "${graphName}" loaded successfully!`);
      } else {
        setError(result.error || 'Failed to load graph');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete specific saved graph
  const handleDeleteGraph = async (graphName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the saved graph "${graphName}"? This action cannot be undone.`)) {
      return;
    }

    setLoadingGraphs(true);
    try {
      const response = await fetch(`/api/graph/saved/${encodeURIComponent(graphName)}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setError(null);
        // Refresh the saved graphs list
        await loadSavedGraphs();
        alert(`Graph "${graphName}" deleted successfully!`);
      } else {
        setError(result.error || 'Failed to delete graph');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoadingGraphs(false);
    }
  };

  // Open load graph modal and fetch saved graphs
  const openLoadGraphModal = () => {
    setShowLoadGraph(true);
    loadSavedGraphs();
  };

  // Get type badge color
  const getTypeColor = (type) => {
    const colors = {
      'Non-Functional Requirement': 'bg-vibe-blue',
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

  /**
   * Reusable LayerHeader component for consistent layer display
   * Includes toggle functionality, layer info, and action buttons
   */
  const LayerHeader = ({ layer, nodeCount, isCollapsed, onToggle, onEdit, onDelete }) => (
    <div className="bg-vibe-darker p-4 rounded-t-lg border-b border-vibe-gray-dark">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Layer color indicator */}
          <div className={`w-4 h-4 rounded-full ${getLayerColor(layer)}`}></div>
          
          {/* Layer name and node count */}
          <h4 className="font-semibold text-vibe-gray text-lg">{layer}</h4>
          <span className="text-sm text-vibe-gray opacity-60">
            ({nodeCount} node{nodeCount !== 1 ? 's' : ''})
          </span>
          
          {/* Toggle button for showing/hiding nodes */}
          <button
            onClick={onToggle}
            className="ml-2 px-3 py-1 text-xs bg-vibe-blue text-white rounded hover:bg-blue-600 transition-colors"
            title={isCollapsed ? 'Show nodes' : 'Hide nodes'}
          >
            {isCollapsed ? '👁️ Show' : '🙈 Hide'} Nodes
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-orange-500 hover:text-orange-400 text-sm px-2 py-1 rounded hover:bg-orange-500 hover:bg-opacity-20 transition-colors"
            title={`Edit ${layer} layer`}
          >
            ✏️ Edit Layer
          </button>
          <button
            onClick={onDelete}
            className="text-vibe-red hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-vibe-red hover:bg-opacity-20 transition-colors"
            title={`Delete ${layer} layer and all its nodes`}
          >
            🗑️ Delete Layer
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Reusable NodeGrid component for displaying layer nodes
   * Maintains existing styling and functionality
   */
  const NodeGrid = ({ nodes, edges, onEditNode, onDeleteNode }) => (
    <div className="p-4">
      {nodes.length === 0 ? (
        <div className="text-center py-8 text-vibe-gray opacity-60">
          No nodes in this layer yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map(node => (
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
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => onEditNode(node)}
                    className="text-orange-500 hover:text-orange-400 text-sm opacity-60 hover:opacity-100"
                    title="Edit node"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDeleteNode(node.id)}
                    className="text-vibe-red hover:text-white text-sm opacity-60 hover:opacity-100"
                    title="Delete node"
                  >
                    🗑️
                  </button>
                </div>
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
  );

  // Handle layer creation using new system
  const handleCreateLayer = async (e) => {
    e.preventDefault();
    
    const success = await createLayer(newLayer.name, newLayer.description);
    if (success) {
      setNewLayer({ name: '', description: '', color: 'bg-blue-500' });
      setShowAddLayer(false);
      setError(null);
    }
  };

  // Handle layer deletion using new system
  const handleDeleteLayer = async (layerName) => {
    const success = await deleteLayer(layerName);
    if (success) {
      setError(null);
    }
  };

  // Edit handlers
  const handleEditNode = (node) => {
    setEditingNode(node);
    setEditNodeForm({
      id: node.id,
      name: node.name,
      description: node.description,
      layer: node.layer,
      type: node.type
    });
    setShowEditNode(true);
  };

  const handleEditLayer = (layerName) => {
    setEditingLayer(layerName);
    setEditLayerForm({
      name: layerName,
      description: '' // We don't have layer descriptions in the current data structure
    });
    setShowEditLayer(true);
  };

  const handleUpdateNode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/graph/nodes/${editingNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editNodeForm.name,
          description: editNodeForm.description,
          layer: editNodeForm.layer,
          type: editNodeForm.type
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update the local state
        setNodes(prevNodes => 
          prevNodes.map(node => 
            node.id === editingNode.id ? result.node : node
          )
        );
        
        setShowEditNode(false);
        setEditingNode(null);
        setEditNodeForm({
          id: '',
          name: '',
          description: '',
          layer: '',
          type: 'requirement'
        });
      } else {
        setError(result.error || 'Failed to update node');
      }
    } catch (error) {
      console.error('Error updating node:', error);
      setError(error.message || 'Failed to update node');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/graph/layers/${encodeURIComponent(editingLayer)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editLayerForm.name,
          description: editLayerForm.description
        })
      });

      const result = await response.json();

      if (result.success) {
        // If layer name changed, update all affected nodes and layers list
        if (editingLayer !== editLayerForm.name) {
          setNodes(prevNodes => 
            prevNodes.map(node => 
              node.layer === editingLayer 
                ? { ...node, layer: editLayerForm.name }
                : node
            )
          );
          
          setLayers(prevLayers => 
            prevLayers.map(layer => 
              layer === editingLayer ? editLayerForm.name : layer
            )
          );
        }
        
        setShowEditLayer(false);
        setEditingLayer(null);
        setEditLayerForm({
          name: '',
          description: ''
        });
      } else {
        setError(result.error || 'Failed to update layer');
      }
    } catch (error) {
      console.error('Error updating layer:', error);
      setError(error.message || 'Failed to update layer');
    } finally {
      setLoading(false);
    }
  };

  const cancelEditNode = () => {
    setShowEditNode(false);
    setEditingNode(null);
    setEditNodeForm({
      id: '',
      name: '',
      description: '',
      layer: '',
      type: 'requirement'
    });
  };

  const cancelEditLayer = () => {
    setShowEditLayer(false);
    setEditingLayer(null);
    setEditLayerForm({ name: '', description: '' });
  };

  // Export/Import handlers
  const handleExportGraph = async () => {
    try {
      setExportLoading(true);
      setError(null);
      
      // Get export info first
      const infoResponse = await ApiService.getExportInfo();
      setExportInfo(infoResponse.export_info);
      setShowExportModal(true);
    } catch (error) {
      console.error('Error getting export info:', error);
      setError(`Failed to get export information: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const executeExport = async (includeMetadata = true) => {
    try {
      setExportLoading(true);
      setError(null);
      
      const result = await ApiService.exportGraph({
        include_metadata: includeMetadata
      });
      
      setShowExportModal(false);
      setError(null);
      
      // Show success message
      setTimeout(() => {
        setError(`✅ Graph exported successfully as ${result.filename}`);
        setTimeout(() => setError(null), 3000);
      }, 100);
      
    } catch (error) {
      console.error('Error exporting graph:', error);
      setError(`Failed to export graph: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportGraph = () => {
    setShowImportModal(true);
    setImportFile(null);
    setImportData(null);
    setImportValidation(null);
    setImportOptions({
      graph_name: '',
      clear_existing: false,
      include_metadata: true
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportFile(file);
    setImportData(null);
    setImportValidation(null);

    try {
      // Read and validate the file
      const jsonData = await ApiService.readFileAsJSON(file);
      setImportData(jsonData);
      
      // Validate the import data
      const validation = await ApiService.validateImportData(jsonData);
      setImportValidation(validation.validation);
      
    } catch (error) {
      console.error('Error reading import file:', error);
      setError(`Error reading file: ${error.message}`);
      setImportFile(null);
    }
  };

  const executeImport = async () => {
    if (!importFile || !importData) {
      setError('No file selected for import');
      return;
    }

    try {
      setImportLoading(true);
      setError(null);
      
      const result = await ApiService.importGraphFromFile(importFile, importOptions);
      
      if (result.success) {
        setShowImportModal(false);
        setError(null);
        
        // Refresh the graph data
        await fetchGraphData();
        
        // Show success message
        const stats = result.statistics;
        const message = `✅ Import successful: ${stats.nodes_created} nodes created, ${stats.nodes_updated} nodes updated, ${stats.edges_created} edges created`;
        setError(message);
        setTimeout(() => setError(null), 5000);
        
        if (stats.errors && stats.errors.length > 0) {
          console.warn('Import warnings:', stats.errors);
        }
      } else {
        setError(`Import failed: ${result.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Error importing graph:', error);
      setError(`Failed to import graph: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
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
            className="btn-add"
          >
            📚 Add Layer
          </button>
          <button
            onClick={() => setShowAddNode(true)}
            className="btn-add"
          >
            ➕ Add Node
          </button>
          <button
            onClick={() => setShowAddEdge(true)}
            className="btn-add"
          >
            🔗 Add Edge
          </button>
          <button
            onClick={() => setShowGraphVisualization(true)}
            className="btn-standard"
          >
            🌐 Visualize Graph
          </button>
          <button
            onClick={() => setShowSaveGraph(true)}
            disabled={loading || nodes.length === 0}
            className="btn-standard"
            title={nodes.length === 0 ? "No graph data to save" : "Save current graph"}
          >
            💾 Save Graph
          </button>
          <button
            onClick={openLoadGraphModal}
            disabled={loading}
            className="btn-standard"
          >
            📂 Load Graph
          </button>
          <button
            onClick={handleExportGraph}
            disabled={loading || exportLoading || nodes.length === 0}
            className="btn-standard"
            title={nodes.length === 0 ? "No graph data to export" : "Export graph to JSON file"}
          >
            {exportLoading ? '🔄 Exporting...' : '📤 Export Graph'}
          </button>
          <button
            onClick={handleImportGraph}
            disabled={loading || importLoading}
            className="btn-standard"
            title="Import graph from JSON file"
          >
            {importLoading ? '🔄 Importing...' : '📥 Import Graph'}
          </button>
          <button
            onClick={handleLoadSampleData}
            disabled={loading}
            className="btn-add"
          >
            📊 Load Sample Data
          </button>
          <button
            onClick={fetchGraphData}
            disabled={loading}
            className="btn-standard"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleClearAll}
            className="btn-delete"
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
                {layers.length === 0 ? (
                  <div className="text-center py-12 text-vibe-gray opacity-60">
                    <div className="mb-4">
                      <div className="text-6xl mb-4">📋</div>
                      <h4 className="text-lg font-medium mb-2">No layers created yet</h4>
                      <p className="text-sm">Create your first layer to start organizing your requirements</p>
                    </div>
                    <button
                      onClick={() => setShowAddLayer(true)}
                      className="btn-add mt-4"
                    >
                      Create First Layer
                    </button>
                  </div>
                ) : (
                  layers.map(layer => {
                    const layerNodes = nodesByLayer[layer] || [];
                    
                    return (
                      <div key={layer} className="border border-vibe-gray-dark rounded-lg">
                        {/* Layer Header */}
                        <LayerHeader
                          layer={layer}
                          nodeCount={layerNodes.length}
                          isCollapsed={isLayerCollapsed(layer)}
                          onToggle={() => toggleLayerVisibility(layer)}
                          onEdit={() => handleEditLayer(layer)}
                          onDelete={() => handleDeleteLayer(layer)}
                        />
                        
                        {/* Layer Nodes - Only show when layer is not collapsed */}
                        {!isLayerCollapsed(layer) && (
                          <NodeGrid
                            nodes={layerNodes}
                            edges={edges}
                            onEditNode={(node) => handleEditNode(node)}
                            onDeleteNode={(nodeId) => handleDeleteNode(nodeId)}
                          />
                        )}
                      </div>
                    );
                  })
                )}
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
                    className="btn-add flex-1"
                  >
                    Add Layer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLayer(false)}
                    className="btn-standard flex-1"
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
                    disabled={layers.length === 0}
                  >
                    {layers.length === 0 ? (
                      <option value="">No layers available - create a layer first</option>
                    ) : (
                      layers.map(layer => (
                        <option key={layer} value={layer}>{layer}</option>
                      ))
                    )}
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
                    className="btn-add flex-1"
                  >
                    Add Node
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNode(false)}
                    className="btn-standard flex-1"
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
                  <button type="submit" className="btn-add flex-1">
                    Create Relationship
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddEdge(false)}
                    className="btn-standard flex-1"
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
                            <div className="text-2xl font-bold text-vibe-orange">{layers.length}</div>
                            <div className="text-sm text-vibe-gray">Layers</div>
                          </div>
                        </div>
                      </div>

                      {/* Visual Graph Representation */}
                      <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                        <h4 className="text-lg font-medium text-vibe-gray mb-4">Network Diagram</h4>
                        <div className="relative bg-vibe-darkest rounded p-6 min-h-[400px] overflow-auto">
                          {/* Layer-based layout */}
                          <div className="space-y-8">
                            {layers.map((layer, layerIndex) => {
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

      {/* Save Graph Modal */}
      {showSaveGraph && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-dark border border-vibe-gray-dark rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-vibe-gray mb-4">Save Graph</h3>
            <form onSubmit={handleSaveGraph}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-vibe-gray mb-2">
                  Graph Name
                </label>
                <input
                  type="text"
                  value={graphName}
                  onChange={(e) => setGraphName(e.target.value)}
                  placeholder="Enter a name for your graph"
                  className="w-full px-3 py-2 bg-vibe-darker border border-vibe-gray-dark rounded text-vibe-gray placeholder-vibe-gray placeholder-opacity-50 focus:outline-none focus:border-vibe-blue"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveGraph(false);
                    setGraphName('');
                  }}
                  className="px-4 py-2 text-vibe-gray hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-standard"
                >
                  💾 Save Graph
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Graph Modal */}
      {showLoadGraph && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-dark border border-vibe-gray-dark rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-vibe-gray">Load Saved Graph</h3>
              <button
                onClick={() => setShowLoadGraph(false)}
                className="text-vibe-gray hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingGraphs ? (
                <div className="text-center py-8">
                  <div className="text-vibe-gray">Loading saved graphs...</div>
                </div>
              ) : savedGraphs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-vibe-gray opacity-75">No saved graphs found</div>
                  <div className="text-sm text-vibe-gray opacity-50 mt-2">
                    Save your current graph to see it here
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedGraphs.map((graph, index) => (
                    <div key={index} className="bg-vibe-darker p-4 rounded border border-vibe-gray-dark">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-vibe-gray">{graph.name}</h4>
                          <p className="text-sm text-vibe-gray opacity-75">
                            {graph.nodes_count} nodes, {graph.edges_count} edges
                          </p>
                          {graph.created_at && (
                            <p className="text-xs text-vibe-gray opacity-60">
                              Created: {new Date(graph.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadGraph(graph.name)}
                            className="px-3 py-1 bg-vibe-blue text-white rounded hover:bg-opacity-80 transition-colors text-sm"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteGraph(graph.name)}
                            className="px-3 py-1 bg-vibe-red text-white rounded hover:bg-opacity-80 transition-colors text-sm"
                            title="Delete this saved graph"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4 pt-4 border-t border-vibe-gray-dark">
              <button
                onClick={() => setShowLoadGraph(false)}
                className="px-4 py-2 text-vibe-gray hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Node Modal */}
      {showEditNode && editingNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-md">
            <h3 className="text-lg font-medium text-vibe-gray mb-4">Edit Node</h3>
            
            <form onSubmit={handleUpdateNode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Node ID</label>
                <input
                  type="text"
                  value={editNodeForm.id}
                  className="input-primary w-full bg-vibe-gray-dark opacity-50 cursor-not-allowed"
                  disabled
                  title="Node ID cannot be changed"
                />
                <p className="text-xs text-vibe-gray opacity-60 mt-1">Node ID cannot be modified</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Name</label>
                <input
                  type="text"
                  value={editNodeForm.name}
                  onChange={(e) => setEditNodeForm({...editNodeForm, name: e.target.value})}
                  className="input-primary w-full"
                  placeholder="e.g., Performance Optimization"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Description</label>
                <textarea
                  value={editNodeForm.description}
                  onChange={(e) => setEditNodeForm({...editNodeForm, description: e.target.value})}
                  className="input-primary w-full h-20 resize-none"
                  placeholder="Describe this requirement..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Layer</label>
                <select
                  value={editNodeForm.layer}
                  onChange={(e) => setEditNodeForm({...editNodeForm, layer: e.target.value})}
                  className="input-primary w-full"
                  disabled={layers.length === 0}
                >
                  {layers.length === 0 ? (
                    <option value="">No layers available</option>
                  ) : (
                    layers.map(layer => (
                      <option key={layer} value={layer}>{layer}</option>
                    ))
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Type</label>
                <select
                  value={editNodeForm.type}
                  onChange={(e) => setEditNodeForm({...editNodeForm, type: e.target.value})}
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
                  className="btn-edit flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Node'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditNode}
                  className="btn-standard flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Layer Modal */}
      {showEditLayer && editingLayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-md">
            <h3 className="text-lg font-medium text-vibe-gray mb-4">Edit Layer</h3>
            
            <form onSubmit={handleUpdateLayer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Layer Name</label>
                <input
                  type="text"
                  value={editLayerForm.name}
                  onChange={(e) => setEditLayerForm({...editLayerForm, name: e.target.value})}
                  className="input-primary w-full"
                  placeholder="e.g., Business Logic, Data Layer"
                  required
                />
                <p className="text-xs text-vibe-gray opacity-60 mt-1">
                  Changing the layer name will update all nodes in this layer
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-vibe-gray mb-2">Description (Optional)</label>
                <textarea
                  value={editLayerForm.description}
                  onChange={(e) => setEditLayerForm({...editLayerForm, description: e.target.value})}
                  className="input-primary w-full h-20 resize-none"
                  placeholder="Describe the purpose of this layer..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-edit flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Layer'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditLayer}
                  className="btn-standard flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && exportInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-2xl">
            <h3 className="text-lg font-medium text-vibe-gray mb-4">Export Graph Data</h3>
            
            <div className="space-y-4">
              {/* Export Statistics */}
              <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                <h4 className="font-medium text-vibe-gray mb-3">Export Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-vibe-blue">{exportInfo.statistics.total_nodes}</div>
                    <div className="text-vibe-gray opacity-75">Nodes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-vibe-green">{exportInfo.statistics.total_edges}</div>
                    <div className="text-vibe-gray opacity-75">Edges</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-vibe-blue">{exportInfo.statistics.total_layers}</div>
                    <div className="text-vibe-gray opacity-75">Layers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-vibe-green">{exportInfo.statistics.custom_layers_count}</div>
                    <div className="text-vibe-gray opacity-75">Custom Layers</div>
                  </div>
                </div>
              </div>

              {/* Layer Breakdown */}
              {Object.keys(exportInfo.layer_statistics).length > 0 && (
                <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                  <h4 className="font-medium text-vibe-gray mb-3">Layer Breakdown</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {Object.entries(exportInfo.layer_statistics).map(([layer, stats]) => (
                      <div key={layer} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getLayerColor(layer)}`}></div>
                          <span className="text-vibe-gray">{layer}</span>
                        </div>
                        <div className="text-vibe-gray opacity-75">
                          {stats.nodes} nodes ({stats.types.join(', ')})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                <h4 className="font-medium text-vibe-gray mb-3">Export Options</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={importOptions.include_metadata}
                      onChange={(e) => setImportOptions({...importOptions, include_metadata: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-vibe-gray">Include metadata (timestamps, statistics)</span>
                  </label>
                  <p className="text-xs text-vibe-gray opacity-60">
                    Metadata includes creation timestamps and detailed statistics. Disable for smaller file size.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-vibe-gray-dark mt-6">
              <button
                onClick={() => executeExport(importOptions.include_metadata)}
                disabled={exportLoading}
                className="btn-add flex-1"
              >
                {exportLoading ? '🔄 Exporting...' : '📤 Export Graph'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-standard flex-1"
                disabled={exportLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-vibe-darker p-6 rounded-lg border border-vibe-gray-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-vibe-gray mb-4">Import Graph Data</h3>
            
            <div className="space-y-4">
              {/* File Selection */}
              <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                <h4 className="font-medium text-vibe-gray mb-3">Select File</h4>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full text-vibe-gray file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-vibe-blue file:text-white hover:file:bg-opacity-80"
                />
                <p className="text-xs text-vibe-gray opacity-60 mt-2">
                  Select a JSON file exported from Vibe Assistant
                </p>
              </div>

              {/* File Validation Results */}
              {importValidation && (
                <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                  <h4 className="font-medium text-vibe-gray mb-3">File Validation</h4>
                  
                  {importValidation.valid ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-vibe-green">
                        <span>✅</span>
                        <span>File is valid and ready for import</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-xl font-bold text-vibe-blue">{importValidation.statistics.nodes_count}</div>
                          <div className="text-vibe-gray opacity-75">Nodes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-vibe-green">{importValidation.statistics.edges_count}</div>
                          <div className="text-vibe-gray opacity-75">Edges</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-vibe-blue">{importValidation.statistics.unique_node_ids}</div>
                          <div className="text-vibe-gray opacity-75">Unique IDs</div>
                        </div>
                      </div>

                      {importValidation.warnings && importValidation.warnings.length > 0 && (
                        <div className="mt-3">
                          <div className="text-yellow-500 text-sm font-medium mb-2">⚠️ Warnings:</div>
                          <ul className="text-xs text-vibe-gray space-y-1">
                            {importValidation.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-vibe-red">
                        <span>❌</span>
                        <span>File validation failed</span>
                      </div>
                      
                      <div className="text-sm">
                        <div className="text-vibe-red font-medium mb-2">Errors:</div>
                        <ul className="text-xs text-vibe-gray space-y-1">
                          {importValidation.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import Options */}
              {importValidation && importValidation.valid && (
                <div className="bg-vibe-dark p-4 rounded border border-vibe-gray-dark">
                  <h4 className="font-medium text-vibe-gray mb-3">Import Options</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-vibe-gray mb-2">
                        Save as Named Graph (Optional)
                      </label>
                      <input
                        type="text"
                        value={importOptions.graph_name}
                        onChange={(e) => setImportOptions({...importOptions, graph_name: e.target.value})}
                        className="input-primary w-full"
                        placeholder="Enter a name to save this import as a named graph"
                      />
                    </div>
                    
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={importOptions.clear_existing}
                        onChange={(e) => setImportOptions({...importOptions, clear_existing: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-vibe-gray">Clear existing graph data before import</span>
                    </label>
                    
                    {importOptions.clear_existing && (
                      <div className="bg-vibe-red bg-opacity-20 border border-vibe-red text-vibe-red p-3 rounded text-sm">
                        ⚠️ Warning: This will permanently delete all current graph data before importing.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-vibe-gray-dark mt-6">
              <button
                onClick={executeImport}
                disabled={importLoading || !importValidation || !importValidation.valid}
                className="btn-add flex-1"
              >
                {importLoading ? '🔄 Importing...' : '📥 Import Graph'}
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                className="btn-standard flex-1"
                disabled={importLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsEditor; 