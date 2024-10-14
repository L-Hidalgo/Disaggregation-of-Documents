const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const path = require('path');

async function extractDetails(pdfData) {
    const textData = await pdfParse(pdfData);
    const gerenciaMatch = textData.text.match(/Nombre\s*Gerencia\s*:\s*([^\n]+)/i);
    const ubicacionMatch = textData.text.match(/Ubicación\s*del\s*Puesto\s*:\s*([^\n]+)/i);
    const cargoMatch = textData.text.match(/Denominación\s*del\s*Cargo\s*:\s*([^\n]+)/i);

    const normalize = str => str ? str.trim().replace(/\s+/g, ' ') : null;

    return {
        gerencia: normalize(gerenciaMatch ? gerenciaMatch[1] : null),
        ubicacion: normalize(ubicacionMatch ? ubicacionMatch[1] : null),
        cargo: normalize(cargoMatch ? cargoMatch[1] : null),
    };
}

async function splitPdfByCriteria(pdfPath, outputFolder, ranges) {
    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const groupedPdfs = {};

    for (const [start, end, step] of ranges) {
        for (let i = start; i <= end; i += step) {
            const subPdf = await PDFDocument.create();

            for (let pageNum = i; pageNum < i + step && pageNum <= end; pageNum++) {
                const [copiedPage] = await subPdf.copyPages(pdfDoc, [pageNum - 1]);
                subPdf.addPage(copiedPage);
            }

            const subPdfBytes = await subPdf.save();
            const { gerencia, ubicacion, cargo } = await extractDetails(subPdfBytes);

            if (gerencia && ubicacion && cargo) {
                const key = `${gerencia}|${ubicacion}|${cargo}`;
                if (!groupedPdfs[key]) {
                    groupedPdfs[key] = {
                        gerencia,
                        ubicacion,
                        cargo,
                        pdfs: [],
                    };
                }
                groupedPdfs[key].pdfs.push(subPdfBytes);
            } else {
                console.log(`No se encontró gerencia, ubicación o cargo en el rango de páginas ${i} a ${Math.min(i + step - 1, end)}.`);
            }
        }
    }

    for (const { gerencia, ubicacion, cargo, pdfs } of Object.values(groupedPdfs)) {
        const combinedPdf = await PDFDocument.create();

        for (const pdfBytes of pdfs) {
            const tempPdfDoc = await PDFDocument.load(pdfBytes);
            const pages = await combinedPdf.copyPages(tempPdfDoc, tempPdfDoc.getPageIndices());
            pages.forEach(page => combinedPdf.addPage(page));
        }

        const outputFolderGerencia = path.join(outputFolder, gerencia);
        const outputFolderUbicacion = path.join(outputFolderGerencia, ubicacion);
        
        if (!fs.existsSync(outputFolderUbicacion)) {
            fs.mkdirSync(outputFolderUbicacion, { recursive: true });
        }

        const outputFilePath = path.join(outputFolderUbicacion, `${cargo}.pdf`);
        const combinedPdfBytes = await combinedPdf.save();
        fs.writeFileSync(outputFilePath, combinedPdfBytes);
        console.log(`Guardado PDF combinado: ${outputFilePath}`);
    }
}

const pdfPath = '/home/lesly.alvarado/Descargas/MAnuales 202409/GRH-MP-52-01.pdf';
const outputFolder = '/home/lesly.alvarado/Vídeos/DISGREGADOS/GRH-MP-52-01';
const ranges = [
    [1, 12, 2], //inicio, hasta, de dos en dos dividir
    [13, 28, 4],
    [29, 46, 3],
    [47, 48, 2],
    [49, 60, 3],
    [61, 66, 2],
    
];

if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

splitPdfByCriteria(pdfPath, outputFolder, ranges)
    .then(() => console.log('PDF splitting and organizing complete'))
    .catch(err => console.error('Error splitting PDF:', err));
