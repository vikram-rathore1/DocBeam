function BeamDoc(title='', text='', language='text') {

    // this.state = Automerge.from({
    //     title: new Automerge.Text(title),
    //     text: new Automerge.Text(text),
    //     language: language
    // });
    this.state = Automerge.init();

    this.setTitle = function(newTitle, callback) {
        const patches = getPatches(this.state.title.toString(), newTitle);
        let nextState = Automerge.change(this.state, doc => {
            patches.forEach(patch => {
                let index = patch.start1;
                patch.diffs.forEach(diff => {
                    switch (diff[0]) {
                        case 1:
                            doc.title.insertAt(index, ...diff[1].split(''));
                        case 0:
                            index += diff[1].length;
                            break;
                        case -1:
                            doc.title.deleteAt(index, diff[1].length);
                            break;
                    }
                });
            });
        });
        let changes = Automerge.getChanges(this.state, nextState);
        this.state = nextState;
        callback(nextState, changes);
    };

    this.setText = function(newText, callback) {
        const patches = getPatches(this.state.text.toString(), newText);
        let nextState = Automerge.change(this.state, doc => {
            patches.forEach(patch => {
                let index = patch.start1;
                patch.diffs.forEach(diff => {
                    switch (diff[0]) {
                        case 1:
                            doc.text.insertAt(index, ...diff[1].split(''));
                        case 0:
                            index += diff[1].length;
                            break;
                        case -1:
                            doc.text.deleteAt(index, diff[1].length);
                            break;
                    }
                });
            });
        });
        let changes = Automerge.getChanges(this.state, nextState);
        this.state = nextState;
        callback(nextState, changes);
    };

    this.setLanguage = function(newLanguage, callback) {
        let nextState = Automerge.change(this.state, doc => {
            doc.language = newLanguage;
        });
        let changes = Automerge.getChanges(this.state, nextState);
        this.state = nextState;
        callback(nextState, changes);
    };

    this.applyChanges = function(changes) {
        this.state = Automerge.applyChanges(this.state, changes);
    };

    this.getTitle = function() {
        return this.state.title.toString();
    };

    this.getText = function() {
        return this.state.text.toString();
    };

    this.getLanguage = function() {
        return this.state.language;
    };

    this.getStateString = function() {
        return Automerge.save(this.state);
    };

    this.catchUp = function(stateString) {
        this.state = Automerge.load(stateString);
    }

}