export class TimedList<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);

    setTimeout(() => this.remove(item), 1000 * 60 * 10);
  }

  private remove(item: T): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  getItems(): T[] {
    return [...this.items];
  }
}
