const express = require('express');
const session = require('express-session');
const fs = require('fs');
const uid = require('uid');
const bodyParser = require('body-parser'); 
// Use this store later
// https://www.npmjs.com/package/connect-mongodb-session
const app = express();
const Busboy = require('busboy');

const utils = require('./utils');

app.use(session({
    secret: process.env.SECRET || 'f8a0r80a93r',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 3600000 //one hour
    },
    genid: function (req) {
        return uid();
    },
}));

app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/api/csv',(req,res) => {
    const busboy = new Busboy({headers: req.headers});
    const sessID = req.sessionID;
    busboy.on('file',(fieldName, file, fileName) => {
        const tmpFileName = `./tmp/${sessID}_${fileName}`;
        const fileBuffer = fs.createWriteStream(tmpFileName);
        req.session.csv = tmpFileName;
        file.on('data',(buffer) => {
            fileBuffer.write(buffer);
        });
        file.on('end',() => {
            req.session.save((err) => {
                utils.getCSVHeaders(tmpFileName)
                    .then(headers => {
                        res.send({
                            headers,
                            csvFile: tmpFileName
                        });
                    });
            });
        });
    });
    req.pipe(busboy);
});

app.post('/api/pdf',(req,res) => {
    const busboy = new Busboy({ headers: req.headers });
    const sessID = req.sessionID;
    busboy.on('file', (fieldName, file, fileName) => {
        const tmpFileName = `./tmp/${sessID}_${fileName}`;        
        const fileBuffer = fs.createWriteStream(tmpFileName);
        req.session.pdf = tmpFileName;      
        file.on('data', (buffer) => {
            fileBuffer.write(buffer);
        });
        file.on('end', () => {
            req.session.save((err) => {
                utils.getPDFFieldNames(tmpFileName)
                    .then(fields => {
                        res.send({
                            fields,
                            pdfFile: tmpFileName
                        });
                    });
            });      
        });
    });
    req.pipe(busboy);
});

app.post('/api/create', (req,res) => {
    const { fields, fileNames } = req.body;
    utils.buildPdfs(fileNames.csv,fileNames.pdf,fields,req.sessionID)
        .then((zipFile) => {            
            res.send({
                success:'File created',
                fileName: zipFile
            });
        });
});

app.get('/api/download',(req,res) => {
    res.download(`${req.query.file}`,() => {
        //Clean up all files
        utils.removeDownloadFiles(req.query.file,req.sessionID);
    });
});

app.listen(3800);