# Contributing to Vibe Assistant

We welcome contributions to the Vibe Assistant project! This guide will help you get started with contributing to this AI-powered development assistant.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review Process](#code-review-process)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** (v16 or higher)
- **Python 3.8+**
- **Docker & Docker Compose** (for Neo4j database)
- **Git** for version control
- **AWS Account** with Bedrock access (for testing AI features)
- **GitHub Account** for authentication testing

### First Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vibe-assistant.git
   cd vibe-assistant
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/vibe-assistant.git
   ```
4. **Install dependencies**:
   ```bash
   npm run setup
   ```
5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## 🛠️ Development Setup

### Starting the Development Environment

```bash
# Start all services (recommended for development)
npm start

# Or start services individually:
npm run start:backend    # Flask backend
npm run start:frontend   # React frontend
cd database && docker-compose up -d  # Neo4j database
```

### Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Neo4j Browser**: http://localhost:7474

### Environment Configuration

Ensure your `.env` file includes:

```env
# Required for development
AWS_ACCESS_KEY_ID=your_test_key
AWS_SECRET_ACCESS_KEY=your_test_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=vibeassistant

# Optional for full feature testing
GITHUB_TOKEN=your_github_token
```

## 🏗️ Project Structure

Understanding the project structure is crucial for contributing:

```
vibe-assistant/
├── backend/                 # Python Flask backend
│   ├── app.py              # Main Flask application
│   ├── services/           # Business logic services
│   └── config/             # Configuration files
├── frontend/               # React frontend
│   ├── src/components/     # React components
│   ├── src/services/       # Frontend services
│   └── public/             # Static assets
├── database/               # Neo4j setup
├── config/                 # Application configuration
├── scripts/                # Utility scripts and tests
├── Documentation/          # Project documentation
└── logs/                   # Application logs
```

### Key Principles

- **Separation of Concerns**: Frontend and backend are completely separate
- **Service-Oriented Architecture**: Business logic in dedicated service modules
- **Configuration Management**: Environment-based configuration
- **Comprehensive Logging**: All operations are logged for debugging

## 📝 Coding Standards

### Backend (Python/Flask)

- **Follow PEP 8** style guidelines
- **Use type hints** where appropriate
- **Service Pattern**: Business logic in `services/` modules
- **Error Handling**: Comprehensive try-catch blocks with logging
- **Documentation**: Docstrings for all functions and classes

**Example:**
```python
def create_node(self, node_data: dict) -> dict:
    """
    Create a new node in the graph database.
    
    Args:
        node_data (dict): Node properties including id, name, layer, type
        
    Returns:
        dict: Created node data with success status
        
    Raises:
        ValueError: If required fields are missing
        Neo4jError: If database operation fails
    """
    try:
        # Implementation here
        pass
    except Exception as e:
        self.logger.error(f"Failed to create node: {str(e)}")
        raise
```

### Frontend (React/JavaScript)

- **Functional Components**: Use hooks instead of class components
- **Custom Hooks**: Extract reusable logic
- **Tailwind CSS**: Use utility classes with custom vibe color palette
- **PropTypes**: Define component prop types
- **Error Boundaries**: Implement error handling

**Example:**
```javascript
const PromptBuilder = ({ selectedFiles, onPromptEnhancement, config }) => {
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const handleEnhancement = useCallback(async () => {
    try {
      setIsEnhancing(true);
      // Implementation here
    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setIsEnhancing(false);
    }
  }, [prompt, selectedFiles]);
  
  return (
    <div className="bg-vibe-dark text-vibe-gray">
      {/* Component JSX */}
    </div>
  );
};
```

### CSS/Styling

- **Tailwind CSS**: Primary styling framework
- **Custom Vibe Colors**: Use the defined color palette
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Ensure WCAG compliance

**Vibe Color Palette:**
```css
vibe-dark: #1e1e1e        /* Main background */
vibe-darker: #252526      /* Secondary background */
vibe-darkest: #1a1a1a     /* Deepest background */
vibe-blue: #007acc        /* Primary accent */
vibe-gray: #cccccc        /* Text */
vibe-gray-dark: #3c3c3c   /* Borders */
vibe-green: #4caf50       /* Success */
vibe-red: #f44336         /* Error */
```

### Git Commit Standards

- **Conventional Commits**: Use the conventional commit format
- **Clear Messages**: Descriptive commit messages
- **Atomic Commits**: One logical change per commit

**Commit Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Examples:**
```
feat(prompt-builder): add architecture integration
fix(neo4j): resolve connection timeout issues
docs(readme): update installation instructions
test(api): add integration tests for graph endpoints
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Backend tests
npm run test:backend

# Frontend tests
cd frontend && npm test

# Integration tests
python scripts/integration_test.py
```

### Test Requirements

- **Unit Tests**: For individual functions and components
- **Integration Tests**: For API endpoints and service interactions
- **E2E Tests**: For complete user workflows
- **Manual Tests**: Using provided test scripts

### Writing Tests

#### Backend Tests
```python
def test_create_node_success():
    """Test successful node creation"""
    service = Neo4jService()
    node_data = {
        'id': 'test-node-1',
        'name': 'Test Node',
        'layer': 'Application',
        'type': 'requirement'
    }
    
    result = service.create_node(node_data)
    assert result['success'] is True
    assert result['node']['id'] == 'test-node-1'
```

#### Frontend Tests
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import PromptBuilder from './PromptBuilder';

test('renders prompt builder interface', () => {
  render(<PromptBuilder selectedFiles={[]} config={{}} />);
  
  expect(screen.getByText('Prompt Builder')).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});
```

## 📤 Submitting Changes

### Branch Strategy

- **Main Branch**: `main` - Production-ready code
- **Feature Branches**: `feature/description` - New features
- **Bug Fix Branches**: `fix/description` - Bug fixes
- **Documentation**: `docs/description` - Documentation updates

### Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Test thoroughly**:
   ```bash
   npm test
   npm run test:backend
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(component): add new feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

### Pre-submission Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New functionality is tested
- [ ] Documentation is updated
- [ ] Environment variables added to `.env.example` if needed
- [ ] No sensitive data in commits
- [ ] Branch is up to date with `main`

## 🐛 Issue Guidelines

### Reporting Bugs

Use the bug report template and include:

- **Environment details** (OS, Node.js version, Python version)
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Logs** from browser console or backend logs

### Feature Requests

Use the feature request template and include:

- **Clear description** of the proposed feature
- **Use case** and motivation
- **Acceptance criteria** for the feature
- **Mockups or wireframes** if applicable

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority/high` - High priority issues

## 🔄 Pull Request Process

### PR Requirements

1. **Descriptive Title**: Clear and concise PR title
2. **Detailed Description**: What changes were made and why
3. **Testing Notes**: How to test the changes
4. **Screenshots**: For UI changes
5. **Breaking Changes**: Document any breaking changes
6. **Linked Issues**: Reference related issues

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added
- [ ] Manual testing completed

## Screenshots
[If applicable]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewers will test functionality
4. **Documentation**: Ensure docs are updated
5. **Final Approval**: Maintainer approval required for merge

## 👥 Code Review Process

### For Authors

- **Self-review** your PR before requesting review
- **Respond promptly** to review comments
- **Make requested changes** or discuss alternatives
- **Keep PRs focused** - one feature per PR
- **Write clear commit messages** for review history

### For Reviewers

- **Be constructive** and helpful in feedback
- **Test the changes** when possible
- **Check for edge cases** and error handling
- **Verify documentation** is updated
- **Approve when ready** or request specific changes

### Review Criteria

- [ ] **Functionality**: Does it work as intended?
- [ ] **Code Quality**: Follows standards and best practices
- [ ] **Testing**: Adequate test coverage
- [ ] **Performance**: No significant performance regression
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Documentation**: Updated as needed

## 🤝 Community Guidelines

### Code of Conduct

We expect all contributors to follow our code of conduct:

- **Be respectful** and inclusive
- **Provide constructive feedback** 
- **Focus on the code**, not the person
- **Help newcomers** learn and contribute
- **Celebrate successes** and learn from mistakes

### Getting Help

- **Documentation**: Check the `Documentation/` directory first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord/Slack**: [Link to community chat if available]

### Recognition

Contributors are recognized through:

- **Contributor list** in README
- **Release notes** mention significant contributions
- **Special thanks** for major features or fixes

## 📚 Resources

### Useful Links

- [Project Documentation](Documentation/)
- [API Reference](Documentation/backend/services/)
- [Architecture Overview](Documentation/architecture/system-overview.md)
- [React Documentation](https://reactjs.org/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Development Tools

- **Code Editor**: VS Code with recommended extensions
- **API Testing**: Postman or curl for API testing  
- **Database**: Neo4j Browser for graph data exploration
- **Debugging**: Browser dev tools and Python debugger

Thank you for contributing to Vibe Assistant! Your contributions help make this tool better for developers worldwide. 🎉 