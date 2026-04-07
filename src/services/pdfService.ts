import { jsPDF } from 'jspdf';
import type { Customer, Emitter } from '../types';
import { numeroPorExtenso } from '../utils/numberToWords';

interface ReceiptPdfPayload {
  emitter: Emitter;
  customer: Customer;
  amount: number;
  description: string;
  receiptNumber: string;
  issueDate: Date;
}

interface PromissoryNotePdfPayload {
  emitter: Emitter;
  customer: Customer;
  amount: number;
  description: string;
  noteNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: 'pending' | 'paid' | 'cancelled';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatIssueDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function drawDottedLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number): void {
  doc.setLineDashPattern([0.7, 0.7], 0);
  doc.line(x1, y1, x2, y2);
  doc.setLineDashPattern([], 0);
}

function drawDoubleBorderBox(doc: jsPDF, x: number, y: number, width: number, height: number): void {
  doc.setLineWidth(0.45);
  doc.roundedRect(x, y, width, height, 4, 4);
  doc.setLineWidth(0.25);
  doc.roundedRect(x + 1.6, y + 1.6, width - 3.2, height - 3.2, 3.2, 3.2);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Falha ao converter imagem para data URL.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler imagem do logotipo.'));
    reader.readAsDataURL(blob);
  });
}

async function loadLogoDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function formatStatusLabel(status: PromissoryNotePdfPayload['status']): string {
  if (status === 'paid') {
    return 'PAGO';
  }

  if (status === 'cancelled') {
    return 'CANCELADO';
  }

  return 'PENDENTE';
}

export async function generateReceiptPdfBlob(payload: ReceiptPdfPayload): Promise<Blob> {
  const { emitter, customer, amount, description, receiptNumber, issueDate } = payload;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const outerMargin = 8;
  const contentTop = 16;
  const blockHeight = pageHeight - contentTop - 12;
  const stubWidth = 72;
  const gap = 4;
  const mainX = outerMargin + stubWidth + gap;
  const mainWidth = pageWidth - mainX - outerMargin;

  doc.setFillColor(248, 248, 248);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  drawDoubleBorderBox(doc, outerMargin, contentTop, stubWidth, blockHeight);
  drawDoubleBorderBox(doc, mainX, contentTop, mainWidth, blockHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RECIBO Nº', outerMargin + 6, contentTop + 12);
  drawDottedLine(doc, outerMargin + 29, contentTop + 12, outerMargin + stubWidth - 6, contentTop + 12);

  doc.text('Valor', outerMargin + 6, contentTop + 27);
  drawDottedLine(doc, outerMargin + 17, contentTop + 27, outerMargin + stubWidth - 6, contentTop + 27);

  doc.text('Recebi (emos) de', outerMargin + 6, contentTop + 44);
  drawDottedLine(doc, outerMargin + 6, contentTop + 48, outerMargin + stubWidth - 6, contentTop + 48);
  drawDottedLine(doc, outerMargin + 6, contentTop + 58, outerMargin + stubWidth - 6, contentTop + 58);

  doc.text('a quantia de', outerMargin + 6, contentTop + 73);
  drawDottedLine(doc, outerMargin + 6, contentTop + 77, outerMargin + stubWidth - 6, contentTop + 77);
  drawDottedLine(doc, outerMargin + 6, contentTop + 87, outerMargin + stubWidth - 6, contentTop + 87);
  drawDottedLine(doc, outerMargin + 6, contentTop + 97, outerMargin + stubWidth - 6, contentTop + 97);

  doc.text('Referente a', outerMargin + 6, contentTop + 111);
  drawDottedLine(doc, outerMargin + 6, contentTop + 115, outerMargin + stubWidth - 6, contentTop + 115);
  drawDottedLine(doc, outerMargin + 6, contentTop + 125, outerMargin + stubWidth - 6, contentTop + 125);
  drawDottedLine(doc, outerMargin + 6, contentTop + 135, outerMargin + stubWidth - 6, contentTop + 135);

  drawDottedLine(doc, outerMargin + 6, contentTop + blockHeight - 12, outerMargin + stubWidth - 6, contentTop + blockHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Data: ${formatIssueDate(issueDate)}`, outerMargin + 6, contentTop + blockHeight - 6);

  const headerY = contentTop + 8;
  const valueBoxWidth = 76;
  const numberBoxWidth = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RECIBO', mainX + 8, headerY + 8);

  doc.setFontSize(11);
  doc.text('Nº', mainX + 70, headerY + 8);
  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + 78, headerY + 1, numberBoxWidth, 10, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.text(receiptNumber, mainX + 81, headerY + 7.8);

  doc.setFont('helvetica', 'bold');
  doc.text('VALOR', mainX + mainWidth - valueBoxWidth - 23, headerY + 8);
  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + mainWidth - valueBoxWidth - 8, headerY + 1, valueBoxWidth, 10, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${formatCurrency(amount)}`, mainX + mainWidth - valueBoxWidth - 4, headerY + 7.8);

  const bodyStartY = headerY + 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  doc.text('Recebi (emos) de', mainX + 6, bodyStartY);
  drawDottedLine(doc, mainX + 42, bodyStartY, mainX + mainWidth - 6, bodyStartY);
  doc.setFontSize(11.5);
  doc.text(customer.name, mainX + 43, bodyStartY - 1.1);

  doc.setFontSize(12);
  doc.text('a quantia de', mainX + 6, bodyStartY + 15);

  doc.setFontSize(11);
  const amountWords = `${numeroPorExtenso(amount)} (R$ ${formatCurrency(amount)})`;
  const splitAmountWords = doc.splitTextToSize(amountWords, mainWidth - 42);
  doc.text(splitAmountWords, mainX + 43, bodyStartY + 15);
  drawDottedLine(doc, mainX + 42, bodyStartY + 15.4, mainX + mainWidth - 6, bodyStartY + 15.4);
  drawDottedLine(doc, mainX + 6, bodyStartY + 26, mainX + mainWidth - 6, bodyStartY + 26);
  drawDottedLine(doc, mainX + 6, bodyStartY + 31, mainX + mainWidth - 6, bodyStartY + 31);

  doc.setFontSize(12);
  doc.text('Referente a', mainX + 6, bodyStartY + 45);
  doc.setFontSize(11.3);
  const splitDescription = doc.splitTextToSize(description || 'Pagamento de serviço conforme combinado.', mainWidth - 33);
  doc.text(splitDescription, mainX + 31, bodyStartY + 45);
  drawDottedLine(doc, mainX + 30, bodyStartY + 45.4, mainX + mainWidth - 6, bodyStartY + 45.4);
  drawDottedLine(doc, mainX + 6, bodyStartY + 55, mainX + mainWidth - 6, bodyStartY + 55);
  drawDottedLine(doc, mainX + 6, bodyStartY + 60, mainX + mainWidth - 6, bodyStartY + 60);

  doc.setFontSize(11.8);
  doc.text('e para clareza firmo (amos) o presente.', mainX + 6, bodyStartY + 72);

  drawDottedLine(doc, mainX + 6, bodyStartY + 83, mainX + mainWidth - 6, bodyStartY + 83);
  doc.setFontSize(11.2);
  doc.text(`${emitter.address} , ${formatIssueDate(issueDate)}`, mainX + 8, bodyStartY + 81.7);

  doc.setFontSize(12);
  doc.text('Assinatura', mainX + 6, bodyStartY + 98);
  drawDottedLine(doc, mainX + 28, bodyStartY + 98, mainX + mainWidth - 6, bodyStartY + 98);

  doc.text('Nome', mainX + 6, bodyStartY + 109);
  drawDottedLine(doc, mainX + 18, bodyStartY + 109, mainX + mainWidth - 52, bodyStartY + 109);
  doc.text('CPF / RG', mainX + mainWidth - 48, bodyStartY + 109);
  drawDottedLine(doc, mainX + mainWidth - 30, bodyStartY + 109, mainX + mainWidth - 6, bodyStartY + 109);

  doc.setFontSize(10.5);
  doc.text(emitter.name, mainX + 19, bodyStartY + 107.6);
  doc.text(emitter.cnpjCpf, mainX + mainWidth - 29, bodyStartY + 107.6);

  doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Recebido por: ${customer.name} | CPF/CNPJ: ${customer.cpfCnpj}`, mainX + 6, contentTop + blockHeight - 8);
  doc.setTextColor(0, 0, 0);

  if (emitter.logoUrl) {
    const logoDataUrl = await loadLogoDataUrl(emitter.logoUrl);
    if (logoDataUrl) {
      try {
        const props = doc.getImageProperties(logoDataUrl);
        const maxWidth = 24;
        const maxHeight = 14;
        const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
        const logoWidth = props.width * ratio;
        const logoHeight = props.height * ratio;
        doc.addImage(
          logoDataUrl,
          props.fileType,
          mainX + mainWidth - logoWidth - 10,
          contentTop + blockHeight - logoHeight - 8,
          logoWidth,
          logoHeight,
        );
      } catch {
        // ignora falhas de renderizacao de imagem para nao bloquear emissao
      }
    }
  }

  return doc.output('blob');
}

export async function generatePromissoryNotePdfBlob(payload: PromissoryNotePdfPayload): Promise<Blob> {
  const { emitter, customer, amount, description, noteNumber, issueDate, dueDate, status } = payload;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const outerMargin = 8;
  const contentTop = 16;
  const blockHeight = pageHeight - contentTop - 12;
  const stubWidth = 50;
  const gap = 4;
  const mainX = outerMargin + stubWidth + gap;
  const mainWidth = pageWidth - mainX - outerMargin;

  doc.setFillColor(248, 246, 223);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  drawDoubleBorderBox(doc, outerMargin, contentTop, stubWidth, blockHeight);

  doc.setDrawColor(179, 156, 98);
  doc.setFillColor(252, 244, 205);
  doc.roundedRect(mainX, contentTop, mainWidth, blockHeight, 4, 4, 'FD');
  doc.setDrawColor(160, 140, 88);
  doc.roundedRect(mainX + 1.4, contentTop + 1.4, mainWidth - 2.8, blockHeight - 2.8, 3.2, 3.2);

  doc.setDrawColor(229, 214, 173);
  for (let y = contentTop + 14; y < contentTop + blockHeight - 10; y += 6) {
    doc.line(mainX + 5, y, mainX + mainWidth - 5, y);
  }
  doc.setDrawColor(0, 0, 0);

  const stubCenterX = outerMargin + stubWidth / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('AVALISTAS', stubCenterX, contentTop + 20, { angle: 90, align: 'center' });

  doc.setFontSize(8.8);
  doc.text('CPF / CNPJ', outerMargin + 8, contentTop + 48);
  drawDottedLine(doc, outerMargin + 8, contentTop + 52, outerMargin + stubWidth - 8, contentTop + 52);
  drawDottedLine(doc, outerMargin + 8, contentTop + 60, outerMargin + stubWidth - 8, contentTop + 60);

  doc.text('ENDERECO', outerMargin + 8, contentTop + 74);
  drawDottedLine(doc, outerMargin + 8, contentTop + 78, outerMargin + stubWidth - 8, contentTop + 78);
  drawDottedLine(doc, outerMargin + 8, contentTop + 86, outerMargin + stubWidth - 8, contentTop + 86);
  drawDottedLine(doc, outerMargin + 8, contentTop + 94, outerMargin + stubWidth - 8, contentTop + 94);

  doc.setFillColor(236, 210, 120);
  doc.circle(stubCenterX, contentTop + blockHeight - 24, 12, 'F');
  doc.setDrawColor(176, 142, 55);
  doc.circle(stubCenterX, contentTop + blockHeight - 24, 8);
  doc.setDrawColor(0, 0, 0);

  const headerY = contentTop + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);

  doc.text('Nº', mainX + 8, headerY + 1.4);
  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + 14, headerY - 3, 30, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.text(noteNumber, mainX + 16, headerY + 3.6);

  doc.setFont('helvetica', 'bold');
  doc.text('VENCIMENTO', mainX + 48, headerY + 1.4);
  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + 74, headerY - 3, 30, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.text(formatIssueDate(dueDate), mainX + 76, headerY + 3.6);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS', mainX + 110, headerY + 1.4);
  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + 124, headerY - 3, 28, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.text(formatStatusLabel(status), mainX + 126, headerY + 3.6);

  doc.setFont('helvetica', 'bold');
  doc.text('R$', mainX + mainWidth - 67, headerY + 1.4);
  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + mainWidth - 58, headerY - 3, 50, 10, 2, 2, 'F');
  doc.text(formatCurrency(amount), mainX + mainWidth - 55, headerY + 3.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('NOTA PROMISSORIA', mainX + 8, headerY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.2);
  doc.text('PAGAREI(EMOS) POR ESTA UNICA VIA DE NOTA PROMISSORIA A', mainX + 8, headerY + 34);
  drawDottedLine(doc, mainX + 8, headerY + 38, mainX + mainWidth - 8, headerY + 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.2);
  doc.text(emitter.name.toUpperCase(), mainX + 9, headerY + 36.6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.2);
  doc.text('A QUANTIA DE', mainX + 8, headerY + 50);

  doc.setFillColor(236, 236, 236);
  doc.roundedRect(mainX + 34, headerY + 44, mainWidth - 42, 12, 2, 2, 'F');
  doc.roundedRect(mainX + 34, headerY + 58, mainWidth - 42, 12, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  const extenso = `${numeroPorExtenso(amount)} (R$ ${formatCurrency(amount)})`;
  const extensoLines = doc.splitTextToSize(extenso, mainWidth - 50);
  doc.text(extensoLines, mainX + 36, headerY + 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('DESCRICAO DO DEBITO', mainX + 8, headerY + 80);
  drawDottedLine(doc, mainX + 47, headerY + 80.3, mainX + mainWidth - 8, headerY + 80.3);

  const normalizedDescription = description.trim() || 'Obrigacao financeira formalizada por esta nota promissoria.';
  const splitDescription = doc.splitTextToSize(normalizedDescription, mainWidth - 56);
  doc.text(splitDescription, mainX + 48, headerY + 78.8);
  drawDottedLine(doc, mainX + 8, headerY + 90, mainX + mainWidth - 8, headerY + 90);
  drawDottedLine(doc, mainX + 8, headerY + 96, mainX + mainWidth - 8, headerY + 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.2);
  doc.text(`Pagavel em: ${emitter.address}`, mainX + 8, headerY + 106);
  doc.text(`Devedor: ${customer.name} | CPF/CNPJ: ${customer.cpfCnpj}`, mainX + 8, headerY + 114);
  doc.text(`Endereco do devedor: ${customer.address}`, mainX + 8, headerY + 121.5);

  drawDottedLine(doc, mainX + 8, contentTop + blockHeight - 18, mainX + mainWidth - 8, contentTop + blockHeight - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(
    `${emitter.address}, emissao em ${formatIssueDate(issueDate)} | vencimento em ${formatIssueDate(dueDate)}`,
    mainX + 10,
    contentTop + blockHeight - 19.3,
  );

  drawDottedLine(doc, mainX + mainWidth - 92, contentTop + blockHeight - 8, mainX + mainWidth - 10, contentTop + blockHeight - 8);
  doc.setFontSize(9.5);
  doc.text('Assinatura do devedor', mainX + mainWidth - 84, contentTop + blockHeight - 3.6);

  if (emitter.logoUrl) {
    const logoDataUrl = await loadLogoDataUrl(emitter.logoUrl);
    if (logoDataUrl) {
      try {
        const props = doc.getImageProperties(logoDataUrl);
        const maxWidth = 22;
        const maxHeight = 14;
        const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
        const logoWidth = props.width * ratio;
        const logoHeight = props.height * ratio;
        doc.addImage(logoDataUrl, props.fileType, mainX + 10, contentTop + blockHeight - logoHeight - 11, logoWidth, logoHeight);
      } catch {
        // ignora falhas de renderizacao de imagem para nao bloquear emissao
      }
    }
  }

  return doc.output('blob');
}
