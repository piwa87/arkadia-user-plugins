import type { Pozycja, PowodRaportu } from '../../src/shared/rkg-api';
import { apiErrorMessage, submitReport } from './api';
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
  let submitting = false;

  function setBusy(busy: boolean): void {
    const dialog = element<HTMLDialogElement>('#raport-dialog');
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-powod]')) {
      button.disabled = busy;
    }
    dialog.setAttribute('aria-busy', String(busy));
  }

  function open(id: string): void {
    reportId = id;
    element('#raport-nazwa').textContent = findEntry(id)?.wynik ?? '';
    element('#raport-status').textContent = '';
    element<HTMLDialogElement>('#raport-dialog').showModal();
  }

  async function submit(reason: PowodRaportu): Promise<void> {
    if (!reportId || submitting) return;
    const id = reportId;
    const status = element('#raport-status');
    submitting = true;
    setBusy(true);
    status.textContent = 'Wysyłam zgłoszenie…';
    try {
      const result = await submitReport(id, voterId(), reason);
      rememberReport(id);
      status.textContent = result.duplikat
        ? 'Ten klub był już przez Ciebie zgłoszony.'
        : 'Zgłoszenie przyjęte.';
      reportId = null;
      onReported();
    } catch (error) {
      status.textContent = apiErrorMessage(
        error,
        'Zgłoszenie nie doszło. Spróbuj później.',
      );
    } finally {
      submitting = false;
      setBusy(false);
    }
  }

  return { open, submit };
}
