export class TimedList<T> {
  private items: T[] = [];

  // Add an item and schedule its removal after 1 minute
  add(item: T): void {
    this.items.push(item);

    setTimeout(() => {
      this.remove(item);
    }, 60_000); // 60,000 ms = 1 minute
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
