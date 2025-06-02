# Diagrams Documentation

This directory contains PlantUML diagrams that visualize the Vibe Assistant system architecture, component relationships, and process flows.

## 📁 Directory Structure

```
diagrams/
├── README.md                   # This file
├── class-diagram.puml         # System class relationships
├── flows/                     # Process flow diagrams
│   ├── user-authentication.puml
│   ├── prompt-generation.puml
│   ├── github-integration.puml
│   └── ai-processing.puml
├── architecture/              # High-level architecture diagrams
│   ├── system-overview.puml
│   ├── service-architecture.puml
│   └── data-flow.puml
└── rendered/                  # Generated diagram images
    ├── png/                   # PNG format images
    └── svg/                   # SVG format images
```

## 🛠️ PlantUML Setup

### Prerequisites

#### Option 1: Local Installation
```bash
# Install Java (required for PlantUML)
brew install openjdk

# Install PlantUML
brew install plantuml

# Verify installation
plantuml -version
```

#### Option 2: VS Code Extension
Install the "PlantUML" extension by jebbs for VS Code:
1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "PlantUML"
4. Install the extension by jebbs

#### Option 3: Online Editor
Use the online PlantUML editor at: https://www.plantuml.com/plantuml/uml/

### Rendering Diagrams

#### Command Line
```bash
# Render single diagram
plantuml diagram-name.puml

# Render all diagrams in directory
plantuml *.puml

# Render to specific format
plantuml -tpng diagram-name.puml  # PNG format
plantuml -tsvg diagram-name.puml  # SVG format
```

#### VS Code
1. Open a `.puml` file
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PlantUML: Preview Current Diagram"
4. The preview will open in a new tab

## 📊 Diagram Types

### Class Diagrams
- **Purpose**: Show relationships between classes and services
- **Location**: `class-diagram.puml`
- **Usage**: Understanding system structure and dependencies

### Sequence Diagrams
- **Purpose**: Illustrate process flows and interactions
- **Location**: `flows/` directory
- **Usage**: Understanding how components communicate

### Architecture Diagrams
- **Purpose**: High-level system overview
- **Location**: `architecture/` directory
- **Usage**: System design and deployment understanding

## 🎨 Diagram Standards

### Naming Conventions
- Use kebab-case for file names: `user-authentication.puml`
- Use descriptive names that indicate the diagram's purpose
- Include version numbers for major changes: `system-overview-v2.puml`

### Styling Guidelines
```plantuml
@startuml
!theme vibedark

' Color scheme matching Vibe Assistant
skinparam backgroundColor #1e1e1e
skinparam classBackgroundColor #252526
skinparam classBorderColor #3c3c3c
skinparam classArrowColor #007acc
skinparam noteBackgroundColor #252526
skinparam noteBorderColor #3c3c3c

' Font settings
skinparam defaultFontName "SF Pro Display"
skinparam defaultFontSize 12
@enduml
```

### Component Stereotypes
Use consistent stereotypes to clarify component roles:
- `<<Service>>`: Backend services
- `<<Component>>`: React components
- `<<Controller>>`: API controllers
- `<<Database>>`: Data storage
- `<<External>>`: External services

### Example Template
```plantuml
@startuml diagram-name
!theme vibedark
title "Diagram Title"

' Define participants/classes
participant "User" as user
participant "Frontend" as frontend <<Component>>
participant "Backend API" as api <<Service>>
participant "Database" as db <<Database>>

' Define interactions
user -> frontend: Action
frontend -> api: API Call
api -> db: Query
db --> api: Result
api --> frontend: Response
frontend --> user: Update UI

note right of api
  Additional notes about
  the process or constraints
end note

@enduml
```

## 📝 Documentation Integration

### Referencing Diagrams in Markdown
```markdown
## System Architecture

The following diagram shows the overall system architecture:

![System Architecture](../diagrams/rendered/png/system-overview.png)

For the interactive version, see: [system-overview.puml](../diagrams/architecture/system-overview.puml)
```

### Embedding in Documentation
- Always include both source `.puml` files and rendered images
- Reference diagrams in relevant documentation sections
- Keep diagrams up-to-date with code changes
- Use descriptive alt text for accessibility

## 🔄 Maintenance

### Update Process
1. Modify the `.puml` source file
2. Re-render the diagram
3. Update any documentation that references the diagram
4. Commit both source and rendered files

### Version Control
- Track both `.puml` source files and rendered images
- Use meaningful commit messages for diagram changes
- Consider diagram changes as part of code reviews

### Automation (Optional)
Set up GitHub Actions to automatically render diagrams:

```yaml
name: Render PlantUML Diagrams
on:
  push:
    paths:
      - 'Documentation/diagrams/**/*.puml'

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Render PlantUML
        uses: cloudbees/plantuml-github-action@master
        with:
          args: -v -tpng Documentation/diagrams/**/*.puml
```

## 🎯 Best Practices

### Design Principles
- Keep diagrams simple and focused
- Use consistent styling and colors
- Include legends for complex diagrams
- Limit the number of elements per diagram

### Content Guidelines
- Focus on one aspect per diagram
- Use clear, descriptive labels
- Include relevant notes and constraints
- Show both happy path and error scenarios

### Collaboration
- Review diagrams as part of code reviews
- Update diagrams when architecture changes
- Use diagrams in design discussions
- Share diagrams with stakeholders for alignment

## 📚 Resources

- [PlantUML Official Documentation](https://plantuml.com/)
- [PlantUML Language Reference](https://plantuml.com/guide)
- [PlantUML Themes](https://plantuml.com/theme)
- [VS Code PlantUML Extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) 