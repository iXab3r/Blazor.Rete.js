import { ListChangeReason, Change, ChangeType } from './observable-collection';
import { RxObservableCollection } from './rx-observable-collection';

describe('RxObservableCollection', () => {
    let collection: RxObservableCollection<number>;

    beforeEach(() => {
        collection = new RxObservableCollection<number>();
    });

    it('should emit an Add event', done => {
        collection.asObservable().subscribe(event => {
            expect(event.reason).toBe(ListChangeReason.Add);
            expect(event.item?.current).toBe(1);
            expect(event.type).toBe(ChangeType.Item);
            done();
        });

        collection.add(1);
    });

    it('should emit a Remove event', done => {
        collection.add(1);
        collection.asObservable().subscribe(event => {
            expect(event.reason).toBe(ListChangeReason.Remove);
            expect(event.item?.current).toBe(1);
            expect(event.type).toBe(ChangeType.Item);
            done();
        });

        collection.remove(1);
    });

    it('should emit an AddRange followed by a RemoveRange event', done => {
        let callCount = 0;

        collection.asObservable().subscribe(event => {
            callCount++;
            if (callCount === 1) {
                expect(event.reason).toBe(ListChangeReason.AddRange);
                expect(event.type).toBe(ChangeType.Range);
                expect(event.range?.items).toEqual([1, 2, 3, 4, 5]);
            } else if (callCount === 2) {
                expect(event.reason).toBe(ListChangeReason.RemoveRange);
                expect(event.type).toBe(ChangeType.Range);
                expect(event.range?.items).toEqual([1, 3, 5]);
                done();
            }
        });

        collection.addRange([1, 2, 3, 4, 5]);
        collection.removeRange([1, 3, 5]);
    });

    it('should emit an AddRange event for initial elements upon subscription', done => {
        collection.addRange([10, 20, 30]);

        collection.asObservable().subscribe(event => {
            expect(event.reason).toBe(ListChangeReason.AddRange);
            expect(event.type).toBe(ChangeType.Range);
            expect(event.range?.items).toEqual([10, 20, 30]);
            done();
        });
    });
});
