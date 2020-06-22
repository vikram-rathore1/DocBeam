function BeamEditor(doc, socket, languageSelect, title, textArea) {

    const blinkRate = 500;

    let editor = CodeMirror.fromTextArea(textArea, {
        lineNumbers: true,
        mode: doc.getLanguage(),
        matchBrackets: true,
        showCursorWhenSelecting: true,
        cursorHeight: 1,
        styleSelectedText: true,
        cursorBlinkRate: blinkRate,
        viewportMargin: Infinity
    });

    let marker = undefined;
    let markerInterval = undefined;
    let selectionMarker = undefined;

    editor.on("change", function (ins, changeObj) {
        if (doc.getText() === ins.getValue()) return;   // Change event triggered by replication or no changes (paste same text over)
        doc.setText(ins.getValue(), function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    editor.on("cursorActivity", function (ins) {
        socket.emit('cursor_activity', {
            cursorRow: ins.getCursor().line,
            cursorCol: ins.getCursor().ch,
            selection: [ins.getCursor(true), ins.getCursor(false)]
        });
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
        // sync title
        title.value = doc.getTitle();

        // sync language
        let opts = languageSelect.options;
        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === doc.getLanguage()) {
                languageSelect.selectedIndex = i;
                break;
            }
        }

        // sync text
        let cursorPos = getNewCursorPos(this.getCursorIndex(), editor.getValue(), doc.getText());
        editor.setValue(doc.getText());
        editor.setOption('mode', languageSelect.value);
        editor.setCursor(cursorPos);
    };

    // Find out index of position where cursor is, assuming text is 1-d string
    this.getCursorIndex = function() {
        let cursorPos = editor.getCursor();
        let cursorIndex = cursorPos.ch;
        let line = 0;
        while (line < cursorPos.line) {
            cursorIndex += editor.lineInfo(line).text.length + 1;
            line += 1;
        }
        return cursorIndex;
    };

    this.showPeerCursorActivity = function(cursorInfo) {

        // Clear old cursor & selection
        if (marker !== undefined) marker.clear();
        if (selectionMarker !== undefined) selectionMarker.clear();

        // Create cursor element
        const peerCursorPos = {line: cursorInfo.cursorRow, ch: cursorInfo.cursorCol};
        const peerCursorCoords = editor.cursorCoords(peerCursorPos);
        const cursorElement = document.createElement('span');
        cursorElement.className = 'peer-cursor';
        cursorElement.attributes.peer = 'Vikram Singh';     // todo: name of peer
        cursorElement.style.borderLeftColor = '#ff0000';    // todo: different colors based on person
        cursorElement.style.height = `${(peerCursorCoords.bottom - peerCursorCoords.top)}px`;
        marker = editor.setBookmark(peerCursorPos, { widget: cursorElement });

        // Register cursor blinking behavior
        let show = true;
        markerInterval = setInterval(() => {
            if(show) {
                cursorElement.style.visibility = 'hidden';
                show = false;
            } else {
                cursorElement.style.visibility = 'visible';
                show = true;
            }
        }, blinkRate);

        // Register hover behavior on cursor
        // todo: Add hover tooltip (complete the block below)
        cursorElement.addEventListener('mouseover', function () {
            console.log(cursorElement.attributes.peer);
        });

        // Show peer's text selection
        selectionMarker = editor.markText(cursorInfo.selection[0], cursorInfo.selection[1], {className: "styled-background"});
    };

    this.getEditorInstance = function() {
        return editor;
    };

}
