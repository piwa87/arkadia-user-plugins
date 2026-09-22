import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';

export interface OutputTableCell {
  text: string;
  state?: FormatStateSnapshot;
  wrap?: boolean;
  firstLineOnly?: boolean;
}

export interface OutputTableColumn<Row> {
  cell(row: Row): OutputTableCell;
  align?: 'left' | 'right';
  maxWidth?: number;
}

export interface OutputTableOptions<Row> {
  api: PluginApi;
  rows: Row[];
  columns: OutputTableColumn<Row>[];
  rowState(row: Row): FormatStateSnapshot;
  borderState: FormatStateSnapshot;
}

export function wrapTableCell(value: string, width: number): string[] {
  if (!value) return [''];
  const safeWidth = Math.max(1, width);

  const lines: string[] = [];
  let remaining = value;
  while (remaining.length > safeWidth) {
    const candidate = remaining.slice(0, safeWidth + 1);
    const breakAt = candidate.lastIndexOf(' ');
    const take = breakAt > 0 ? breakAt : safeWidth;
    lines.push(remaining.slice(0, take).trimEnd());
    remaining = remaining.slice(take).trimStart();
  }
  lines.push(remaining);
  return lines;
}

export function printOutputTable<Row>(options: OutputTableOptions<Row>): void {
  const { api, rows, columns } = options;
  if (rows.length === 0 || columns.length === 0) return;

  const cells = rows.map((row) => columns.map((column) => column.cell(row)));
  const widths = columns.map((column, columnIndex) => {
    const contentWidth = Math.max(
      0,
      ...cells.flatMap((rowCells) => {
        const cell = rowCells[columnIndex];
        if (!cell) return [0];
        return cell.wrap && column.maxWidth
          ? wrapTableCell(cell.text, column.maxWidth).map((line) => line.length)
          : [cell.text.length];
      }),
    );
    return column.maxWidth === undefined ? contentWidth : Math.min(column.maxWidth, contentWidth);
  });
  const border = widths.map((width) => `+${'-'.repeat(width + 2)}`).join('') + '+';

  const printBorder = () => {
    const buffer = new api.AnsiAwareBuffer(border);
    buffer.color([0, border.length], options.borderState);
    api.output.print(buffer);
  };

  printBorder();
  rows.forEach((row, rowIndex) => {
    const rowCells = cells[rowIndex];
    const linesByCell = rowCells.map((cell, columnIndex) =>
      cell.wrap && columns[columnIndex].maxWidth
        ? wrapTableCell(cell.text, widths[columnIndex])
        : [cell.text],
    );
    const lineCount = Math.max(...linesByCell.map((lines) => lines.length));
    const rowState = options.rowState(row);

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const buffer = new api.AnsiAwareBuffer();
      buffer.append('| ', rowState);

      columns.forEach((column, columnIndex) => {
        const cell = rowCells[columnIndex];
        const text = cell.firstLineOnly && lineIndex > 0
          ? ''
          : (linesByCell[columnIndex][lineIndex] ?? '');
        const padding = widths[columnIndex] - text.length;
        const leftPadding = column.align === 'right' ? padding : 0;
        const rightPadding = padding - leftPadding;

        if (leftPadding > 0) buffer.append(' '.repeat(leftPadding), rowState);
        if (text) buffer.append(text, cell.state ? { ...rowState, ...cell.state } : rowState);
        if (rightPadding > 0) buffer.append(' '.repeat(rightPadding), rowState);
        buffer.append(columnIndex === columns.length - 1 ? ' |' : ' | ', rowState);
      });

      api.output.print(buffer);
    }
  });
  printBorder();
}
