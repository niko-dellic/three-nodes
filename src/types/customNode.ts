import { PortDefinition } from '@/types';
import { PropertyConfig } from '@/core/types';

/**
 * Custom node definition structure for storage and serialization
 */
export interface CustomNodeDefinition {
  id: string;
  name: string; // Unique identifier/type name (e.g., "MyCustomNode")
  label: string; // Display name
  category: string;
  icon?: string;
  description?: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  properties: PropertyConfig[];
  evaluateCode: string; // User's evaluate function body as string
  version: string; // For future compatibility
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

/**
 * Storage format for custom nodes in localStorage
 */
export interface CustomNodeStorage {
  version: string;
  nodes: CustomNodeDefinition[];
}

/**
 * Result type for custom node operations
 */
export interface CustomNodeOperationResult {
  success: boolean;
  message?: string;
  error?: string;
  nodeId?: string;
}

/**
 * AI generation request
 */
export interface AIGenerationRequest {
  description: string;
  provider: 'openai' | 'anthropic';
  mode: 'full' | 'code-only';
  existingInputs?: PortDefinition[];
  existingOutputs?: PortDefinition[];
  existingProperties?: PropertyConfig[];
}

/**
 * AI generation response
 */
export interface AIGenerationResponse {
  success: boolean;
  code?: string;
  error?: string;
  nodeStructure?: {
    name?: string;
    label?: string;
    category?: string;
    inputs?: PortDefinition[];
    outputs?: PortDefinition[];
    properties?: PropertyConfig[];
  };
}

/**
 * API key storage
 */
export interface APIKeyStorage {
  openai?: string;
  anthropic?: string;
}

