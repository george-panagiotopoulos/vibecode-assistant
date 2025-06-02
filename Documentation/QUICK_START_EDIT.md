# Quick Start Guide: Edit Functionality

## Prerequisites

1. **Backend Running**: Ensure the Flask backend is running on `http://localhost:5000`
2. **Frontend Running**: Ensure the React frontend is running on `http://localhost:3000`
3. **Neo4j Database**: Ensure Neo4j is running and accessible

## Starting the Application

### Option 1: Start Both Services
```bash
npm run start
```

### Option 2: Start Services Separately
```bash
# Terminal 1 - Backend
npm run start:backend

# Terminal 2 - Frontend  
npm run start:frontend
```

## Testing the Edit Functionality

### 1. Access the Hierarchical Planning View
1. Open your browser to `http://localhost:3000`
2. Navigate to "🏗️ Hierarchical Planning" in the sidebar

### 2. Create Sample Data (if needed)
1. Click "📊 Load Sample Data" to populate the graph with test data
2. Or create your own layers and nodes using the "📚 Add Layer" and "➕ Add Node" buttons

### 3. Test Node Editing
1. **Locate a Node**: Find any node card in the hierarchical view
2. **Click Edit Button**: Click the ✏️ (edit) button in the top-right corner of the node card
3. **Modify Properties**: 
   - Change the name
   - Update the description
   - Move to a different layer
   - Change the type
4. **Save Changes**: Click "Update Node"
5. **Verify**: The changes should be immediately visible in the UI

### 4. Test Layer Editing
1. **Locate a Layer**: Find any layer header in the hierarchical view
2. **Click Edit Button**: Click the ✏️ (edit) button in the layer header
3. **Modify Properties**:
   - Change the layer name
   - Add or update the description
4. **Save Changes**: Click "Update Layer"
5. **Verify**: The layer name should update, and all nodes in that layer should reflect the new layer name

### 5. Test Error Handling
1. **Try Invalid Data**: Attempt to rename a layer to an existing layer name
2. **Empty Fields**: Try to save with empty required fields
3. **Network Issues**: Disconnect from the internet and try to edit (should show error)

## Automated Testing

Run the automated test script to verify all functionality:

```bash
# Make sure you're in the project root directory
python scripts/test_edit_functionality.py
```

This script will:
- Test API connectivity
- Create test layers and nodes
- Test updating both layers and nodes
- Test error handling scenarios
- Clean up test data

## Expected Behavior

### Node Editing
- ✅ Edit button appears on hover over node cards
- ✅ Modal opens with current node data pre-filled
- ✅ Node ID field is disabled (read-only)
- ✅ Changes are saved to the database
- ✅ UI updates immediately after saving
- ✅ Error messages appear for invalid data

### Layer Editing
- ✅ Edit button appears in layer headers
- ✅ Modal opens with current layer data
- ✅ Layer renaming updates all associated nodes
- ✅ Changes are saved to the database
- ✅ UI updates immediately after saving
- ✅ Error messages appear for duplicate names

### Real-time Updates
- ✅ Changes appear immediately in the UI
- ✅ Node counts update when nodes move between layers
- ✅ Relationships are preserved during edits
- ✅ Loading states show during operations

## Troubleshooting

### Edit Buttons Not Visible
- **Check**: Browser console for JavaScript errors
- **Solution**: Refresh the page, ensure both frontend and backend are running

### Updates Not Saving
- **Check**: Network tab in browser dev tools for failed API calls
- **Solution**: Verify backend is running and Neo4j is accessible

### Modal Not Opening
- **Check**: Browser console for React errors
- **Solution**: Refresh the page, check for conflicting CSS

### Database Errors
- **Check**: Backend logs for Neo4j connection issues
- **Solution**: Ensure Neo4j is running and credentials are correct

## Features Demonstrated

1. **Intuitive UI**: Edit buttons are clearly visible and accessible
2. **Real-time Updates**: Changes are immediately reflected in the interface
3. **Data Integrity**: Node relationships are preserved during edits
4. **Error Handling**: User-friendly error messages for invalid operations
5. **Performance**: Updates are fast and responsive
6. **Validation**: Proper input validation prevents data corruption

## Next Steps

After testing the basic functionality, you can:

1. **Create Complex Graphs**: Build larger hierarchies to test performance
2. **Test Edge Cases**: Try various combinations of edits and updates
3. **Explore Integration**: Test how edits work with other features like graph visualization
4. **Performance Testing**: Create large datasets and test edit responsiveness

## Support

If you encounter any issues:

1. **Check Documentation**: Refer to `Documentation/EDIT_FUNCTIONALITY.md` for detailed information
2. **Run Tests**: Use the automated test script to verify functionality
3. **Check Logs**: Review browser console and backend logs for errors
4. **Report Issues**: Document any bugs or unexpected behavior

---

*This quick start guide helps you get up and running with the new edit functionality. For comprehensive documentation, see the full edit functionality documentation.* 