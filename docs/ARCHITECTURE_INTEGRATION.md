# Architecture Integration in Vibe Assistant

## Overview

The Architecture Integration feature enhances the Vibe Assistant prompt builder by incorporating application architecture data into the prompt enhancement process. This allows for more contextually aware and architecturally aligned prompt generation.

## Features

### 🏗️ Architecture-Enhanced Prompt Building
- **Smart Integration**: Automatically incorporates architecture layers and components into prompt enhancement
- **Context-Aware Generation**: Considers architectural relationships and dependencies
- **Complexity Analysis**: Analyzes prompt complexity based on architecture scope
- **Fallback Support**: Gracefully falls back to standard enhancement when architecture data is unavailable

### 📊 Enhanced Metadata and Analytics
- **Architecture Metrics**: Track processed layers, components, and relationships
- **Complexity Assessment**: Automatic complexity level estimation (low/medium/high)
- **Integration Status**: Real-time status of Neo4j and architecture services
- **Performance Insights**: Response times and processing statistics

### 🎯 Visual Indicators
- **Architecture Enhancement Badges**: Clear visual indicators when architecture is being used
- **Complexity Color Coding**: Visual complexity indicators (green/yellow/red)
- **Service Status Indicators**: Real-time connection status for Neo4j and other services
- **Component Counters**: Display of processed architecture components

## Architecture

### Backend Components

#### Enhanced PromptService (`backend/services/prompt_service.py`)
```python
class PromptService:
    def __init__(self, bedrock_service, neo4j_service=None):
        # Enhanced with Neo4j support for architecture data
        
    def build_final_prompt(self, base_prompt, requirements=None, 
                          selected_files=None, architecture_layers=None, 
                          task_type='development'):
        # Main method for architecture-enhanced prompt building
        
    def _process_architecture_layers(self, layers):
        # Process and format architecture layer data
        
    def analyze_prompt_complexity(self, prompt, architecture_layers=None):
        # Analyze complexity including architecture considerations
```

#### New API Endpoint (`backend/app.py`)
```python
@app.route('/api/enhance-prompt-with-architecture', methods=['POST'])
def enhance_prompt_with_architecture():
    # Enhanced endpoint with full architecture integration support
```

### Frontend Components

#### Enhanced PromptBuilder (`frontend/src/components/PromptBuilder.js`)
- **Architecture Detection**: Automatically detects when architecture layers are selected
- **Enhanced API Calls**: Uses new architecture-enhanced endpoint when appropriate
- **Visual Feedback**: Shows architecture enhancement status and metrics
- **Fallback Handling**: Gracefully handles service failures

#### Enhanced ApiService (`frontend/src/services/ApiService.js`)
```javascript
async enhancePromptWithArchitecture(prompt, options = {}) {
    // New method for architecture-enhanced prompt building
}
```

## Usage

### 1. Basic Architecture Integration

1. **Load Architecture Data**:
   - Click "🏗️ Load Application Architecture" button
   - Select relevant architecture layers from your saved graphs
   - Layers will appear in the selected architecture section

2. **Enable Architecture Consideration**:
   - Check the "Consider application architecture" checkbox
   - Enhancement buttons will show 🏗️ icon when architecture is active

3. **Generate Enhanced Prompts**:
   - Enter your prompt as usual
   - Click any enhancement button (Maximum Detail, Balanced, Key Requirements)
   - The system will automatically use architecture-enhanced processing

### 2. Advanced Features

#### Complexity Analysis
The system automatically analyzes prompt complexity based on:
- Number of architecture layers involved
- Total component count
- Relationship complexity
- Requirements scope

#### Integration Status Monitoring
Real-time status indicators show:
- **Neo4j Connection**: Green dot = connected, Red dot = unavailable
- **Architecture Layers**: Number of layers processed
- **Components**: Total architectural components considered

#### Recommendations Engine
Based on complexity analysis, the system provides:
- Architecture alignment suggestions
- Performance optimization recommendations
- Best practice guidance

## API Reference

### POST `/api/enhance-prompt-with-architecture`

Enhanced prompt building with architecture integration support.

#### Request Body
```json
{
  "prompt": "string (required)",
  "task_type": "string (optional, default: 'development')",
  "selected_files": "array (optional)",
  "architecture_layers": "array (optional)",
  "requirements": "array (optional)",
  "enhancement_type": "string (optional, default: 'development')"
}
```

#### Architecture Layer Format
```json
{
  "name": "Layer Name",
  "nodeCount": 5,
  "nodes": [
    {
      "name": "ComponentName",
      "type": "component_type"
    }
  ]
}
```

#### Response
```json
{
  "enhanced_prompt": "string",
  "original_input": "string",
  "task_type": "string",
  "enhancement_type": "string",
  "complexity_analysis": {
    "estimated_complexity": "low|medium|high",
    "recommendations": ["array of strings"]
  },
  "integration_status": {
    "neo4j_available": "boolean",
    "architecture_layers_processed": "number"
  },
  "metadata": {
    "architecture_layers_count": "number",
    "requirements_count": "number",
    "selected_files_count": "number",
    "total_components": "number",
    "neo4j_available": "boolean"
  },
  "logs": ["array of log entries"]
}
```

## Configuration

### Environment Variables
```bash
# Neo4j Configuration (optional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# AWS Bedrock (required)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Service Dependencies
- **Required**: AWS Bedrock (for AI processing)
- **Optional**: Neo4j (for advanced architecture queries)
- **Fallback**: Works without Neo4j using in-memory architecture data

## Testing

### Automated Testing
Run the comprehensive test suite:
```bash
# Start the backend first
npm run start:backend

# Run architecture integration tests
python scripts/test_architecture_integration.py
```

### Manual Testing
1. **Basic Integration**:
   - Load architecture layers
   - Enable architecture consideration
   - Generate enhanced prompts
   - Verify architecture context in output

2. **Fallback Behavior**:
   - Disable Neo4j service
   - Verify graceful fallback to standard enhancement
   - Check error handling and user feedback

3. **Performance Testing**:
   - Test with large architecture datasets
   - Monitor response times and memory usage
   - Verify complexity analysis accuracy

## Troubleshooting

### Common Issues

#### Architecture Data Not Loading
- **Cause**: Neo4j service unavailable or misconfigured
- **Solution**: Check Neo4j connection settings, verify service is running
- **Fallback**: System will use in-memory architecture data

#### Slow Response Times
- **Cause**: Large architecture datasets or complex relationships
- **Solution**: Consider filtering architecture layers, optimize Neo4j queries
- **Monitoring**: Check complexity analysis recommendations

#### Enhancement Not Using Architecture
- **Cause**: Architecture consideration checkbox not enabled
- **Solution**: Ensure checkbox is checked and architecture layers are selected
- **Verification**: Look for 🏗️ icon on enhancement buttons

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=DEBUG
```

This will provide detailed logs for:
- Architecture data processing
- Neo4j query execution
- Prompt enhancement steps
- Service integration status

## Performance Considerations

### Optimization Strategies
1. **Layer Filtering**: Select only relevant architecture layers
2. **Component Limiting**: System automatically limits components per layer (configurable)
3. **Caching**: Architecture data is cached for improved performance
4. **Async Processing**: Non-blocking architecture integration

### Scalability
- **Horizontal**: Multiple backend instances supported
- **Vertical**: Optimized for large architecture datasets
- **Caching**: Redis support for architecture data caching (optional)

## Future Enhancements

### Planned Features
- **Architecture Validation**: Real-time validation of architectural constraints
- **Dependency Analysis**: Automatic dependency mapping and conflict detection
- **Pattern Recognition**: AI-powered architecture pattern suggestions
- **Integration Templates**: Pre-built templates for common architectural patterns

### Extensibility
The architecture integration system is designed for extensibility:
- **Custom Processors**: Add custom architecture data processors
- **Plugin System**: Support for third-party architecture tools
- **API Extensions**: Extend API for custom architecture formats

## Contributing

### Development Setup
1. Follow the main project setup instructions
2. Install additional dependencies for architecture features:
   ```bash
   pip install neo4j networkx
   ```
3. Configure Neo4j (optional but recommended for full functionality)
4. Run tests to verify setup

### Code Standards
- Follow existing project coding standards
- Add tests for new architecture features
- Update documentation for API changes
- Ensure backward compatibility

## Support

For issues related to architecture integration:
1. Check the troubleshooting section above
2. Review logs with DEBUG level enabled
3. Run the test suite to identify specific issues
4. Consult the main project documentation for general setup

---

*This feature enhances the Vibe Assistant with powerful architecture-aware prompt building capabilities while maintaining backward compatibility and graceful fallback behavior.* 