import { jsPDF } from 'jspdf';

export const generateDealCertificate = (deal: {
  id: string;
  brand_name: string;
  creator_handle: string;
  base_pay: number;
  view_bonus_per_500: number;
  created_at: string;
  locked_at?: string;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── BACKGROUND ──
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ── BORDER ──
  doc.setDrawColor(6, 182, 212); // cyan
  doc.setLineWidth(1);
  doc.rect(8, 8, pageW - 16, pageH - 16);
  doc.setDrawColor(249, 115, 22); // orange inner border
  doc.setLineWidth(0.3);
  doc.rect(11, 11, pageW - 22, pageH - 22);

  // ── HEADER ──
  // Zenvidia gradient text simulation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(6, 182, 212);
  doc.text('ZENVIDIA', pageW / 2, 35, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(160, 160, 160);
  doc.text('Northeast India\'s Creator Marketplace', 
           pageW / 2, 43, { align: 'center' });

  // ── TITLE ──
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('DEAL CERTIFICATE', pageW / 2, 58, 
           { align: 'center' });

  // Underline
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(0.5);
  doc.line(40, 61, pageW - 40, 61);

  // ── DEAL ID ──
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('DEAL ID', pageW / 2, 70, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(6, 182, 212);
  doc.text(deal.id.toUpperCase(), pageW / 2, 76, 
           { align: 'center' });

  // ── PARTIES SECTION ──
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(15, 82, pageW - 30, 45, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('THIS AGREEMENT IS BETWEEN', 
           pageW / 2, 91, { align: 'center' });

  // Brand box
  doc.setFillColor(20, 40, 50);
  doc.roundedRect(18, 95, (pageW - 40) / 2, 25, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(6, 182, 212);
  doc.text('🏢 BRAND', 18 + (pageW - 40) / 4, 102, 
           { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(deal.brand_name, 18 + (pageW - 40) / 4, 111, 
           { align: 'center', maxWidth: (pageW - 40) / 2 - 4 });

  // AND
  doc.setFontSize(10);
  doc.setTextColor(249, 115, 22);
  doc.text('AND', pageW / 2, 110, { align: 'center' });

  // Creator box
  const creatorBoxX = pageW / 2 + 4;
  doc.setFillColor(40, 20, 10);
  doc.roundedRect(creatorBoxX, 95, (pageW - 40) / 2, 25, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(249, 115, 22);
  doc.text('🎨 CREATOR', 
           creatorBoxX + (pageW - 40) / 4, 102, 
           { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('@' + deal.creator_handle, 
           creatorBoxX + (pageW - 40) / 4, 111, 
           { align: 'center', 
             maxWidth: (pageW - 40) / 2 - 4 });

  // ── DEAL TERMS ──
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('AGREED TERMS', pageW / 2, 140, 
           { align: 'center' });

  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(0.3);
  doc.line(50, 143, pageW - 50, 143);

  // Term boxes
  const termY = 150;
  const termW = (pageW - 40) / 2 - 3;

  // Advance Pay
  doc.setFillColor(20, 40, 50);
  doc.roundedRect(15, termY, termW, 30, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 160, 180);
  doc.text('ADVANCE PAYMENT', 15 + termW / 2, termY + 8, 
           { align: 'center' });
  doc.setFontSize(20);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text('₹' + deal.base_pay.toLocaleString(), 
           15 + termW / 2, termY + 22, 
           { align: 'center' });

  // Bonus per 100 views
  doc.setFillColor(40, 25, 10);
  doc.roundedRect(pageW / 2 + 4, termY, termW, 30, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(180, 140, 100);
  doc.text('BONUS PER 100 VIEWS', 
           pageW / 2 + 4 + termW / 2, termY + 8, 
           { align: 'center' });
  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.text('₹' + deal.view_bonus_per_500, 
           pageW / 2 + 4 + termW / 2, termY + 22, 
           { align: 'center' });

  // ── EARNINGS ESTIMATE ──
  doc.setFillColor(20, 30, 20);
  doc.roundedRect(15, 188, pageW - 30, 28, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 180, 100);
  doc.text('ESTIMATED EARNINGS AT 10K VIEWS', 
           pageW / 2, 196, { align: 'center' });
  const est10k = deal.base_pay + (10000 / 100) * deal.view_bonus_per_500;
  doc.setFontSize(16);
  doc.setTextColor(100, 220, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('₹' + est10k.toLocaleString(), 
           pageW / 2, 210, { align: 'center' });

  // ── ZENVIDIA FEE ──
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Zenvidia Honor Fee: 5% on final payment', 
           pageW / 2, 225, { align: 'center' });

  // ── TIMESTAMP ──
  const lockedDate = deal.locked_at 
    ? new Date(deal.locked_at).toLocaleString('en-IN')
    : new Date().toLocaleString('en-IN');

  doc.setFillColor(25, 25, 25);
  doc.roundedRect(15, 230, pageW - 30, 18, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Deal Locked On:', 25, 238);
  doc.setTextColor(200, 200, 200);
  doc.text(lockedDate, 25, 244);
  doc.setTextColor(100, 100, 100);
  doc.text('Verified by Zenvidia', pageW - 25, 241, 
           { align: 'right' });

  // ── LEGAL TEXT ──
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  const legal = 'This certificate confirms a mutual agreement between the parties. ' +
    'Zenvidia acts as marketplace platform only. ' +
    'Payments are direct between Brand and Creator. ' +
    'This document is auto-generated and serves as proof of deal agreement.';
  const lines = doc.splitTextToSize(legal, pageW - 40);
  doc.text(lines, pageW / 2, 257, { align: 'center' });

  // ── WATERMARK ──
  doc.setFontSize(60);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENVIDIA', pageW / 2, pageH / 2 + 20, { 
    align: 'center',
    angle: 45
  });

  // ── FOOTER ──
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text('zenvidia.com', pageW / 2, pageH - 15, 
           { align: 'center' });

  // Save PDF
  const filename = `Zenvidia_Deal_${deal.id.slice(0,8).toUpperCase()}.pdf`;
  doc.save(filename);
  
  return filename;
};
