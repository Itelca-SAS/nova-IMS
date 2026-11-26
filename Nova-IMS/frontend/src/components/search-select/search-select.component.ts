import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

function foldSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export interface SearchSelectOption {
  id: string | number;
  name: string;
}

export function filterSearchOptions<T extends SearchSelectOption>(options: T[], rawQuery: string): T[] {
  const query = foldSearchText(rawQuery).trim();
  if (!query) return options;
  const starts: T[] = [];
  const contains: T[] = [];
  for (const option of options) {
    const name = foldSearchText(option.name);
    if (name.startsWith(query)) starts.push(option);
    else if (name.includes(query)) contains.push(option);
  }
  return [...starts, ...contains];
}

let nextId = 0;

@Component({
  selector: 'app-search-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true },
  ],
  templateUrl: './search-select.component.html',
  styleUrl: './search-select.component.css',
})
export class SearchSelectComponent implements ControlValueAccessor {
  options = input<SearchSelectOption[]>([]);
  placeholder = input('Seleccione…');
  emptyText = input('No hay opciones');
  inputId = input<string | null>(null);
  invalid = input(false);
  locked = input(false);

  readonly listId = `search-select-${nextId++}`;

  private readonly value = signal<string>('');
  private readonly formDisabled = signal(false);
  readonly query = signal('');
  readonly typing = signal(false);
  readonly open = signal(false);
  readonly active = signal(0);

  readonly isDisabled = computed(() => this.formDisabled() || this.locked());

  readonly selectedName = computed(() => {
    const value = this.value();
    if (!value) return '';
    return this.options().find((option) => String(option.id) === value)?.name ?? '';
  });

  readonly text = computed(() => (this.typing() ? this.query() : this.selectedName()));

  readonly filtered = computed(() =>
    filterSearchOptions(this.options(), this.typing() ? this.query() : ''),
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: unknown): void {
    this.value.set(value == null ? '' : String(value));
    this.typing.set(false);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  isSelected(option: SearchSelectOption): boolean {
    return String(option.id) === this.value();
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
    this.openList();
  }

  openList(): void {
    if (this.isDisabled() || this.open()) return;
    const index = this.filtered().findIndex((option) => this.isSelected(option));
    this.active.set(Math.max(0, index));
    this.open.set(true);
    this.scrollActiveIntoView();
  }

  onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.typing.set(true);
    this.active.set(0);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.filtered().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) return this.openList();
        if (count) this.active.set((this.active() + 1) % count);
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.set((this.active() - 1 + count) % count);
        this.scrollActiveIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        if (!this.open()) return this.openList();
        const option = this.filtered()[this.active()];
        if (option) this.choose(option);
        break;
      }
      case 'Tab': {
        const option = this.open() && this.typing() ? this.filtered()[this.active()] : undefined;
        if (option) this.choose(option);
        break;
      }
      case 'Escape':
        if (!this.open()) return;
        event.preventDefault();
        this.close();
        break;
    }
  }

  onBlur(): void {
    if (this.typing() && !this.query().trim() && this.value()) {
      this.commit('');
    }
    this.close();
    this.onTouched();
  }

  choose(option: SearchSelectOption): void {
    this.commit(String(option.id));
    this.close();
  }

  private commit(value: string): void {
    if (value !== this.value()) {
      this.value.set(value);
      this.onChange(value);
    }
  }

  private close(): void {
    this.open.set(false);
    this.typing.set(false);
    this.query.set('');
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() =>
      document.getElementById(`${this.listId}-${this.active()}`)?.scrollIntoView({ block: 'nearest' }),
    );
  }
}
