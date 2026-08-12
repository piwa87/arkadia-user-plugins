import type { AkcjaModeracji, PowodRaportu, Sortowanie } from '../../src/shared/rkg-api';
import { element } from './dom';
import { createModeration } from './moderation';
import { createRanking } from './ranking';
import { createReporting } from './reporting';

const ranking = createRanking();
const reporting = createReporting(ranking.find, ranking.render);
const moderation = createModeration(() => ranking.load(false));

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const sort = target.closest<HTMLElement>('[data-sort]')?.dataset.sort as Sortowanie | undefined;
  if (sort) return ranking.changeSort(sort);

  const arrow = target.closest<HTMLElement>('.strzalka');
  if (arrow?.dataset.id) {
    void ranking.vote(arrow.dataset.id, Number(arrow.dataset.dir) as 1 | -1);
    return;
  }

  const report = target.closest<HTMLElement>('[data-report]')?.dataset.report;
  if (report) return reporting.open(report);

  const reason = target.closest<HTMLElement>('[data-powod]')?.dataset.powod as PowodRaportu | undefined;
  if (reason) {
    void reporting.submit(reason);
    return;
  }

  const adminId = target.closest<HTMLElement>('[data-admin-id]')?.dataset.adminId;
  const action = target.closest<HTMLElement>('[data-admin-action]')?.dataset.adminAction as AkcjaModeracji | undefined;
  if (adminId && action) void moderation.apply(adminId, action);

  const adminView = target.closest<HTMLElement>('[data-admin-view]')?.dataset.adminView;
  if (adminView) moderation.changeView(adminView);
});

element('#wiecej').addEventListener('click', () => void ranking.load(true));
element('#moderacja-open').addEventListener('click', moderation.open);
element('#admin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void moderation.login(element<HTMLInputElement>('#admin-klucz').value);
});

void ranking.load(false);
