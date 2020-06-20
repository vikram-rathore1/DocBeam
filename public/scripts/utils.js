function getPatches(past, present) {
    let dmp = new diff_match_patch();
    let diff = dmp.diff_main(past, present);
    dmp.diff_cleanupSemantic(diff);
    return dmp.patch_make(past, diff);
}