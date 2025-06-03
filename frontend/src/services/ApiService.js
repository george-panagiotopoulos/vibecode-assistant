import axios from 'axios';
import loggingService from './LoggingService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for LLM calls
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    loggingService.logInfo(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      url: config.url,
      method: config.method,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    loggingService.logError('request_interceptor', error.message, { error: error.toString() });
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    loggingService.logInfo(`API Response: ${response.status} ${response.config.url}`, {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    
    if (response.data && !response.data.success && response.data.error) {
      const error = new Error(response.data.error);
      loggingService.logError('api_response_error', response.data.error, {
        url: response.config.url,
        status: response.status,
        response_data: response.data
      });
      throw error;
    }
    return response;
  },
  (error) => {
    const errorMessage = error.response?.data?.error || error.message;
    loggingService.logError('api_response_error', errorMessage, {
      url: error.config?.url,
      status: error.response?.status,
      code: error.code,
      response_data: error.response?.data
    });
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server - is it running?');
    }
    throw error;
  }
);

export const ApiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Configuration operations
  async getConfig() {
    const response = await api.get('/api/config');
    return response.data.config;
  },

  async updateConfig(config) {
    const response = await api.post('/api/config', config);
    return response.data.config;
  },

  // Test service connections
  async testConnection(service, config = {}) {
    const response = await api.post(`/api/test-connection/${service}`, config);
    return response.data;
  },

  // GitHub operations
  async cloneRepository(repoUrl, branch = 'main') {
    const response = await api.post('/api/github/clone', {
      repo_url: repoUrl,
      branch: branch
    });
    return response.data;
  },

  async loadRepository(repoUrl, config = {}) {
    const response = await api.post('/api/repositories/files', {
      repo_url: repoUrl,
      github_token: config.github?.token
    });
    return response.data;
  },

  async getRepositoryFiles(repoUrl, config = {}) {
    const response = await api.post('/api/repositories/files', {
      repo_url: repoUrl,
      github_token: config.github?.token
    });
    return response.data;
  },

  async getFileContent(repoUrl, filePath, config = {}) {
    const response = await api.post('/api/repositories/file-content', {
      repo_url: repoUrl,
      file_path: filePath,
      github_token: config.github?.token
    });
    return response.data;
  },

  // Requirements operations
  async getRequirements(taskType, config = {}) {
    const response = await api.get('/api/requirements', {
      params: { task_type: taskType }
    });
    return response.data;
  },

  async updateRequirements(taskType, requirements, config = {}) {
    const response = await api.post('/api/requirements', { 
      task_type: taskType,
      requirements 
    });
    return response.data;
  },

  // Enhanced prompt operation - the main feature
  async enhancePrompt(prompt, taskType = 'development', selectedFiles = []) {
    try {
      loggingService.logInfo('Starting prompt enhancement', {
        prompt: prompt.substring(0, 100) + '...',
        taskType,
        selectedFilesCount: selectedFiles.length
      });

      const response = await api.post('/api/enhance-prompt', {
        prompt,
        task_type: taskType,
        selected_files: selectedFiles
      });

      loggingService.logInfo('Prompt enhancement successful', {
        responseLength: response.data.enhanced_specification?.length || 0
      });

      return response.data;
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      loggingService.logError('enhance_prompt', error.message, {
        prompt: prompt.substring(0, 100) + '...',
        taskType,
        selectedFilesCount: selectedFiles.length,
        error: error.toString()
      });
      throw error;
    }
  },

  // Streaming response operation
  async streamResponse(prompt, options = {}) {
    const {
      systemPrompt = null,
      maxTokens = 4000,
      temperature = 0.3,
      onChunk = () => {},
      onComplete = () => {},
      onError = () => {}
    } = options;

    try {
      loggingService.logInfo('Starting streaming response', {
        prompt: prompt.substring(0, 100) + '...',
        maxTokens,
        temperature
      });

      const response = await fetch(`${API_BASE_URL}/api/stream-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          system_prompt: systemPrompt,
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        loggingService.logError('streaming_http_error', errorMsg, {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                loggingService.logError('streaming_data_error', data.error, {
                  chunkCount,
                  totalLength
                });
                onError(new Error(data.error));
                return;
              }
              
              if (data.done) {
                loggingService.logInfo('Streaming completed successfully', {
                  chunkCount,
                  totalLength
                });
                onComplete();
                return;
              }
              
              if (data.chunk) {
                chunkCount++;
                totalLength += data.chunk.length;
                onChunk(data.chunk);
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
              loggingService.logWarning('Failed to parse streaming data', {
                parseError: parseError.message,
                line: line
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming response:', error);
      loggingService.logError('streaming_response', error.message, {
        prompt: prompt.substring(0, 100) + '...',
        error: error.toString()
      });
      onError(error);
      throw error;
    }
  },

  // Repository analysis
  async analyzeRepository(repoPath) {
    const response = await api.get('/api/repository/analyze', {
      params: { repo_path: repoPath }
    });
    return response.data;
  },

  // Neo4j Graph operations
  async getSavedGraphs() {
    const response = await api.get('/api/graph/saved');
    return response.data;
  },

  async getGraphData(graphName) {
    // This method gets the saved graph data without loading it into the main graph
    const response = await api.get(`/api/graph/saved/${graphName}/data`);
    return response.data;
  },

  async loadGraph(graphName) {
    const response = await api.post(`/api/graph/load/${graphName}`);
    return response.data;
  },

  async saveGraph(graphName, graphData) {
    const response = await api.post('/api/graph/save', {
      graph_name: graphName,
      graph_data: graphData
    });
    return response.data;
  },

  async deleteGraph(graphName) {
    const response = await api.delete(`/api/graph/saved/${graphName}`);
    return response.data;
  },

  async getGraphNodes() {
    const response = await api.get('/api/graph/nodes');
    return response.data;
  },

  async createGraphNode(nodeData) {
    const response = await api.post('/api/graph/nodes', nodeData);
    return response.data;
  },

  async updateGraphNode(nodeId, nodeData) {
    const response = await api.put(`/api/graph/nodes/${nodeId}`, nodeData);
    return response.data;
  },

  async deleteGraphNode(nodeId) {
    const response = await api.delete(`/api/graph/nodes/${nodeId}`);
    return response.data;
  },

  async getGraphLayers() {
    const response = await api.get('/api/graph/layers');
    return response.data;
  },

  async createGraphLayer(layerData) {
    const response = await api.post('/api/graph/layers', layerData);
    return response.data;
  },

  async updateGraphLayer(layerName, layerData) {
    const response = await api.put(`/api/graph/layers/${encodeURIComponent(layerName)}`, layerData);
    return response.data;
  },

  async deleteGraphLayer(layerName) {
    const response = await api.delete(`/api/graph/layers/${encodeURIComponent(layerName)}`);
    return response.data;
  },

  async createGraphEdge(edgeData) {
    const response = await api.post('/api/graph/edges', edgeData);
    return response.data;
  },

  async deleteGraphEdge(fromId, toId, edgeType) {
    const response = await api.delete('/api/graph/edges', {
      data: { fromId, toId, edgeType }
    });
    return response.data;
  },

  // Graph Export/Import operations
  async getExportInfo() {
    const response = await api.get('/api/graph/export/info');
    return response.data;
  },

  async exportGraph(options = {}) {
    try {
      const response = await api.post('/api/graph/export', options, {
        responseType: 'blob'
      });
      
      // Create blob URL for download
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'vibe_graph_export.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Error exporting graph:', error);
      throw error;
    }
  },

  async validateImportData(importData) {
    const response = await api.post('/api/graph/import/validate', importData);
    return response.data;
  },

  async importGraph(importData, options = {}) {
    const response = await api.post('/api/graph/import', {
      import_data: importData,
      options: options
    });
    return response.data;
  },

  async importGraphFromFile(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add options to form data
    if (options.graph_name) {
      formData.append('graph_name', options.graph_name);
    }
    if (options.clear_existing) {
      formData.append('clear_existing', 'true');
    }
    
    const response = await api.post('/api/graph/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Utility method to read file as JSON
  async readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          resolve(json);
        } catch (error) {
          reject(new Error(`Invalid JSON file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  },

  // Utility methods
  validateGitHubUrl(url) {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    const shortFormRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    return githubRegex.test(url) || shortFormRegex.test(url);
  },

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileIcon(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      js: '📄',
      jsx: '⚛️',
      ts: '📘',
      tsx: '⚛️',
      py: '🐍',
      java: '☕',
      cpp: '⚙️',
      c: '⚙️',
      css: '🎨',
      html: '🌐',
      json: '📋',
      md: '📝',
      txt: '📄',
      png: '🖼️',
      jpg: '🖼️',
      gif: '🖼️',
      svg: '🖼️'
    };
    return iconMap[extension] || '📄';
  }
};

export default ApiService; 