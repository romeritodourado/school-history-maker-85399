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

const formatDateTime = (dateTimeString: string | null) => {
  if (!dateTimeString) return "N/A";
  const date = new Date(dateTimeString);
  return date.toLocaleDateString("pt-BR") + " às " + date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
};

export const exportToPDF = async (
  student: StudentData,
  academicYears: AcademicYearData[],
  grades: { [yearId: string]: GradeData[] },
  trimesterGrades: TrimesterGradeData[],
  schoolPeriod: { startDate: string; endDate: string; gradeClass: string; shift: string } | undefined,
  transcriptId: string,
  directorProfile?: ProfileData | null,
  secretaryProfile?: ProfileData | null,
  directorSignedAt?: string | null, // NOVO
  secretarySignedAt?: string | null, // NOVO
  documentHash?: string | null // NOVO
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // General page margin
  const headerLogoSize = 20; // Reduced logo size for header
  const smallFontSize = 8; // Define small font size
  const boldFontSize = 9; // Define bold font size
  const lineHeight = 4; // Define line height

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

  // --- PDF METADATA ---
  let signatureSubject = "Assinaturas Digitais: ";
  let signatureKeywords: string[] = ["Histórico Escolar", "Assinatura Digital", student.full_name, schoolName];

  if (directorProfile?.name) {
    signatureSubject += `Diretor(a) ${directorProfile.name}`;
    signatureKeywords.push(`Diretor(a) ${directorProfile.name}`);
    if (directorProfile.registration_number) {
      signatureKeywords.push(`Registro Diretor: ${directorProfile.registration_number}`);
    }
    if (directorSignedAt) { // NOVO
      signatureKeywords.push(`Assinado Diretor: ${formatDateTime(directorSignedAt)}`);
    }
  }
  if (secretaryProfile?.name) {
    if (directorProfile?.name) signatureSubject += ", ";
    signatureSubject += `Secretário(a) ${secretaryProfile.name}`;
    signatureKeywords.push(`Secretário(a) ${secretaryProfile.name}`);
    if (secretaryProfile.registration_number) {
      signatureKeywords.push(`Registro Secretário: ${secretaryProfile.registration_number}`);
    }
    if (secretarySignedAt) { // NOVO
      signatureKeywords.push(`Assinado Secretário: ${formatDateTime(secretarySignedAt)}`);
    }
  }
  if (!directorProfile?.name && !secretaryProfile?.name) {
    signatureSubject += "Nenhuma assinatura digital encontrada.";
  }
  if (documentHash) { // NOVO
    signatureKeywords.push(`Hash Documento: ${documentHash}`);
  }

  doc.setProperties({
    title: `Histórico Escolar - ${student.full_name}`,
    author: "Sistema de Histórico Escolar Correct",
    subject: signatureSubject,
    keywords: signatureKeywords.join(", "),
    creator: "Sistema de Histórico Escolar Correct",
  });

  // --- HEADER SECTION ---
  const headerTextX = pageWidth / 2;
  const textAvailableWidth = pageWidth - (margin * 2) - (headerLogoSize * 2) - 20; // 20px padding on each side of text from logo

  // Municipality Emblem (left)
  if (municipalityEmblemBase64) {
    doc.addImage(municipalityEmblemBase64, "PNG", margin, yPos, headerLogoSize, headerLogoSize);
  }

  // School Logo (right)
  if (schoolLogoBase64) {
    doc.addImage(schoolLogoBase64, "PNG", pageWidth - margin - headerLogoSize, yPos, headerLogoSize, headerLogoSize);
  }

  // Central Header Text
  let currentHeaderY = yPos + 5; // Start text a bit below the top of logos

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const municipalityHeaderText = `PREFEITURA MUNICIPAL de ${municipalityName.toUpperCase()}`;
  const wrappedMunicipalityText = doc.splitTextToSize(municipalityHeaderText, textAvailableWidth);
  wrappedMunicipalityText.forEach((line: string) => {
    doc.text(line, headerTextX, currentHeaderY, { align: "center" });
    currentHeaderY += lineHeight;
  });

  // NEW LINE: SECRETARIA MUNICIPAL DA EDUCAÇÃO
  const secretaryHeaderText = "SECRETARIA MUNICIPAL DA EDUCAÇÃO";
  const wrappedSecretaryText = doc.splitTextToSize(secretaryHeaderText, textAvailableWidth);
  wrappedSecretaryText.forEach((line: string) => {
    doc.text(line, headerTextX, currentHeaderY, { align: "center" });
    currentHeaderY += lineHeight;
  });

  doc.setFontSize(10); // School name should be slightly larger than municipality/secretary
  const schoolHeaderText = schoolName.toUpperCase();
  const wrappedSchoolText = doc.splitTextToSize(schoolHeaderText, textAvailableWidth);
  wrappedSchoolText.forEach((line: string) => {
    doc.text(line, headerTextX, currentHeaderY, { align: "center" });
    currentHeaderY += lineHeight;
  });

  if (authorizationDecree || officialGazette) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let authText = "";
    if (authorizationDecree) authText += `Autorização: ${authorizationDecree}`;
    if (authorizationDecree && officialGazette) authText += ` - `;
    if (officialGazette) authText += `D.O.: ${officialGazette}`;
    const wrappedAuthText = doc.splitTextToSize(authText, textAvailableWidth);
    wrappedAuthText.forEach((line: string) => {
      doc.text(line, headerTextX, currentHeaderY, { align: "center" });
      currentHeaderY += lineHeight;
    });
  }
  
  currentHeaderY += 5; // Add some space before the main title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO ESCOLAR - ENSINO FUNDAMENTAL", headerTextX, currentHeaderY, { align: "center" });
  yPos = currentHeaderY + 10; // Update yPos after header, adding a bit more space

  // Ensure yPos is below the lowest part of the header (logos or text)
  const finalHeaderY = Math.max(yPos, margin + headerLogoSize + 5); // +5 for a small buffer
  yPos = finalHeaderY;


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
  if (yPos + 80 > pageHeight - margin) { // Ensure enough space for signatures (increased from 60 to 80)
    doc.addPage();
    yPos = margin;
  }

  // Ajuste de layout: aumentar o espaço entre o texto do certificado e as assinaturas
  yPos += 10;

  // --- SIGNATURES SECTION WITH IMPROVED LAYOUT ---
  const signatureSectionStartY = yPos;
  const signatureSectionHeight = 70; // Altura fixa para a seção de assinaturas
  const signatureSectionWidth = pageWidth - 2 * margin;
  
  // Dividir o espaço em 3 colunas iguais
  const columnWidth = signatureSectionWidth / 3;
  const columnPadding = 5;
  const usableColumnWidth = columnWidth - 2 * columnPadding;
  
  // Coordenadas das colunas
  const col1X = margin + columnPadding;
  const col2X = margin + columnWidth + columnPadding;
  const col3X = margin + 2 * columnWidth + columnPadding;
  
  // Altura máxima para elementos na seção de assinaturas
  const maxSignatureHeight = signatureSectionHeight - 10;

  // --- Column 1: QR Code (movido para cima) ---
  if (qrCodeDataUrl) {
    const qrCodeSize = 20; // Reduzido de 25 para 20
    const qrCodeX = col1X + (usableColumnWidth - qrCodeSize) / 2; // Centralizar
    const qrCodeY = signatureSectionStartY + 5; // Mais próximo do topo
    
    doc.addImage(qrCodeDataUrl, "PNG", qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
    
    // Texto abaixo do QR Code
    doc.setFontSize(6); // Reduzido de smallFontSize para 6
    doc.setFont("helvetica", "normal");
    const qrTextX = col1X + usableColumnWidth / 2;
    let qrTextY = qrCodeY + qrCodeSize + 5;
    doc.text("Escaneie para validar a autenticidade", qrTextX, qrTextY, { align: "center" });
    qrTextY += 3;
    doc.text("Este documento pode ter sua autenticidade confirmada pelo QR Code acima.", qrTextX, qrTextY, { align: "center" });
  }

  // --- Column 2: System Digital Signature ---
  let systemSigCurrentY = signatureSectionStartY + 5;
  const systemLogoWidth = 25; // Reduzido de 30 para 25
  const systemLogoHeight = (12 / 48) * systemLogoWidth; // Manter proporção

  if (signatureLogoBase64) {
    const systemLogoX = col2X + (usableColumnWidth - systemLogoWidth) / 2; // Centralizar
    doc.addImage(signatureLogoBase64, "PNG", systemLogoX, systemSigCurrentY, systemLogoWidth, systemLogoHeight);
    systemSigCurrentY += systemLogoHeight + 2;
  }

  doc.setFontSize(7); // Reduzido de boldFontSize para 7
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
    signersText = `Assinado digitalmente por: ${signers.join(' e ')}.`;
  } else {
    signersText = "Documento não assinado digitalmente.";
  }

  const wrappedSignersText = doc.splitTextToSize(signersText, usableColumnWidth);
  const signersTextX = col2X + usableColumnWidth / 2;
  doc.text(wrappedSignersText, signersTextX, systemSigCurrentY, { align: "center" });
  systemSigCurrentY += wrappedSignersText.length * 3; // Reduzido espaçamento

  if (isSignedBySystem) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("pt-BR");
    const formattedTime = now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(6); // Reduzido de smallFontSize para 6
    doc.setFont("helvetica", "normal");
    const systemTextX = col2X + usableColumnWidth / 2;
    doc.text(`Em: ${formattedDate} às ${formattedTime}`, systemTextX, systemSigCurrentY, { align: "center" }); // NOVO: Adicionado hora
    systemSigCurrentY += 3;
    doc.text("Pelo sistema Correct", systemTextX, systemSigCurrentY, { align: "center" });
  }
  
  if (documentHash) { // NOVO: Exibir hash do documento
    systemSigCurrentY += 3;
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    const hashDisplay = `Hash: ${documentHash.substring(0, 10)}...${documentHash.substring(documentHash.length - 10)}`;
    doc.text(hashDisplay, col2X + usableColumnWidth / 2, systemSigCurrentY, { align: "center" });
  }


  // --- Column 3: Individual Signatures (Director & Secretary) ---
  let individualSigCurrentY = signatureSectionStartY + 5;
  const hasDirectorSignature = !!directorProfile;
  const hasSecretarySignature = !!secretaryProfile;
  
  if (hasDirectorSignature || hasSecretarySignature) {
    const signatureImageWidth = 30; // Reduzido de 40 para 30
    const signatureImageHeight = 12; // Reduzido de 16 para 12
    const signatureLineLength = usableColumnWidth - 10;
    
    // Director's Signature
    if (hasDirectorSignature) {
      const directorCenterX = col3X + usableColumnWidth / 2;
      
      if (directorSignatureImageBase64) {
        const imageX = directorCenterX - signatureImageWidth / 2;
        doc.addImage(directorSignatureImageBase64, "PNG", imageX, individualSigCurrentY, signatureImageWidth, signatureImageHeight);
        individualSigCurrentY += signatureImageHeight + 2;
      }
      
      // Linha de assinatura
      const lineStartX = col3X + 5;
      const lineEndX = col3X + usableColumnWidth - 5;
      doc.line(lineStartX, individualSigCurrentY, lineEndX, individualSigCurrentY);
      individualSigCurrentY += 3;

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Diretor(a)", directorCenterX, individualSigCurrentY, { align: "center" });
      individualSigCurrentY += 3;

      if (directorProfile?.name) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const wrappedDirectorName = doc.splitTextToSize(directorProfile.name, signatureLineLength);
        doc.text(wrappedDirectorName, directorCenterX, individualSigCurrentY, { align: "center" });
        individualSigCurrentY += wrappedDirectorName.length * 2.5;
      }
      if (directorProfile?.registration_number) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(`Registro: ${directorProfile.registration_number}`, directorCenterX, individualSigCurrentY, { align: "center" }); // Adicionado "Registro:"
        individualSigCurrentY += 3;
      }
      
      // Adicionar data e hora da assinatura do diretor (using directorSignedAt)
      if (directorSignedAt) { // ATUALIZADO
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(`Assinado em: ${formatDateTime(directorSignedAt)}`, directorCenterX, individualSigCurrentY, { align: "center" });
        individualSigCurrentY += 3;
      }
    }

    // Secretary's Signature (adicionar espaço antes se houver diretor)
    if (hasDirectorSignature && hasSecretarySignature) {
      individualSigCurrentY += 5;
    }

    if (hasSecretarySignature) {
      const secretaryCenterX = col3X + usableColumnWidth / 2;
      
      if (secretarySignatureImageBase64) {
        const imageX = secretaryCenterX - signatureImageWidth / 2;
        doc.addImage(secretarySignatureImageBase64, "PNG", imageX, individualSigCurrentY, signatureImageWidth, signatureImageHeight);
        individualSigCurrentY += signatureImageHeight + 2;
      }
      
      // Linha de assinatura
      const lineStartX = col3X + 5;
      const lineEndX = col3X + usableColumnWidth - 5;
      doc.line(lineStartX, individualSigCurrentY, lineEndX, individualSigCurrentY);
      individualSigCurrentY += 3;

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Secretário(a)", secretaryCenterX, individualSigCurrentY, { align: "center" });
      individualSigCurrentY += 3;

      if (secretaryProfile?.name) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const wrappedSecretaryName = doc.splitTextToSize(secretaryProfile.name, signatureLineLength);
        doc.text(wrappedSecretaryName, secretaryCenterX, individualSigCurrentY, { align: "center" });
        individualSigCurrentY += wrappedSecretaryName.length * 2.5;
      }
      if (secretaryProfile?.registration_number) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(`Registro: ${secretaryProfile.registration_number}`, secretaryCenterX, individualSigCurrentY, { align: "center" }); // Adicionado "Registro:"
        individualSigCurrentY += 3;
      }
      
      // Adicionar data e hora da assinatura do secretário (using secretarySignedAt)
      if (secretarySignedAt) { // ATUALIZADO
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text(`Assinado em: ${formatDateTime(secretarySignedAt)}`, secretaryCenterX, individualSigCurrentY, { align: "center" });
      }
    }
  }

  // Atualizar yPos após a seção de assinaturas
  yPos = signatureSectionStartY + signatureSectionHeight + 10;

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