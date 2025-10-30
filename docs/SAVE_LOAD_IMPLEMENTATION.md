# Save/Load System Implementation

## Overview

A comprehensive save/load system has been implemented for the node graph editor, allowing users to save their work to local storage and load saved graphs later. The system includes both local storage persistence and file import/export functionality.

## Features

### 1. **Save Graph** (Ctrl/Cmd+S or Save Button)

- Opens a dialog prompting for a graph name
- Saves the current graph configuration to browser local storage
- Includes:
  - All nodes with their types, positions, and custom dimensions
  - All node properties and input values
  - All connections (edges) between nodes
  - Timestamp for organization

### 2. **Load Graph** (Load Button)

- Opens a modal displaying all saved graphs
- Shows graph names and save timestamps
- Sorted by most recent first
- Each graph item displays:
  - Graph name
  - Date and time saved
  - Load button (folder icon)
  - Delete button (trash icon)
- Click anywhere on the graph item to load it
- Loads graph completely replacing the current one

### 3. **Additional Features**

- **Delete Graphs**: Remove unwanted saved graphs from storage
- **Notifications**: Visual feedback for save/load/delete actions
- **Export to File**: Export graphs as JSON files (planned, method exists)
- **Import from File**: Import graphs from JSON files (planned, method exists)
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd+S` - Quick save with custom name dialog

## Implementation Details

### Files Created/Modified

#### New Files:

1. **`/src/ui/SaveLoadManager.ts`**
   - Main class handling all save/load operations
   - Local storage management
   - Modal UI generation
   - Notification system
   - File import/export methods

#### Modified Files:

1. **`/src/ui/GraphEditor.ts`**
   - Integrated SaveLoadManager
   - Added save/load buttons to toolbar
   - Added Ctrl/Cmd+S keyboard shortcut
   - Updated info overlay with new shortcut

2. **`/src/ui/index.ts`**
   - Exported SaveLoadManager for external use

3. **`/src/style.css`**
   - Added comprehensive modal styles
   - Save/load dialog styles
   - Notification toast styles
   - Graph list item styles
   - Animations and transitions

### Data Structure

Saved graphs are stored in local storage with the following structure:

```json
{
  "id": "graph-1234567890",
  "name": "My Graph",
  "timestamp": 1234567890,
  "data": "{...serialized graph JSON...}"
}
```

The serialized graph data includes:

- **version**: Serialization format version
- **nodes**: Array of node data (id, type, label, position, customWidth, customHeight, inputs, properties)
- **edges**: Array of edge data (id, sourceNodeId, sourcePortName, targetNodeId, targetPortName)

### Local Storage Key

All saved graphs are stored under a single key:

- `three-nodes-saved-graphs`

### UI Components

#### Save Dialog

- Modal with input field for graph name
- Pre-filled with timestamp-based default name
- Save/Cancel buttons
- Keyboard navigation (Enter to save, Escape to cancel)

#### Load Modal

- Displays list of all saved graphs
- Each item shows:
  - Graph name (truncated if too long)
  - Save date/time
  - Load and delete action buttons
- Empty state when no graphs are saved
- Scrollable list for many saved graphs

#### Notifications

- Toast-style notifications in top-right corner
- Success (green) and error (red) variants
- Auto-dismiss after 3 seconds
- Slide-in animation

### Graph Loading Process

When a graph is loaded:

1. **Clear Current Graph**: Uses `graph.clear()` to properly dispose of all nodes
2. **Deserialize**: Parse JSON and create new graph structure
3. **Add Nodes**: Add all nodes with their properties and positions
4. **Add Edges**: Restore all connections between nodes
5. **Trigger Update**: Graph change event fires, triggering evaluation and render
6. **Callback**: Optional callback for additional actions (e.g., reset viewport)

### Error Handling

- **Storage Full**: Catches quota exceeded errors and notifies user
- **Corrupted Data**: Catches parse errors and notifies user
- **Missing Nodes**: Warns about unknown node types in console
- **Invalid Files**: Validates imported JSON files

## Usage

### For Users

**To Save a Graph:**

1. Press `Ctrl/Cmd+S` or click the save button (💾) in the toolbar
2. Enter a name for your graph (or use the default)
3. Click "Save"

**To Load a Graph:**

1. Click the load button (📁) in the toolbar
2. Click on a saved graph to load it, or use the folder icon
3. The current graph will be replaced

**To Delete a Graph:**

1. Open the load modal
2. Click the trash icon (🗑️) next to the graph you want to delete
3. Confirm the deletion

### For Developers

**Programmatic Access:**

```typescript
import { SaveLoadManager } from '@/ui/SaveLoadManager';

// Create instance
const saveLoadManager = new SaveLoadManager(graph, registry);

// Save current graph with custom name
saveLoadManager.saveGraph('My Custom Graph');

// Show save dialog
saveLoadManager.showSaveDialog();

// Show load modal
saveLoadManager.showLoadModal();

// Export to file
saveLoadManager.exportToFile();

// Import from file
saveLoadManager.importFromFile();

// Listen to load events
saveLoadManager.onLoad((loadedGraph) => {
  console.log('Graph loaded', loadedGraph);
  // Perform additional actions
});
```

## Browser Compatibility

- **Local Storage**: All modern browsers (IE10+)
- **Storage Limit**: Typically 5-10MB per domain
- **Phosphor Icons**: Used for toolbar and action buttons

## Future Enhancements

Potential improvements:

1. Auto-save functionality
2. Cloud storage integration
3. Graph versioning/history
4. Graph templates library
5. Share graphs via URL
6. Graph thumbnails/previews
7. Export to different formats (PNG, SVG)
8. Import from other node editors

## Notes

- Saved graphs persist across browser sessions
- Clearing browser data will remove saved graphs
- Large graphs with many nodes may approach storage limits
- Node types must exist in registry for successful loading
- Custom node dimensions are preserved
- Selection state is NOT saved (intentional)
