// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IAdapterForMerge } from "./AdapterMergeTypes";

// DRY: Centralized validation logic to avoid repetition
export class MergeValidationUtils {
  // KISS: Simple validation with clear error messages
  static validateMergeRequest(
    adapters: IAdapterForMerge[],
    outputName: string
  ): string | null {
    const selectedAdapters = adapters.filter((a) => a.selected);

    if (selectedAdapters.length < 2) {
      return "Selecione pelo menos 2 adapters para fusão";
    }

    if (!this.isValidOutputName(outputName)) {
      return "Insira um nome válido para o adapter merged";
    }

    const compatibilityError = this.validateCompatibility(selectedAdapters);
    if (compatibilityError) {
      return compatibilityError;
    }

    return null;
  }

  // SRP: Single responsibility for name validation
  private static isValidOutputName(name: string): boolean {
    return name.trim().length > 0 && name.trim().length <= 50;
  }

  // SRP: Single responsibility for adapter compatibility
  private static validateCompatibility(
    adapters: IAdapterForMerge[]
  ): string | null {
    const baseModels = [...new Set(adapters.map((a) => a.baseModel))];

    if (baseModels.length > 1) {
      return `Adapters incompatíveis - Base models diferentes: ${baseModels.join(
        ", "
      )}`;
    }

    return null;
  }

  // KISS: Simple weight validation
  static validateWeight(weight: number): number {
    return Math.max(0.1, Math.min(2.0, weight));
  }

  // DRY: Reusable adapter selection logic
  static toggleAdapterSelection(
    adapters: IAdapterForMerge[],
    index: number
  ): IAdapterForMerge[] {
    const updated = [...adapters];
    updated[index].selected = !updated[index].selected;
    return updated;
  }

  // DRY: Reusable weight update logic
  static updateAdapterWeight(
    adapters: IAdapterForMerge[],
    index: number,
    weight: number
  ): IAdapterForMerge[] {
    const updated = [...adapters];
    updated[index].weight = this.validateWeight(weight);
    return updated;
  }
}
