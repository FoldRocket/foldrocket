import { api } from '../../api/client';
import { kickJobPump } from '../../api/jobPump';

/** Queue changed media by default; a full rebuild remains available in Maintenance. */
export async function runFullLibraryIndex(
  start?: { indexed: number; attachments: number },
  mode: 'differential' | 'full' = 'differential'
) {
  const result = await api.indexLibrary({ mode });
  kickJobPump();
  return { indexed: start?.indexed ?? 0, attachments: result.scan?.total ?? start?.attachments ?? 0 };
}
