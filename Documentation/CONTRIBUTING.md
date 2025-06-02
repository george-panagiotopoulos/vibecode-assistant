# Contributing to Vibe Assistant Documentation

This guide explains how to contribute to and maintain the Vibe Assistant documentation system.

## 📚 Documentation Philosophy

Our documentation follows these core principles:

### Co-located Documentation
- Documentation structure mirrors the codebase structure
- Each feature/module has corresponding documentation
- Easy navigation between code and docs

### Living Documentation
- Updated alongside code changes
- Integrated into code review process
- Automated where possible

### Comprehensive Coverage
- Every feature should be documented
- Include both "how" and "why" information
- Provide examples and use cases

## 🔄 Documentation Workflow

### When to Update Documentation

Documentation should be updated in the following scenarios:

1. **New Features**: Document new functionality, APIs, or components
2. **API Changes**: Update endpoint documentation and examples
3. **Architecture Changes**: Modify system diagrams and architecture docs
4. **Bug Fixes**: Update documentation if behavior changes
5. **Configuration Changes**: Update setup and configuration guides
6. **Deprecations**: Mark deprecated features and provide migration paths

### Documentation Review Process

1. **Include in Pull Requests**: Documentation updates should be part of the same PR as code changes
2. **Review for Accuracy**: Ensure documentation matches the actual implementation
3. **Check Links**: Verify all internal and external links work
4. **Validate Examples**: Test code examples and ensure they work
5. **Review Diagrams**: Update PlantUML diagrams if system relationships change

## 📝 Writing Guidelines

### Content Standards

#### Structure
- Use consistent heading hierarchy (H1 for title, H2 for main sections, etc.)
- Include a table of contents for long documents
- Start with a brief purpose statement
- End with related links and references

#### Language
- Write in clear, concise language
- Use active voice when possible
- Define technical terms and acronyms
- Include examples for complex concepts

#### Code Examples
- Provide working code examples
- Include necessary imports and setup
- Show both basic and advanced usage
- Comment code appropriately

### Markdown Standards

#### Formatting
```markdown
# Main Title (H1)
## Section Title (H2)
### Subsection Title (H3)

**Bold text** for emphasis
*Italic text* for terms
`code snippets` for inline code
```

#### Code Blocks
```markdown
```language
// Code block with language specification
const example = "Always specify the language";
```
```

#### Links
```markdown
[Link Text](relative/path/to/file.md)
[External Link](https://example.com)
```

#### Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
```

## 🎨 Diagram Guidelines

### PlantUML Standards

#### File Naming
- Use kebab-case: `user-authentication.puml`
- Include version numbers for major changes: `system-overview-v2.puml`
- Use descriptive names that indicate purpose

#### Styling
Always include the vibe theme and color scheme:

```plantuml
@startuml diagram-name
!theme vibedark
title "Diagram Title"

' Color scheme matching Vibe Assistant
skinparam backgroundColor #1e1e1e
skinparam classBackgroundColor #252526
skinparam classBorderColor #3c3c3c
skinparam classArrowColor #007acc
```

#### Content Guidelines
- Keep diagrams focused on one aspect
- Use consistent stereotypes (<<Service>>, <<Component>>, etc.)
- Include relevant notes and constraints
- Limit complexity - split large diagrams into smaller ones

### Diagram Maintenance

1. **Update Source Files**: Always modify the `.puml` source file
2. **Re-render**: Generate new PNG/SVG files after changes
3. **Update References**: Check all documentation that references the diagram
4. **Version Control**: Commit both source and rendered files

## 📁 File Organization

### Directory Structure
Follow the established structure:
```
Documentation/
├── README.md                    # Main documentation index
├── _templates/                  # Reusable templates
├── diagrams/                    # PlantUML diagrams
├── backend/                     # Backend documentation
├── frontend/                    # Frontend documentation
├── architecture/                # System architecture docs
└── config/                      # Configuration documentation
```

### File Naming Conventions
- Use kebab-case for file names: `feature-name.md`
- Navigation files: `_README.md` (underscore prefix)
- Index files: `index.md`
- Templates: `template-name.md` in `_templates/`

### Cross-References
- Use relative paths for internal links
- Include bidirectional links between related documents
- Maintain a consistent link format

## 🛠️ Tools and Setup

### Required Tools

#### PlantUML
```bash
# macOS
brew install plantuml

# Verify installation
plantuml -version
```

#### VS Code Extensions
- PlantUML (by jebbs)
- Markdown All in One
- Markdown Preview Enhanced

### Rendering Diagrams

#### Command Line
```bash
# Render single diagram
plantuml diagram-name.puml

# Render all diagrams
plantuml *.puml

# Specific format
plantuml -tpng diagram-name.puml
```

#### VS Code
1. Open `.puml` file
2. `Cmd+Shift+P` → "PlantUML: Preview Current Diagram"

## 📋 Templates Usage

### Using Templates
1. Copy the appropriate template from `_templates/`
2. Rename to match your feature/component
3. Fill in all sections with relevant information
4. Remove template comments and placeholders

### Available Templates
- `feature-template.md`: Standard feature documentation
- `service-template.md`: Backend service documentation
- `component-template.md`: Frontend component documentation
- `api-template.md`: API endpoint documentation

### Creating New Templates
1. Identify common documentation patterns
2. Create template in `_templates/` directory
3. Include clear placeholders and instructions
4. Update this guide with template information

## 🔍 Quality Assurance

### Documentation Checklist

Before submitting documentation changes:

- [ ] Content is accurate and up-to-date
- [ ] All links work correctly
- [ ] Code examples are tested and functional
- [ ] Diagrams are current and properly rendered
- [ ] Spelling and grammar are correct
- [ ] Follows established style guidelines
- [ ] Includes necessary cross-references
- [ ] Templates are used appropriately

### Review Criteria

Reviewers should check:

1. **Accuracy**: Does the documentation match the implementation?
2. **Completeness**: Are all aspects of the feature documented?
3. **Clarity**: Is the content easy to understand?
4. **Consistency**: Does it follow established patterns?
5. **Examples**: Are code examples working and helpful?
6. **Navigation**: Are links and cross-references correct?

## 🚀 Automation

### GitHub Actions (Optional)

Set up automated diagram rendering:

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

### Documentation Validation

Consider adding:
- Link checking automation
- Spell checking
- Markdown linting
- Diagram validation

## 📊 Maintenance Schedule

### Regular Reviews
- **Weekly**: Check for broken links and outdated information
- **Monthly**: Review and update architecture diagrams
- **Quarterly**: Comprehensive documentation audit
- **Release**: Update all relevant documentation for new releases

### Ownership
- **Feature Teams**: Maintain documentation for their features
- **Architecture Team**: Maintain system-level documentation
- **DevOps Team**: Maintain deployment and configuration docs

## 🆘 Getting Help

### Documentation Issues
- Create GitHub issues for documentation problems
- Tag issues with `documentation` label
- Provide specific details about the problem

### Questions and Discussions
- Use team chat for quick questions
- Schedule documentation reviews for complex changes
- Reach out to the documentation maintainers

### Resources
- [Markdown Guide](https://www.markdownguide.org/)
- [PlantUML Documentation](https://plantuml.com/)
- [Technical Writing Best Practices](https://developers.google.com/tech-writing)

## 📈 Metrics and Improvement

### Documentation Metrics
Track the following to improve documentation quality:
- Documentation coverage per feature
- Time to find information
- User feedback and questions
- Documentation update frequency

### Continuous Improvement
- Regular feedback collection from team members
- Documentation usability testing
- Process refinement based on usage patterns
- Tool evaluation and updates

---

**Last Updated**: 2024-01-XX  
**Maintainer**: Documentation Team  
**Next Review**: Monthly 