// ==========================================
// Excel Service — Import/Export
// ==========================================

const ExcelJS = require('exceljs');

/**
 * Parse student list from uploaded Excel buffer.
 * Expects columns: Roll No, Name
 */
async function parseStudentExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw Object.assign(new Error('Empty workbook'), { statusCode: 400 });

  const students = [];
  const errors = [];
  const seenRolls = new Set();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const rollNo = String(row.getCell(1).value || '').trim();
    const name = String(row.getCell(2).value || '').trim();

    if (!rollNo || !name) {
      errors.push(`Row ${rowNumber}: Missing roll number or name`);
      return;
    }

    if (seenRolls.has(rollNo)) {
      errors.push(`Row ${rowNumber}: Duplicate roll number ${rollNo}`);
      return;
    }

    seenRolls.add(rollNo);
    students.push({ rollNo, name });
  });

  return { students, errors };
}

/**
 * Generate subject results Excel workbook.
 * Columns: Roll No, Name, [Activity scores], Raw Total, Final Out Of 15
 */
async function generateResultsExcel(meta, activities, results, students) {
  const {
    subjectName,
    subjectCode = '',
    className = 'N/A',
    academicYearName = 'N/A',
  } = meta || {};

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PICT CIE Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(subjectName.substring(0, 31));
  const tableHeaderRowIndex = 6;

  // Build columns
  const columns = [
    { header: 'Roll No', key: 'rollNo', width: 15 },
    { header: 'Student Name', key: 'name', width: 30 },
  ];

  activities.forEach((act) => {
    columns.push({
      header: `${act.name} (${act.totalMarks})`,
      key: `act_${act._id}`,
      width: 18,
    });
  });

  columns.push(
    { header: 'Raw Total', key: 'rawTotal', width: 14 },
    { header: 'Max Possible', key: 'maxPossible', width: 14 },
    { header: 'Final Out Of 15', key: 'finalOutOf15', width: 16 }
  );

  sheet.columns = columns;
  // ExcelJS writes headers to row 1 automatically when setting columns; remove it so metadata rows can occupy the top.
  sheet.spliceRows(1, 1);

  // Report metadata shown at top of export
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = `Subject: ${subjectName}${subjectCode ? ` (${subjectCode})` : ''}`;
  sheet.getCell('A1').font = { bold: true, size: 13 };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `Class: ${className}`;
  sheet.getCell('A2').font = { bold: true, size: 11 };

  sheet.mergeCells('A3:D3');
  sheet.getCell('A3').value = `Academic Year: ${academicYearName}`;
  sheet.getCell('A3').font = { bold: true, size: 11 };

  sheet.mergeCells('A4:D4');
  sheet.getCell('A4').value = `Exported On: ${new Date().toLocaleString()}`;
  sheet.getCell('A4').font = { italic: true, size: 10 };

  // Style header
  const headerRow = sheet.getRow(tableHeaderRowIndex);
  headerRow.values = columns.map((col) => col.header);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.alignment = { horizontal: 'center' };

  // Populate rows
  for (const student of students) {
    const result = results.find(
      (r) => r.student.toString() === student._id.toString()
    );

    const row = {
      rollNo: student.rollNo,
      name: student.name,
      rawTotal: result ? result.rawTotal : 0,
      maxPossible: result ? result.maxPossible : 0,
      finalOutOf15: result ? result.finalOutOf15 : 0,
    };

    // Activity breakdown scores
    if (result && result.activityBreakdown) {
      result.activityBreakdown.forEach((ab) => {
        row[`act_${ab.activity}`] = ab.score;
      });
    }

    sheet.addRow(row);
  }

  // Auto-filter
  sheet.autoFilter = {
    from: { row: tableHeaderRowIndex, column: 1 },
    to: { row: tableHeaderRowIndex, column: columns.length },
  };

  return workbook;
}

module.exports = { parseStudentExcel, generateResultsExcel };
