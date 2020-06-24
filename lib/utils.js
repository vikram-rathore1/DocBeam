module.exports = {
    randomId: (length) => {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    },

    getRandomColorExcept: (usedColors) => {
        const allColors = ['#A93226', '#27AE60', '#0E6251', '#76448A', '#2980B9', '#F1C40F', '#B7950B', '#E67E22'];
        let colorsLeft = allColors.filter(x => !usedColors.includes(x));
        return (colorsLeft.length > 0) ? colorsLeft[Math.floor(Math.random() * colorsLeft.length)] : allColors[Math.floor(Math.random() * allColors.length)];
    }
};