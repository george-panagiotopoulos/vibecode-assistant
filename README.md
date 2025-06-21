# 🎯 Vibe Assistant - AI-Powered Development Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![React](https://img.shields.io/badge/react-18.2+-blue.svg)
![Neo4j](https://img.shields.io/badge/neo4j-5.15-orange.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

A comprehensive AI-powered development assistant that enhances prompts, manages code repositories, and leverages hierarchical software planning through graph-based modeling.

[Features](#-key-features) • [Installation](#-installation--setup) • [Usage](#-usage) • [Documentation](#-documentation) • [API](#-api-reference) • [Contributing](#-contributing)

</div>

## ✨ Key Features

### 🤖 **AI-Powered Prompt Enhancement**
- **AWS Bedrock Integration**: Powered by Claude 3.5 Sonnet for intelligent prompt optimization
- **Multiple Enhancement Modes**: 
  - **Full Specification**: Comprehensive business requirements analysis
  - **Enhanced Prompt**: TDD-focused implementation planning with 5-7 step guides
  - **Rephrase**: Language clarity improvements
  - **Custom**: User-defined enhancement instructions
- **Real-time Streaming**: Live character-by-character AI responses with auto-scroll
- **Context-Aware Processing**: Integrates file contents, requirements, and architecture

### 🏗️ **Hierarchical Software Planning**
- **Graph-Based Modeling**: Model software concerns as interconnected nodes across abstraction layers
- **Multi-Layer Architecture**: 
  - **UX Layer**: User experience and interface concerns
  - **Architecture Layer**: System design patterns and decisions
  - **Application Layer**: Code structure and development practices
  - **Infrastructure Layer**: Performance, deployment, and scalability
  - **Security Layer**: Security practices and compliance requirements
- **Neo4j Database**: Powered by Neo4j graph database for complex relationship queries
- **Relationship Management**: Define dependencies, conflicts, and support relationships
- **Visual Management**: Interactive layer-based organization with bulk operations

### 📁 **Repository Management**
- **GitHub Integration**: Connect and browse repositories with full API access
- **File Explorer**: Navigate project structure with intelligent file filtering
- **Content Preview**: View and analyze file contents before inclusion
- **Smart File Selection**: Focus on relevant code files with extension filtering
- **Multi-Repository Support**: Handle multiple repositories within single session

### ⚙️ **Configuration Management**
- **Secure Credential Storage**: Encrypted storage of AWS and GitHub credentials
- **Connection Testing**: Built-in health checks for all integrations
- **Environment Management**: Support for development and production configurations
- **Custom Requirements**: Define and manage non-functional requirements by task type

### 🎨 **Modern UI/UX**
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark Theme**: Professional interface with custom vibe color palette
- **Real-time Updates**: Live status indicators and progress tracking
- **Intuitive Navigation**: Clean, accessible interface with keyboard shortcuts
- **Auto-scroll Features**: Smart scrolling during streaming responses

### 📊 **Advanced Analytics**
- **Complexity Analysis**: Automatic assessment of prompt and architecture complexity
- **Performance Metrics**: Track processing times and resource usage
- **Enhancement Statistics**: Detailed analytics on AI processing
- **Graph Analytics**: Node counts, relationship analysis, and layer statistics

## 🏗️ Project Structure

```
vibe-assistant/
├── backend/                    # Python Flask backend
│   ├── app.py                 # Main Flask application (1,518 lines)
│   ├── services/              # Backend services
│   │   ├── bedrock_service.py # AWS Bedrock AI integration
│   │   ├── neo4j_service.py   # Graph database operations
│   │   ├── github_service.py  # GitHub API integration
│   │   ├── config_service.py  # Configuration management
│   │   ├── prompt_service.py  # Prompt processing logic
│   │   └── logging_service.py # Application logging
│   ├── config/                # Backend configuration
│   └── requirements.txt       # Python dependencies
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── PromptBuilder.js        # Main prompt interface (1,172 lines)
│   │   │   ├── RequirementsEditor.js   # Graph-based requirements editor (2,044 lines)
│   │   │   ├── Dashboard.js            # System dashboard (834 lines)
│   │   │   ├── NonFunctionalRequirementsLoader.js # NFR selection interface
│   │   │   ├── ApplicationArchitectureLoader.js   # Architecture loader
│   │   │   ├── FileExplorer.js         # Repository file navigation
│   │   │   └── ...                     # Additional UI components
│   │   ├── services/          # Frontend services
│   │   └── App.js            # Main React application
│   ├── public/               # Static assets
│   ├── package.json         # Frontend dependencies
│   └── tailwind.config.js    # Tailwind CSS configuration
├── database/                  # Neo4j database setup
│   ├── docker-compose.yml    # Neo4j containerization
│   └── README.md            # Database documentation
├── config/                   # Application configuration
│   ├── user_config.json     # User preferences
│   └── prompt_config.json   # Prompt enhancement configurations
├── scripts/                  # Build and utility scripts
│   ├── start.sh             # Application startup script
│   └── tests/               # Test files and integration tests
├── Documentation/            # Comprehensive documentation
├── logs/                    # Application logs
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **Python 3.8+**
- **Docker & Docker Compose** (for Neo4j database)
- **AWS Account** with Bedrock access
- **GitHub Account** (optional for repository integration)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/vibe-assistant.git
cd vibe-assistant
```

### 2. Quick Setup (Recommended)
```bash
# Install all dependencies
npm run setup

# Start all services (Neo4j, Backend, Frontend)
npm start
```

### 3. Environment Configuration

Create a `.env` file in the project root:
```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required Configuration:**
```env
# AWS Configuration (Required for AI features)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0

# Neo4j Configuration (Required for hierarchical planning)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=vibeassistant

# GitHub Configuration (Optional)
GITHUB_TOKEN=your_github_token
GITHUB_DEFAULT_REPO=https://github.com/your-username/your-repo

# Application Configuration
FLASK_ENV=development
FLASK_DEBUG=True
REACT_APP_API_URL=http://localhost:5000
```

### 4. Service Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Neo4j Browser**: http://localhost:7474 (user: neo4j, password: vibeassistant)

### 5. Manual Setup (Alternative)

#### Backend Setup
```bash
cd backend
pip3 install -r requirements.txt
python3 app.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

#### Database Setup
```bash
cd database
docker-compose up -d
```

## 📖 Usage

### Basic Workflow

1. **Configure Services**: Set up AWS and GitHub credentials via the Dashboard
2. **Load Repository**: Connect to a GitHub repository for context
3. **Define Requirements**: Use the hierarchical planning to define non-functional requirements
4. **Build Architecture**: Create application architecture models
5. **Enhance Prompts**: Use AI to enhance prompts with context, requirements, and architecture
6. **Iterate**: Refine and improve based on results

### Feature-Specific Usage

#### Hierarchical Software Planning
1. Navigate to "🏗️ Hierarchical Planning"
2. Create layers (UX, Architecture, Application, Infrastructure, Security)
3. Add nodes (requirements, constraints, goals, features)
4. Define relationships between nodes
5. Save and load planning configurations

#### AI Prompt Enhancement
1. Enter your prompt in the Prompt Builder
2. Select enhancement mode (Full Specification, Enhanced Prompt, etc.)
3. Load relevant files from your repository
4. Include non-functional requirements and architecture
5. Generate enhanced prompt with streaming AI response

#### Repository Integration
1. Configure GitHub token in Dashboard
2. Load repository via Repository Selector
3. Browse and select relevant files
4. Preview file contents before inclusion
5. Use selected files as context for prompt enhancement

## 🔧 Configuration

### AWS Bedrock Setup
1. Create AWS account and enable Bedrock in `us-east-1`
2. Create IAM user with `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` permissions
3. Generate access keys and add to `.env` file
4. Test connection via Dashboard

### GitHub Integration
1. Generate GitHub Personal Access Token with `repo` scope
2. Add token to `.env` file or configure via Dashboard
3. Test connection and repository access

### Neo4j Database
The application uses Neo4j for hierarchical software planning:
- **Local**: Uses Docker container (automatic setup)
- **Cloud**: Update `NEO4J_URI` in `.env` to point to cloud instance
- **Authentication**: Default credentials are `neo4j/vibeassistant`

## 📡 API Reference

### Core Endpoints

#### Health & Configuration
- `GET /api/health` - Service health check with environment status
- `GET /api/config` - Get application configuration
- `POST /api/config` - Update application configuration
- `POST /api/test-connection/<service>` - Test service connections (aws, github, neo4j)

#### Repository Management
- `POST /api/repositories/files` - Get repository file tree
- `POST /api/repositories/file-content` - Get specific file content
- `POST /api/repositories/folder-contents` - Get folder contents

#### AI Enhancement
- `POST /api/stream-response` - Stream AI-enhanced responses
- `GET /api/requirements` - Get non-functional requirements
- `POST /api/requirements` - Store requirements selection

#### Graph Database Operations
- `GET /api/graph/nodes` - Get all nodes and edges
- `POST /api/graph/nodes` - Create new node
- `PUT /api/graph/nodes/<node_id>` - Update existing node
- `DELETE /api/graph/nodes/<node_id>` - Delete node
- `POST /api/graph/edges` - Create relationship between nodes
- `DELETE /api/graph/edges/<from_id>/<to_id>` - Delete edge
- `POST /api/graph/sample` - Populate sample data
- `POST /api/graph/clear` - Clear all graph data

#### Graph Management
- `POST /api/graph/save` - Save current graph with name and type
- `GET /api/graph/saved` - Get list of saved graphs (optionally filtered by type)
- `GET /api/graph/saved/<graph_name>/data` - Get saved graph data
- `POST /api/graph/load/<graph_name>` - Load saved graph
- `DELETE /api/graph/saved/<graph_name>` - Delete saved graph
- `POST /api/graph/import` - Import graph from JSON
- `GET /api/graph/export` - Export graph to JSON

## 🧪 Testing

### Automated Tests
```bash
# Run all tests
npm test

# Backend tests
npm run test:backend

# Frontend tests
cd frontend && npm test
```

### Manual Testing
```bash
# Test specific functionality
python scripts/test_enhanced_scroll_functionality.py
python scripts/test_architecture_integration.py
python scripts/integration_test.py
```

## 📚 Documentation

Comprehensive documentation is available in the `Documentation/` directory:

- **[Architecture Overview](Documentation/architecture/system-overview.md)** - System design and architecture
- **[Frontend Guide](Documentation/frontend/_README.md)** - React components and UI patterns
- **[Backend Guide](Documentation/backend/_README.md)** - Flask services and API details
- **[Quick Start Guide](Documentation/QUICK_START_EDIT.md)** - Get started quickly
- **[API Documentation](Documentation/backend/services/)** - Detailed API reference

## 🚀 Deployment

### Local Development
```bash
npm start  # Starts all services
```

### Cloud Deployment
1. Update environment variables for cloud endpoints
2. Configure Neo4j cloud instance
3. Set up AWS credentials and GitHub tokens
4. Deploy frontend and backend separately or use container orchestration

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the established project structure
- Update documentation for new features
- Add tests for new functionality
- Follow the existing code style and patterns
- Update the `.env.example` file for new environment variables

## 📋 Requirements

### Python Dependencies
```
Flask==2.3.3
Flask-CORS==4.0.0
python-dotenv==1.0.0
requests==2.31.0
PyGithub==1.59.1
boto3==1.34.131
botocore==1.34.131
cryptography==41.0.7
neo4j==5.15.0
```

### Frontend Dependencies
```
react: ^18.2.0
react-dom: ^18.2.0
axios: ^1.6.0
tailwindcss: ^3.4.17
```

## 🛠️ Troubleshooting

### Common Issues

#### Neo4j Connection Issues
- Ensure Docker is running
- Check if port 7687 is available
- Verify Neo4j container is running: `docker ps`

#### AWS Bedrock Issues
- Verify AWS credentials are correct
- Ensure Bedrock is enabled in `us-east-1` region
- Check IAM permissions for Bedrock access

#### GitHub Integration Issues
- Verify GitHub token has correct permissions
- Check repository URL format
- Ensure token is not expired

### Logs and Debugging
- Backend logs: `logs/` directory
- Frontend console: Browser developer tools
- Neo4j logs: `docker-compose logs neo4j`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AWS Bedrock** for AI capabilities
- **Neo4j** for graph database functionality
- **React** and **Flask** communities for excellent frameworks
- **Tailwind CSS** for the utility-first CSS framework

## 📞 Support

For support, please:
1. Check the [Documentation](Documentation/) directory
2. Review existing [Issues](https://github.com/your-username/vibe-assistant/issues)
3. Create a new issue with detailed information

---

<div align="center">
Made with ❤️ by the Vibe Assistant Team
</div> 