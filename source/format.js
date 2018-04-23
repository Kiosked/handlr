function indent(text, spaces) {
    const lines = `${text}`.split("\n");
    lines.forEach((line, index) => {
        let newLine = line;
        for (let i = 0; i < spaces; i += 1) {
            newLine = " " + newLine;
        }
        lines[index] = newLine;
    });
    return lines.join("\n");
}

module.exports = {
    indent
};
