
const fs = require('fs');
const path = require('path');

const connectors = new Set(['de', 'del', 'de la', 'y', 'al', 'la']);

const romanNumeralRegex = /\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i;

function formatName(name) {
    const ext = path.extname(name);
    const baseName = path.basename(name, ext);
    
    const match = baseName.match(romanNumeralRegex);
    const coreName = match ? baseName.slice(0, match.index) : baseName;
    const romanNumerals = match ? match[0] : ''; 

    const formattedBaseName = coreName
        .toLowerCase() 
        .split(' ') 
        .map((word, index) => {
            if (index === 0 || !connectors.has(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word; 
        })
        .join(' ') + romanNumerals; 

    return formattedBaseName + ext.toLowerCase(); 
}

function renameFilesAndFolders(dirPath) {
    fs.readdir(dirPath, (err, items) => {
        if (err) {
            console.error(`Error leyendo el directorio: ${err}`);
            return;
        }

        items.forEach(item => {
            const itemPath = path.join(dirPath, item);
            const newName = formatName(item);
            const newPath = path.join(dirPath, newName);

            fs.stat(itemPath, (err, stats) => {
                if (err) {
                    console.error(`Error obteniendo el estado de ${item}: ${err}`);
                    return;
                }

                if (newPath !== itemPath) {
                    fs.rename(itemPath, newPath, (err) => {
                        if (err) {
                            console.error(`Error renombrando ${item} a ${newName}: ${err}`);
                        } else {
                            console.log(`Renombrado: ${item} -> ${newName}`);
                            if (stats.isDirectory()) {
                                renameFilesAndFolders(newPath); 
                            }
                        }
                    });
                } else {
                    console.log(`El nombre de ${item} no necesita cambios.`);
                }
            });
        });
    });
}

const directoryPath = '/home/lesly.alvarado/Imágenes/DISGREGADOS/GRH-MP-52-01';
renameFilesAndFolders(directoryPath);
