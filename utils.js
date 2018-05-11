const fs = require('fs');
const fdf = require('fdf');
const csvToJson = require('csvtojson');
const fse = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');

const createPdf = (data,dest,tempFdfName) => {
    return new Promise((resolve,reject) => {
        const formData = fdf.generate(data);
        fs.writeFile(tempFdfName,formData,'utf8',(err) => {
            if (err) reject();
            // pdftk form.pdf fill_form data.fdf output form_final.pdf flatten
            const pdftk = spawn('pdftk', [dest,'fill_form',tempFdfName,'output', `${dest.replace('.pdf','_filled.pdf')}`,'flatten']);

            pdftk.on('close',(code) => {
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

const splitArray = (array,limit) => {
    //Input array [1,2,3,4,5,6,7,8]
    //Output
    // [
    //     [1,2,3]
    //     [4,5,6]
    //     [7,8]
    // ]
    const newArray = [];
    while(array.length > 0) {
        newArray.push(array.splice(0,limit))
    }
    return newArray;
}


const batchBuild = (data,pdfFile) => {
    return data.reduce((p,file) => {
        return p.then(async () => {
            await fse.copy(pdfFile, file.destinationPdf);
            await createPdf(file.data, file.destinationPdf, file.tempFdfName);
            await cleanUp([file.destinationPdf, file.tempFdfName]);
        });
    }, Promise.resolve())



    // return batches.map((smallBatch) => {
    //     return new Promise((resolve,reject) => {
    //         Promise.all(smallBatch.map((file) => new Promise(async (resolve) =>{ 
    //             await fse.copy(pdfFile,file.destinationPdf);
    //             await createPdf(file.data, file.destinationPdf, file.tempFdfName);
    //             await cleanUp([file.destinationPdf,file.tempFdfName]);
    //             resolve();
    //         })))
    //         .then(resolve)
    //         .catch(reject);
    //     });
    // });
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
    return new Promise((resolve,reject) => {
        const dirPath = `${path.resolve()}/tmp/${sessionID}_output`;
        if(!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    
        const pdfs = [];
        const fileData = [];
        csvToJson()
            .fromFile(csvFile)
            .on('json', (data) => {
                const mappedFields = {};
                for(let key in fields) {
                    mappedFields[key] = data[fields[key]]
                }
                const fileName = Object.keys(mappedFields)[0];
                const destinationPdf = `${dirPath}/${mappedFields[fileName]}.pdf`;
                const tempFdfName = `${dirPath}/${mappedFields[fileName].toLowerCase().replace(' ', '_')}.fdf`;
                fileData.push({
                    data: mappedFields,
                    fileName,
                    destinationPdf,
                    tempFdfName
                });
            })
            .on('done',(err) => {
                const pdfs = batchBuild(fileData,pdfFile);
                pdfs
                    .then(() => {
                        zipUp(`./tmp/${sessionID}_output`)
                            .then(async (fileName) => {
                                await cleanUp([csvFile,pdfFile]);
                                resolve(fileName);
                            })
                            .catch(reject);
                    })
                    .catch(console.log);
            });
    });
};

exports.removeDownloadFiles = async (zipPath,sessionID) => {
    const dir = zipPath.replace('.zip', '');
    //Remove Zip file
    await cleanUp([zipPath]);
    //Remove folder
    fs.readdir(dir,async (err,files) => {
        await cleanUp(files.map(file => `${path.resolve()}/tmp/${sessionID}_output/${file}`));
        fs.rmdirSync(dir);
    });

};