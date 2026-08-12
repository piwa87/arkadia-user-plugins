import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import type { Role } from '../../shared/rkg-api';
import type { RkgStyles } from './styles';

const INDENT = '      ';
const LABEL_WIDTH = 11;

/** Print the generated club as a compact two-column dossier. */
export function printClubTable(
  api: PluginApi,
  styles: RkgStyles,
  wynik: string,
  role: Partial<Role>,
): void {
  function row(label: string, value: string, valueStyle: FormatStateSnapshot): void {
    if (!value) return;
    const buffer = new api.AnsiAwareBuffer(INDENT, styles.info);
    buffer.append(label.padEnd(LABEL_WIDTH), { ...styles.info, bold: true });
    buffer.append('│ ', styles.info);
    buffer.append(value, valueStyle);
    api.output.print(buffer);
  }

  row('KLUB', wynik, styles.clubName);
  row('PRZYWODCA', role.przywodca ?? '', styles.role);
  row('ZASTEPCA', role.zastepca ?? '', styles.role);
  row('CZLONEK', role.czlonek ?? '', styles.role);
}
