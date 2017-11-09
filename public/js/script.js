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

app.events = () => {
    selectElm('.csv-form')
        .addEventListener('submit', function(e) {
            e.preventDefault();
            const files = this.csv.files;
            if(files.length > 0) {
                app.uploadFile(files[0],'csv')
                    .then((res) => {
                        console.log(res);
                    });
            }
        });
    selectElm('.pdf-form')
        .addEventListener('submit', function(e) {
            e.preventDefault();
            const files = this.pdf.files;
            if(files.length > 0) {
                app.uploadFile(files[0],'pdf')
                    .then((res) => {
                        console.log(res);
                    });
            }
        });
};

app.init = () => {
    app.events();
};

window.onload = app.init;