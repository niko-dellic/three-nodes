# Data Loader Nodes

This document describes the JSON and CSV loader nodes added to the three-nodes project.

## Overview

Two new data loader nodes have been added to enable loading and parsing data files:

1. **JSON Loader Node** - Loads and parses JSON files
2. **CSV Loader Node** - Loads and parses CSV files using D3.js

## JSON Loader Node

### Location

`src/three/nodes/loaders/JSONLoaderNode.ts`

### Outputs

- `data` (Any): The parsed JSON data as a JavaScript object
- `loaded` (Boolean): True when a file is successfully loaded

### Usage

1. Add the "JSON Loader" node to your graph (found in the "Loaders" category)
2. Click the "Load JSON" button to select a `.json` file from your computer
3. The parsed JSON data will be available on the `data` output
4. Use the `loaded` output to check if data has been successfully loaded
5. Click "Clear" to remove the loaded file and reset outputs

### Example Use Cases

- Loading configuration files
- Processing structured data
- Importing pre-computed values
- Loading scene metadata

## CSV Loader Node

### Location

`src/three/nodes/loaders/CSVLoaderNode.ts`

### Outputs

- `data` (Any): Array of objects representing CSV rows
- `columns` (Any): Array of column names from the CSV header
- `loaded` (Boolean): True when a file is successfully loaded

### Usage

1. Add the "CSV Loader" node to your graph (found in the "Loaders" category)
2. Click the "Load CSV" button to select a `.csv` file from your computer
3. The parsed CSV data will be available as an array of objects on the `data` output
4. Column names are available on the `columns` output
5. Use the `loaded` output to check if data has been successfully loaded
6. Click "Clear" to remove the loaded file and reset outputs

### CSV Parsing

The CSV loader uses D3.js (`d3.csv`) for parsing, which:

- Automatically detects the header row
- Converts each row into a JavaScript object with column names as keys
- Handles quoted fields and escaped characters
- Preserves all values as strings (no automatic type conversion)

### Example Use Cases

- Loading tabular data for visualization
- Processing measurement data
- Importing point cloud coordinates
- Loading animation keyframes

## Implementation Details

### Architecture

Both loaders follow the existing loader pattern established by `BaseFileLoaderNode`:

- Use `FilePickerHelper` for consistent file selection UI
- Implement async file loading with proper error handling
- Trigger graph evaluation after successful load
- Support clearing loaded data
- Automatic UI refresh on file selection/clearing

### Dependencies

- **JSON Loader**: Native browser APIs (fetch, JSON.parse)
- **CSV Loader**: D3.js library (already included in the project)

### Registration

Both nodes are registered in the "Loaders" category:

- JSON Loader: Icon 📋
- CSV Loader: Icon 📊

## Future Enhancements

Potential improvements for these loaders:

1. Add data preview in the node UI
2. CSV type inference/conversion options
3. Support for custom CSV delimiters
4. JSON schema validation
5. Large file streaming support
6. Data caching and re-loading
