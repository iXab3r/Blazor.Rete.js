// ObservableCollection.test.ts
import {ObservableCollection, ListChangeReason, Change} from './observable-collection'; // Adjust the import to match the path to your ObservableCollection file

describe('ObservableCollection', () => {
    let collection: ObservableCollection<number>;
    let listener: jest.Mock;

    beforeEach(() => {
        collection = new ObservableCollection<number>();
        listener = jest.fn();
        collection.addListener(listener);
    });

    it('should add an item', () => {
        collection.add(1);
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.Add, 1));
    });

    it('should remove an item', () => {
        collection.add(1);
        listener.mockClear();
        collection.remove(1);
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.Remove, 1));
    });

    it('should not remove a non-existent item', () => {
        collection.remove(1);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should clear all items', () => {
        collection.add(1);
        listener.mockClear();
        collection.clear();
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.Clear, undefined));
    });

    it('should move an item', () => {
        collection.add(1);
        collection.add(2);
        listener.mockClear();
        collection.move(0, 1);
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.Moved, 1, undefined, 1, 0));
    });

    it('should not move an item to the same index', () => {
        collection.add(1);
        listener.mockClear();
        collection.move(0, 0);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should add a range of items', () => {
        const items = [1, 2, 3];
        collection.addRange(items);
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.AddRange, items));
    });

    it('should remove a range of items', () => {
        collection.add(1);
        collection.add(2);
        collection.add(3);
        listener.mockClear();
        const itemsToRemove = [1, 3];
        collection.removeRange(itemsToRemove);
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.RemoveRange, itemsToRemove));
    });

    it('should replace an item', () => {
        collection.add(1);
        listener.mockClear();
        collection.replace(1, 2);
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.Replace, 2, 1));
    });

    it('should not replace a non-existent item', () => {
        collection.replace(1, 2);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on refresh', () => {
        collection.add(1);
        listener.mockClear();
        collection.refresh();
        expect(listener).toHaveBeenCalledWith(new Change(ListChangeReason.Refresh, 1));
    });

    it('should handle multiple Add and Remove operations correctly', () => {
        collection.add(1);
        collection.add(2);
        collection.add(3);
        collection.remove(2);

        expect(listener).toHaveBeenNthCalledWith(1, new Change(ListChangeReason.Add, 1));
        expect(listener).toHaveBeenNthCalledWith(2, new Change(ListChangeReason.Add, 2));
        expect(listener).toHaveBeenNthCalledWith(3, new Change(ListChangeReason.Add, 3));
        expect(listener).toHaveBeenNthCalledWith(4, new Change(ListChangeReason.Remove, 2));
    });

    it('should manage sequence of AddRange, Remove and Replace operations', () => {
        collection.addRange([1, 2, 3]);
        collection.remove(2);
        collection.replace(3, 4);

        expect(listener).toHaveBeenNthCalledWith(1, new Change(ListChangeReason.AddRange, [1, 2, 3]));
        expect(listener).toHaveBeenNthCalledWith(2, new Change(ListChangeReason.Remove, 2));
        expect(listener).toHaveBeenNthCalledWith(3, new Change(ListChangeReason.Replace, 4, 3));
    });

    it('should handle Move followed by Replace correctly', () => {
        collection.add(1);
        collection.add(2);
        collection.add(3);
        collection.move(0, 2);
        collection.replace(2, 5);

        expect(listener).toHaveBeenNthCalledWith(1, new Change(ListChangeReason.Add, 1));
        expect(listener).toHaveBeenNthCalledWith(2, new Change(ListChangeReason.Add, 2));
        expect(listener).toHaveBeenNthCalledWith(3, new Change(ListChangeReason.Add, 3));
        expect(listener).toHaveBeenNthCalledWith(4, new Change(ListChangeReason.Moved, 1, undefined, 2, 0));
        expect(listener).toHaveBeenNthCalledWith(5, new Change(ListChangeReason.Replace, 5, 2));
    });

    it('should manage a Clear after multiple Adds', () => {
        collection.add(1);
        collection.add(2);
        collection.add(3);
        collection.clear();

        expect(listener).toHaveBeenNthCalledWith(1, new Change(ListChangeReason.Add, 1));
        expect(listener).toHaveBeenNthCalledWith(2, new Change(ListChangeReason.Add, 2));
        expect(listener).toHaveBeenNthCalledWith(3, new Change(ListChangeReason.Add, 3));
        expect(listener).toHaveBeenNthCalledWith(4, new Change(ListChangeReason.Clear, undefined));
    });

    it('should manage sequence of RemoveRange and Add operations', () => {
        collection.addRange([1, 2, 3, 4]);
        collection.removeRange([2, 4]);
        collection.add(5);

        expect(listener).toHaveBeenNthCalledWith(1, new Change(ListChangeReason.AddRange, [1, 2, 3, 4]));
        expect(listener).toHaveBeenNthCalledWith(2, new Change(ListChangeReason.RemoveRange, [2, 4]));
        expect(listener).toHaveBeenNthCalledWith(3, new Change(ListChangeReason.Add, 5));
    });
});

