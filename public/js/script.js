const app = {};
app.fileNames = {
    pdf: '',
    csv: ''
};

function selectElm(selector) {
    const selection = document.querySelectorAll(selector);
    if(selection.length > 1) {
        return selection;
    }
    return selection[0];
}

app.uploadFile = (files,type) => {
    const formData = new FormData();
    formData.append(type,files);
    pubsub.publish('LOADING','');
    return $.ajax({
        url: `/api/${type}`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
    });
};

app.buildLists = (content) => {
    //Build a list with all the pdf fields
    //For each feild put a dataset in there that contains the 
    //csv header info.
    const ul = document.createElement('ul');
    ul.classList.add('field-list');
    const pdf = content.pdf;
    const csv = content.csv;
    const buildBtn = document.createElement('input');
    buildBtn.setAttribute('type','submit');
    buildBtn.value = "Build PDF's";

    pdf.forEach(el => {
        const li = document.createElement('li');
        li.dataset.fieldName = el; 
        li.innerHTML = `
            <p><strong>Field Name:</strong> ${el}</p>
            <input list="${el}"/>
            <datalist id="${el}">
                ${csv.map(option => `
                    <option value="${option.trim()}"/>
                `).join('')}
            </datalist>
        `;
        ul.appendChild(li);
    }); 
    const form = selectElm('.fields form');
    form.appendChild(ul);
    form.appendChild(buildBtn);
    selectElm('.fields')
        .classList.add('show');

};

app.events = () => {
    selectElm('.file-form')
        .addEventListener('submit', function(e) {
            e.preventDefault();
            const csvFiles = this.csv.files;
            const pdfFiles = this.pdf.files;
            if(csvFiles.length > 0 && pdfFiles.length > 0) {                
                $.when(
                    app.uploadFile(csvFiles[0], 'csv'), 
                    app.uploadFile(pdfFiles[0], 'pdf')
                ).then((csv,pdf) => {
                    pubsub.publish('DONE_LOADING', '');                    
                    app.fileNames = {
                        pdf: pdf[0].pdfFile,
                        csv: csv[0].csvFile
                    };
                    app.buildLists({
                        csv: csv[0].headers,
                        pdf: pdf[0].fields
                    });
                });
            }
        });

    selectElm('.build-form')
        .addEventListener('submit', function(e) {
            e.preventDefault();
            //Get all the li and the data from them
            const fieldMatch = {};
            selectElm('.field-list li')
                .forEach(el => {
                    fieldMatch[el.dataset.fieldName] = el.querySelector('input').value;
                })
        
            const request = {
                fields: fieldMatch,
                fileNames: app.fileNames
            };
            //Create and object to send to the api 
            pubsub.publish('LOADING', '');            
            $.ajax({
                url: '/api/create',
                method: 'POST',
                headers: {
                    'Accept' : 'application/json',
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(request)
            })
            .then((res) => {
                pubsub.publish('DONE_LOADING', '');
                window.open(`${location.origin}/api/download?file=${res.fileName.replace('./','')}`,'_blank'); 
            });

        });

    pubsub.subscribe('LOADING', () => {
        selectElm('.loading')
            .classList.add('show');
    });

    pubsub.subscribe('DONE_LOADING', () => {
        selectElm('.loading')
            .classList.remove('show');
    });
   
};

app.init = () => {
    app.events();
};

window.onload = app.init;