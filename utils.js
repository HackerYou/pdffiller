const fs = require('fs');
const fdf = require('fdf');
const csvToJson = require('csvtojson');
const fse = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');

const normalizeName = name => name.toLowerCase().replace(' ', '_');

const createPdf = (data,dest,tempFdfName) => {
    return new Promise((resolve,reject) => {
        const formData = fdf.generate(data);
        fs.writeFile(tempFdfName,formData,'utf8',(err) => {
            if (err) reject();
            // pdftk form.pdf fill_form data.fdf output form_final.pdf flatten
            const pdftk = spawn('pdftk', [dest,'fill_form',tempFdfName,'output', `${dest.replace('.pdf','_filled.pdf')}`,'flatten']);
            pdftk.on('close',() => {
                resolve();
            });
        });
    });
};

const zipUp = (folder) => {
    return new Promise((resolve,reject) => {
        const output = fs.createWriteStream(`${folder}.zip`);
        const archive = archiver('zip', {
            zlib: { level: 9 } 
        });
    
        output.on('data', console.log);
        output.on('close', () => {
            console.log('all done')
            resolve(`${folder}.zip`);
        });

        archive.on('warning',console.log);

        archive.on('error', (err) => {
            reject(err);
        });
    
        archive.pipe(output);
        archive.directory(`${folder}/`,false);
        archive.finalize();
    });
};

const cleanUp = (files) => {
    const deletedFiles = files.map((file) => {
        return new Promise((resolve,reject) => {
            fs.unlink(file,resolve);
        });
    });
    return Promise.all(deletedFiles);
};

exports.getCSVHeaders = (csv) => {
    return new Promise((resolve,reject) => {
        fs.readFile(csv,(err,data) => {
            if(err) reject(err);
            const headers = data.toString().split('\n')[0];
            resolve(headers.split(','));
        });
    });
};

exports.getPDFFieldNames = (pdf) => {
    return new Promise((resolve,reject) => {
        const pdftk = spawn('pdftk',[pdf,'dump_data_fields']);
        let buffer = '';
        pdftk.stdout.on('data',(data) => {
            buffer += data.toString();
        });
    
        pdftk.stderr.on('data',(err) => {
            reject(err);
        });

        pdftk.on('close',() => {
            const fieldData = buffer.split('---')
                .filter(line => line !== '')
                .map(line => line.split('\n'))
                .map(line => line[2].split(' ')[1]);
            
            resolve(fieldData);
        });
    });
};

exports.buildPdfs = (csvFile, pdfFile, fields,sessionID) => {
    console.log(csvFile,pdfFile,fields);
    return new Promise((resolve,reject) => {
        const dirPath = `${path.resolve()}/tmp/${sessionID}_output`;
        if(!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    
        const pdfs = [];
    
        csvToJson()
            .fromFile(csvFile)
            .on('json', (data) => {
                pdfs.push(new Promise(async (res,rej) => {
                    const mappedFields = {};
                    for(let key in fields) {
                        mappedFields[key] = data[fields[key]]
                    }
                    const fileName = Object.keys(mappedFields)[0];
                    const destinationPdf = `${dirPath}/${mappedFields[fileName]}.pdf`;
                    const tempFdfName = `${dirPath}/${mappedFields[fileName].toLowerCase().replace(' ', '_')}.fdf`;
        
                    await fse.copy(pdfFile,destinationPdf);
    
                    await createPdf(mappedFields, destinationPdf, tempFdfName);
        
                    await cleanUp([destinationPdf,tempFdfName]);
                    res();
                }));
            })
            .on('done',(err) => {
                Promise.all(pdfs)
                    .then(() => {
                        zipUp(`./tmp/${sessionID}_output`)
                            .then(resolve)
                            .catch(reject);
                    });
            });
    });
};
