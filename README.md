# VSC Selection Convert

Convert selected text by your custom script.

## Getting started

1. Install `selection-convert`
2. Open `Command Palette`, and type `Convert Selected Text`
3. A file in your home folder `.vscode/selection-convert.js` will be created and opened automatically.
4. Write your custom converting script.
5. Select the text which you want to convert.
6. Redo step 2, this time your custom converters should show up.
7. Pick the one your want to run, and selected text will be replaced.


## Custom Converter Examples:

```js
const vscode = require("vscode")
module.exports = {
    // basic
    sortLinesByLength(text) {
        return text.split(/\n/g).sort((a,b)=>b.length-a.length).join("\n")
    },
    // take advantage of user input
    deleteSpecificWords: (text) => {
        const userInput = await vscode.window.showInputBox("CSV of words to remove")
        const pattern = new RegExp("\\b(" + userInput.split(",").join("|") + ")\\b", "g")
        return text.replace(pattern, "")
    },
    // convert selected text to camel case
    camelCase: (text) => {
        return text.replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase())
    },
    // convert selected text to snake case
    snakeCase: (text) => {
        return text.replace(/(\w)(\w*)/g, (_, first, rest) => first.toLowerCase() + rest.toUpperCase())
    },
    // convert selected text to kebab case
    kebabCase: (text) => {
        return text.replace(/(\w)(\w*)/g, (_, first, rest) => first.toLowerCase() + rest.toLowerCase())
    },
}
```

# Credit

This is an enhanced version of [this extension](https://github.com/klesh/vsc-selection-converter)

# Setup

Everything is detailed in the `documentation/setup.md`!