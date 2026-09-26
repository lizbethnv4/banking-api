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

const COLUMNS = [
  { label: 'Fecha', width: 78, align: 'left' as const },
  { label: 'Tipo', width: 52, align: 'left' as const },
  { label: 'Descripción', width: 145, align: 'left' as const },
  { label: 'Monto', width: 80, align: 'right' as const },
  { label: 'Saldo anterior', width: 80, align: 'right' as const },
  { label: 'Saldo posterior', width: 80, align: 'right' as const },
];

const ROW_HEIGHT = 18;
const HEADER_FILL = '#1B3A4B';
const ALT_ROW = '#F4F7F8';
const MUTED = '#5C6B73';
const LINE = '#D0D7DE';

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
      margin: 40,
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

    drawHeading(doc, input);
    drawTable(doc, input.movements);
    drawPageNumbers(doc);
    doc.end();
  });
}

function drawHeading(doc: PDFKit.PDFDocument, input: StatementPdfInput) {
  doc.fillColor(HEADER_FILL).font('Helvetica-Bold').fontSize(18);
  doc.text('ESTADO DE CUENTA', { align: 'left' });
  doc.moveDown(0.15);
  doc.fillColor(MUTED).font('Helvetica').fontSize(10);
  doc.text('Banking System');
  doc.moveDown(0.8);

  doc.fillColor(HEADER_FILL).font('Helvetica-Bold').fontSize(11);
  doc.text('Cuenta');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#1A1A1A');
  writePair(doc, 'Número de cuenta', input.account.accountNumber);
  writePair(doc, 'Titular', input.account.holderName);
  writePair(doc, 'Moneda', input.account.currency);
  writePair(doc, 'Estado', accountStatusLabel(input.account.status));
  doc.moveDown(0.6);

  doc.fillColor(HEADER_FILL).font('Helvetica-Bold').fontSize(11);
  doc.text('Período');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#1A1A1A');
  doc.text(`${MONTHS[input.month - 1]} ${input.year}`);
  doc.text(`${input.from} a ${input.to}`);
  doc.moveDown(0.6);

  doc.fillColor(HEADER_FILL).font('Helvetica-Bold').fontSize(11);
  doc.text('Resumen');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#1A1A1A');
  writePair(doc, 'Total créditos', formatDop(input.totalCredits));
  writePair(doc, 'Total débitos', formatDop(input.totalDebits));
  doc.moveDown(0.8);

  doc.fillColor(HEADER_FILL).font('Helvetica-Bold').fontSize(11);
  doc.text('MOVIMIENTOS');
  doc.moveDown(0.4);
}

function writePair(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`${label}: `, {
    continued: true,
  });
  doc.font('Helvetica').fillColor('#1A1A1A').text(value);
}

function drawTable(doc: PDFKit.PDFDocument, movements: AccountMovement[]) {
  drawTableHeader(doc);

  if (movements.length === 0) {
    doc.x = 40;
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
      doc.fillColor(ALT_ROW).rect(40, y, tableWidth(), ROW_HEIGHT).fill();
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

    let x = 40;
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
  doc.fillColor(HEADER_FILL).rect(40, y, tableWidth(), ROW_HEIGHT).fill();
  doc.restore();

  let x = 40;
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
  doc.strokeColor(LINE).moveTo(40, doc.y).lineTo(40 + tableWidth(), doc.y).stroke();
  doc.restore();
}

function drawPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index++) {
    doc.switchToPage(range.start + index);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    doc.text(
      `Página ${index + 1} de ${range.count}`,
      40,
      doc.page.height - 28,
      {
        width: doc.page.width - 80,
        align: 'right',
        lineBreak: false,
      },
    );
  }
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
