# Bedrock Service Documentation

## Purpose

The `BedrockService` provides integration with AWS Bedrock Claude models, enabling AI-powered prompt processing and response generation. It supports both streaming and non-streaming interactions with Claude models.

## Components

### Core Class: `BedrockService`

**Location**: `backend/services/bedrock_service.py`

The main service class that handles all AWS Bedrock interactions.

#### Key Attributes
- `client`: AWS Bedrock runtime client
- `model_id`: Claude model identifier (configurable via environment)

#### Key Methods

##### `__init__()`
Initializes the service and sets up the AWS Bedrock client.

##### `_initialize_client()`
Private method that configures the AWS Bedrock client with credentials from environment variables.

**Required Environment Variables:**
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_DEFAULT_REGION`: AWS region (defaults to 'us-east-1')
- `AWS_BEDROCK_MODEL_ID`: Claude model ID (defaults to 'anthropic.claude-3-5-sonnet-20240620-v1:0')

##### `test_connection() -> bool`
Tests the Bedrock connection with a simple request to verify service availability.

**Returns:**
- `bool`: True if connection successful, False otherwise

##### `invoke_claude_streaming(prompt, system_prompt=None, max_tokens=4000, temperature=0.3) -> Generator[str, None, None]`
Invokes Claude model with streaming response for real-time text generation.

**Parameters:**
- `prompt` (str): User prompt text
- `system_prompt` (str, optional): System context prompt
- `max_tokens` (int): Maximum tokens to generate (default: 4000)
- `temperature` (float): Response randomness (0.0-1.0, default: 0.3)

**Yields:**
- `str`: Streaming response chunks

**Usage Example:**
```python
bedrock_service = BedrockService()
for chunk in bedrock_service.invoke_claude_streaming("Explain AI"):
    print(chunk, end='', flush=True)
```

##### `invoke_claude(prompt, system_prompt=None, max_tokens=4000, temperature=0.3, model_id=None) -> str`
Invokes Claude model with complete response (non-streaming).

**Parameters:**
- `prompt` (str): User prompt text
- `system_prompt` (str, optional): System context prompt
- `max_tokens` (int): Maximum tokens to generate (default: 4000)
- `temperature` (float): Response randomness (0.0-1.0, default: 0.3)
- `model_id` (str, optional): Override default model ID

**Returns:**
- `str`: Complete model response

**Usage Example:**
```python
bedrock_service = BedrockService()
response = bedrock_service.invoke_claude(
    prompt="What is machine learning?",
    system_prompt="You are a helpful AI assistant.",
    max_tokens=1000,
    temperature=0.2
)
print(response)
```

## APIs

### REST Endpoints

The service is exposed through Flask routes in `app.py`:

#### `POST /api/bedrock/generate`
Generates AI responses using the Bedrock service.

**Request Body:**
```json
{
    "prompt": "string",
    "system_prompt": "string (optional)",
    "max_tokens": "integer (optional)",
    "temperature": "float (optional)",
    "streaming": "boolean (optional)"
}
```

**Response (Non-streaming):**
```json
{
    "response": "string",
    "status": "success"
}
```

**Response (Streaming):**
Server-Sent Events (SSE) stream with chunks of generated text.

#### `GET /api/bedrock/test`
Tests the Bedrock service connection.

**Response:**
```json
{
    "status": "success|error",
    "message": "string"
}
```

## Dependencies

### External Dependencies
- `boto3`: AWS SDK for Python
- `botocore`: Core AWS functionality

### Internal Dependencies
- `config.env_loader`: Environment variable loading
- `logging`: Python logging module

### Service Dependencies
- AWS Bedrock service access
- Valid AWS credentials
- Network connectivity to AWS

## Limitations

### Rate Limits
- Subject to AWS Bedrock rate limits
- Model-specific token limits apply
- Concurrent request limitations

### Model Constraints
- Maximum token limits per request
- Context window limitations
- Model availability by region

### Error Handling
- Network connectivity issues
- Invalid credentials
- Model unavailability
- Token limit exceeded

### Performance Considerations
- Streaming responses for better UX
- Connection pooling for efficiency
- Retry logic for transient failures

## Configuration

### Environment Variables
```bash
# Required
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Optional
AWS_DEFAULT_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

### Model Selection
The service supports different Claude model variants:
- `anthropic.claude-3-5-sonnet-20240620-v1:0` (default)
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`

## Error Handling

### Common Errors
1. **NoCredentialsError**: AWS credentials not configured
2. **ClientError**: AWS service errors (rate limits, permissions)
3. **ConnectionError**: Network connectivity issues
4. **ValidationError**: Invalid request parameters

### Error Response Format
```json
{
    "error": "error_type",
    "message": "detailed_error_message",
    "status": "error"
}
```

## Monitoring and Logging

### Log Levels
- `INFO`: Successful operations and connections
- `ERROR`: Service failures and exceptions
- `DEBUG`: Detailed request/response information

### Key Metrics
- Request/response times
- Token usage
- Error rates
- Connection status

## Security Considerations

### Credential Management
- Environment variable storage for AWS credentials
- No hardcoded secrets in code
- Secure credential rotation practices

### Data Privacy
- Prompt data sent to AWS Bedrock
- Response data handling
- Logging sensitive information

### Access Control
- AWS IAM permissions for Bedrock access
- Service-level authentication
- Request validation and sanitization

## Testing

### Unit Tests
- Mock AWS Bedrock client
- Test connection initialization
- Validate request/response handling

### Integration Tests
- End-to-end AWS Bedrock communication
- Error scenario testing
- Performance benchmarking

### Test Configuration
```python
# Mock Bedrock client for testing
import unittest.mock as mock

@mock.patch('boto3.client')
def test_bedrock_service(mock_client):
    # Test implementation
    pass
```

## Performance Optimization

### Best Practices
- Use streaming for long responses
- Implement connection pooling
- Cache frequently used prompts
- Monitor token usage

### Scaling Considerations
- Multiple service instances
- Load balancing strategies
- Rate limit management
- Cost optimization

## Related Services

- **[Prompt Service](prompt-service.md)**: Manages prompt templates and processing
- **[Prompt Constructor](prompt-constructor.md)**: Builds complex prompts
- **[Config Service](config-service.md)**: Manages service configuration 