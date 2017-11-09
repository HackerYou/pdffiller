const express = require('express');
const session = require('express-session');
const fs = require('fs');
const uid = require('uid'); 
// Use this store later
// https://www.npmjs.com/package/connect-mongodb-session
const app = express();
const Busboy = require('busboy');

const utils = require('./utils');

app.use(session({
    secret: 'f8a0r80a93r',
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

app.post('/api/csv',(req,res) => {
    const busboy = new Busboy({headers: req.headers});
    const sessID = req.sessionID;
    busboy.on('file',(fieldName, file, fileName) => {
        const tmpFileName = `./tmp/${sessID}_${fileName}`;
        const fileBuffer = fs.createWriteStream(tmpFileName);
        file.on('data',(buffer) => {
            fileBuffer.write(buffer);
        });
        file.on('end',() => {
            req.session.csv = tmpFileName;
            utils.getCSVHeaders(tmpFileName)
                .then(headers => {
                    res.send({
                        headers
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
        file.on('data', (buffer) => {
            fileBuffer.write(buffer);
        });
        file.on('end', () => {
            res.send('pdf uploaded');
        });
    });
    req.pipe(busboy);
});

app.listen(3800);