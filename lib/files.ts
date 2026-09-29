import * as FileSystem from 'expo-file-system/legacy';

/** Persist a receipt outside the temporary image-picker cache. */
export async function persistReceipt(tempUri: string, id: string): Promise<string | undefined> {
  try {
    if (!FileSystem.documentDirectory) return undefined;
    const name = `receipt-${id}.jpg`;
    const destination = `${FileSystem.documentDirectory}${name}`;
    await FileSystem.copyAsync({ from: tempUri, to: destination });
    return name;
  } catch {
    return undefined;
  }
}

export function receiptPath(stored?: string): string | undefined {
  if (!stored) return undefined;
  if (stored.startsWith('file:') || stored.startsWith('http')) return stored;
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${stored}` : undefined;
}

export async function deleteReceipt(stored?: string): Promise<void> {
  const p = receiptPath(stored);
  if (p && FileSystem.documentDirectory && p.startsWith(FileSystem.documentDirectory)) {
    await FileSystem.deleteAsync(p, { idempotent: true }).catch(() => {});
  }
}
