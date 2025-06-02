import React, { useState, useEffect } from 'react';
import { ApiService } from './services/ApiService';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PromptBuilder from './components/PromptBuilder';
import ConfigPanel from './components/ConfigPanel';
import RequirementsEditor from './components/RequirementsEditor';
import StatusBar from './components/StatusBar';
import StreamingTest from './components/StreamingTest';

const App = () => {
  const [currentView, setCurrentView] = useState('builder');
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repositoryData, setRepositoryData] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  // Auto-load default repository when config is loaded
  useEffect(() => {
    if (config.github?.default_repo && !repositoryData) {
      handleRepositoryLoad(config.github.default_repo, config.github?.token || '');
    }
  }, [config, repositoryData]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await ApiService.getConfig();
      setConfig(configData);
      setStatusMessage('Configuration loaded successfully');
    } catch (err) {
      setError(`Failed to load configuration: ${err.message}`);
      setStatusMessage('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (newConfig) => {
    try {
      setLoading(true);
      const updatedConfig = await ApiService.updateConfig(newConfig);
      setConfig(updatedConfig);
      setStatusMessage('Configuration updated successfully');
      
      // Test connections after config update
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    } catch (err) {
      setError(`Failed to update configuration: ${err.message}`);
      setStatusMessage('Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryLoad = async (repoUrl, token = '') => {
    try {
      setLoading(true);
      setError('');
      setStatusMessage(`Loading repository: ${repoUrl}`);
      
      const repoData = await ApiService.getRepositoryFiles(repoUrl, { github: { token } });
      setRepositoryData(repoData);
      setSelectedFiles([]);
      
      // Get repository info and file count for status message
      const repoInfo = repoData.files?.repository || repoData.repository || { name: 'Repository' };
      const filesArray = repoData.files?.tree || repoData.tree || [];
      
      setStatusMessage(`Repository loaded: ${repoInfo.name} (${filesArray.length} items)`);
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    } catch (err) {
      setError(`Failed to load repository: ${err.message}`);
      setStatusMessage('Failed to load repository');
      setRepositoryData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (file, isSelected) => {
    setSelectedFiles(prev => {
      if (isSelected) {
        return [...prev, file];
      } else {
        return prev.filter(f => f.path !== file.path);
      }
    });
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
  };

  const handlePromptEnhancement = async (prompt, taskType, selectedFiles) => {
    try {
      const response = await ApiService.enhancePrompt(prompt, taskType, selectedFiles);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const renderMainContent = () => {
    const workAreaContent = () => {
      switch (currentView) {
        case 'builder':
          return (
            <PromptBuilder
              selectedFiles={selectedFiles}
              onPromptEnhancement={handlePromptEnhancement}
              config={config}
            />
          );
        case 'config':
          return (
            <ConfigPanel
              config={config}
              onConfigUpdate={handleConfigUpdate}
              loading={loading}
            />
          );
        case 'requirements':
          return (
            <RequirementsEditor
              selectedFiles={selectedFiles}
              config={config}
            />
          );
        case 'streaming':
          return (
            <StreamingTest
              config={config}
            />
          );
        default:
          return (
            <div className="flex items-center justify-center h-full text-vibe-gray">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h2 className="text-xl mb-2">Welcome to Vibe Assistant</h2>
                <p className="text-vibe-gray opacity-75">Select a tool from the header to get started</p>
              </div>
            </div>
          );
      }
    };

    return (
      <div className="h-full bg-vibe-dark overflow-auto">
        {workAreaContent()}
      </div>
    );
  };

  return (
    <div className="layout-grid bg-vibe-darkest text-vibe-gray">
      {/* Header */}
      <div className="col-span-2 bg-vibe-darker border-b border-vibe-gray-dark">
        <Header 
          currentView={currentView}
          onViewChange={handleViewChange}
        />
      </div>

      {/* Sidebar */}
      <div className="bg-vibe-dark border-r border-vibe-gray-dark">
        <Sidebar
          activeView={currentView}
          onViewChange={setCurrentView}
          repositoryData={repositoryData}
          selectedFiles={selectedFiles}
          onFileSelect={handleFileSelection}
          onRepositoryLoad={handleRepositoryLoad}
          config={config}
        />
      </div>

      {/* Main Content */}
      <div className="bg-vibe-dark overflow-hidden">
        {renderMainContent()}
      </div>

      {/* Status Bar */}
      <div className="col-span-2 bg-vibe-darker border-t border-vibe-gray-dark">
        <StatusBar
          loading={loading}
          error={error}
          message={statusMessage}
          repositoryData={repositoryData}
          selectedFiles={selectedFiles}
          config={config}
        />
      </div>
    </div>
  );
};

export default App; 