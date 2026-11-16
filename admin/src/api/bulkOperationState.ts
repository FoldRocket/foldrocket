const STORAGE_KEY = 'frkt_bulk_conversion_operation';

export type RememberedBulkConversion = {
  operationId: string;
  jobIds: number[];
  total: number;
};

export function rememberBulkConversion(operation: RememberedBulkConversion): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(operation));
  } catch {
    // Progress still works from the server when browser storage is unavailable.
  }
}

export function readRememberedBulkConversion(): RememberedBulkConversion | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RememberedBulkConversion>;
    if (!value.operationId || !Array.isArray(value.jobIds)) return null;
    return {
      operationId: value.operationId,
      jobIds: value.jobIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
      total: Math.max(0, Number(value.total) || value.jobIds.length),
    };
  } catch {
    return null;
  }
}

export function clearRememberedBulkConversion(operationId: string): void {
  const remembered = readRememberedBulkConversion();
  if (!remembered || remembered.operationId !== operationId) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else to clean up.
  }
}
