import React, { useState, useCallback } from 'react';
import { ApiService } from '../services/ApiService';

const Dashboard = ({ config, onConfigUpdate }) => {
  const [serviceStatus, setServiceStatus] = useState({
    api: { status: 'unknown', message: '', lastChecked: null },
    frontend: { status: 'unknown', message: '', lastChecked: null },
    github: { status: 'unknown', message: '', lastChecked: null },
    aws: { status: 'unknown', message: '', lastChecked: null },
    neo4j: { status: 'unknown', message: '', lastChecked: null }
  });
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  
  // Configuration state
  const [configData, setConfigData] = useState(config || {});
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [testing, setTesting] = useState({
    aws: false,
    github: false,
    neo4j: false
  });
  const [testResults, setTestResults] = useState({
    aws: null,
    github: null,
    neo4j: null
  });

  const checkAllServices = useCallback(async () => {
    setLoading(true);
    const newStatus = {
      api: { status: 'unknown', message: '', lastChecked: new Date() },
      frontend: { status: 'unknown', message: '', lastChecked: new Date() },
      github: { status: 'unknown', message: '', lastChecked: new Date() },
      aws: { status: 'unknown', message: '', lastChecked: new Date() },
      neo4j: { status: 'unknown', message: '', lastChecked: new Date() }
    };

    // Check API health
    try {
      const health = await ApiService.healthCheck();
      newStatus.api = {
        status: 'online',
        message: 'Backend API is healthy and responding',
        lastChecked: new Date(),
        details: health.environment
      };
    } catch (error) {
      newStatus.api = {
        status: 'error',
        message: `API health check failed: ${error.message}`,
        lastChecked: new Date()
      };
    }

    // Check frontend (always online if we can run this code)
    newStatus.frontend = {
      status: 'online',
      message: 'Frontend application is running',
      lastChecked: new Date()
    };

    // Check GitHub connection
    try {
      const result = await ApiService.testConnection('github');
      newStatus.github = {
        status: result.success ? 'connected' : 'error',
        message: result.success ? result.message : result.error,
        lastChecked: new Date()
      };
    } catch (error) {
      newStatus.github = {
        status: 'error',
        message: `GitHub test failed: ${error.message}`,
        lastChecked: new Date()
      };
    }

    // Check AWS Bedrock connection
    try {
      const result = await ApiService.testConnection('aws');
      newStatus.aws = {
        status: result.success ? 'connected' : 'error',
        message: result.success ? result.message : result.error,
        lastChecked: new Date()
      };
    } catch (error) {
      newStatus.aws = {
        status: 'error',
        message: `AWS test failed: ${error.message}`,
        lastChecked: new Date()
      };
    }

    // Check Neo4j connection
    try {
      const result = await ApiService.testConnection('neo4j');
      newStatus.neo4j = {
        status: result.success ? 'connected' : 'error',
        message: result.success ? result.message : result.error,
        lastChecked: new Date()
      };
    } catch (error) {
      newStatus.neo4j = {
        status: 'error',
        message: `Neo4j test failed: ${error.message}`,
        lastChecked: new Date()
      };
    }

    setServiceStatus(newStatus);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  const loadConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await fetch('/api/config');
      const data = await response.json();
      
      if (data.success) {
        setConfigData(data.config);
        setConfigError('');
        setConfigSuccess('Configuration loaded successfully!');
        if (onConfigUpdate) {
          onConfigUpdate(data.config);
        }
        setTimeout(() => setConfigSuccess(''), 3000);
      } else {
        setConfigError('Failed to load configuration');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigError('Error loading configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async () => {
    setConfigLoading(true);
    setConfigError('');
    setConfigSuccess('');
    try {
      const updatedConfig = await ApiService.updateConfig(configData);
      setConfigData(updatedConfig);
      setConfigSuccess('Configuration saved successfully!');
      if (onConfigUpdate) {
        onConfigUpdate(updatedConfig);
      }
      setTimeout(() => setConfigSuccess(''), 3000);
    } catch (error) {
      setConfigError(`Failed to save configuration: ${error.message}`);
    } finally {
      setConfigLoading(false);
    }
  };

  const testAWSConnection = async () => {
    setTesting(prev => ({ ...prev, aws: true }));
    try {
      const result = await ApiService.testConnection('aws', { aws: configData.aws });
      
      if (result.success) {
        setConfigSuccess('AWS Bedrock connection successful!');
        setTestResults(prev => ({ ...prev, aws: 'success' }));
      } else {
        setConfigError(`AWS connection failed: ${result.error}`);
        setTestResults(prev => ({ ...prev, aws: 'error' }));
      }
    } catch (error) {
      setConfigError(`AWS connection failed: ${error.message}`);
      setTestResults(prev => ({ ...prev, aws: 'error' }));
    } finally {
      setTesting(prev => ({ ...prev, aws: false }));
    }
  };

  const testGitHubConnection = async () => {
    setTesting(prev => ({ ...prev, github: true }));
    try {
      const result = await ApiService.testConnection('github', { github: configData.github });
      
      if (result.success) {
        setConfigSuccess('GitHub connection successful!');
        setTestResults(prev => ({ ...prev, github: 'success' }));
      } else {
        setConfigError(`GitHub connection failed: ${result.error}`);
        setTestResults(prev => ({ ...prev, github: 'error' }));
      }
    } catch (error) {
      setConfigError(`GitHub connection failed: ${error.message}`);
      setTestResults(prev => ({ ...prev, github: 'error' }));
    } finally {
      setTesting(prev => ({ ...prev, github: false }));
    }
  };

  const testNeo4jConnection = async () => {
    setTesting(prev => ({ ...prev, neo4j: true }));
    try {
      const result = await ApiService.testConnection('neo4j');
      
      if (result.success) {
        setConfigSuccess('Neo4j connection successful!');
        setTestResults(prev => ({ ...prev, neo4j: 'success' }));
      } else {
        setConfigError(`Neo4j connection failed: ${result.error}`);
        setTestResults(prev => ({ ...prev, neo4j: 'error' }));
      }
    } catch (error) {
      setConfigError(`Neo4j connection failed: ${error.message}`);
      setTestResults(prev => ({ ...prev, neo4j: 'error' }));
    } finally {
      setTesting(prev => ({ ...prev, neo4j: false }));
    }
  };

  const updateConfig = (section, field, value) => {
    setConfigData({
      ...configData,
      [section]: {
        ...configData[section],
        [field]: value
      }
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
      case 'connected':
        return '🟢';
      case 'error':
      case 'offline':
        return '🔴';
      case 'not_configured':
        return '🟡';
      case 'unknown':
        return '⚪';
      default:
        return '⚪';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'offline':
        return 'Offline';
      case 'not_configured':
        return 'Not Configured';
      case 'unknown':
        return 'Unknown';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'connected':
        return 'text-vibe-green';
      case 'error':
      case 'offline':
        return 'text-vibe-red';
      case 'not_configured':
        return 'text-yellow-500';
      case 'unknown':
        return 'text-vibe-gray';
      default:
        return 'text-vibe-gray';
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status) {
      case 'testing':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔍';
    }
  };

  const getTestStatusColor = (status) => {
    switch (status) {
      case 'testing':
        return 'text-yellow-500';
      case 'success':
        return 'text-vibe-green';
      case 'error':
        return 'text-vibe-red';
      default:
        return 'text-vibe-gray';
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const services = [
    {
      id: 'api',
      name: 'Backend API',
      description: 'Flask backend service',
      icon: '🔧'
    },
    {
      id: 'frontend',
      name: 'Frontend',
      description: 'React application interface',
      icon: '🌐'
    },
    {
      id: 'github',
      name: 'GitHub Integration',
      description: 'Repository access and file management',
      icon: '🐙'
    },
    {
      id: 'aws',
      name: 'AWS Bedrock',
      description: 'AI model integration for prompt enhancement',
      icon: '☁️'
    },
    {
      id: 'neo4j',
      name: 'Neo4j Database',
      description: 'Graph database for hierarchical planning',
      icon: '🗄️'
    }
  ];

  return (
    <div className="h-full overflow-auto p-6 bg-vibe-dark">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-vibe-gray-dark pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-vibe-gray mb-2">
                System Dashboard & Configuration
              </h2>
              <p className="text-sm text-vibe-gray opacity-75">
                Monitor services and manage application configuration
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={checkAllServices}
                disabled={loading}
                className="btn-secondary mb-2"
              >
                {loading ? '🔄 Checking...' : '🔄 Refresh Status'}
              </button>
              <div className="text-xs text-vibe-gray opacity-60">
                Last updated: {formatTime(lastRefresh)}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-vibe-darker p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'status'
                ? 'bg-vibe-blue text-white'
                : 'text-vibe-gray hover:text-white hover:bg-vibe-gray-dark'
            }`}
          >
            📊 Service Status
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'config'
                ? 'bg-vibe-blue text-white'
                : 'text-vibe-gray hover:text-white hover:bg-vibe-gray-dark'
            }`}
          >
            ⚙️ Configuration
          </button>
        </div>

        {/* Status Tab */}
        {activeTab === 'status' && (
          <>
            {/* Service Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => {
                const status = serviceStatus[service.id];
                return (
                  <div key={service.id} className="panel p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div>
                          <h3 className="text-lg font-medium text-vibe-gray">
                            {service.name}
                          </h3>
                          <p className="text-sm text-vibe-gray opacity-75">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{getStatusIcon(status.status)}</span>
                          <span className={`font-medium ${getStatusColor(status.status)}`}>
                            {getStatusText(status.status)}
                          </span>
                        </div>
                        <div className="text-xs text-vibe-gray opacity-60">
                          {formatTime(status.lastChecked)}
                        </div>
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="bg-vibe-darker p-3 rounded border border-vibe-gray-dark">
                      <p className="text-sm text-vibe-gray">
                        {status.message || 'No status information available'}
                      </p>
                    </div>

                    {/* Additional Details for API */}
                    {service.id === 'api' && status.details && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-vibe-gray opacity-75">Environment:</div>
                        <div className="bg-vibe-darkest p-2 rounded text-xs font-mono">
                          <div className="grid grid-cols-2 gap-2">
                            <div>AWS: {status.details.aws_configured ? '✅' : '❌'}</div>
                            <div>GitHub: {status.details.github_configured ? '✅' : '❌'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Enhanced System Status */}
            <div className="panel p-6">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">
                Configuration Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-vibe-darker p-4 rounded border border-vibe-gray-dark">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-vibe-gray opacity-75">AWS Bedrock</div>
                    <div className={`text-lg ${configData?.aws?.access_key_id ? 'text-vibe-green' : 'text-vibe-red'}`}>
                      {configData?.aws?.access_key_id ? '✅' : '❌'}
                    </div>
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Region: {configData?.aws?.region || 'Not set'}
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Model: {configData?.aws?.model_id?.split('.')[1] || 'Not set'}
                  </div>
                </div>

                <div className="bg-vibe-darker p-4 rounded border border-vibe-gray-dark">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-vibe-gray opacity-75">GitHub</div>
                    <div className={`text-lg ${configData?.github?.token ? 'text-vibe-green' : 'text-vibe-red'}`}>
                      {configData?.github?.token ? '✅' : '❌'}
                    </div>
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Token: {configData?.github?.token ? 'Set' : 'Not set'}
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Repo: {configData?.github?.default_repo ? 'Set' : 'Not set'}
                  </div>
                </div>

                <div className="bg-vibe-darker p-4 rounded border border-vibe-gray-dark">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-vibe-gray opacity-75">Neo4j Database</div>
                    <div className={`text-lg ${configData?.neo4j?.uri ? 'text-vibe-green' : 'text-vibe-red'}`}>
                      {configData?.neo4j?.uri ? '✅' : '❌'}
                    </div>
                  </div>
                  <div className="text-xs text-vibe-gray">
                    URI: {configData?.neo4j?.uri || 'Not set'}
                  </div>
                  <div className="text-xs text-vibe-gray">
                    User: {configData?.neo4j?.username || 'Not set'}
                  </div>
                </div>

                <div className="bg-vibe-darker p-4 rounded border border-vibe-gray-dark">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-vibe-gray opacity-75">System</div>
                    <div className="text-lg text-vibe-blue">ℹ️</div>
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Version: v1.0.0
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Frontend: :3000
                  </div>
                  <div className="text-xs text-vibe-gray">
                    Backend: :5000
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="panel p-6">
              <h3 className="text-lg font-medium text-vibe-gray mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => window.open('http://localhost:7474', '_blank')}
                  className="btn-secondary"
                >
                  🗄️ Open Neo4j Browser
                </button>
                <button
                  onClick={() => window.open('/api/health', '_blank')}
                  className="btn-secondary"
                >
                  🔧 View API Health
                </button>
                <button
                  onClick={checkAllServices}
                  disabled={loading}
                  className="btn-primary"
                >
                  🔄 Refresh All Services
                </button>
                <button
                  onClick={loadConfig}
                  disabled={configLoading}
                  className="btn-secondary"
                >
                  📥 Reload Configuration
                </button>
              </div>
            </div>
          </>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Configuration Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-vibe-gray">Application Configuration</h3>
                <p className="text-sm text-vibe-gray opacity-75">
                  Configure services and test connections
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={loadConfig}
                  disabled={configLoading}
                  className="btn-secondary"
                >
                  {configLoading ? '⏳ Loading...' : '📥 Load Config'}
                </button>
                <button
                  onClick={saveConfig}
                  disabled={configLoading}
                  className="btn-primary"
                >
                  {configLoading ? '⏳ Saving...' : '💾 Save Config'}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {configError && (
              <div className="bg-vibe-red bg-opacity-10 border border-vibe-red border-opacity-30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-vibe-red">❌</span>
                  <span className="text-vibe-red font-medium">Error</span>
                </div>
                <p className="text-vibe-red mt-1">{configError}</p>
              </div>
            )}

            {configSuccess && (
              <div className="bg-vibe-green bg-opacity-10 border border-vibe-green border-opacity-30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-vibe-green">✅</span>
                  <span className="text-vibe-green font-medium">Success</span>
                </div>
                <p className="text-vibe-green mt-1">{configSuccess}</p>
              </div>
            )}

            {/* AWS Configuration */}
            <div className="panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-vibe-gray">
                  AWS Bedrock Configuration
                </h3>
                <button
                  onClick={testAWSConnection}
                  disabled={configLoading || testing.aws || !configData.aws?.access_key_id}
                  className={`btn-secondary text-sm ${getTestStatusColor(testing.aws ? 'testing' : testResults.aws)}`}
                >
                  {getTestStatusIcon(testing.aws ? 'testing' : testResults.aws)} Test Connection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    value={configData.aws?.access_key_id || ''}
                    onChange={(e) => updateConfig('aws', 'access_key_id', e.target.value)}
                    className="input-primary w-full"
                    placeholder="AKIA..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    value={configData.aws?.secret_access_key || ''}
                    onChange={(e) => updateConfig('aws', 'secret_access_key', e.target.value)}
                    className="input-primary w-full"
                    placeholder="Enter secret key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Region
                  </label>
                  <select
                    value={configData.aws?.region || 'us-east-1'}
                    onChange={(e) => updateConfig('aws', 'region', e.target.value)}
                    className="input-primary w-full"
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">Europe (Ireland)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Model ID
                  </label>
                  <input
                    type="text"
                    value={configData.aws?.model_id || ''}
                    onChange={(e) => updateConfig('aws', 'model_id', e.target.value)}
                    className="input-primary w-full"
                    placeholder="anthropic.claude-3-5-sonnet-20240620-v1:0"
                  />
                  <p className="text-xs text-vibe-gray opacity-75 mt-1">
                    Available models: Claude 3.5 Sonnet, Claude 3 Haiku, Claude 3 Opus
                  </p>
                </div>
              </div>
            </div>

            {/* GitHub Configuration */}
            <div className="panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-vibe-gray">
                  GitHub Configuration
                </h3>
                <button
                  onClick={testGitHubConnection}
                  disabled={configLoading || testing.github || !configData.github?.token}
                  className={`btn-secondary text-sm ${getTestStatusColor(testing.github ? 'testing' : testResults.github)}`}
                >
                  {getTestStatusIcon(testing.github ? 'testing' : testResults.github)} Test Connection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={configData.github?.token || ''}
                    onChange={(e) => updateConfig('github', 'token', e.target.value)}
                    className="input-primary w-full"
                    placeholder="ghp_..."
                  />
                  <p className="text-xs text-vibe-gray opacity-75 mt-1">
                    Generate at: GitHub Settings → Developer settings → Personal access tokens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Default Repository
                  </label>
                  <input
                    type="text"
                    value={configData.github?.default_repo || ''}
                    onChange={(e) => updateConfig('github', 'default_repo', e.target.value)}
                    className="input-primary w-full"
                    placeholder="https://github.com/user/repo"
                  />
                  <p className="text-xs text-vibe-gray opacity-75 mt-1">
                    Default repository for file operations
                  </p>
                </div>
              </div>
            </div>

            {/* Neo4j Configuration */}
            <div className="panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-vibe-gray">
                  Neo4j Database Configuration
                </h3>
                <button
                  onClick={testNeo4jConnection}
                  disabled={configLoading || testing.neo4j || !configData.neo4j?.uri}
                  className={`btn-secondary text-sm ${getTestStatusColor(testing.neo4j ? 'testing' : testResults.neo4j)}`}
                >
                  {getTestStatusIcon(testing.neo4j ? 'testing' : testResults.neo4j)} Test Connection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Database URI
                  </label>
                  <input
                    type="text"
                    value={configData.neo4j?.uri || ''}
                    onChange={(e) => updateConfig('neo4j', 'uri', e.target.value)}
                    className="input-primary w-full"
                    placeholder="bolt://localhost:7687"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={configData.neo4j?.username || ''}
                    onChange={(e) => updateConfig('neo4j', 'username', e.target.value)}
                    className="input-primary w-full"
                    placeholder="neo4j"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-vibe-gray mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={configData.neo4j?.password || ''}
                    onChange={(e) => updateConfig('neo4j', 'password', e.target.value)}
                    className="input-primary w-full"
                    placeholder="Enter Neo4j password"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-vibe-darker rounded-lg">
                <h4 className="text-sm font-medium text-vibe-gray mb-2">Database Information</h4>
                <div className="text-xs text-vibe-gray opacity-75 space-y-1">
                  <p>• Neo4j Browser: <a href="http://localhost:7474" target="_blank" rel="noopener noreferrer" className="text-vibe-blue hover:underline">http://localhost:7474</a></p>
                  <p>• Default credentials: neo4j / vibeassistant</p>
                  <p>• Used for hierarchical software planning and requirements management</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 