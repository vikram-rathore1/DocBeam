function BeamDoc(title='', text='', language='text') {

    this.state = Automerge.init();

    // update the function like setText, whenever this feature is enabled
    // this.setTitle = function(newTitle, callback) {
    //     const patches = getPatches(this.state.title.toString(), newTitle);
    //     let nextState = Automerge.change(this.state, doc => {
    //         patches.forEach(patch => {
    //             let index = patch.start1;
    //             patch.diffs.forEach(diff => {
    //                 switch (diff[0]) {
    //                     case 1:
    //                         doc.title.insertAt(index, ...diff[1].split(''));
    //                     case 0:
    //                         index += diff[1].length;
    //                         break;
    //                     case -1:
    //                         doc.title.deleteAt(index, diff[1].length);
    //                         break;
    //                 }
    //             });
    //         });
    //     });
    //     let changes = Automerge.getChanges(this.state, nextState);
    //     this.state = nextState;
    //     callback(nextState, changes);
    // };

    this.setText = function(newText, callback) {
        const patches = getPatches(this.state.text.toString(), newText);
        let nextState = Automerge.change(this.state, doc => {
            applyPatches(patches, (pos, val) => {
                doc.text.insertAt(pos, ...val.split(''));
            }, (pos, val) => {
                doc.text.deleteAt(pos, val.length);
            });
        });
        let changes = Automerge.getChanges(this.state, nextState);
        this.state = nextState;
        callback(nextState, changes);
    };

    // todo: these operations e.g. adding chat should be emitted as separate events (if possible. think about offline mode)
    this.setLanguage = function(newLanguage, newLanguageName, callback) {
        let nextState = Automerge.change(this.state, doc => {
            doc.language = newLanguage;
            doc.chats.push({
                sender: alias,
                message: 'changed language to ' + newLanguageName,
                type: 'system'
            });
        });
        let changes = Automerge.getChanges(this.state, nextState);
        this.state = nextState;
        callback(nextState, changes);
    };

    this.pushChat = function(chatMsg, callback) {
        let nextState = Automerge.change(this.state, doc => {
            doc.chats.push({
                sender: alias,
                message: chatMsg,
                type: 'user'
            });
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
    };

    this.getCollaboratorColor = function(alias) {
        if (this.state && this.state.collabs && alias in this.state.collabs)
            return this.state.collabs[alias].color;
        return '#ccc';
    };

    this.getCollaboratorList = function() {
        if (this.state)
            return this.state.collabs;
        return undefined;
    };

    this.getChatList = function() {
        if (this.state)
            return this.state.chats;
        return undefined;
    };

}