const app = {};

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
    const buildBtn = document.createElement('button');
    buildBtn.innerHTML = "Build PDF's";

    pdf.forEach(el => {
        const li = document.createElement('li');
        li.dataset.fieldName = el; 
        li.innerHTML = `
            <p>${el}</p>
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

            //Create and object to send to the api 
            $.ajax({
                url: '/api/create',
                method: 'POST',
                headers: {
                    'Accept' : 'application/json',
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(fieldMatch)
            })
            .then((res) => {
                window.open(`${location.origin}/api/downlload?file=${res.fileName.replace('./','')}`,'_blank'); 
            });

        });
   
};

app.init = () => {
    app.events();
};

window.onload = app.init;