import { Decimal } from 'decimal.js';
import PDFDocument from 'pdfkit';
import { Account } from '../database/entities/account.entity.js';
import { AccountMovement } from '../database/entities/account-movement.entity.js';
import { AccountStatus, MovementType } from '../database/enums.js';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const COLUMNS = [
  { label: 'Fecha', width: 78, align: 'left' as const },
  { label: 'Tipo', width: 52, align: 'left' as const },
  { label: 'Descripción', width: 145, align: 'left' as const },
  { label: 'Monto', width: 80, align: 'right' as const },
  { label: 'Saldo anterior', width: 80, align: 'right' as const },
  { label: 'Saldo posterior', width: 80, align: 'right' as const },
];

const PAGE_X = 40;
const ROW_HEIGHT = 18;
const HEADER_FILL = '#1B3A4B';
const ALT_ROW = '#F4F7F8';
const META_FILL = '#F8F9FA';
const META_BORDER = '#E2E7EA';
const MUTED = '#6B7680';
const LINE = '#D0D7DE';
const HAIRLINE = '#DCE2E5';
const INK = '#1A1A1A';
const CREDIT_COLOR = '#1E7A4C';
const DEBIT_COLOR = '#A6403A';
const ACCENT_ACTIVE = '#1E7A4C';
const ACCENT_BLOCKED = '#B23A3A';
const ACCENT_CLOSED = '#6B7680';

const HEADER_TOP = 20;
const BAR_HEIGHT = 20;
const TIER1_HEIGHT = 30;
const TIER2_HEIGHT = 24;
const META_HEIGHT = TIER1_HEIGHT + TIER2_HEIGHT;
const HEADER_GAP = 10;
const CONTENT_TOP = HEADER_TOP + BAR_HEIGHT + META_HEIGHT + HEADER_GAP;
const BOTTOM_MARGIN = 32;
const META_PAD = 16;
const STRIP_WIDTH = 3;

const CUENTA_W = 225;
const PERIODO_W = 105;
const TIER1_GAP = 20;

const STAT_GAP = 22;

export type StatementPdfInput = {
  account: Account;
  year: number;
  month: number;
  from: string;
  to: string;
  totalCredits: string;
  totalDebits: string;
  movements: AccountMovement[];
};

export function statementPdfFilename(
  accountNumber: string,
  year: number,
  month: number,
): string {
  const safeAccount =
    accountNumber.replace(/[^A-Za-z0-9_-]/g, '') || 'cuenta';
  return `estado-cuenta-${safeAccount}-${year}-${String(month).padStart(2, '0')}.pdf`;
}

export function formatDop(value: string): string {
  const amount = new Decimal(value);
  const sign = amount.isNegative() ? '-' : '';
  const [whole, fraction] = amount.abs().toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}RD$ ${grouped}.${fraction}`;
}

export function buildStatementPdf(input: StatementPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: CONTENT_TOP,
        bottom: BOTTOM_MARGIN,
        left: PAGE_X,
        right: PAGE_X,
      },
      bufferPages: true,
      info: {
        Title: 'Estado de cuenta',
        Author: 'Banking System',
      },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawTable(doc, input.movements);
    drawRunningHeaders(doc, input);
    doc.end();
  });
}

function drawRunningHeaders(
  doc: PDFKit.PDFDocument,
  input: StatementPdfInput,
) {
  const range = doc.bufferedPageRange();
  const balances = periodBalances(input.movements);

  for (let index = 0; index < range.count; index++) {
    doc.switchToPage(range.start + index);
    drawRunningHeader(doc, input, index + 1, range.count, balances);
  }
}

function drawRunningHeader(
  doc: PDFKit.PDFDocument,
  input: StatementPdfInput,
  pageNumber: number,
  pageCount: number,
  balances: { opening: string | null; closing: string | null },
) {
  const previousTop = doc.page.margins.top;
  const previousBottom = doc.page.margins.bottom;
  const previousX = doc.x;
  const previousY = doc.y;
  doc.page.margins.top = 0;
  doc.page.margins.bottom = 0;

  try {
    const width = tableWidth();
    const metaTop = HEADER_TOP + BAR_HEIGHT;
    const tier2Top = metaTop + TIER1_HEIGHT;
    const barMidY = HEADER_TOP + BAR_HEIGHT / 2;

    doc.save();
    doc.fillColor(HEADER_FILL).rect(PAGE_X, HEADER_TOP, width, BAR_HEIGHT).fill();
    doc.fillColor(META_FILL).rect(PAGE_X, metaTop, width, META_HEIGHT).fill();
    doc
      .strokeColor(META_BORDER)
      .lineWidth(0.75)
      .rect(PAGE_X, metaTop, width, META_HEIGHT)
      .stroke();
    doc.fillColor(HEADER_FILL).rect(PAGE_X, metaTop, STRIP_WIDTH, META_HEIGHT).fill();
    doc.restore();

    drawMasthead(doc, PAGE_X, HEADER_TOP, width, barMidY, pageNumber, pageCount);
    drawTier1(doc, input, PAGE_X + META_PAD, metaTop, width - META_PAD * 2);
    drawTier2(doc, input, balances, PAGE_X + META_PAD, tier2Top, width - META_PAD * 2);
  } finally {
    doc.page.margins.top = previousTop;
    doc.page.margins.bottom = previousBottom;
    doc.x = previousX;
    doc.y = previousY;
  }
}

function drawMasthead(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  midY: number,
  pageNumber: number,
  pageCount: number,
) {
  const title = 'ESTADO DE CUENTA';
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
  doc.text(title, x, midY, {
    baseline: 'middle',
    lineBreak: false,
    height: BAR_HEIGHT,
    characterSpacing: 0.4,
  });
  const titleWidth = doc.widthOfString(title, { characterSpacing: 0.4 });

  doc.font('Helvetica').fontSize(8).fillColor('#9FB2BC');
  doc.text('·', x + titleWidth + 8, midY, {
    baseline: 'middle',
    lineBreak: false,
    height: BAR_HEIGHT,
  });
  doc.font('Helvetica').fontSize(7.5).fillColor('#C3D2D8');
  doc.text('Banking System', x + titleWidth + 15, midY, {
    baseline: 'middle',
    lineBreak: false,
    height: BAR_HEIGHT,
  });

  const pillLabel = `Página ${pageNumber} de ${pageCount}`;
  doc.font('Helvetica-Bold').fontSize(7);
  const pillTextWidth = doc.widthOfString(pillLabel);
  const pillPadX = 8;
  const pillHeight = 13;
  const pillWidth = pillTextWidth + pillPadX * 2;
  const pillX = x + width - pillWidth;
  const pillY = y + (BAR_HEIGHT - pillHeight) / 2;

  doc.save();
  doc.fillOpacity(0.14);
  doc
    .fillColor('#FFFFFF')
    .roundedRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2)
    .fill();
  doc.restore();

  doc.fillColor('#FFFFFF');
  doc.text(pillLabel, pillX, y + BAR_HEIGHT / 2, {
    width: pillWidth,
    align: 'center',
    baseline: 'middle',
    lineBreak: false,
    height: BAR_HEIGHT,
  });
}

function drawTier1(
  doc: PDFKit.PDFDocument,
  input: StatementPdfInput,
  x: number,
  y: number,
  width: number,
) {
  const cuentaX = x;
  const periodoX = cuentaX + CUENTA_W + TIER1_GAP;
  const estadoX = periodoX + PERIODO_W + TIER1_GAP;
  const estadoW = Math.max(width - (estadoX - x), 60);

  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(INK);
  drawFittedText(doc, input.account.accountNumber, cuentaX, y + 4, CUENTA_W, 15, {
    characterSpacing: 0.3,
  });
  doc.font('Helvetica').fontSize(8).fillColor(MUTED);
  drawFittedText(doc, input.account.holderName, cuentaX, y + 19, CUENTA_W, 10);

  drawTinyLabel(doc, 'PERÍODO', periodoX, y + 3, PERIODO_W);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(INK);
  drawFittedText(
    doc,
    `${MONTHS[input.month - 1]} ${input.year}`,
    periodoX,
    y + 11,
    PERIODO_W,
    11,
  );
  doc.font('Helvetica').fontSize(7).fillColor(MUTED);
  drawFittedText(
    doc,
    formatPeriodRange(input.from, input.to),
    periodoX,
    y + 21,
    PERIODO_W,
    9,
  );

  drawTinyLabel(doc, 'ESTADO', estadoX, y + 3, estadoW);
  const dotY = y + 15;
  doc.save();
  doc.fillColor(statusAccent(input.account.status));
  doc.circle(estadoX + 3, dotY, 2.5).fill();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK);
  const statusLabel = accountStatusLabel(input.account.status);
  doc.text(statusLabel, estadoX + 10, dotY - 5, {
    lineBreak: false,
    height: 10,
  });
  const statusWidth = doc.widthOfString(statusLabel);
  doc.font('Helvetica').fontSize(7).fillColor(MUTED);
  doc.text(input.account.currency, estadoX + 10 + statusWidth + 7, dotY - 4, {
    lineBreak: false,
    height: 9,
  });
}

function drawTier2(
  doc: PDFKit.PDFDocument,
  input: StatementPdfInput,
  balances: { opening: string | null; closing: string | null },
  x: number,
  y: number,
  width: number,
) {
  const statW = (width - STAT_GAP * 3) / 4;
  const xs = [
    x,
    x + statW + STAT_GAP,
    x + (statW + STAT_GAP) * 2,
    x + (statW + STAT_GAP) * 3,
  ];

  drawStat(doc, xs[0], y, statW, 'SALDO INICIAL', formatStatementAmount(balances.opening), {
    valueColor: INK,
    valueSize: 8.5,
  });
  drawStat(doc, xs[1], y, statW, 'CRÉDITOS', `+${formatDop(input.totalCredits)}`, {
    valueColor: CREDIT_COLOR,
    valueSize: 8.5,
  });
  drawStat(doc, xs[2], y, statW, 'DÉBITOS', `-${formatDop(input.totalDebits)}`, {
    valueColor: DEBIT_COLOR,
    valueSize: 8.5,
  });
  drawStat(
    doc,
    xs[3],
    y,
    statW,
    'SALDO FINAL',
    formatStatementAmount(balances.closing),
    { valueColor: HEADER_FILL, valueSize: 11, align: 'right' },
  );

  doc.save();
  doc.strokeColor(HAIRLINE).lineWidth(0.75);
  for (let i = 1; i < xs.length; i++) {
    const lineX = xs[i] - STAT_GAP / 2;
    doc.moveTo(lineX, y + 3).lineTo(lineX, y + TIER2_HEIGHT - 5).stroke();
  }
  doc.restore();
}

function drawStat(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  options: { valueColor: string; valueSize: number; align?: 'left' | 'right' },
) {
  const align = options.align ?? 'left';
  drawTinyLabel(doc, label, x, y + 2, width, align);
  doc.font('Helvetica-Bold').fontSize(options.valueSize).fillColor(options.valueColor);
  doc.text(value, x, y + 10, {
    width,
    align,
    ellipsis: true,
    lineBreak: false,
    height: 13,
  });
}

function drawTinyLabel(
  doc: PDFKit.PDFDocument,
  label: string,
  x: number,
  y: number,
  width: number,
  align: 'left' | 'right' = 'left',
) {
  doc.font('Helvetica-Bold').fontSize(5.5).fillColor(MUTED);
  doc.text(label, x, y, {
    width,
    align,
    characterSpacing: 0.3,
    lineBreak: false,
    height: 7,
  });
}

function drawFittedText(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra?: { characterSpacing?: number },
) {
  doc.text(value, x, y, {
    width,
    height,
    ellipsis: true,
    lineBreak: false,
    ...extra,
  });
}

function periodBalances(movements: AccountMovement[]): {
  opening: string | null;
  closing: string | null;
} {
  if (movements.length === 0) {
    return { opening: null, closing: null };
  }

  return {
    opening: movements[0].balanceBefore,
    closing: movements[movements.length - 1].balanceAfter,
  };
}

function formatStatementAmount(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return formatDop(value);
}

function formatPeriodRange(from: string, to: string): string {
  const [fromYear, fromMonth, fromDay] = from.split('-');
  const [toYear, toMonth, toDay] = to.split('-');

  if (fromYear === toYear && fromMonth === toMonth) {
    return `${fromDay}–${toDay} ${MONTHS_SHORT[Number(fromMonth) - 1]} ${fromYear}`;
  }

  const fromLabel = `${fromDay} ${MONTHS_SHORT[Number(fromMonth) - 1]}`;
  const toLabel = `${toDay} ${MONTHS_SHORT[Number(toMonth) - 1]} ${toYear}`;
  return `${fromLabel} – ${toLabel}`;
}

function statusAccent(status: AccountStatus): string {
  if (status === AccountStatus.ACTIVE) {
    return ACCENT_ACTIVE;
  }
  if (status === AccountStatus.BLOCKED) {
    return ACCENT_BLOCKED;
  }
  return ACCENT_CLOSED;
}

function drawTable(doc: PDFKit.PDFDocument, movements: AccountMovement[]) {
  drawTableHeader(doc);

  if (movements.length === 0) {
    doc.x = PAGE_X;
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(10).fillColor(MUTED);
    doc.text('No se encontraron movimientos para este período.', {
      width: tableWidth(),
    });
    return;
  }

  movements.forEach((movement, index) => {
    if (doc.y + ROW_HEIGHT > doc.page.maxY()) {
      doc.addPage();
      drawTableHeader(doc);
    }

    const y = doc.y;
    if (index % 2 === 1) {
      doc.save();
      doc.fillColor(ALT_ROW).rect(PAGE_X, y, tableWidth(), ROW_HEIGHT).fill();
      doc.restore();
    }

    const cells = [
      formatMovementDate(movement.createdAt),
      movementTypeLabel(movement.type),
      movement.description ?? '—',
      formatDop(movement.amount),
      formatDop(movement.balanceBefore),
      formatDop(movement.balanceAfter),
    ];

    let x = PAGE_X;
    doc.font('Helvetica').fontSize(8).fillColor('#1A1A1A');
    cells.forEach((cell, columnIndex) => {
      const column = COLUMNS[columnIndex];
      doc.text(cell, x + 3, y + 4, {
        width: column.width - 6,
        height: ROW_HEIGHT - 6,
        align: column.align,
        ellipsis: true,
        lineBreak: false,
      });
      x += column.width;
    });

    doc.y = y + ROW_HEIGHT;
  });
}

function drawTableHeader(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc.save();
  doc.fillColor(HEADER_FILL).rect(PAGE_X, y, tableWidth(), ROW_HEIGHT).fill();
  doc.restore();

  let x = PAGE_X;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
  for (const column of COLUMNS) {
    doc.text(column.label, x + 3, y + 4, {
      width: column.width - 6,
      height: ROW_HEIGHT - 6,
      align: column.align,
      lineBreak: false,
    });
    x += column.width;
  }

  doc.y = y + ROW_HEIGHT;
  doc.save();
  doc.strokeColor(LINE).moveTo(PAGE_X, doc.y).lineTo(PAGE_X + tableWidth(), doc.y).stroke();
  doc.restore();
}

function tableWidth(): number {
  return COLUMNS.reduce((total, column) => total + column.width, 0);
}

function formatMovementDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = value.getUTCFullYear();
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function movementTypeLabel(type: MovementType): string {
  if (type === MovementType.CREDIT) {
    return 'Crédito';
  }
  if (type === MovementType.DEBIT) {
    return 'Débito';
  }
  return type;
}

function accountStatusLabel(status: AccountStatus): string {
  if (status === AccountStatus.ACTIVE) {
    return 'Activa';
  }
  if (status === AccountStatus.BLOCKED) {
    return 'Bloqueada';
  }
  if (status === AccountStatus.CLOSED) {
    return 'Cerrada';
  }
  return status;
}
