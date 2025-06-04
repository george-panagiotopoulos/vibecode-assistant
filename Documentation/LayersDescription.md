# Vibe Assistant - System Architecture Layers

## Backend Layer (Python Flask)

The Vibe Assistant backend is built on Python Flask, providing a robust and scalable foundation for the AI-powered prompt builder application. The backend architecture follows a modular service-oriented design that separates concerns and ensures maintainability.

**Core Technologies:**
- **Flask Framework**: Lightweight WSGI web application framework that provides the HTTP server capabilities and RESTful API endpoints
- **Python 3.x**: Modern Python runtime with type hints and async support for enhanced code quality and performance
- **Neo4j Python Driver**: Official driver for seamless integration with the Neo4j graph database
- **AWS Boto3**: Amazon Web Services SDK for Python, enabling integration with AWS Bedrock and other cloud services
- **PyGithub**: GitHub API client for repository management and integration features

**Key Features:**
The backend implements a comprehensive graph management system that allows users to create, modify, and visualize hierarchical planning structures. The core functionality revolves around managing nodes (requirements, constraints, goals) and edges (relationships) within a graph database. The system supports multiple graph types including Non-Functional Requirements (NFR) and Application Architecture graphs, each with specialized handling and validation.

The AI integration layer leverages AWS Bedrock to provide intelligent prompt generation and analysis capabilities. This includes natural language processing for requirement extraction, automated relationship discovery, and intelligent suggestions for graph optimization. The backend also implements a sophisticated export/import system that allows users to backup and share their graph configurations in JSON format with full metadata preservation.

**Service Architecture:**
The backend is organized into distinct services: ConfigService manages environment variables and application settings, GitHubService handles repository integration and version control features, BedrockService manages AI model interactions and prompt processing, and Neo4jService provides all graph database operations. Each service is designed with dependency injection principles and comprehensive error handling.

**API Design:**
The RESTful API follows OpenAPI specifications with clear endpoint organization. Graph operations include CRUD operations for nodes and edges, layer management, graph visualization data, and bulk operations for import/export. The API implements proper HTTP status codes, request validation, and structured error responses. Authentication and authorization are handled through configurable middleware that supports multiple authentication strategies.

## Frontend Layer (React)

The Vibe Assistant frontend is a modern React application that provides an intuitive and responsive user interface for graph-based hierarchical planning. Built with contemporary web technologies, it offers a seamless user experience for managing complex requirement structures and architectural designs.

**Core Technologies:**
- **React 18**: Latest version of React with concurrent features, hooks, and functional components for optimal performance
- **Tailwind CSS**: Utility-first CSS framework with custom vibe-* color palette for consistent theming and responsive design
- **JavaScript ES6+**: Modern JavaScript features including async/await, destructuring, and module imports
- **React Hooks**: useState, useEffect, useCallback for state management and lifecycle handling
- **Fetch API**: Native browser API for HTTP requests with proper error handling and response processing

**Key Features:**
The frontend implements a sophisticated graph visualization system that presents hierarchical data in an intuitive layer-based interface. Users can create and manage multiple abstraction layers, each containing nodes representing different types of requirements or architectural components. The interface supports real-time editing with immediate visual feedback, drag-and-drop functionality for relationship creation, and collapsible layer views for managing complex graphs.

The component architecture includes specialized modules for different graph types. The RequirementsEditor handles NFR graphs with features for requirement categorization, dependency mapping, and constraint validation. The ApplicationArchitectureLoader manages architectural graphs with support for component relationships, service dependencies, and infrastructure mapping. The PromptBuilder integrates both graph types to generate comprehensive AI prompts.

**User Experience Design:**
The interface follows modern UX principles with a dark theme optimized for extended use. Interactive elements provide immediate feedback, modal dialogs handle complex operations without page navigation, and the responsive design ensures functionality across desktop and mobile devices. The application implements progressive disclosure, showing basic information by default with detailed views available on demand.

**State Management:**
The frontend uses React's built-in state management with hooks for local component state and context for shared application state. The architecture supports real-time updates, optimistic UI updates for better perceived performance, and proper error boundaries for graceful error handling. Form validation provides immediate feedback with clear error messages and guided user input.

## Infrastructure Layer (AWS, Neo4j, GitHub)

The Vibe Assistant infrastructure leverages cloud-native services and modern database technologies to provide a scalable, reliable, and intelligent platform for hierarchical planning and AI-powered prompt generation.

**AWS Bedrock Integration:**
Amazon Bedrock serves as the AI foundation, providing access to state-of-the-art large language models for natural language processing and generation. The integration supports multiple model types including Claude, GPT, and other foundation models, allowing users to select the most appropriate AI model for their specific use case. The service handles prompt optimization, context management, and response processing with built-in rate limiting and error handling. Bedrock's serverless architecture ensures cost-effective scaling and eliminates the need for model infrastructure management.

**Neo4j Graph Database:**
Neo4j provides the core data persistence layer, specifically designed for graph-based data structures that are central to the application's hierarchical planning capabilities. The graph database excels at storing and querying complex relationships between nodes, making it ideal for requirement dependencies, architectural component relationships, and multi-layer abstractions. Neo4j's Cypher query language enables sophisticated graph traversals, pattern matching, and analytical queries that would be complex in traditional relational databases.

The database schema supports flexible node types with properties for requirements, constraints, goals, and architectural components. Relationships are typed and directional, allowing for precise modeling of dependencies, conflicts, and support relationships. The graph structure enables powerful queries for impact analysis, dependency tracking, and automated validation of requirement consistency.

**GitHub Integration:**
GitHub integration provides version control and collaboration features for graph configurations and prompt templates. The system can automatically sync graph definitions to GitHub repositories, enabling team collaboration, change tracking, and backup functionality. The integration supports branch-based workflows, allowing teams to work on different versions of architectural designs or requirement sets simultaneously.

**Security and Scalability:**
The infrastructure implements security best practices including encrypted data transmission, secure API key management through AWS Secrets Manager, and role-based access control. The cloud-native architecture provides automatic scaling capabilities, with Neo4j Aura for managed database scaling and AWS Lambda for serverless compute scaling. Monitoring and logging are implemented through AWS CloudWatch and Neo4j monitoring tools, providing comprehensive observability for performance optimization and troubleshooting.

**Deployment Architecture:**
The system supports multiple deployment models including containerized deployments with Docker, serverless deployments on AWS Lambda, and traditional server deployments. The modular architecture allows for independent scaling of different components based on usage patterns and performance requirements. 