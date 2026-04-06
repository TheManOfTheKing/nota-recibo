import { jsPDF } from 'jspdf';
import { DocumentRecord, IssuerProfile } from '../types';
import { numeroPorExtenso } from './numberToWords';

export const generatePDF = async (docRecord: DocumentRecord, issuer: IssuerProfile) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helper for centered text
  const centerText = (text: string, y: number, size: number, isBold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  // Border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 277);

  // Logo
  if (issuer.logoUrl) {
    try {
      const imgProps = doc.getImageProperties(issuer.logoUrl);
      const imgWidth = 40;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      doc.addImage(issuer.logoUrl, imgProps.fileType, 15, 15, imgWidth, imgHeight);
    } catch (e) {
      console.error('Error adding logo to PDF', e);
    }
  }

  // Header
  centerText(issuer.name.toUpperCase(), 25, 16, true);
  centerText(`CNPJ/CPF: ${issuer.document}`, 32, 10);
  centerText(issuer.address, 38, 10);
  
  doc.line(10, 45, pageWidth - 10, 45);

  if (docRecord.type === 'receipt') {
    // Receipt Title
    centerText('RECIBO', 60, 24, true);
    
    // Amount Box
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - 70, 52, 50, 12, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${docRecord.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 65, 60);

    // Body
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const bodyText = `Recebi(emos) de ${docRecord.customerName}, a quantia de ${numeroPorExtenso(docRecord.amount)} (R$ ${docRecord.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}), referente a ${docRecord.description || 'pagamento'}.`;
    
    const splitText = doc.splitTextToSize(bodyText, pageWidth - 40);
    doc.text(splitText, 20, 90);

    // Footer
    doc.text(`Para maior clareza, firmo(amos) o presente recibo.`, 20, 130);
    
    const dateParts = docRecord.date.split(' ');
    doc.text(`Local e Data: ______________________, ${dateParts[0]} de ${dateParts[2]} de ${dateParts[4] || new Date().getFullYear()}`, 20, 150);

    // Signature
    doc.line(pageWidth / 2 - 40, 200, pageWidth / 2 + 40, 200);
    centerText(issuer.name, 208, 12);
    centerText(`CNPJ/CPF: ${issuer.document}`, 215, 10);

  } else {
    // Promissory Note Title
    centerText('NOTA PROMISSÓRIA', 60, 24, true);
    
    // Amount Box
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - 70, 52, 50, 12, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${docRecord.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 65, 60);

    // Body
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const dueDate = docRecord.dueDate || '___/___/_____';
    
    const bodyText = `Ao(s) ${dueDate}, pagarei(emos) por esta única via de nota promissória a ${issuer.name}, ou à sua ordem, a quantia de ${numeroPorExtenso(docRecord.amount)} (R$ ${docRecord.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) em moeda corrente deste país.`;
    
    const splitText = doc.splitTextToSize(bodyText, pageWidth - 40);
    doc.text(splitText, 20, 90);

    // Debtor Info
    doc.text(`Pagável em: ${issuer.address.split(',')[0] || '__________________'}`, 20, 130);
    doc.text(`Emitente: ${docRecord.customerName}`, 20, 145);
    doc.text(`Endereço: ${docRecord.clientAddress || '________________________________________________'}`, 20, 155);

    // Signature
    doc.line(pageWidth / 2 - 40, 200, pageWidth / 2 + 40, 200);
    centerText('Assinatura do Emitente', 208, 12);
  }

  // Save
  doc.save(`${docRecord.type === 'receipt' ? 'Recibo' : 'Nota_Promissoria'}_${docRecord.customerName.replace(/\s+/g, '_')}.pdf`);
};
