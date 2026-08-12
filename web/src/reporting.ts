import type { Pozycja, PowodRaportu } from '../../src/shared/rkg-api';
import { submitReport } from './api';
import { element } from './dom';
import { rememberReport, voterId } from './local-state';

export interface Reporting {
  open(id: string): void;
  submit(reason: PowodRaportu): Promise<void>;
}

export function createReporting(
  findEntry: (id: string) => Pozycja | undefined,
  onReported: () => void,
): Reporting {
  let reportId: string | null = null;

  function open(id: string): void {
    reportId = id;
    element('#raport-nazwa').textContent = findEntry(id)?.wynik ?? '';
    element('#raport-status').textContent = '';
    element<HTMLDialogElement>('#raport-dialog').showModal();
  }

  async function submit(reason: PowodRaportu): Promise<void> {
    if (!reportId) return;
    const id = reportId;
    const status = element('#raport-status');
    status.textContent = 'Wysylam zgloszenie…';
    try {
      const result = await submitReport(id, voterId(), reason);
      rememberReport(id);
      status.textContent = result.duplikat
        ? 'Ten klub byl juz przez Ciebie zgloszony.'
        : 'Zgloszenie przyjete.';
      onReported();
    } catch {
      status.textContent = 'Zgloszenie nie doszlo. Sprobuj pozniej.';
    }
  }

  return { open, submit };
}
