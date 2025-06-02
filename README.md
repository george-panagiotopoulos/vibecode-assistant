# 🎯 Vibe Assistant - AI-Powered Coding Assistant

A modern, intelligent coding assistant that helps developers enhance their prompts, manage code repositories, and leverage AI capabilities through AWS Bedrock integration.

## ✨ Features

### 🤖 **AI-Powered Prompt Enhancement**
- **Claude 3.5 Sonnet Integration**: Uses AWS Bedrock for intelligent prompt optimization
- **Three Enhancement Modes**: 
  - **Full Specification**: Comprehensive business requirements specification
  - **Plan**: Step-by-step implementation plan (500 words or less)
  - **Clarity**: Improved language and clarity without adding details
- **Task-Specific Enhancement**: Optimizes prompts based on development, refactoring, or testing tasks
- **Real-time Streaming**: Live character-by-character AI responses

### 📁 **Repository Management**
- **GitHub Integration**: Connect and browse your repositories
- **File Explorer**: Navigate and select files for context
- **Content Preview**: View file contents before including in prompts
- **Smart File Filtering**: Focus on relevant code files

### ⚙️ **Configuration Management**
- **Secure Credential Storage**: Safely store AWS and GitHub credentials
- **Connection Testing**: Verify integrations with built-in health checks
- **Customizable Requirements**: Define non-functional requirements per task type
- **Flexible Settings**: Customize behavior and preferences

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Theme**: Professional dark interface with custom vibe color palette
- **Real-time Updates**: Live feedback and status indicators
- **Intuitive Navigation**: Clean, modern interface design

### 🏗️ **Hierarchical Software Planning** (NEW)
- **Graph-Based Modeling**: Model software concerns as nodes with relationships across multiple abstraction layers
- **Multi-Layer Architecture**: Organize concerns across UX, Architecture, Application, Infrastructure, and Security layers
- **Relationship Management**: Define dependencies, support relationships, and conflicts between concerns
- **Neo4j Integration**: Powered by Neo4j graph database for complex relationship queries
- **Sample Data**: Pre-configured examples demonstrating software planning best practices
- **Interactive Visualization**: View and manage nodes grouped by layer with relationship mapping

#### Supported Layers:
- **UX**: User experience and usability concerns
- **Architecture**: System design patterns and architectural decisions  
- **Application**: Code structure, practices, and development standards
- **Infrastructure**: Performance, availability, and deployment concerns
- **Security**: Security practices, trust requirements, and compliance

#### Relationship Types:
- **DEPENDS_ON**: Dependency relationships between concerns
- **SUPPORTS**: Supporting relationships that enable other concerns
- **LINKED_TO**: General associations between related concerns
- **CONFLICTS_WITH**: Conflicting requirements that need resolution
- **ENABLES**: Relationships where one concern enables another

## 🏗️ **Project Structure**

The project follows a clean, organized structure with clear separation of concerns:

```
vibe-assistant/
├── backend/                    # Python Flask backend
│   ├── app.py                 # Main Flask application
│   ├── config/                # Backend configuration
│   ├── services/              # Backend services
│   └── requirements.txt       # Python dependencies
├── frontend/                  # React frontend application
│   ├── src/                   # React source code
│   │   ├── components/        # React components
│   │   ├── services/          # Frontend services
│   │   └── App.js            # Main React app
│   ├── public/               # Static assets
│   ├── node_modules/         # NPM packages (auto-generated)
│   ├── package.json         # Frontend dependencies
│   ├── package-lock.json    # Dependency lock file
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── postcss.config.js     # PostCSS configuration
├── config/                   # Application configuration files
│   └── user_config.json     # User configuration
├── scripts/                  # Build and utility scripts
│   ├── start.sh             # Application startup script
│   └── tests/               # Test files
├── logs/                     # Application logs
├── .env                      # Environment variables (not in git)
├── .env.example             # Environment template
├── package.json             # Root package.json for scripts
└── README.md                # Project documentation
```

## 🚀 **AWS Bedrock Integration - FULLY WORKING**

### ✅ **Current Status**
- **Model**: `anthropic.claude-3-5-sonnet-20240620-v1:0` ✅ **OPERATIONAL**
- **Region**: `us-east-1` (Virginia)
- **Features**: ✅ Invoke ✅ Stream ✅ Enhance
- **Connection**: ✅ **100% Success Rate**

### 🧪 **Verified Capabilities**
- **Simple Invocation**: Direct Claude API calls working
- **Streaming Responses**: Real-time character-by-character output
- **Prompt Enhancement**: AI-powered prompt optimization with three modes
- **Requirements Integration**: Smart filtering of non-functional requirements

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **Python 3.8+**
- **Docker & Docker Compose** (for Neo4j graph database)
- **AWS Account** with Bedrock access
- **GitHub Account** (optional)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vibe-assistant
```

### 2. Quick Setup (Recommended)
```bash
# Install all dependencies
npm run setup

# Start both frontend and backend
npm start
```

### 3. Manual Setup (Alternative)

#### Backend Dependencies
```bash
cd backend
pip3 install -r requirements.txt
cd ..
```

#### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Configuration

#### Option 1: Environment Variables (Optional)
Create a `.env` file in the project root:
```bash
# AWS Configuration (Optional - can be set via UI)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0

# GitHub Configuration (Optional - can be set via UI)
GITHUB_TOKEN=your_github_token
GITHUB_DEFAULT_REPO=https://github.com/your-username/your-repo

# Application Configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

#### Option 2: UI Configuration (Recommended)
1. Start the application (see below)
2. Navigate to the Configuration panel
3. Add your AWS and GitHub credentials
4. Test connections using built-in health checks

### 5. Start the Application

#### Option 1: Use NPM Scripts (Recommended)
```bash
# Start both frontend and backend
npm start

# Or start individually
npm run start:frontend    # Frontend only
npm run start:backend     # Backend only

# Development mode with auto-restart
npm run dev
```

#### Option 2: Use the Startup Script
```bash
./scripts/start.sh
```

#### Option 3: Manual Start
```bash
# Terminal 1 - Backend
cd backend
python3 app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Neo4j Browser**: http://localhost:7474 (user: neo4j, password: vibeassistant)

## 🎯 **New Enhancement Modes**

### 📋 **Maximum Detail**
Generates comprehensive step-by-step implementation guides with 15-25 detailed steps that cover all aspects of the development task. Each step includes specific technical details, actionable instructions, and considers all inputs including non-functional requirements, selected files, and project context.

### 📝 **Balanced**
Creates balanced step-by-step implementation plans with approximately 10 key steps that cover the most important aspects of the development task. Focuses on essential implementation details while maintaining clarity and conciseness.

### ✨ **Key Requirements**
Analyzes user requests to extract and identify core functional requirements, critical technical constraints, essential features, and key dependencies. Provides a structured breakdown of what needs to be built, highlighting the most important aspects and dependencies.

## 🔧 Configuration

### AWS Bedrock Setup
1. **Create AWS Account**: Set up an AWS account if you don't have one
2. **Enable Bedrock**: Enable AWS Bedrock in the `us-east-1` region
3. **Create IAM User**: Create an IAM user with Bedrock permissions
4. **Add Credentials**: Add your AWS credentials via the Configuration panel
5. **Test Connection**: Use the built-in test to verify connectivity

### GitHub Integration
1. **Generate Token**: Create a GitHub personal access token
2. **Add Token**: Add the token via the Configuration panel
3. **Test Connection**: Verify access to your repositories

### Non-Functional Requirements
Customize the AI enhancement behavior by editing requirements in the Configuration panel:

- **Development**: Requirements for new feature development
- **Refactoring**: Requirements for code improvement tasks
- **Testing**: Requirements for testing and QA tasks

## 📡 API Endpoints

### Health & Status
- `GET /api/health` - Server health status

### Configuration
- `GET /api/config` - Get application configuration
- `POST /api/config` - Update application configuration

### Repository Management
- `POST /api/repositories/files` - Get repository file structure
- `POST /api/repositories/file-content` - Get specific file content

### AI & Prompt Enhancement
- `POST /api/enhance-prompt` - Enhance prompts with AI
- `POST /api/stream-response` - Stream AI responses in real-time

### Graph Database (NEW)
- `GET /api/graph/nodes` - Fetch all nodes and edges
- `POST /api/graph/nodes` - Create a new node
- `POST /api/graph/edges` - Create a new relationship
- `POST /api/graph/sample` - Load sample data
- `DELETE /api/graph/nodes/{id}` - Delete a node
- `DELETE /api/graph/edges/{from}/{to}` - Delete a relationship
- `POST /api/graph/clear` - Clear all data

## 🎯 Usage Examples

### Basic Prompt Enhancement
```bash
curl -X POST http://localhost:5000/api/enhance-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a user authentication system",
    "task_type": "development"
  }'
```

### Streaming AI Response
```bash
curl -X POST http://localhost:5000/api/stream-response \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain React hooks",
    "systemPrompt": "You are a helpful coding assistant",
    "maxTokens": 1000
  }'
```

## 🔒 Security & Privacy

### Credential Management
- **Local Storage**: All credentials stored locally in `config/user_config.json`
- **No Cloud Storage**: Credentials never sent to external services
- **Secure Transmission**: HTTPS used for all external API calls
- **Environment Fallback**: Supports environment variables as backup

### Data Privacy
- **No Data Collection**: No user data collected or transmitted
- **Local Processing**: All operations performed locally
- **Secure APIs**: Direct communication with AWS and GitHub APIs only

## 🧪 Development

### Available Scripts
- `npm run setup` - Install all dependencies
- `npm start` - Start both frontend and backend
- `npm run start:frontend` - Start frontend only
- `npm run start:backend` - Start backend only
- `npm run build` - Build frontend for production
- `npm run test` - Run frontend tests
- `npm run test:backend` - Run backend tests
- `npm run dev` - Development mode with concurrency

### Project Structure Guidelines
- **Frontend files**: Place in `/frontend/` directory
- **Backend files**: Place in `/backend/` directory
- **Node dependencies**: Managed in `/node/` directory
- **Scripts**: Add to `/scripts/` directory
- **Configuration**: Use `/config/` for app config, `.env` for secrets

### Color Scheme
The application uses a custom dark theme with the vibe color palette:
- `vibe-dark`: #1e1e1e (main background)
- `vibe-darker`: #252526 (secondary background)
- `vibe-darkest`: #1a1a1a (deepest background)
- `vibe-blue`: #007acc (primary accent)
- `vibe-gray`: #cccccc (text)
- `vibe-green`: #4caf50 (success)
- `vibe-red`: #f44336 (error)

## 🤝 Contributing

1. Follow the established directory structure
2. Use the provided scripts for development
3. Test changes thoroughly
4. Maintain separation between frontend and backend
5. Follow the coding standards defined in `.cursorrules`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts**: Use the startup script which handles port conflicts automatically
2. **Missing dependencies**: Run `npm run setup` to install all dependencies
3. **AWS connection issues**: Verify credentials and region in Configuration panel
4. **GitHub API limits**: Ensure you have a valid GitHub token
5. **Neo4j connection issues**: 
   - Ensure Docker is running: `docker ps`
   - Check Neo4j status: `cd database && docker-compose ps`
   - Restart Neo4j: `cd database && docker-compose restart`
   - View logs: `cd database && docker-compose logs neo4j`

### Getting Help

- Check the logs in the `/logs/` directory
- Use the health check endpoints to verify service status
- Review the Configuration panel for connection issues 