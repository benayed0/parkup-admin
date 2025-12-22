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
  template: `
    <div
      class="plate-display"
      [class.mini]="mini"
      [style.transform]="'scale(' + scale + ')'"
      [style.--plate-color]="config.color"
      [style.--plate-bg]="config.bgColor"
      [class.eu-plate]="plateType === 'eu'"
      [class.government-plate]="plateType === 'government'"
      [class.diplomatic-plate]="isDiplomaticPlate"
      [class.consular-plate]="isConsularPlate"
    >
      @if (plateType === 'eu') {
        <div class="eu-band">
          <span class="eu-stars">★</span>
          <span class="eu-code">EU</span>
        </div>
      }

      <div class="plate-content">
        @if (config.layout === 'standard') {
          <span class="plate-left">{{ leftNumber }}</span>
          <span class="plate-center">{{ config.centerText }}</span>
          <span class="plate-right">{{ rightNumber }}</span>
        } @else if (config.layout === 'single') {
          <span class="plate-number">{{ leftNumber }}</span>
          @if (config.centerText) {
            <span class="plate-suffix">{{ config.centerText }}</span>
          }
        } @else {
          <span class="plate-number">{{ leftNumber }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .plate-display {
        display: inline-flex;
        align-items: center;
        background: var(--plate-bg, #ffffff);
        border: 2px solid #1f2937;
        border-radius: 4px;
        padding: 4px 8px;
        min-height: 32px;
        box-shadow:
          inset 0 1px 2px rgba(0, 0, 0, 0.1),
          0 1px 2px rgba(0, 0, 0, 0.1);
        position: relative;
        transform-origin: left center;
      }

      .plate-display.mini {
        padding: 2px 6px;
        min-height: 24px;
        border-width: 1.5px;
      }

      .plate-display.eu-plate {
        padding-left: 28px;
      }

      .plate-display.mini.eu-plate {
        padding-left: 22px;
      }

      .eu-band {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 22px;
        background: #003399;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        border-radius: 2px 0 0 2px;
      }

      .mini .eu-band {
        width: 18px;
      }

      .eu-stars {
        color: #ffcc00;
        font-size: 7px;
      }

      .eu-code {
        color: #ffffff;
        font-size: 7px;
        font-weight: bold;
      }

      .plate-content {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--plate-color, #000);
        font-family: 'Courier New', monospace;
        font-weight: 700;
        white-space: nowrap;
      }

      .mini .plate-content {
        gap: 4px;
        font-size: 0.75rem;
      }

      .plate-left,
      .plate-right,
      .plate-number {
        font-size: 0.875rem;
        letter-spacing: 1px;
      }

      .mini .plate-left,
      .mini .plate-right,
      .mini .plate-number {
        font-size: 0.688rem;
      }

      .plate-center,
      .plate-suffix {
        font-family: 'Arial', sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .mini .plate-center,
      .mini .plate-suffix {
        font-size: 0.625rem;
      }

      /* Government plate special styling */
      .government-plate {
        background: linear-gradient(to bottom, #dc2626 50%, #ffffff 50%);
      }

      .government-plate .plate-content {
        color: #000;
        text-shadow: 0 0 1px rgba(255, 255, 255, 0.8);
      }
    `,
  ],
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
