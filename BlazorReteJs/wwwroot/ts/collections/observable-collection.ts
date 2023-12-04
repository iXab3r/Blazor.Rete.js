import {DotnetObjectReference} from "../scaffolding/dotnet-object-reference";

export enum ListChangeReason {
    Add,
    AddRange,
    Replace,
    Remove,
    RemoveRange,
    Refresh,
    Moved,
    Clear
}
// Optional Types
export const None = Symbol('None');
export type Optional<T> = T | typeof None;

export type ItemChange<T> = {
    current: T;
    previous: Optional<T>;
    currentIndex?: number;
    previousIndex?: number;
}

export type RangeChange<T> = {
    items: T[];
    index?: number;
}

export class Change<T> {
    readonly reason: ListChangeReason;
    readonly type: ChangeType;
    readonly item?: ItemChange<T>;
    readonly range?: RangeChange<T>;

    // Constructor for item changes
    constructor(reason: ListChangeReason, current: T, previous?: Optional<T>, currentIndex?: number, previousIndex?: number);
    // Constructor for range changes
    constructor(reason: ListChangeReason, items: T[], index?: number);

    // Actual constructor implementation
    constructor(reason: ListChangeReason, firstArg: T | T[], secondArg: Optional<T> | number = None, currentIndex?: number, previousIndex?: number) {
        this.reason = reason;
        this.type = getChangeType(reason);

        if (this.type === ChangeType.Item && Array.isArray(firstArg)) {
            throw new Error('Invalid arguments for item change');
        }

        if (this.type === ChangeType.Range && !Array.isArray(firstArg) && reason !== ListChangeReason.Clear) {
            throw new Error('Invalid arguments for range change');
        }

        if (this.type === ChangeType.Item) {
            this.item = {
                current: firstArg as T,
                previous: secondArg as Optional<T>,
                currentIndex,
                previousIndex
            };
        } else if (this.type === ChangeType.Range) {
            this.range = {
                items: firstArg as T[],
                index: secondArg as number
            };
        }
    }
}

// ChangeType Enum and helper function
export enum ChangeType {
    Item,
    Range,
    None
}

export function getChangeType(reason: ListChangeReason): ChangeType {
    switch (reason) {
        case ListChangeReason.Add:
        case ListChangeReason.Remove:
        case ListChangeReason.Replace:
        case ListChangeReason.Moved:
            return ChangeType.Item;
        case ListChangeReason.AddRange:
        case ListChangeReason.RemoveRange:
        case ListChangeReason.Clear:
            return ChangeType.Range;
        default:
            return ChangeType.None;
    }
}

export class ObservableCollection<T> {
    private readonly items: T[] = [];
    private readonly eventListeners: Array<(event: Change<T>) => void> = [];

    public getItems(): T[] {
        return this.items;
    }

    public add(item: T): void {
        this.items.push(item);
        this._notifyListeners(new Change(ListChangeReason.Add, item));
    }

    public remove(item: T): void {
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
            this._notifyListeners(new Change(ListChangeReason.Remove, item));
        }
    }

    public clear(): void {
        this.items.length = 0;
        this._notifyListeners(new Change(ListChangeReason.Clear, this.items[0])); // Using the first item as a placeholder since a clear operation doesn't directly deal with any item.
    }
    
    public contains(item: T) : boolean {
        return this.items.includes(item);
    }

    public move(oldIndex: number, newIndex: number): void {
        if (oldIndex !== newIndex) {
            const [item] = this.items.splice(oldIndex, 1);
            this.items.splice(newIndex, 0, item);
            this._notifyListeners(new Change(ListChangeReason.Moved, item, None, newIndex, oldIndex));
        }
    }

    public addRange(items: T[]): void {
        this.items.push(...items);
        this._notifyListeners(new Change<T>(ListChangeReason.AddRange, items));
    }

    public removeRange(items: T[]): void {
        items.forEach(item => {
            const index = this.items.indexOf(item);
            if (index > -1) {
                this.items.splice(index, 1);
            }
        });
        this._notifyListeners(new Change<T>(ListChangeReason.RemoveRange, items));
    }

    public replace(oldItem: T, newItem: T): void {
        const index = this.items.indexOf(oldItem);
        if (index > -1) {
            this.items[index] = newItem;
            this._notifyListeners(new Change(ListChangeReason.Replace, newItem, oldItem));
        }
    }

    public refresh(): void {
        this._notifyListeners(new Change(ListChangeReason.Refresh, this.items[0])); // Using the first item as a placeholder since a refresh operation doesn't directly deal with any item.
    }

    private _notifyListeners(event: Change<T>) {
        for (const listener of this.eventListeners) {
            listener(event);
        }
    }

    public addListener(listener: (event: Change<T>) => void): void {
        this.eventListeners.push(listener);
    }

    public removeListener(listener: (event: Change<T>) => void): void {
        const index = this.eventListeners.indexOf(listener);
        if (index > -1) {
            this.eventListeners.splice(index, 1);
        }
    }
}
