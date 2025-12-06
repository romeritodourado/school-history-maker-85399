import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import QRCode from "qrcode"; // Importar a biblioteca qrcode
import correctSignatureLogo from "@/assets/correct-signature-logo.png"; // Importar o novo logo de assinatura

// Convert image to base64 with optional resizing
const getImageAsBase64 = async (imageUrl: string, maxWidth = 100, maxHeight = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Needed for cross-origin images
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions to fit within maxWidth/maxHeight while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = (e) => {
      console.error("Image loading error:", e);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    img.src = imageUrl;
  });
};

interface StudentData {
  id: string;
  full_name: string;
  mother_name: string;
  father_name: string | null;
  birth_date: string;
  birth_place: string;
  birth_state: string;
  student_status: string | null;
  grade_series: string | null;
  observations: string | null;
  school_id: string | null;
  schools: { 
    name: string, 
    municipality_id: string, 
    address: string | null, 
    city: string | null, 
    state: string | null, 
    logo_url: string | null, 
    authorization_decree_url: string | null, 
    official_gazette_url: string | null,
    municipalities: {
      name: string;
      emblem_url: string | null;
    } | null;
  } | null;
}

interface AcademicYearData {
  id: string;
  calendar_year: number;
  grade_level: string;
  school_name: string;
  city: string;
  state: string;
  reclassified?: boolean;
  school_period_start?: string | null;
  school_period_end?: string | null;
  trimester_year?: string | null;
  trimester_shift?: string | null;
}

interface GradeData {
  subject_name: string;
  grade: number | null;
  workload: number | null;
  absences: number;
}

interface TrimesterGradeData {
  subject_name: string;
  trimester: number;
  grade: number | null;
  absences: number;
}

interface ProfileData {
  id: string;
  name: string | null;
  registration_number: string | null;
  role: string;
  signature_image_url: string | null;
}

const formatGrade = (grade: number | null) => {
  if (grade === null) return "-";
  return grade.toFixed(1);
};

export const exportToPDF = async (
  student: StudentData,
  academicYears: AcademicYearData[],
  grades: { [yearId: string]: GradeData[] },
  trimesterGrades: TrimesterGradeData[],
  schoolPeriod: { startDate: string; endDate: string; gradeClass: string; shift: string } | undefined,
  transcriptId: string,
  directorProfile?: ProfileData | null,
  secretaryProfile?: ProfileData | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // General page margin
  const headerLogoSize = 20; // Reduced logo size for header

  let yPos = margin; // Current Y position for drawing

  const municipalityName = student.schools?.municipalities?.name || "Não Informado";
  const schoolName = student.schools?.name || "ESCOLA MUNICIPAL";
  const authorizationDecree = student.schools?.authorization_decree_url || "";
  const officialGazette = student.schools?.official_gazette_url || "";
  const schoolLogoUrl = student.schools?.logo_url;
  const municipalityEmblemUrl = student.schools?.municipalities?.emblem_url;

  let schoolLogoBase64: string | null = null;
  let municipalityEmblemBase64: string | null = null;
  let signatureLogoBase64: string | null = null;
  let qrCodeDataUrl: string | null = null;
  let directorSignatureImageBase64: string | null = null;
  let secretarySignatureImageBase64: string | null = null;

  // Load images concurrently with resizing
  await Promise.all([
    schoolLogoUrl ? getImageAsBase64(schoolLogoUrl, 100, 100).then(data => schoolLogoBase64 = data).catch(e => console.error("Error loading school logo:", e)) : Promise.resolve(),
    municipalityEmblemUrl ? getImageAsBase64(municipalityEmblemUrl, 100, 100).then(data => municipalityEmblemBase64 = data).catch(e => console.error("Error loading municipality emblem:", e)) : Promise.resolve(),
    getImageAsBase64(correctSignatureLogo, 100, 100).then(data => signatureLogoBase64 = data).catch(e => console.error("Error loading system signature logo:", e)),
    directorProfile?.signature_image_url ? getImageAsBase64(directorProfile.signature_image_url, 150, 60).then(data => directorSignatureImageBase64 = data).catch(e => console.error("Error loading director signature image:", e)) : Promise.resolve(),
    secretaryProfile?.signature_image_url ? getImageAsBase64(secretaryProfile.signature_image_url, 150, 60).then(data => secretarySignatureImageBase64 = data).catch(e => console.error("Error loading secretary signature image:", e)) : Promise.resolve(),
    QRCode.toDataURL(`${window.location.origin}/validar?id=${transcriptId}`, { width: 128, margin: 2 })
      .then(url => qrCodeDataUrl = url)
      .catch(err => console.error("Error generating QR code for PDF:", err))
  ]);

  // --- HEADER SECTION ---
  const headerStartY = yPos;
  const headerTextX = pageWidth / 2;

  // Municipality Emblem (left)
  if (municipalityEmblemBase64) {
    doc.addImage(municipalityEmblemBase64, "PNG", margin, headerStartY, headerLogoSize, headerLogoSize);
  }

  // School Logo (right)
  if (schoolLogoBase64) {
    doc.addImage(schoolLogoBase64, "PNG", pageWidth - margin - headerLogoSize, headerStartY, headerLogoSize, headerLogoSize);
  }

  // Central Header Text
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`PREFEITURA MUNICIPAL de ${municipalityName.toUpperCase()}`, headerTextX, headerStartY + 5, { align: "center" });
  doc.setFontSize(10);
  doc.text(schoolName.toUpperCase(), headerTextX, headerStartY + 10, { align: "center" });

  if (authorizationDecree || officialGazette) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let authText = "";
    if (authorizationDecree) authText += `Autorização: ${authorizationDecree}`;
    if (authorizationDecree && officialGazette) authText += ` - `;
    if (officialGazette) authText += `D.O.: ${officialGazette}`;
    doc.text(authText, headerTextX, headerStartY + 15, { align: "center" });
  }
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL", headerTextX, headerStartY + 25, { align: "center" });
  yPos = headerStartY + 35; // Update yPos after header

  // --- STUDENT DATA SECTION ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`ALUNO (A): `, margin, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(student.full_name, margin + doc.getTextWidth(`ALUNO (A): `), yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`Mãe: ${student.mother_name || "Não informado"}`, margin, yPos);
  const birthDate = new Date(student.birth_date + 'T00:00:00');
  doc.text(`Data de Nascimento: ${birthDate.toLocaleDateString("pt-BR")}`, pageWidth / 2 + 10, yPos); // Adjusted X for second column
  yPos += 7;
  doc.text(`Pai: ${student.father_name || "Não informado"}`, margin, yPos);
  doc.text(`Naturalidade: ${student.birth_place || "Não informado"} - ${student.birth_state || "BA"}`, pageWidth / 2 + 10, yPos);
  yPos += 10;

  // --- TRIMESTER GRADES SECTION (if applicable) ---
  if (trimesterGrades.length > 0 && student.student_status === "cursando") {
    if (yPos + 50 > pageHeight - margin) { // Check if enough space for table header + some rows
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RENDIMENTO ESCOLAR POR TRIMESTRE", margin, yPos);
    yPos += 5;
    
    if (schoolPeriod && (schoolPeriod.startDate || schoolPeriod.endDate || schoolPeriod.gradeClass || schoolPeriod.shift)) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      let periodText = "";
      if (schoolPeriod.startDate && schoolPeriod.endDate) {
        periodText = `Período: ${schoolPeriod.startDate} a ${schoolPeriod.endDate}`;
      }
      if (schoolPeriod.gradeClass) {
        periodText += periodText ? ` | Ano/Turma: ${schoolPeriod.gradeClass}` : `Ano/Turma: ${schoolPeriod.gradeClass}`;
      }
      if (schoolPeriod.shift) {
        periodText += periodText ? ` | Turno: ${schoolPeriod.shift}` : `Turno: ${schoolPeriod.shift}`;
      }
      doc.text(periodText, margin, yPos);
      yPos += 5;
    }

    const uniqueSubjects = Array.from(new Set(trimesterGrades.map(g => g.subject_name)));
    const trimesterTableBody = uniqueSubjects.map(subject => {
      const t1 = trimesterGrades.find(g => g.subject_name === subject && g.trimester === 1);
      const t2 = trimesterGrades.find(g => g.subject_name === subject && g.trimester === 2);
      const t3 = trimesterGrades.find(g => g.subject_name === subject && g.trimester === 3);
      
      return [
        subject,
        formatGrade(t1?.grade || null),
        t1?.absences.toString() || "-",
        formatGrade(t2?.grade || null),
        t2?.absences.toString() || "-",
        formatGrade(t3?.grade || null),
        t3?.absences.toString() || "-",
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [[
        "Disciplina",
        "I Trim. Nota",
        "Faltas",
        "II Trim. Nota",
        "Faltas",
        "III Trim. Nota",
        "Faltas"
      ]],
      body: trimesterTableBody,
      theme: "grid",
      headStyles: { fillColor: [0, 51, 153], textColor: 255, fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1 },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- ACADEMIC YEARS TABLE SECTION ---
  if (academicYears.length > 0) {
    if (yPos + 50 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ESTUDOS REALIZADOS - ENSINO FUNDAMENTAL", margin, yPos);
    yPos += 5;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Ano", "Ano/Série", "Estabelecimento", "Cidade", "UF"]],
      body: academicYears.map((year) => [
        year.calendar_year.toString(),
        year.grade_level,
        year.school_name,
        year.city,
        year.state,
      ]),
      theme: "grid",
      headStyles: { fillColor: [0, 51, 153], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1 },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- ANNUAL GRADES TABLE SECTION ---
  if (academicYears.length > 0) {
    if (yPos + 50 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL", margin, yPos);
    yPos += 5;

    const sortedYears = [...academicYears].sort((a, b) => {
      const gradeA = parseInt(a.grade_level.match(/\d+/)?.[0] || "0");
      const gradeB = parseInt(b.grade_level.match(/\d+/)?.[0] || "0");
      return gradeA - gradeB;
    });

    const subjectsByCategory = {
      "Base Nacional Comum": new Set<string>(),
      "Base Diversificada": new Set<string>(),
    };

    sortedYears.forEach((year) => {
      const yearGrades = grades[year.id] || [];
      yearGrades.forEach((g) => {
        const category = 
          g.subject_name.includes("Inglês") || 
          g.subject_name.includes("Produção") ||
          g.subject_name.includes("Orientação") ||
          g.subject_name.includes("Socio") 
            ? "Base Diversificada" 
            : "Base Nacional Comum";
        subjectsByCategory[category as keyof typeof subjectsByCategory].add(g.subject_name);
      });
    });

    const bncSubjects = Array.from(subjectsByCategory["Base Nacional Comum"]);
    const bdSubjects = Array.from(subjectsByCategory["Base Diversificada"]);
    const totalSubjectRows = bncSubjects.length + (bdSubjects.length > 0 ? bdSubjects.length : 0);
    
    const tableHeaders: any[] = [];
    
    const headerRow1: any[] = [
      { content: "Componentes Curriculares", rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold', halign: 'center', fontSize: 7 } }
    ];
    
    const cbaYears = sortedYears.filter(y => y.grade_level === "1º Ano" || y.grade_level === "2º Ano");
    const regularYears = sortedYears.filter(y => y.grade_level !== "1º Ano" && y.grade_level !== "2º Ano");

    if (cbaYears.length > 0) {
      headerRow1.push({ 
        content: "CBA", 
        colSpan: cbaYears.length * 3, 
        styles: { halign: 'center', fontStyle: 'bold', fillColor: [200, 200, 200], fontSize: 7 } 
      });
    }
    
    if (regularYears.length > 0) {
      headerRow1.push({ 
        content: "", 
        colSpan: regularYears.length * 3, 
        styles: { border: { top: 0, left: 0, right: 0, bottom: 0 } }
      });
    }

    const headerRow2: any[] = [];
    sortedYears.forEach((year) => {
      const yearLabel = year.grade_level.toUpperCase();
      headerRow2.push({ 
        content: yearLabel, 
        colSpan: 3,
        styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } 
      });
    });

    const headerRow3: any[] = [];
    sortedYears.forEach(() => {
      headerRow3.push(
        { content: "N", styles: { fontSize: 6, fillColor: [0, 51, 153], textColor: 255 } }, 
        { content: "CH", styles: { fontSize: 6, fillColor: [0, 51, 153], textColor: 255 } }, 
        { content: "F", styles: { fontSize: 6, fillColor: [0, 51, 153], textColor: 255 } }
      );
    });

    tableHeaders.push(headerRow1, headerRow2, headerRow3);

    const matrixBody: any[] = [];
    const yearTotals: number[] = new Array(sortedYears.length).fill(0);
    
    const reclassifiedAdded: boolean[] = new Array(sortedYears.length).fill(false);
    
    matrixBody.push([{
      content: "Componentes Curriculares",
      colSpan: 1 + (sortedYears.length * 3),
      styles: { fontStyle: 'bold', halign: 'left', fillColor: [240, 240, 240], fontSize: 7 }
    }]);

    matrixBody.push([{
      content: "Áreas de Conhecimento",
      colSpan: 1 + (sortedYears.length * 3),
      styles: { fontStyle: 'italic', halign: 'left', fillColor: [250, 250, 250], fontSize: 6 }
    }]);

    bncSubjects.forEach((subject) => {
      const row: any[] = [{ content: subject, styles: { fontStyle: 'normal', halign: 'left', fontSize: 6 } }];
      
      sortedYears.forEach((year, yearIndex) => {
        const yearGrades = grades[year.id] || [];
        const gradeData = yearGrades.find((g) => g.subject_name === subject);
        
        if (year.reclassified && !reclassifiedAdded[yearIndex]) {
          reclassifiedAdded[yearIndex] = true;
          
          row.push({ 
            content: "R\nE\nC\nL\nA\nS\nS\nI\nF\nI\nC\nA\nD\nO", 
            colSpan: 1,
            rowSpan: totalSubjectRows,
            styles: { 
              fontSize: 5.5, 
              halign: 'center',
              valign: 'middle',
              cellPadding: 0.5,
              lineHeight: 1.1,
              fillColor: [255, 255, 255],
              lineWidth: { top: 0.1, right: 0, bottom: 0.1, left: 0.1 }
            } 
          });
          
          row.push({ 
            content: "C\nO\nN\nF\nO\nR\nM\nE\n \nL\nE\nI\n \nN\nº\n9\n3\n9\n4\n/\n9\n6", 
            colSpan: 2,
            rowSpan: totalSubjectRows,
            styles: { 
              fontSize: 5.5, 
              halign: 'center',
              valign: 'middle',
              cellPadding: 0.5,
              lineHeight: 1.1,
              fillColor: [255, 255, 255],
              lineWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0 }
            } 
          });
        } else if (year.reclassified) {
          // Already added in first row, skip
        } else if (gradeData) {
          const usesReport = (year.grade_level === "1º Ano" || year.grade_level === "2º Ano") && gradeData.grade === null;
          const gradeCell = usesReport ? "S" : formatGrade(gradeData.grade);
          
          row.push(
            { content: gradeCell, styles: { fontSize: 6, halign: 'center' } },
            { content: gradeData.workload?.toString() || "", styles: { fontSize: 6, halign: 'center' } },
            { content: gradeData.absences.toString() || "0", styles: { fontSize: 6, halign: 'center' } }
          );
          
          yearTotals[yearIndex] += gradeData.workload || 0;
        } else {
          row.push(
            { content: "", styles: { fontSize: 6 } },
            { content: "", styles: { fontSize: 6 } },
            { content: "", styles: { fontSize: 6 } }
          );
        }
      });
      
      matrixBody.push(row);
    });

    if (bdSubjects.length > 0) {
      const bdHeaderRow: any[] = [{ 
        content: "Base Diversificada", 
        styles: { fontStyle: 'bold', halign: 'left', fillColor: [240, 240, 240], fontSize: 7 } 
      }];
      
      sortedYears.forEach((year) => {
        if (year.reclassified) {
          bdHeaderRow.push({ 
            content: "", 
            colSpan: 3,
            styles: { fillColor: [255, 255, 255], lineWidth: 0 } 
          });
        } else {
          bdHeaderRow.push({ 
            content: "", 
            colSpan: 3,
            styles: { fillColor: [240, 240, 240] } 
          });
        }
      });
      
      matrixBody.push(bdHeaderRow);

      bdSubjects.forEach((subject) => {
        const row: any[] = [{ content: subject, styles: { fontStyle: 'normal', halign: 'left', fontSize: 6 } }];
        
        sortedYears.forEach((year, yearIndex) => {
          const yearGrades = grades[year.id] || [];
          const gradeData = yearGrades.find((g) => g.subject_name === subject);
          
          if (year.reclassified) {
            // Already added in first BNC row, skip
          } else if (gradeData) {
            const gradeCell = formatGrade(gradeData.grade);
            
            row.push(
              { content: gradeCell, styles: { fontSize: 6, halign: 'center' } },
              { content: gradeData.workload?.toString() || "", styles: { fontSize: 6, halign: 'center' } },
              { content: gradeData.absences.toString() || "0", styles: { fontSize: 6, halign: 'center' } }
            );
            
            yearTotals[yearIndex] += gradeData.workload || 0;
          } else {
            row.push(
              { content: "", styles: { fontSize: 6 } },
              { content: "", styles: { fontSize: 6 } },
              { content: "", styles: { fontSize: 6 } }
            );
          }
        });
        
        matrixBody.push(row);
      });
    }

    const totalRow: any[] = [{ content: "CARGA HORÁRIA TOTAL", styles: { fontStyle: 'bold', halign: 'left', fontSize: 7 } }];
    sortedYears.forEach((year, yearIndex) => {
      if (year.reclassified) {
        totalRow.push(
          { content: "", styles: { fontSize: 6 } },
          { content: "", styles: { fontSize: 6 } },
          { content: "", styles: { fontSize: 6 } }
        );
      } else {
        totalRow.push(
          { content: "", styles: { fontSize: 6 } },
          { content: yearTotals[yearIndex].toString(), styles: { fontStyle: 'bold', halign: 'center', fontSize: 7 } },
          { content: "", styles: { fontSize: 6 } }
        );
      }
    });
    matrixBody.push(totalRow);

    autoTable(doc, {
      startY: yPos,
      head: tableHeaders,
      body: matrixBody,
      theme: "grid",
      headStyles: { fillColor: [0, 51, 153], textColor: 255, fontSize: 6, fontStyle: 'bold' },
      styles: { fontSize: 6, cellPadding: 0.8, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 35, halign: 'left' }
      },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- CERTIFICATE TEXT SECTION ---
  if (yPos + 50 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  let certificateTitle = "";
  if (student.student_status === "concluído") {
    certificateTitle = "CERTIFICADO DE CONCLUSÃO";
  } else if (student.student_status === "cursando") {
    certificateTitle = "CERTIFICADO DE ESCOLARIDADE";
  } else if (student.student_status === "transferido") {
    certificateTitle = "CERTIFICADO DE TRANSFERÊNCIA";
  } else if (student.student_status === "conservado") {
    certificateTitle = "CERTIFICADO DE MATRÍCULA CONSERVADA";
  } else {
    certificateTitle = "CERTIFICADO DE ESCOLARIDADE"; // Default if status is null
  }
  doc.text(certificateTitle, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(10);
  const currentYear = new Date().getFullYear();
  const lastYear = academicYears.length > 0 ? academicYears[academicYears.length - 1].calendar_year : currentYear;
  const gradeInfo = student.grade_series || "Ensino Fundamental";
  
  let certText1 = "Certificamos que ";
  let certText2 = "";
  let certText3 = ` do Ensino Fundamental de 9 anos, conforme Histórico Escolar.`;
  
  if (student.student_status === "concluído") {
    certText2 = ` concluiu no ano de ${lastYear} o `;
  } else if (student.student_status === "cursando") {
    certText2 = ` está cursando no ano de ${currentYear} o `;
  } else if (student.student_status === "transferido") {
    certText2 = ` foi transferido no ano de ${lastYear} o `;
  } else if (student.student_status === "conservado") {
    certText2 = ` está conservado no ano de ${currentYear} o `;
  } else {
    certText2 = ` está cursando no ano de ${currentYear} o `; // Default if status is null
  }
  
  doc.setFont("helvetica", "normal");
  const fullText = certText1 + student.full_name + certText2 + gradeInfo + certText3;
  const wrappedText = doc.splitTextToSize(fullText, pageWidth - 2 * margin);
  doc.text(wrappedText, pageWidth / 2, yPos, { align: "center" });
  yPos += wrappedText.length * 5 + 10; // Adjusted line height for wrapped text

  // --- SIGNATURES BLOCK ---
  if (yPos + 60 > pageHeight - margin) { // Ensure enough space for signatures
    doc.addPage();
    yPos = margin;
  }

  const signatureBlockStartY = yPos + 10;
  const blockPadding = 5;
  const innerWidth = pageWidth - 2 * margin;
  const col1Width = innerWidth * 0.25; // QR Code
  const col2Width = innerWidth * 0.35; // System Signature
  const col3Width = innerWidth * 0.40; // Individual Signatures

  const col1X = margin;
  const col2X = col1X + col1Width + blockPadding;
  const col3X = col2X + col2Width + blockPadding;

  let maxBlockHeight = 0; // To track the tallest column

  // --- Column 1: QR Code ---
  if (qrCodeDataUrl) {
    const qrCodeSize = 25;
    const qrCodeCenterX = col1X + col1Width / 2;
    doc.addImage(qrCodeDataUrl, "PNG", qrCodeCenterX - qrCodeSize / 2, signatureBlockStartY, qrCodeSize, qrCodeSize);
    doc.setFontSize(smallFontSize);
    doc.setFont("helvetica", "normal");
    doc.text("Escaneie para validar a autenticidade", qrCodeCenterX, signatureBlockStartY + qrCodeSize + 2, { align: "center" });
    maxBlockHeight = Math.max(maxBlockHeight, qrCodeSize + 2 * smallFontSize);
  }

  // --- Column 2: System Digital Signature ---
  let systemSigCurrentY = signatureBlockStartY;
  const systemLogoWidth = 30;
  const systemLogoHeight = (12 / 48) * systemLogoWidth; // Maintain aspect ratio

  if (signatureLogoBase64) {
    const systemLogoCenterX = col2X + col2Width / 2;
    doc.addImage(signatureLogoBase64, "PNG", systemLogoCenterX - systemLogoWidth / 2, systemSigCurrentY, systemLogoWidth, systemLogoHeight);
    systemSigCurrentY += systemLogoHeight + 2;
  }

  doc.setFontSize(boldFontSize);
  doc.setFont("helvetica", "bold");
  
  let signersText = "";
  const signers: string[] = [];
  if (directorProfile?.name) {
    signers.push(`Diretor(a) ${directorProfile.name}`);
  }
  if (secretaryProfile?.name) {
    signers.push(`Secretário(a) ${secretaryProfile.name}`);
  }

  const isSignedBySystem = signers.length > 0;
  if (isSignedBySystem) {
    signersText = `Este documento foi assinado digitalmente por: ${signers.join(' e ')}.`;
  } else {
    signersText = "Este documento ainda não foi assinado digitalmente.";
  }

  const wrappedSignersText = doc.splitTextToSize(signersText, col2Width - 10);
  doc.text(wrappedSignersText, col2X + col2Width / 2, systemSigCurrentY, { align: "center" });
  systemSigCurrentY += wrappedSignersText.length * lineHeight;

  if (isSignedBySystem) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("pt-BR");
    const formattedTime = now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(smallFontSize);
    doc.setFont("helvetica", "normal");
    doc.text(`Assinado em: ${formattedDate} às ${formattedTime}`, col2X + col2Width / 2, systemSigCurrentY + lineHeight, { align: "center" });
    systemSigCurrentY += lineHeight;
    doc.text("Pelo sistema Correct", col2X + col2Width / 2, systemSigCurrentY + lineHeight, { align: "center" });
    systemSigCurrentY += lineHeight;
  }
  maxBlockHeight = Math.max(maxBlockHeight, systemSigCurrentY - signatureBlockStartY);

  // --- Column 3: Individual Signatures (Director & Secretary) ---
  let individualSigCurrentY = signatureBlockStartY;
  const hasDirectorSignature = !!directorProfile;
  const hasSecretarySignature = !!secretaryProfile;
  const numIndividualSignatures = (hasDirectorSignature ? 1 : 0) + (hasSecretarySignature ? 1 : 0);

  if (numIndividualSignatures > 0) {
    const singleSigBlockWidth = (col3Width - (numIndividualSignatures > 1 ? blockPadding : 0)) / numIndividualSignatures;
    const signatureImageWidth = 40; // Fixed width for signature image
    const signatureImageHeight = 16; // Fixed height for signature image
    const signatureLineLength = singleSigBlockWidth - 10; // Line length with padding

    let currentIndividualX = col3X;
    let currentIndividualMaxY = individualSigCurrentY;

    // Director's Signature
    if (hasDirectorSignature) {
      const directorCenterX = currentIndividualX + singleSigBlockWidth / 2;
      let directorElementY = individualSigCurrentY;

      if (directorSignatureImageBase64) {
        doc.addImage(directorSignatureImageBase64, "PNG", directorCenterX - signatureImageWidth / 2, directorElementY, signatureImageWidth, signatureImageHeight);
        directorElementY += signatureImageHeight + 2;
      }
      
      doc.line(currentIndividualX + 5, directorElementY, currentIndividualX + singleSigBlockWidth - 5, directorElementY);
      directorElementY += lineHeight;

      doc.setFontSize(boldFontSize);
      doc.setFont("helvetica", "bold");
      doc.text("Diretor(a)", directorCenterX, directorElementY, { align: "center" });
      directorElementY += lineHeight;

      if (directorProfile?.name) {
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
        const wrappedDirectorName = doc.splitTextToSize(directorProfile.name, signatureLineLength);
        doc.text(wrappedDirectorName, directorCenterX, directorElementY, { align: "center" });
        directorElementY += wrappedDirectorName.length * lineHeight;
      }
      if (directorProfile?.registration_number) {
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
        doc.text(directorProfile.registration_number, directorCenterX, directorElementY, { align: "center" });
        directorElementY += lineHeight;
      }
      currentIndividualMaxY = Math.max(currentIndividualMaxY, directorElementY);
      currentIndividualX += singleSigBlockWidth + blockPadding;
    }

    // Secretary's Signature
    if (hasSecretarySignature) {
      const secretaryCenterX = currentIndividualX + singleSigBlockWidth / 2;
      let secretaryElementY = individualSigCurrentY;

      if (secretarySignatureImageBase64) {
        doc.addImage(secretarySignatureImageBase64, "PNG", secretaryCenterX - signatureImageWidth / 2, secretaryElementY, signatureImageWidth, signatureImageHeight);
        secretaryElementY += signatureImageHeight + 2;
      }

      doc.line(currentIndividualX + 5, secretaryElementY, currentIndividualX + singleSigBlockWidth - 5, secretaryElementY);
      secretaryElementY += lineHeight;

      doc.setFontSize(boldFontSize);
      doc.setFont("helvetica", "bold");
      doc.text("Secretário(a)", secretaryCenterX, secretaryElementY, { align: "center" });
      secretaryElementY += lineHeight;

      if (secretaryProfile?.name) {
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
        const wrappedSecretaryName = doc.splitTextToSize(secretaryProfile.name, signatureLineLength);
        doc.text(wrappedSecretaryName, secretaryCenterX, secretaryElementY, { align: "center" });
        secretaryElementY += wrappedSecretaryName.length * lineHeight;
      }
      if (secretaryProfile?.registration_number) {
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
        doc.text(secretaryProfile.registration_number, secretaryCenterX, secretaryElementY, { align: "center" });
      }
      currentIndividualMaxY = Math.max(currentIndividualMaxY, secretaryElementY);
    }
    maxBlockHeight = Math.max(maxBlockHeight, currentIndividualMaxY - signatureBlockStartY);
  }

  yPos = signatureBlockStartY + maxBlockHeight + 10; // Update yPos after the entire signature block

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const now = new Date();
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const dateStr = `${now.getDate().toString().padStart(2, '0')} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  doc.text(`Luís Eduardo Magalhães - BA, ${dateStr}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // --- OBSERVATIONS SECTION ---
  if (student.observations) {
    if (yPos + 30 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES:", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const obsLines = doc.splitTextToSize(student.observations, pageWidth - 2 * margin);
    doc.text(obsLines, margin, yPos);
    yPos += obsLines.length * 4 + 5;
  }

  // --- LEGEND AND IMPORTANT INFO SECTION ---
  if (yPos + 50 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  } else {
    yPos += 10;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LEGENDA:", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.text("O = Ótimo (9,5 a 10,0) | MB = Muito Bom (8,0 a 9,4) | B = Bom (7,0 a 7,9)", margin, yPos);
  yPos += 5;
  doc.text("R = Regular (5,0 a 6,9) | I = Insuficiente (0,0 a 4,9)", margin, yPos);
  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.text("INFORMAÇÃO IMPORTANTE:", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const infoText = "O Sistema Municipal de Ensino de Luís Eduardo Magalhães, conforme resolução n°005/2018, publicado no diário oficial do município n°858 de 23/10/2018, o Conselho Municipal de Educação adota o Ciclo Básico de Alfabetização, com dois anos de duração, sem retenção ou promoção, no decorrer deste. Faz-se necessário apenas o relatório dos níveis de habilidades do aluno nas competências de leitura, escrita e raciocínio lógico-matemático em anexo.";
  const splitInfo = doc.splitTextToSize(infoText, pageWidth - 2 * margin);
  doc.text(splitInfo, margin, yPos);

  doc.save(`historico_${student.full_name.replace(/ /g, "_")}.pdf`);
};

export const exportToExcel = (
  student: StudentData,
  academicYears: AcademicYearData[],
  grades: { [yearId: string]: GradeData[] },
  trimesterGrades: TrimesterGradeData[]
) => {
  const wb = XLSX.utils.book_new();

  const municipalityName = student.schools?.municipalities?.name || "PREFEITURA MUNICIPAL";
  const schoolName = student.schools?.name || "ESCOLA MUNICIPAL";
  const authorizationDecree = student.schools?.authorization_decree_url || "";
  const officialGazette = student.schools?.official_gazette_url || "";

  const studentInfo = [
    [`PREFEITURA MUNICIPAL de ${municipalityName.toUpperCase()}`],
    [schoolName.toUpperCase()],
    [(authorizationDecree || officialGazette) ? `Autorização: ${authorizationDecree} - D.O.: ${officialGazette}` : ""],
    [""],
    ["HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL"],
    [""],
    ["DADOS DO ALUNO"],
    ["Nome Completo:", student.full_name],
    ["Nome da Mãe:", student.mother_name || "Não informado"],
    ["Nome do Pai:", student.father_name || "Não informado"],
    ["Data de Nascimento:", new Date(student.birth_date).toLocaleDateString("pt-BR")],
    ["Naturalidade:", student.birth_place || "Não informado"],
    ["Estado:", student.birth_state || "BA"],
    ["Status do Aluno:", student.student_status || "N/A"],
    ["Séries Cursadas:", student.grade_series || "N/A"],
    ["Observações:", student.observations || "N/A"],
    [""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(studentInfo);

  let currentRow = studentInfo.length;
  XLSX.utils.sheet_add_aoa(ws, [["ESTUDOS REALIZADOS"]], { origin: { r: currentRow, c: 0 } });
  currentRow++;
  XLSX.utils.sheet_add_aoa(ws, [["Ano", "Série", "Escola", "Cidade", "UF"]], {
    origin: { r: currentRow, c: 0 },
  });
  currentRow++;

  academicYears.forEach((year) => {
    XLSX.utils.sheet_add_aoa(
      ws,
      [[year.calendar_year, year.grade_level, year.school_name, year.city, year.state]],
      { origin: { r: currentRow, c: 0 } }
    );
    currentRow++;
  });

  currentRow += 2;

  academicYears.forEach((year) => {
    const yearGrades = grades[year.id] || [];
    if (yearGrades.length > 0) {
      const totalWorkload = yearGrades.reduce((sum, g) => sum + (g.workload || 0), 0);
      
      XLSX.utils.sheet_add_aoa(ws, [[`${year.grade_level} - ${year.calendar_year}`]], {
        origin: { r: currentRow, c: 0 },
      });
      currentRow++;
      XLSX.utils.sheet_add_aoa(ws, [["Disciplina", "Nota", "C.H.", "Faltas"]], {
        origin: { r: currentRow, c: 0 },
      });
      currentRow++;

      yearGrades.forEach((g) => {
        XLSX.utils.sheet_add_aoa(
          ws,
          [[g.subject_name, formatGrade(g.grade), g.workload || "-", g.absences]],
          { origin: { r: currentRow, c: 0 } }
        );
        currentRow++;
      });
      
      XLSX.utils.sheet_add_aoa(
        ws,
        [["Carga Horária Total", "", `${totalWorkload}h`, ""]],
        { origin: { r: currentRow, c: 0 } }
      );
      currentRow++;
      currentRow += 2;
    }
  });

  XLSX.utils.sheet_add_aoa(ws, [["CERTIFICADO DE CONCLUSÃO"]], { origin: { r: currentRow, c: 0 } });
  currentRow++;
  
  let statusText = "";
  const gradeInfo = student.grade_series ? ` (${student.grade_series})` : "";
  
  if (student.student_status === "concluído") {
    statusText = `Certificamos que ${student.full_name} concluiu o Ensino Fundamental${gradeInfo}.`;
  } else if (student.student_status === "cursando") {
    statusText = `Certificamos que ${student.full_name} está cursando o Ensino Fundamental${gradeInfo}.`;
  } else if (student.student_status === "transferido") {
    statusText = `Certificamos que ${student.full_name} foi transferido(a)${gradeInfo}.`;
  } else if (student.student_status === "conservado") {
    statusText = `Certificamos que ${student.full_name} está com matrícula conservada${gradeInfo}.`;
  } else {
    statusText = `Certificamos que ${student.full_name} está cursando o Ensino Fundamental${gradeInfo}.`; // Default
  }
  
  XLSX.utils.sheet_add_aoa(ws, [[statusText]], { origin: { r: currentRow, c: 0 } });
  currentRow += 2;
  
  XLSX.utils.sheet_add_aoa(ws, [["_____________________", "", "_____________________"]], {
    origin: { r: currentRow, c: 0 },
  });
  currentRow++;
  XLSX.utils.sheet_add_aoa(ws, [["Diretor(a)", "", "Secretário(a)"]], {
    origin: { r: currentRow, c: 0 },
  });
  currentRow++;
  if (student.schools?.authorization_decree_url) {
    XLSX.utils.sheet_add_aoa(ws, [[student.schools.authorization_decree_url, "", student.schools.official_gazette_url || ""]], {
      origin: { r: currentRow, c: 0 },
    });
  }
  currentRow += 2;
  
  XLSX.utils.sheet_add_aoa(
    ws,
    [[`Luís Eduardo Magalhães - BA, ${new Date().toLocaleDateString("pt-BR")}`]],
    { origin: { r: currentRow, c: 0 } }
  );
  currentRow += 2;

  XLSX.utils.sheet_add_aoa(ws, [["LEGENDA"]], { origin: { r: currentRow, c: 0 } });
  currentRow++;
  XLSX.utils.sheet_add_aoa(
    ws,
    [["O = Ótimo (9,5 a 10,0)", "MB = Muito Bom (8,0 a 9,4)", "B = Bom (7,0 a 7,9)"]],
    { origin: { r: currentRow, c: 0 } }
  );
  currentRow++;
  XLSX.utils.sheet_add_aoa(
    ws,
    [["R = Regular (5,0 a 6,9)", "I = Insuficiente (0,0 a 4,9)"]],
    { origin: { r: currentRow, c: 0 } }
  );

  XLSX.utils.book_append_sheet(wb, ws, `historico_${student.full_name.replace(/ /g, "_")}`);
  XLSX.writeFile(wb, `historico_${student.full_name.replace(/ /g, "_")}.xlsx`);
};