import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import {
  PlateType,
  PlateCategory,
  LicensePlate,
} from '../../../core/models/parking-session.model';

export interface PlateTypeConfig {
  type: PlateType;
  label: string;
  shortLabel: string;
  category: PlateCategory;
  color: string;
  bgColor: string;
  layout: 'standard' | 'single' | 'alphanumeric';
  centerText?: string;
}

export const PLATE_TYPES: PlateTypeConfig[] = [
  {
    type: PlateType.TUNIS,
    label: 'Tunisie',
    shortLabel: 'تونس',
    category: PlateCategory.REGULAR,
    color: '#000000',
    bgColor: '#FFFFFF',
    layout: 'standard',
    centerText: 'تونس',
  },
  {
    type: PlateType.RS,
    label: 'Regime Suspensif',
    shortLabel: 'ن.ت',
    category: PlateCategory.REGULAR,
    color: '#000000',
    bgColor: '#FFFFFF',
    layout: 'single',
    centerText: 'ن.ت',
  },
  {
    type: PlateType.GOVERNMENT,
    label: 'Gouvernement',
    shortLabel: 'GOV',
    category: PlateCategory.GOVERNMENT,
    color: '#FFFFFF',
    bgColor: '#DC2626',
    layout: 'standard',
    centerText: '-',
  },
  {
    type: PlateType.LIBYA,
    label: 'Libye',
    shortLabel: 'ليبيا',
    category: PlateCategory.LIBYA,
    color: '#000000',
    bgColor: '#FFFFFF',
    layout: 'single',
    centerText: 'ليبيا',
  },
  {
    type: PlateType.ALGERIA,
    label: 'Algerie',
    shortLabel: 'DZ',
    category: PlateCategory.ALGERIA,
    color: '#000000',
    bgColor: '#FDE047',
    layout: 'single',
  },
  {
    type: PlateType.EU,
    label: 'Union Europeenne',
    shortLabel: 'EU',
    category: PlateCategory.EU,
    color: '#000000',
    bgColor: '#FFFFFF',
    layout: 'alphanumeric',
  },
  {
    type: PlateType.CMD,
    label: 'Chef de Mission',
    shortLabel: 'CMD',
    category: PlateCategory.DIPLOMATIC,
    color: '#FFFFFF',
    bgColor: '#1E40AF',
    layout: 'standard',
    centerText: 'CMD',
  },
  {
    type: PlateType.CD,
    label: 'Corps Diplomatique',
    shortLabel: 'CD',
    category: PlateCategory.DIPLOMATIC,
    color: '#FFFFFF',
    bgColor: '#1E40AF',
    layout: 'standard',
    centerText: 'CD',
  },
  {
    type: PlateType.MD,
    label: 'Mission Diplomatique',
    shortLabel: 'MD',
    category: PlateCategory.DIPLOMATIC,
    color: '#FFFFFF',
    bgColor: '#1E40AF',
    layout: 'standard',
    centerText: 'MD',
  },
  {
    type: PlateType.PAT,
    label: 'Personnel Admin. Tech.',
    shortLabel: 'PAT',
    category: PlateCategory.DIPLOMATIC,
    color: '#FFFFFF',
    bgColor: '#1E40AF',
    layout: 'standard',
    centerText: 'PAT',
  },
  {
    type: PlateType.CC,
    label: 'Corps Consulaire',
    shortLabel: 'CC',
    category: PlateCategory.CONSULAR,
    color: '#FFFFFF',
    bgColor: '#059669',
    layout: 'standard',
    centerText: 'CC',
  },
  {
    type: PlateType.MC,
    label: 'Mission Consulaire',
    shortLabel: 'MC',
    category: PlateCategory.CONSULAR,
    color: '#FFFFFF',
    bgColor: '#059669',
    layout: 'standard',
    centerText: 'MC',
  },
  {
    type: PlateType.OTHER,
    label: 'Autre',
    shortLabel: '...',
    category: PlateCategory.OTHER,
    color: '#000000',
    bgColor: '#E5E7EB',
    layout: 'alphanumeric',
  },
];

@Component({
  selector: 'app-license-plate-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LicensePlateInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="license-plate-input">
      @if (label) {
        <label class="input-label">{{ label }}</label>
      }

      <!-- Type Selector -->
      @if (showTypeSelector) {
        <div class="type-selector" [class.compact]="compactTypeSelector">
          @for (config of plateTypes; track config.type) {
            <button
              type="button"
              class="type-btn"
              [class.active]="selectedType === config.type"
              [style.--plate-color]="config.color"
              [style.--plate-bg]="config.bgColor"
              (click)="selectType(config.type)"
              [title]="config.label"
            >
              <span class="type-label">{{ config.shortLabel }}</span>
            </button>
          }
        </div>
      }

      <!-- Plate Input Preview -->
      <div
        class="plate-container"
        [style.--plate-color]="currentConfig.color"
        [style.--plate-bg]="currentConfig.bgColor"
        [class.eu-plate]="selectedType === 'eu'"
        [class.government-plate]="selectedType === 'government'"
        [class.diplomatic-plate]="isDiplomaticPlate"
        [class.consular-plate]="isConsularPlate"
      >
        @if (selectedType === 'eu') {
          <div class="eu-band">
            <span class="eu-stars">★</span>
            <span class="eu-code">EU</span>
          </div>
        }

        <div class="plate-inputs" [class.single-input]="currentConfig.layout === 'single' || currentConfig.layout === 'alphanumeric'">
          @if (currentConfig.layout === 'standard') {
            <input
              type="text"
              class="plate-input left"
              [placeholder]="leftPlaceholder"
              [(ngModel)]="leftValue"
              (ngModelChange)="onInputChange()"
              [maxlength]="4"
              inputmode="numeric"
              pattern="[0-9]*"
            />
            <div class="plate-center">
              {{ currentConfig.centerText }}
            </div>
            <input
              type="text"
              class="plate-input right"
              [placeholder]="rightPlaceholder"
              [(ngModel)]="rightValue"
              (ngModelChange)="onInputChange()"
              [maxlength]="4"
              inputmode="numeric"
              pattern="[0-9]*"
            />
          } @else if (currentConfig.layout === 'single') {
            <input
              type="text"
              class="plate-input full"
              [placeholder]="singlePlaceholder"
              [(ngModel)]="leftValue"
              (ngModelChange)="onInputChange()"
              [maxlength]="8"
              inputmode="numeric"
              pattern="[0-9]*"
            />
            @if (currentConfig.centerText) {
              <div class="plate-suffix">{{ currentConfig.centerText }}</div>
            }
          } @else {
            <input
              type="text"
              class="plate-input alphanumeric"
              placeholder="ABC 123"
              [(ngModel)]="leftValue"
              (ngModelChange)="onInputChange()"
              [maxlength]="12"
            />
          }
        </div>
      </div>

      <!-- Formatted Output Preview -->
      @if (showPreview && formattedPlate) {
        <div class="plate-preview">
          <span class="preview-label">Apercu:</span>
          <span class="preview-value">{{ formattedPlate }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .license-plate-input {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .input-label {
        font-size: 0.813rem;
        color: var(--app-text-secondary);
        margin-bottom: 4px;
      }

      /* Type Selector */
      .type-selector {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: var(--spacing-sm);
      }

      .type-selector.compact {
        gap: 4px;
      }

      .type-btn {
        padding: 6px 10px;
        border: 2px solid transparent;
        border-radius: var(--radius-sm);
        background: var(--plate-bg, #fff);
        color: var(--plate-color, #000);
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 40px;
        text-align: center;
      }

      .type-selector.compact .type-btn {
        padding: 4px 8px;
        font-size: 0.688rem;
      }

      .type-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .type-btn.active {
        border-color: var(--color-secondary);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      }

      /* Plate Container */
      .plate-container {
        display: flex;
        align-items: center;
        background: var(--plate-bg, #ffffff);
        border: 3px solid #1f2937;
        border-radius: 6px;
        padding: 8px 12px;
        min-height: 52px;
        box-shadow:
          inset 0 1px 2px rgba(0, 0, 0, 0.1),
          0 2px 4px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
      }

      .plate-container.eu-plate {
        padding-left: 40px;
      }

      .eu-band {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 32px;
        background: #003399;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }

      .eu-stars {
        color: #ffcc00;
        font-size: 10px;
      }

      .eu-code {
        color: #ffffff;
        font-size: 10px;
        font-weight: bold;
      }

      .plate-inputs {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        justify-content: center;
      }

      .plate-inputs.single-input {
        justify-content: center;
      }

      .plate-input {
        border: none;
        background: transparent;
        color: var(--plate-color, #000);
        font-family: 'Courier New', monospace;
        font-size: 1.25rem;
        font-weight: 700;
        text-align: center;
        outline: none;
        letter-spacing: 2px;
      }

      .plate-input::placeholder {
        color: var(--plate-color, #000);
        opacity: 0.3;
      }

      .plate-input.left,
      .plate-input.right {
        width: 80px;
      }

      .plate-input.full {
        width: 120px;
      }

      .plate-input.alphanumeric {
        width: 160px;
        text-transform: uppercase;
      }

      .plate-center {
        font-family: 'Arial', sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: var(--plate-color, #000);
        padding: 0 8px;
        white-space: nowrap;
      }

      .plate-suffix {
        font-family: 'Arial', sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: var(--plate-color, #000);
        margin-left: 8px;
      }

      /* Special plate styles */
      .government-plate {
        background: #ffffff;
        border-color: #dc2626;
        position: relative;
      }

      .government-plate::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 8px;
        background: #dc2626;
      }

      .government-plate .plate-input,
      .government-plate .plate-center {
        color: #dc2626;
        font-weight: 800;
      }

      .government-plate .plate-input::placeholder {
        color: #dc2626;
        opacity: 0.4;
      }

      .diplomatic-plate,
      .consular-plate {
        border-color: #000;
      }

      /* Preview */
      .plate-preview {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        background: var(--app-surface-variant);
        border-radius: var(--radius-sm);
        font-size: 0.813rem;
      }

      .preview-label {
        color: var(--app-text-secondary);
      }

      .preview-value {
        font-family: monospace;
        font-weight: 600;
        color: var(--app-text-primary);
        letter-spacing: 1px;
      }

      @media (max-width: 480px) {
        .type-selector {
          justify-content: center;
        }

        .plate-input {
          font-size: 1rem;
        }

        .plate-input.left,
        .plate-input.right {
          width: 60px;
        }
      }
    `,
  ],
})
export class LicensePlateInputComponent
  implements OnInit, OnChanges, ControlValueAccessor
{
  @Input() label?: string;
  @Input() initialValue?: LicensePlate;
  @Input() showTypeSelector = true;
  @Input() compactTypeSelector = true;
  @Input() showPreview = false;
  @Input() leftPlaceholder = '123';
  @Input() rightPlaceholder = '4567';
  @Input() singlePlaceholder = '123456';

  @Output() plateChange = new EventEmitter<LicensePlate>();

  plateTypes = PLATE_TYPES;
  selectedType: PlateType = PlateType.TUNIS;
  leftValue = '';
  rightValue = '';

  // ControlValueAccessor
  private onChange: (value: LicensePlate) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  get currentConfig(): PlateTypeConfig {
    return (
      this.plateTypes.find((p) => p.type === this.selectedType) ||
      this.plateTypes[0]
    );
  }

  get isDiplomaticPlate(): boolean {
    return [
      PlateType.CMD,
      PlateType.CD,
      PlateType.MD,
      PlateType.PAT,
    ].includes(this.selectedType);
  }

  get isConsularPlate(): boolean {
    return [PlateType.CC, PlateType.MC].includes(this.selectedType);
  }

  get formattedPlate(): string {
    return this.formatPlate();
  }

  get currentPlate(): LicensePlate {
    return {
      type: this.selectedType,
      category: this.currentConfig.category,
      left: this.leftValue || undefined,
      right: this.rightValue || undefined,
      formatted: this.formattedPlate,
    };
  }

  get isEmpty(): boolean {
    if (this.currentConfig.layout === 'single' || this.currentConfig.layout === 'alphanumeric') {
      return !this.leftValue?.trim();
    }
    return !this.leftValue?.trim() && !this.rightValue?.trim();
  }

  ngOnInit(): void {
    if (this.initialValue) {
      this.setPlateValue(this.initialValue);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] && this.initialValue) {
      this.setPlateValue(this.initialValue);
    }
  }

  selectType(type: PlateType): void {
    this.selectedType = type;
    // Clear right value for single-input layouts
    if (
      this.currentConfig.layout === 'single' ||
      this.currentConfig.layout === 'alphanumeric'
    ) {
      this.rightValue = '';
    }
    this.emitChange();
  }

  onInputChange(): void {
    this.emitChange();
  }

  private setPlateValue(plate: LicensePlate): void {
    this.selectedType = plate.type;
    this.leftValue = plate.left || '';
    this.rightValue = plate.right || '';
  }

  private formatPlate(): string {
    const config = this.currentConfig;
    const left = this.leftValue?.trim() || '';
    const right = this.rightValue?.trim() || '';

    if (!left && !right) return '';

    switch (config.layout) {
      case 'standard':
        if (left && right) {
          return `${left} ${config.centerText || ''} ${right}`.trim();
        } else if (left) {
          return `${left} ${config.centerText || ''}`.trim();
        } else if (right) {
          return `${config.centerText || ''} ${right}`.trim();
        }
        return '';

      case 'single':
        if (config.centerText) {
          return `${left} ${config.centerText}`.trim();
        }
        return left;

      case 'alphanumeric':
        return left.toUpperCase();

      default:
        return left;
    }
  }

  private emitChange(): void {
    const plate = this.currentPlate;
    this.plateChange.emit(plate);
    this.onChange(plate);
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: LicensePlate | null): void {
    if (value) {
      this.setPlateValue(value);
    } else {
      this.leftValue = '';
      this.rightValue = '';
      this.selectedType = PlateType.TUNIS;
    }
  }

  registerOnChange(fn: (value: LicensePlate) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
