#!/usr/bin/env python3
"""
Automatically add type safety parameters to all Node classes.

This script:
1. Scans all .ts files in src/three/nodes/
2. Parses each file to extract input/output port names from addInput/addOutput calls
3. Injects generic type parameters into the class declaration
4. Handles special cases (no inputs = never, dynamic ports = string)
"""

import re
import os
from pathlib import Path
from typing import List, Tuple, Optional

def extract_port_names(file_content: str, method: str) -> List[str]:
    """Extract port names from addInput() or addOutput() calls."""
    # Match patterns like: this.addInput({ name: 'portName', ...
    pattern = rf"this\.{method}\({{\s*name:\s*['\"](\w+)['\"]"
    matches = re.findall(pattern, file_content)
    return matches

def get_base_class(file_content: str) -> Optional[str]:
    """Extract the base class name (BaseThreeNode, TweakpaneNode, etc.)."""
    # Match: export class NodeName extends BaseClassName
    match = re.search(r'export class \w+ extends (\w+)', file_content)
    return match.group(1) if match else None

def get_class_name(file_content: str) -> Optional[str]:
    """Extract the class name."""
    match = re.search(r'export class (\w+) extends', file_content)
    return match.group(1) if match else None

def has_type_parameters(file_content: str) -> bool:
    """Check if the class already has type parameters."""
    return bool(re.search(r'extends \w+<[^>]+>', file_content))

def format_type_union(names: List[str]) -> str:
    """Format port names as TypeScript union type."""
    if not names:
        return 'never'
    if len(names) == 1:
        return f"'{names[0]}'"
    return ' | '.join(f"'{name}'" for name in names)

def inject_type_parameters(file_content: str, inputs: List[str], outputs: List[str]) -> str:
    """Inject type parameters into the class declaration."""
    input_type = format_type_union(inputs)
    output_type = format_type_union(outputs)
    
    # Match: export class NodeName extends BaseClass {
    # Replace with: export class NodeName extends BaseClass<TInputs, TOutputs> {
    
    # First, check if already has type parameters
    if has_type_parameters(file_content):
        print("  ⚠️  Already has type parameters, skipping")
        return file_content
    
    pattern = r'(export class \w+ extends \w+)(\s*{)'
    replacement = rf'\1<\n  {input_type},\n  {output_type}\n>\2'
    
    modified = re.sub(pattern, replacement, file_content)
    
    if modified == file_content:
        print("  ⚠️  Could not find class declaration pattern")
        return file_content
    
    return modified

def is_dynamic_ports_node(class_name: str) -> bool:
    """Check if this is a node with dynamically added ports."""
    dynamic_nodes = ['MergeNode', 'SplitNode']
    return class_name in dynamic_nodes

def process_file(file_path: Path) -> bool:
    """Process a single TypeScript file. Returns True if modified."""
    try:
        content = file_path.read_text()
        
        # Skip if no class export
        class_name = get_class_name(content)
        if not class_name:
            return False
        
        base_class = get_base_class(content)
        if not base_class:
            return False
        
        # Skip base classes themselves
        if class_name in ['Node', 'BaseThreeNode', 'TweakpaneNode']:
            return False
        
        # Skip if already has type parameters
        if has_type_parameters(content):
            print(f"✓ {file_path.name} - already typed")
            return False
        
        print(f"Processing {file_path.name}...")
        
        # Handle dynamic port nodes specially
        if is_dynamic_ports_node(class_name):
            inputs = ['string']  # Dynamic inputs use string
            outputs = extract_port_names(content, 'addOutput')
            if class_name == 'SplitNode':
                outputs = ['string']  # Dynamic outputs
            print(f"  📌 Dynamic ports node")
        else:
            # Extract port names from constructor
            inputs = extract_port_names(content, 'addInput')
            outputs = extract_port_names(content, 'addOutput')
        
        print(f"  Inputs: {inputs if inputs else 'none'}")
        print(f"  Outputs: {outputs if outputs else 'none'}")
        
        # Inject type parameters
        modified_content = inject_type_parameters(content, inputs, outputs)
        
        if modified_content != content:
            file_path.write_text(modified_content)
            print(f"  ✅ Added type parameters: <{format_type_union(inputs)}, {format_type_union(outputs)}>")
            return True
        else:
            print(f"  ⚠️  No changes made")
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Main entry point."""
    # Find all node files
    project_root = Path(__file__).parent.parent
    nodes_dir = project_root / 'src' / 'three' / 'nodes'
    
    if not nodes_dir.exists():
        print(f"❌ Nodes directory not found: {nodes_dir}")
        return
    
    print(f"🔍 Scanning {nodes_dir}...\n")
    
    # Find all .ts files recursively
    ts_files = list(nodes_dir.rglob('*.ts'))
    print(f"Found {len(ts_files)} TypeScript files\n")
    
    modified_count = 0
    skipped_count = 0
    
    for file_path in sorted(ts_files):
        relative_path = file_path.relative_to(nodes_dir)
        print(f"\n📄 {relative_path}")
        
        if process_file(file_path):
            modified_count += 1
        else:
            skipped_count += 1
    
    print("\n" + "="*60)
    print(f"✅ Modified: {modified_count} files")
    print(f"⏭️  Skipped: {skipped_count} files")
    print(f"📊 Total: {len(ts_files)} files")
    print("="*60)
    
    if modified_count > 0:
        print("\n⚠️  Run 'npm run build' to verify changes!")

if __name__ == '__main__':
    main()

