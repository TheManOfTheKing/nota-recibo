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
