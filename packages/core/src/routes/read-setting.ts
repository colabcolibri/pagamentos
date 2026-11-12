export async function readSetting<T>(value: T | (() => T | Promise<T>)): Promise<T> {
  if (typeof value === 'function') {
    return await (value as () => T | Promise<T>)();
  }
  return value;
}
