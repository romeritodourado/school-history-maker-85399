import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import QRCode from "qrcode"; // Importar a biblioteca qrcode
import correctLogo from "/correct-logo.png"; // Importar o logo principal
import correctSignatureLogo from "@/assets/correct-signature-logo.png"; // Importar o novo logo de assinatura

// Convert image to base64
const getImageAsBase64 = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Needed for cross-origin images
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
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
  full_name: string; // Changed from name
  mother_name: string;
  father_name: string | null;
  birth_date: string; // Changed from birthdate
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
    municipalities: { // Add this nested object
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
  transcriptId: string, // Adicionar transcriptId
  directorProfile?: ProfileData | null, // Novo: Perfil do Diretor
  secretaryProfile?: ProfileData | null // Novo: Perfil do Secretário
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 25; 
  const logoHeight = 25; 
  const logoMargin = 10; 
  const headerTopY = 25; // Ajustado para empurrar o conteúdo para baixo

  let currentTextY = headerTopY; 

  const municipalityName = student.schools?.municipalities?.name || "Não Informado";
  const schoolName = student.schools?.name || "ESCOLA MUNICIPAL";
  const authorizationDecree = student.schools?.authorization_decree_url || "";
  const officialGazette = student.schools?.official_gazette_url || "";
  const schoolLogoUrl = student.schools?.logo_url;
  const municipalityEmblemUrl = student.schools?.municipalities?.emblem_url;

  let schoolLogoBase64: string | null = null;
  let municipalityEmblemBase64: string | null = null;
  let signatureLogoBase64: string | null = null; // Novo: para o logo de assinatura
  let qrCodeDataUrl: string | null = null;

  // Load images concurrently
  await Promise.all([
    schoolLogoUrl ? getImageAsBase64(schoolLogoUrl).then(data => schoolLogoBase64 = data).catch(e => console.error("Error loading school logo:", e)) : Promise.resolve(),
    municipalityEmblemUrl ? getImageAsBase64(municipalityEmblemUrl).then(data => municipalityEmblemBase64 = data).catch(e => console.error("Error loading municipality emblem:", e)) : Promise.resolve(),
    getImageAsBase64(correctSignatureLogo).then(data => signatureLogoBase64 = data).catch(e => console.error("Error loading signature logo:", e)), // Carregar o novo logo
    QRCode.toDataURL(`${window.location.origin}/validar?id=${transcriptId}`, { width: 128, margin: 2 })
      .then(url => qrCodeDataUrl = url)
      .catch(err => console.error("Error generating QR code for PDF:", err))
  ]);

  // Add municipality emblem (left)
  if (municipalityEmblemBase64) {
    doc.addImage(municipalityEmblemBase64, "PNG", logoMargin, headerTopY, logoWidth, logoHeight);
  }

  // Add school logo (right)
  if (schoolLogoBase64) {
    doc.addImage(schoolLogoBase64, "PNG", pageWidth - logoMargin - logoWidth, headerTopY, logoWidth, logoHeight);
  }

  // Central Text Block
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`PREFEITURA MUNICIPAL de ${municipalityName.toUpperCase()}`, pageWidth / 2, currentTextY, { align: "center" });
  currentTextY += 5; 
  currentTextY += 5; 
  doc.text(schoolName.toUpperCase(), pageWidth / 2, currentTextY, { align: "center" });
  currentTextY += 5; 

  if (authorizationDecree || officialGazette) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let authText = "";
    if (authorizationDecree) authText += `Autorização: ${authorizationDecree}`;
    if (authorizationDecree && officialGazette) authText += ` - `;
    if (officialGazette) authText += `D.O.: ${officialGazette}`;
    doc.text(authText, pageWidth / 2, currentTextY, { align: "center" });
    currentTextY += 4; // Line spacing for smaller font
  }

  currentTextY += 5; // Additional space before main title

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL", pageWidth / 2, currentTextY, { align: "center" });
  currentTextY += 10; // Space after main title

  // Update yPos for the rest of the document
  let yPos = currentTextY;

  // Student data section starts here
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`ALUNO (A): `, 15, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(student.full_name, 15 + doc.getTextWidth(`ALUNO (A): `), yPos);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(`Mãe: ${student.mother_name || "Não informado"}`, 15, yPos);
  const birthDate = new Date(student.birth_date + 'T00:00:00');
  doc.text(`Data de Nascimento: ${birthDate.toLocaleDateString("pt-BR")}`, 120, yPos);
  yPos += 7;
  doc.text(`Pai: ${student.father_name || "Não informado"}`, 15, yPos);
  doc.text(`Naturalidade: ${student.birth_place || "Não informado"} - ${student.birth_state || "BA"}`, 120, yPos);
  yPos += 10;

  if (trimesterGrades.length > 0 && student.student_status === "cursando") {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RENDIMENTO ESCOLAR POR TRIMESTRE", 15, yPos);
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
      doc.text(periodText, 15, yPos);
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
      headStyles: { fillColor: [0, 51, 153], textColor: 255 },
      styles: { fontSize: 7 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  if (academicYears.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ESTUDOS REALIZADOS - ENSINO FUNDAMENTAL", 15, yPos);
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
      headStyles: { fillColor: [0, 51, 153], textColor: 255 },
      styles: { fontSize: 8 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  if (academicYears.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL", 15, yPos);
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
      { content: "Base Nacional Comum", rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold', halign: 'center', fontSize: 7 } }
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
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
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
  let xPos = 20;
  const maxWidth = pageWidth - 40;
  
  doc.setFont("helvetica", "normal");
  const text1Width = doc.getTextWidth(certText1);
  doc.setFont("helvetica", "bold");
  const nameTextWidth = doc.getTextWidth(student.full_name);
  doc.setFont("helvetica", "normal");
  const text2Width = doc.getTextWidth(certText2);
  doc.setFont("helvetica", "bold");
  const gradeWidth = doc.getTextWidth(gradeInfo);
  doc.setFont("helvetica", "normal");
  const text3Width = doc.getTextWidth(certText3);
  
  const totalWidth = text1Width + nameTextWidth + text2Width + gradeWidth + text3Width;
  
  if (totalWidth <= maxWidth) {
    xPos = (pageWidth - totalWidth) / 2;
    doc.setFont("helvetica", "normal");
    doc.text(certText1, xPos, yPos);
    xPos += text1Width;
    doc.setFont("helvetica", "bold");
    doc.text(student.full_name, xPos, yPos);
    xPos += nameTextWidth;
    doc.setFont("helvetica", "normal");
    doc.text(certText2, xPos, yPos);
    xPos += text2Width;
    doc.setFont("helvetica", "bold");
    doc.text(gradeInfo, xPos, yPos);
    xPos += gradeWidth;
    doc.setFont("helvetica", "normal");
    doc.text(certText3, xPos, yPos);
    yPos += 20;
  } else {
    doc.setFont("helvetica", "normal");
    const fullText = certText1 + student.full_name + certText2 + gradeInfo + certText3;
    const wrappedText = doc.splitTextToSize(fullText, maxWidth);
    doc.text(wrappedText, pageWidth / 2, yPos, { align: "center" });
    yPos += wrappedText.length * 7 + 20;
  }

  // --- START OF REVISED SIGNATURE BLOCK ---
  const signatureBlockAreaY = yPos + 10; // Starting Y for the entire signature block area
  const columnWidth = (pageWidth - 30) / 3; // Each column width
  const columnMargin = 15; // Left margin for the first column

  // Define heights for elements
  const qrCodeSize = 25; // Adjusted for better fit
  const signatureLogoDisplayWidth = 40;
  const signatureLogoDisplayHeight = (12 / 48) * signatureLogoDisplayWidth; // Maintain aspect ratio (original 48x12)
  const textLineHeight = 4; // Estimated line height for font size 7-9

  // Calculate vertical positions for the central signature block
  // Aim to align the bottom of the QR code text with the bottom of the "Pelo sistema Correct" text
  const baseTextY = signatureBlockAreaY + qrCodeSize + 5; // This will be the Y for the QR code's descriptive text

  // Central Signature (Logo + Text)
  const centralColumnX = columnMargin + columnWidth;
  const centralColumnCenterX = centralColumnX + (columnWidth / 2);

  // Text lines for the digital signature
  const digitalSignatureText1 = signedByText(); // "Este documento..." or actual signers
  const digitalSignatureText2 = "Pelo sistema Correct";

  // Calculate the Y position for the digital signature text to align with QR code text
  // We want the bottom of "Pelo sistema Correct" to be at `baseTextY`
  const peloSistemaTextY = baseTextY;
  const signedByTextY = peloSistemaTextY - textLineHeight - 1; // 1 unit padding
  const signatureLogoY = signedByTextY - signatureLogoDisplayHeight - 3; // 3 units padding
  const centralLineY = signatureLogoY - 5; // 5 units padding above the logo

  doc.line(centralColumnX + 10, centralLineY, centralColumnX + columnWidth - 10, centralLineY); // Line

  if (signatureLogoBase64) {
    const logoX = centralColumnCenterX - (signatureLogoDisplayWidth / 2);
    doc.addImage(signatureLogoBase64, "PNG", logoX, signatureLogoY, signatureLogoDisplayWidth, signatureLogoDisplayHeight);
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(digitalSignatureText1, centralColumnCenterX, signedByTextY, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(digitalSignatureText2, centralColumnCenterX, peloSistemaTextY, { align: "center" });

  // QR Code (Left Column)
  if (qrCodeDataUrl) {
    const qrCodeX = columnMargin + (columnWidth / 2) - (qrCodeSize / 2);
    const qrCodeY = signatureBlockAreaY; // Top of the block area
    doc.addImage(qrCodeDataUrl, "PNG", qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Escaneie para validar a autenticidade", columnMargin + (columnWidth / 2), peloSistemaTextY, { align: "center" });
  }

  // Director and Secretary Signatures (Right Column)
  const rightColumnX = columnMargin + (columnWidth * 2);
  const rightColumnCenterX = rightColumnX + (columnWidth / 2);

  let currentSignatureY = centralLineY; // Start signatures from the same line as the central block's line

  if (directorProfile) {
    doc.line(rightColumnX + 10, currentSignatureY, rightColumnX + columnWidth - 10, currentSignatureY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Diretor(a)", rightColumnCenterX, currentSignatureY + 5, { align: "center" });
    if (directorProfile.name) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(directorProfile.name, rightColumnCenterX, currentSignatureY + 8, { align: "center" });
    }
    if (directorProfile.registration_number) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(directorProfile.registration_number, rightColumnCenterX, currentSignatureY + 11, { align: "center" });
    }
    currentSignatureY += 20; // Space for next signature or date
  }

  if (secretaryProfile) {
    // If director is present, add more space between director and secretary
    if (directorProfile) currentSignatureY += 10;

    doc.line(rightColumnX + 10, currentSignatureY, rightColumnX + columnWidth - 10, currentSignatureY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Secretário(a)", rightColumnCenterX, currentSignatureY + 5, { align: "center" });
    if (secretaryProfile.name) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(secretaryProfile.name, rightColumnCenterX, currentSignatureY + 8, { align: "center" });
    }
    if (secretaryProfile.registration_number) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(secretaryProfile.registration_number, rightColumnCenterX, currentSignatureY + 11, { align: "center" });
    }
    currentSignatureY += 20;
  }

  // Update yPos for the date text, ensuring it's below all signature elements
  yPos = Math.max(peloSistemaTextY + textLineHeight + 5, currentSignatureY) + 10; // Ensure date is below the lowest signature block
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const now = new Date();
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const dateStr = `${now.getDate().toString().padStart(2, '0')} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  doc.text(`Luís Eduardo Magalhães - BA, ${dateStr}`, pageWidth / 2, yPos, { align: "center" });
  // --- END OF REVISED SIGNATURE BLOCK ---

  if (student.observations) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES:", 15, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const obsLines = doc.splitTextToSize(student.observations, pageWidth - 30);
    doc.text(obsLines, 15, yPos);
    yPos += obsLines.length * 4 + 5;
  }

  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 10;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LEGENDA:", 15, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.text("O = Ótimo (9,5 a 10,0) | MB = Muito Bom (8,0 a 9,4) | B = Bom (7,0 a 7,9)", 15, yPos);
  yPos += 5;
  doc.text("R = Regular (5,0 a 6,9) | I = Insuficiente (0,0 a 4,9)", 15, yPos);
  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.text("INFORMAÇÃO IMPORTANTE:", 15, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const infoText = "O Sistema Municipal de Ensino de Luís Eduardo Magalhães, conforme resolução n°005/2018, publicado no diário oficial do município n°858 de 23/10/2018, o Conselho Municipal de Educação adota o Ciclo Básico de Alfabetização, com dois anos de duração, sem retenção ou promoção, no decorrer deste. Faz-se necessário apenas o relatório dos níveis de habilidades do aluno nas competências de leitura, escrita e raciocínio lógico-matemático em anexo.";
  const splitInfo = doc.splitTextToSize(infoText, pageWidth - 30);
  doc.text(splitInfo, 15, yPos);

  doc.save(`historico_${student.full_name.replace(/ /g, "_")}.pdf`);
};