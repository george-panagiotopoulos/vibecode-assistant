# Backend Documentation

Welcome to the Vibe Assistant backend documentation. This section covers the Python Flask backend that powers the AI prompt building functionality.

## 🏗️ Architecture Overview

The backend is built with Flask and follows a service-oriented architecture pattern. It provides RESTful APIs for the frontend and integrates with various external services.

### Core Components

- **Flask Application** (`app.py`): Main application entry point and route definitions
- **Services Layer**: Modular services for different functionalities
- **Configuration**: Environment-based configuration management

## 📁 Directory Structure

```
backend/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── config/                     # Configuration modules
│   └── env_loader.py          # Environment variable loading
└── services/                   # Business logic services
    ├── bedrock_service.py     # AWS Bedrock AI integration
    ├── config_service.py      # Configuration management
    ├── github_service.py      # GitHub API integration
    ├── logging_service.py     # Centralized logging
    ├── neo4j_service.py       # Neo4j database operations
    ├── prompt_constructor.py  # AI prompt building logic
    └── prompt_service.py      # Prompt management service
```

## 🔧 Services Documentation

### Core Services
- **[Bedrock Service](services/bedrock-service.md)**: AWS Bedrock integration for AI capabilities
- **[Config Service](services/config-service.md)**: Application configuration management
- **[GitHub Service](services/github-service.md)**: GitHub repository integration
- **[Neo4j Service](services/neo4j-service.md)**: Graph database operations
- **[Prompt Service](services/prompt-service.md)**: Prompt management and processing

### Utility Services
- **[Logging Service](services/logging-service.md)**: Centralized logging functionality
- **[Prompt Constructor](services/prompt-constructor.md)**: AI prompt building utilities

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Required environment variables (see `.env.example`)
- Access to AWS Bedrock
- Neo4j database instance

### Installation
```bash
cd backend
pip install -r requirements.txt
```

### Configuration
Copy `.env.example` to `.env` and configure:
- AWS credentials and region
- GitHub token and repository
- Neo4j connection details

### Running the Backend
```bash
python3 app.py
```

The backend will start on `http://localhost:5000` by default.

## 📡 API Endpoints

### Core Endpoints
- `GET /health` - Health check endpoint
- `POST /api/prompts` - Create new prompt
- `GET /api/prompts` - List prompts
- `POST /api/github/analyze` - Analyze GitHub repository
- `POST /api/bedrock/generate` - Generate AI responses

For detailed API documentation, see individual service documentation files.

## 🔍 Key Features

### AI Integration
- AWS Bedrock integration for advanced AI capabilities
- Prompt engineering and optimization
- Context-aware response generation

### Repository Analysis
- GitHub repository scanning and analysis
- Code structure understanding
- Intelligent prompt suggestions

### Data Management
- Neo4j graph database for relationship mapping
- Efficient data storage and retrieval
- Complex query capabilities

## 🛠️ Development Guidelines

### Code Style
- Follow PEP 8 guidelines
- Use type hints where appropriate
- Comprehensive error handling
- Detailed logging for debugging

### Testing
- Unit tests for individual services
- Integration tests for API endpoints
- Mock external dependencies

### Error Handling
- Consistent error response format
- Proper HTTP status codes
- Detailed error logging

## 📊 Monitoring and Logging

The backend includes comprehensive logging through the `logging_service.py`. Logs are structured and include:
- Request/response logging
- Service operation tracking
- Error and exception details
- Performance metrics

## 🔐 Security Considerations

- Environment variable management for secrets
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure external service integration

## 📈 Performance

- Asynchronous operations where possible
- Connection pooling for database operations
- Caching strategies for frequently accessed data
- Optimized query patterns

For specific implementation details, refer to the individual service documentation files. 