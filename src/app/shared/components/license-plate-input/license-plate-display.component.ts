import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PlateType,
  PlateCategory,
  LicensePlate,
} from '../../../core/models/parking-session.model';
import { PlateTypeConfig, PLATE_TYPES } from './license-plate-input.component';

/**
 * Parses a formatted license plate string and attempts to detect the plate type
 */
export function parseLicensePlate(
  plateString: string,
  suggestedType?: PlateType
): { left: string; right: string; type: PlateType } {
  if (!plateString) {
    return { left: '', right: '', type: suggestedType || PlateType.TUNIS };
  }

  const normalized = plateString.trim();

  // Check for Tunisian plate pattern: "123 تونس 4567"
  const tunisMatch = normalized.match(/^(\d+)\s*تونس\s*(\d+)$/);
  if (tunisMatch) {
    return { left: tunisMatch[1], right: tunisMatch[2], type: PlateType.TUNIS };
  }

  // Check for RS plate pattern: "123456 ن.ت"
  const rsMatch = normalized.match(/^(\d+)\s*ن\.?ت$/);
  if (rsMatch) {
    return { left: rsMatch[1], right: '', type: PlateType.RS };
  }

  // Check for Libya plate pattern: "123456 ليبيا"
  const libyaMatch = normalized.match(/^(\d+)\s*ليبيا$/);
  if (libyaMatch) {
    return { left: libyaMatch[1], right: '', type: PlateType.LIBYA };
  }

  // Check for diplomatic plates
  const diplomaticMatch = normalized.match(/^(\d+)\s*(CMD|CD|MD|PAT|CC|MC)\s*(\d+)$/i);
  if (diplomaticMatch) {
    const typeMap: Record<string, PlateType> = {
      CMD: PlateType.CMD,
      CD: PlateType.CD,
      MD: PlateType.MD,
      PAT: PlateType.PAT,
      CC: PlateType.CC,
      MC: PlateType.MC,
    };
    return {
      left: diplomaticMatch[1],
      right: diplomaticMatch[3],
      type: typeMap[diplomaticMatch[2].toUpperCase()] || PlateType.OTHER,
    };
  }

  // Check for government plates with dash: "123 - 456"
  const govMatch = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
  if (govMatch) {
    return { left: govMatch[1], right: govMatch[2], type: PlateType.GOVERNMENT };
  }

  // Check for standard number pattern: "123 4567"
  const standardMatch = normalized.match(/^(\d+)\s+(\d+)$/);
  if (standardMatch) {
    return {
      left: standardMatch[1],
      right: standardMatch[2],
      type: suggestedType || PlateType.TUNIS,
    };
  }

  // EU or other alphanumeric plates
  if (/^[A-Z0-9\s-]+$/i.test(normalized)) {
    return { left: normalized.toUpperCase(), right: '', type: PlateType.EU };
  }

  // Fallback: treat as single number or use suggested type
  return {
    left: normalized,
    right: '',
    type: suggestedType || PlateType.OTHER,
  };
}

@Component({
  selector: 'app-license-plate-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './license-plate-display.component.html',
  styleUrl: './license-plate-display.component.css'
})
export class LicensePlateDisplayComponent implements OnInit, OnChanges {
  @Input() plate?: LicensePlate;
  @Input() plateNumber?: string;
  @Input() plateType?: PlateType;
  @Input() scale = 1;
  @Input() mini = false;

  config: PlateTypeConfig = PLATE_TYPES[0];
  leftNumber = '';
  rightNumber = '';

  get isDiplomaticPlate(): boolean {
    return [
      PlateType.CMD,
      PlateType.CD,
      PlateType.MD,
      PlateType.PAT,
    ].includes(this.plateType || PlateType.TUNIS);
  }

  get isConsularPlate(): boolean {
    return [PlateType.CC, PlateType.MC].includes(
      this.plateType || PlateType.TUNIS
    );
  }

  ngOnInit(): void {
    this.updateDisplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plate'] || changes['plateNumber'] || changes['plateType']) {
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    if (this.plate) {
      this.plateType = this.plate.type;
      this.leftNumber = this.plate.left || '';
      this.rightNumber = this.plate.right || '';
    } else if (this.plateNumber) {
      const parsed = parseLicensePlate(this.plateNumber, this.plateType);
      this.plateType = parsed.type;
      this.leftNumber = parsed.left;
      this.rightNumber = parsed.right;
    }

    this.config =
      PLATE_TYPES.find((p) => p.type === this.plateType) || PLATE_TYPES[0];
  }
}
