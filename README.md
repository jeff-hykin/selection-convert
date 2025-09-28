# VSC Selection Convert

Convert selected text by your custom script.

## Getting started

1. Install this VS Code extension `selection-convert`
2. Open `Command Palette` (CMD/CTRL + P), and type `Selection Convert: Add/edit Converters`
3. A file in your home folder `.vscode/selection-convert.js` will be created and opened automatically (example below).
4. Add a function (examples below).
5. Select some text.
6. Open `Command Palette` (CMD/CTRL + P), and type `Selection Convert: Convert Selected Text`
7. Pick the name of the function you just made, and volia the text will be transformed.


## Custom Converter Examples:

```js
const vscode = require("vscode")
module.exports = {
    // basic
    sortLinesByLength(text) {
        return text.split(/\n/g).sort((a,b)=>b.length-a.length).join("\n")
    },
    // take advantage of user input
    deleteSpecificWords: async (text) => {
        const userInput = await vscode.window.showInputBox("CSV of words to remove")
        const pattern = new RegExp("\\b(" + userInput.split(",").join("|") + ")\\b", "g")
        // debugging
        await vscode.window.showInformationMessage(`regex is ${pattern}`)
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
