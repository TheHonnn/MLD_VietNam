export class OwnerWriteQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = new Map<string, Promise<any>>();

  constructor(private readonly getOwner: () => string, private readonly limit = 32) {}

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const owner = this.getOwner();
    if (!owner) return Promise.reject(new Error('Vui lòng đăng nhập lại.'));
    const id = `${owner}\n${key}`;
    const current = this.pending.get(id);
    if (current) return current;
    if (this.pending.size >= this.limit) return Promise.reject(new Error('Vui lòng chờ thao tác trước hoàn tất.'));
    const operation = this.tail.then(() => {
      if (owner !== this.getOwner()) throw new Error('Phiên đăng nhập đã thay đổi.');
      return task();
    });
    this.tail = operation.catch(() => undefined);
    const result = operation.finally(() => { this.pending.delete(id); });
    this.pending.set(id,result);
    return result;
  }
}
