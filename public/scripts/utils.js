function getPatches(past, present) {
    let dmp = new diff_match_patch();
    let diff = dmp.diff_main(past, present);
    dmp.diff_cleanupSemantic(diff);
    return dmp.patch_make(past, diff);
}

function getNewCursorPos(cursorIndex, past, present) {
    let patches = getPatches(past, present);
    let pos = {line: 0, ch: -1};
    patches.forEach(patch => {
        let index = patch.start1;
        patch.diffs.forEach(diff => {
            switch (diff[0]) {
                case 1:
                    if (index < cursorIndex)
                        cursorIndex += diff[1].length;
                case 0:
                    index += diff[1].length;
                    break;
                case -1:
                    if (index < cursorIndex)
                        cursorIndex -= Math.min(cursorIndex - index, diff[1].length);
                    break;
            }
        });
    });

    for (let i = 0; i < cursorIndex && i < present.length; i++) {
        if (present[i] === '\n') {
            pos.line += 1;
            pos.ch = 0;
        } else pos.ch += 1;
    }
    return pos;
}