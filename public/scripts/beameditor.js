function BeamEditor(doc, socket, languageSelect, title, textArea) {

    let editor = CodeMirror.fromTextArea(textArea, {
        lineNumbers: true,
        mode: doc.getLanguage(),
        matchBrackets: true,
        showCursorWhenSelecting: true,
        cursorHeight: 0.85
    });

    editor.on("change", function (ins, changeObj) {
        if (doc.getText() === ins.getValue()) return;   // Change event triggered by replication or no changes (paste same text over)
        doc.setText(ins.getValue(), function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    editor.on("cursorActivity", function (ins) {
        // console.log(ins.getCursor().line, ins.getCursor().ch, ins.getSelection());
    });

    title.addEventListener('change', function() {
        doc.setTitle(title.value, function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    languageSelect.addEventListener('change', function() {
        editor.setOption('mode', languageSelect.value);
        doc.setLanguage(languageSelect.value, function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    this.refresh = function() {
        // todo: preserve cursor position as well
        title.value = doc.getTitle();

        let opts = languageSelect.options;
        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === doc.getLanguage()) {
                languageSelect.selectedIndex = i;
                break;
            }
        }

        editor.setValue(doc.getText());
        editor.setOption('mode', languageSelect.value);
    };

}