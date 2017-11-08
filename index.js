const fdf = require('fdf');
const csvToJson = require('csvtojson');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const csv = 'student_info.csv';
const srcPdf = './midpointCheckIn_w_fields.pdf';

const normalizeName = name => name.toLowerCase().replace(' ', '_');

function createPdf(data,dest) {
    return new Promise((resolve,reject) => {
        const formData = fdf.generate(data);
        const tempFdfName = `${path.resolve()}/output/${data.student_name.toLowerCase().replace(' ','_')}.fdf`;

        fs.writeFile(tempFdfName,formData,'utf8',(err) => {
            if (err) reject();
            // pdftk form.pdf fill_form data.fdf output form_final.pdf flatten
            const pdftk = spawn('pdftk', [dest,'fill_form',tempFdfName,'output', `${dest.replace('.pdf','_final.pdf')}`,'flatten']);
            pdftk.on('close',() => {
                resolve();
            })
        });
    });
}

function cleanUp(studentName) {
    fs.unlinkSync(`${path.resolve()}/output/${studentName}.pdf`);
    fs.unlinkSync(`${path.resolve()}/output/${studentName}.fdf`);
}

csvToJson()
    .fromFile(csv)
    .on('json',async (data) => {

        const fields = {
            "student_name": data['Student'],
            "project1_mark": `${Number(data['Project 1']) * 100}%`,
            "project2_mark": `${Number(data['Project 2']) * 100}%`,
            "wakatime_hours": '',
            "test1_mark": `${Number(data['Test 1']) * 100}%`
        };
        console.log(fields)
        const normalizedName = normalizeName(fields.student_name);

        const destinationPdf = `${path.resolve()}/output/${normalizedName}.pdf`;
        
        await fse.copy(srcPdf,destinationPdf);
        console.log(`Starting to create ${destinationPdf}.`);
        
        await createPdf(fields,destinationPdf);

        await cleanUp(normalizedName);

    });