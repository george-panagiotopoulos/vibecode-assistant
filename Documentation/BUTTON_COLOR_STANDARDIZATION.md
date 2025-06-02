# Button Color Standardization Guide

## Overview
This document outlines the standardized button color scheme implemented across all three tabs of the Vibe Assistant application to ensure consistent user experience and intuitive functionality recognition.

## Color Scheme

### 🔵 Standard Buttons (Blue)
**Class:** `btn-standard`
**Color:** Blue (`bg-vibe-blue hover:bg-blue-600`)
**Usage:** General operations, navigation, and standard functionality

**Examples:**
- Refresh/Reload buttons
- Save/Load operations
- Test connections
- Navigation (Back, Cancel)
- Copy operations
- Visualize/View operations

### 🟢 Add Functionality (Green)
**Class:** `btn-add`
**Color:** Green (`bg-vibe-green hover:bg-green-600`)
**Usage:** Adding, creating, or loading new content

**Examples:**
- Add Layer, Add Node, Add Edge
- Load NFR, Load Repository
- Create operations
- Select All functionality
- Add to Prompt

### 🔴 Delete Functionality (Red)
**Class:** `btn-delete`
**Color:** Red (`bg-vibe-red hover:bg-red-600`)
**Usage:** Deleting, removing, or clearing content

**Examples:**
- Delete buttons
- Clear operations
- Remove functionality
- Clear selection

### 🟠 Edit Functionality (Orange)
**Class:** `btn-edit`
**Color:** Orange (`bg-orange-500 hover:bg-orange-600`)
**Usage:** Editing or modifying existing content

**Examples:**
- Edit Node, Edit Layer
- Update operations
- Modify functionality

## Implementation Across Tabs

### 1. Prompt Builder Tab
- **Add Functionality (Green):** Load NFR button
- **Standard (Blue):** Enhancement buttons (Full Specification, Plan, Clarity), Copy Result
- **Delete (Red):** Clear button
- **Edit (Orange):** Not applicable in this tab

### 2. Hierarchical Planning Tab
- **Add Functionality (Green):** Add Layer, Add Node, Add Edge, Load Sample Data, Create First Layer
- **Standard (Blue):** Visualize Graph, Save Graph, Load Graph, Refresh, Cancel buttons
- **Delete (Red):** Clear All, Delete Layer, Delete Node, Delete Edge buttons
- **Edit (Orange):** Edit Layer, Edit Node buttons and their update operations

### 3. Dashboard & Configuration Tab
- **Add Functionality (Green):** Not applicable in this tab
- **Standard (Blue):** All buttons (Refresh Status, Test Connections, Load/Save Config, etc.)
- **Delete (Red):** Not applicable in this tab
- **Edit (Orange):** Not applicable in this tab

## Supporting Components

### NonFunctionalRequirementsLoader Component
- **Add Functionality (Green):** Add to Prompt button, Select All layer buttons
- **Standard (Blue):** Back navigation buttons

### FileExplorer Component
- **Add Functionality (Green):** Select All button
- **Standard (Blue):** Retry button
- **Delete (Red):** Clear selection button

### RepositoryLoader Component
- **Add Functionality (Green):** Load Repository button
- **Standard (Blue):** Show/Hide token button

## CSS Classes

```css
/* Standardized Button Classes */
.btn-standard {
  @apply bg-vibe-blue hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors duration-200;
}

.btn-add {
  @apply bg-vibe-green hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-200;
}

.btn-delete {
  @apply bg-vibe-red hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-200;
}

.btn-edit {
  @apply bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors duration-200;
}
```

## Legacy Support

The following legacy classes are maintained for backward compatibility:
- `btn-primary` (maps to blue)
- `btn-secondary` (gray for neutral actions)
- `btn-danger` (maps to red)
- `btn-accent` (maps to green)

## Benefits

1. **Consistency:** Uniform color usage across all tabs
2. **Intuitive UX:** Users can quickly identify button functionality by color
3. **Accessibility:** Clear visual distinction between different action types
4. **Maintainability:** Standardized classes make future updates easier
5. **Professional Appearance:** Cohesive design language throughout the application

## Usage Guidelines

### When to Use Each Color:

**Blue (Standard):**
- Default choice for most buttons
- Navigation and general operations
- Non-destructive actions

**Green (Add):**
- Creating new content
- Loading/importing data
- Positive actions that add value

**Red (Delete):**
- Destructive actions
- Removing content
- Clearing data

**Orange (Edit):**
- Modifying existing content
- Update operations
- Non-destructive changes

### Best Practices:

1. Always use the appropriate color for the button's function
2. Maintain consistency within the same component
3. Consider the user's mental model when choosing colors
4. Test color combinations for accessibility
5. Use hover states to provide visual feedback

## Files Modified

### CSS:
- `frontend/src/index.css` - Added new standardized button classes

### Components:
- `frontend/src/components/PromptBuilder.js`
- `frontend/src/components/RequirementsEditor.js`
- `frontend/src/components/Dashboard.js`
- `frontend/src/components/NFRLoader.js`
- `frontend/src/components/FileExplorer.js`
- `frontend/src/components/RepositoryLoader.js`

## Future Considerations

1. **Icon Consistency:** Consider standardizing icons alongside colors
2. **Size Variants:** Implement consistent sizing classes (small, medium, large)
3. **State Variants:** Add loading, disabled, and active state styling
4. **Accessibility:** Ensure color choices meet WCAG guidelines
5. **Theme Support:** Consider dark/light theme variations

This standardization ensures a cohesive and intuitive user experience across the entire Vibe Assistant application. 