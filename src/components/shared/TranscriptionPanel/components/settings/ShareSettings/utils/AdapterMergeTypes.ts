// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ISP: Interface segregation - specific interfaces for each responsibility

export interface IAdapterForMerge {
  name: string;
  path: string;
  baseModel: string;
  checksum: string;
  weight: number;
  selected: boolean;
  from: string;
}

export interface IMergeStrategy {
  value: "arithmetic_mean" | "weighted_average" | "svd_merge";
  label: string;
  description: string;
}

export interface IMergedAdapterInfo {
  name: string;
  path: string;
  metadata: {
    sourceAdapters: Array<{
      id: string;
      name: string;
      baseModel: string;
      checksum: string;
      timestamp: string;
      author?: string;
      peers?: number;
    }>;
    mergeStrategy: string;
    mergeTimestamp: string;
    mergedBy: string;
    targetBaseModel: string;
    mergedAdapterPath: string;
    mergedChecksum: string;
  };
}

export interface IMergeRequest {
  adapters: Array<{
    name: string;
    path: string;
    baseModel: string;
    checksum: string;
    weight?: number;
  }>;
  strategy: IMergeStrategy["value"];
  outputName: string;
  targetBaseModel: string;
}

// ISP: Separate interface for merge operations
export interface IMergeOperations {
  mergeLoRAAdapters(
    request: IMergeRequest
  ): Promise<{ success: boolean; error?: string }>;
  listMergedAdapters(): Promise<{
    success: boolean;
    adapters: IMergedAdapterInfo[];
  }>;
  shareMergedAdapter(
    name: string
  ): Promise<{ success: boolean; error?: string }>;
  removeMergedAdapter(
    name: string
  ): Promise<{ success: boolean; error?: string }>;
}

// ISP: Separate interface for adapter listing
export interface IAdapterListOperations {
  onDownload: (adapter: any) => void;
  adapters: any[];
  currentRoom: any;
  isSharing: boolean;
}

export const MERGE_STRATEGIES: IMergeStrategy[] = [
  {
    value: "arithmetic_mean",
    label: "Média Aritmética",
    description: "Média simples dos deltas LoRA",
  },
  {
    value: "weighted_average",
    label: "Média Ponderada",
    description: "Pesos personalizados para cada adapter",
  },
  {
    value: "svd_merge",
    label: "Fusão SVD",
    description: "Preservação de rank via SVD",
  },
];
