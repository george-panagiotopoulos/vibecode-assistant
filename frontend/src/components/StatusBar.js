import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';

const StatusBar = ({ loading, error, message, repositoryData, selectedFiles = [], config }) => {
  const [systemStatus, setSystemStatus] = useState('unknown');
  const [configStatus, setConfigStatus] = useState({ status: 'checking', text: 'Checking', count: 0 });

  const checkSystemStatus = async () => {
    try {
      const health = await ApiService.healthCheck();
      setSystemStatus(health.environment ? 'online' : 'offline');
    } catch (error) {
      setSystemStatus('offline');
    }
  };

  const getConfigStatus = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      
      if (data.success) {
        const config = data.config;
        let configuredCount = 0;
        const totalServices = 3;
        
        // Check AWS configuration
        if (config.aws?.access_key_id && config.aws?.secret_access_key && config.aws?.model_id) {
          configuredCount++;
        }
        
        // Check GitHub configuration
        if (config.github?.token) {
          configuredCount++;
        }
        
        // Check Neo4j configuration
        if (config.neo4j?.uri && config.neo4j?.username && config.neo4j?.password) {
          configuredCount++;
        }
        
        if (configuredCount === totalServices) {
          setConfigStatus({ status: 'ready', text: 'Ready', count: configuredCount });
        } else if (configuredCount > 0) {
          setConfigStatus({ status: 'partial', text: 'Partial', count: configuredCount });
        } else {
          setConfigStatus({ status: 'missing', text: 'Missing', count: 0 });
        }
      } else {
        setConfigStatus({ status: 'error', text: 'Error', count: 0 });
      }
    } catch (error) {
      setConfigStatus({ status: 'error', text: 'Error', count: 0 });
    }
  };

  // Check system status on mount
  useEffect(() => {
    checkSystemStatus();
    getConfigStatus();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'loading': return '🟡';
      default: return '⚪';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'loading': return 'Loading';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-vibe-darker border-t border-vibe-gray-dark px-4 py-2 flex items-center justify-between text-sm">
      {/* Left side - Status and messages */}
      <div className="flex items-center space-x-4">
        {loading && (
          <div className="flex items-center space-x-2 text-yellow-500">
            <span className="animate-spin">⏳</span>
            <span>Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center space-x-2 text-vibe-red">
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}
        
        {message && !loading && !error && (
          <div className="flex items-center space-x-2 text-vibe-green">
            <span>✅</span>
            <span>{message}</span>
          </div>
        )}
        
        {repositoryData && (
          <div className="flex items-center space-x-2 text-vibe-gray">
            <span>📁</span>
            <span>{repositoryData.name || 'Repository loaded'}</span>
          </div>
        )}
        
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="flex items-center space-x-2 text-vibe-blue">
            <span>📄</span>
            <span>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</span>
          </div>
        )}
      </div>

      {/* Right side - System status */}
      <div className="flex items-center space-x-4">
        {/* API Status */}
        <div className="flex items-center space-x-2" title="Backend API Status">
          <span>{getStatusIcon(systemStatus)}</span>
          <span className="text-vibe-gray">API: {getStatusText(systemStatus)}</span>
        </div>
        
        {/* Configuration Status */}
        <div className="flex items-center space-x-2" title={`Configuration Status: ${configStatus.count}/3 services configured`}>
          <span>
            {configStatus.status === 'ready' ? '🟢' : 
             configStatus.status === 'partial' ? '🟡' : '🔴'}
          </span>
          <span className="text-vibe-gray">
            Config: {configStatus.text}
            {configStatus.status === 'partial' && ` (${configStatus.count}/3)`}
          </span>
        </div>
        
        {/* Individual Service Status */}
        <div className="flex items-center space-x-1" title="Service Configuration Status">
          <span title="AWS Bedrock" className={config?.aws?.access_key_id ? 'text-vibe-green' : 'text-vibe-red'}>
            ☁️
          </span>
          <span title="GitHub" className={config?.github?.token ? 'text-vibe-green' : 'text-vibe-red'}>
            🐙
          </span>
          <span title="Neo4j" className={config?.neo4j?.uri ? 'text-vibe-green' : 'text-vibe-red'}>
            🗄️
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar; 