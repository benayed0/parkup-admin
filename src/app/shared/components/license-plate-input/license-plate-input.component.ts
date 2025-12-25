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
  templateUrl: './license-plate-input.component.html',
  styleUrl: './license-plate-input.component.css'
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
