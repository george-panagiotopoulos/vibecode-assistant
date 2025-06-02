# Layer Toggle Feature Documentation

## Overview

The Layer Toggle Feature enhances the Hierarchical Planning tab by allowing users to show/hide nodes associated with each layer. This improves the user experience by providing a cleaner, more organized view of the hierarchical structure, especially when dealing with large numbers of nodes across multiple layers.

## Features

### 1. Default Behavior
- **Initial State**: All layers start collapsed (nodes hidden) when the tab loads
- **Clean Interface**: Only layer headers with descriptions and node counts are visible by default
- **Progressive Disclosure**: Users can selectively reveal nodes for layers they want to examine

### 2. Toggle Functionality
- **Toggle Button**: Each layer header includes a "Show/Hide Nodes" button
- **Visual Feedback**: Button text and icon change based on current state
- **Smooth Interaction**: Instant response when toggling layer visibility
- **Independent Control**: Each layer can be toggled independently

### 3. Preserved Functionality
- **Existing Features**: All existing layer and node operations remain unchanged
- **Visual Consistency**: Maintains the established look and feel of the interface
- **Performance**: No impact on existing functionality or performance

## Implementation Details

### State Management

```javascript
// Layer visibility state - tracks which layers are collapsed
const [collapsedLayers, setCollapsedLayers] = useState(new Set());

// Toggle function for individual layers
const toggleLayerVisibility = useCallback((layerName) => {
  setCollapsedLayers(prevCollapsed => {
    const newCollapsed = new Set(prevCollapsed);
    if (newCollapsed.has(layerName)) {
      newCollapsed.delete(layerName);
    } else {
      newCollapsed.add(layerName);
    }
    return newCollapsed;
  });
}, []);
```

### Component Architecture

#### LayerHeader Component
- **Purpose**: Reusable component for consistent layer display
- **Features**: Toggle button, layer info, action buttons
- **Props**: `layer`, `nodeCount`, `isCollapsed`, `onToggle`, `onEdit`, `onDelete`

```javascript
const LayerHeader = ({ layer, nodeCount, isCollapsed, onToggle, onEdit, onDelete }) => (
  <div className="bg-vibe-darker p-4 rounded-t-lg border-b border-vibe-gray-dark">
    {/* Layer info and toggle button */}
    {/* Action buttons (Edit, Delete) */}
  </div>
);
```

#### NodeGrid Component
- **Purpose**: Reusable component for displaying layer nodes
- **Features**: Maintains existing node styling and functionality
- **Props**: `nodes`, `edges`, `onEditNode`, `onDeleteNode`

```javascript
const NodeGrid = ({ nodes, edges, onEditNode, onDeleteNode }) => (
  <div className="p-4">
    {/* Node grid with existing styling */}
  </div>
);
```

### Conditional Rendering

```javascript
{/* Layer Nodes - Only show when layer is not collapsed */}
{!isLayerCollapsed(layer) && (
  <NodeGrid
    nodes={layerNodes}
    edges={edges}
    onEditNode={(node) => handleEditNode(node)}
    onDeleteNode={(nodeId) => handleDeleteNode(nodeId)}
  />
)}
```

## User Interface

### Layer Header Elements

1. **Layer Color Indicator**: Colored circle for visual layer identification
2. **Layer Name**: Bold text displaying the layer name
3. **Node Count**: Shows number of nodes in parentheses
4. **Toggle Button**: 
   - Collapsed: "👁️ Show Nodes" (blue background)
   - Expanded: "🙈 Hide Nodes" (blue background)
5. **Action Buttons**: Edit and Delete layer buttons (unchanged)

### Visual States

#### Collapsed Layer (Default)
```
┌─────────────────────────────────────────────────────────────┐
│ ● Layer Name (5 nodes) [👁️ Show Nodes] [✏️ Edit] [🗑️ Delete] │
└─────────────────────────────────────────────────────────────┘
```

#### Expanded Layer
```
┌─────────────────────────────────────────────────────────────┐
│ ● Layer Name (5 nodes) [🙈 Hide Nodes] [✏️ Edit] [🗑️ Delete] │
├─────────────────────────────────────────────────────────────┤
│ [Node 1] [Node 2] [Node 3]                                  │
│ [Node 4] [Node 5]                                           │
└─────────────────────────────────────────────────────────────┘
```

## Code Quality Features

### Clean Code Principles

1. **Single Responsibility**: Each component has a single, well-defined purpose
2. **Descriptive Naming**: Function and variable names clearly indicate their purpose
3. **Modular Design**: Reusable components promote code reuse
4. **Separation of Concerns**: UI logic separated from business logic

### Maintainability

1. **Documented Functions**: JSDoc comments explain function purposes and parameters
2. **Consistent Patterns**: Follows established patterns in the codebase
3. **Reusable Components**: LayerHeader and NodeGrid can be reused elsewhere
4. **Clear State Management**: Centralized state with clear update patterns

### Performance Considerations

1. **Efficient Rendering**: Only renders visible nodes, improving performance with large datasets
2. **Memoized Callbacks**: useCallback prevents unnecessary re-renders
3. **Minimal State Updates**: State changes are batched and optimized
4. **Conditional Rendering**: Reduces DOM complexity when nodes are hidden

## Usage Guidelines

### For Users

1. **Default View**: When opening the Hierarchical Planning tab, all layers are collapsed
2. **Revealing Nodes**: Click "👁️ Show Nodes" to reveal nodes for a specific layer
3. **Hiding Nodes**: Click "🙈 Hide Nodes" to hide nodes for a layer
4. **Independent Control**: Each layer can be toggled independently
5. **Existing Features**: All existing edit, delete, and creation features work as before

### For Developers

1. **State Management**: Use `collapsedLayers` Set to track layer visibility
2. **Toggle Function**: Use `toggleLayerVisibility(layerName)` to change layer state
3. **Check State**: Use `isLayerCollapsed(layerName)` to check if layer is collapsed
4. **Component Reuse**: LayerHeader and NodeGrid components can be reused in other contexts

## Benefits

### User Experience
- **Cleaner Interface**: Reduced visual clutter with collapsed layers
- **Better Organization**: Easier to navigate large hierarchical structures
- **Progressive Disclosure**: Users can focus on relevant layers
- **Maintained Functionality**: All existing features remain accessible

### Technical Benefits
- **Performance**: Improved rendering performance with large node counts
- **Maintainability**: Modular components are easier to maintain and test
- **Extensibility**: Easy to add additional layer-level features
- **Consistency**: Follows established UI patterns and conventions

## Future Enhancements

### Potential Improvements
1. **Bulk Toggle**: "Expand All" / "Collapse All" buttons
2. **Persistent State**: Remember layer states across sessions
3. **Keyboard Navigation**: Arrow keys to navigate between layers
4. **Search Integration**: Auto-expand layers containing search results
5. **Animation**: Smooth expand/collapse animations

### Technical Considerations
1. **Local Storage**: Save layer states to localStorage
2. **URL Parameters**: Include layer states in URL for sharing
3. **Accessibility**: Enhanced ARIA labels and keyboard support
4. **Mobile Optimization**: Touch-friendly toggle controls

## Testing

### Manual Testing Scenarios
1. **Initial Load**: Verify all layers start collapsed
2. **Toggle Functionality**: Test show/hide for each layer
3. **Independent Control**: Verify layers toggle independently
4. **Existing Features**: Confirm edit/delete/create still work
5. **Performance**: Test with large numbers of nodes and layers

### Automated Testing
- Unit tests for toggle functions
- Component tests for LayerHeader and NodeGrid
- Integration tests for layer visibility state
- Performance tests with large datasets

## Conclusion

The Layer Toggle Feature significantly enhances the Hierarchical Planning tab by providing better organization and improved user experience while maintaining all existing functionality. The implementation follows clean code principles, ensures maintainability, and provides a solid foundation for future enhancements. 