// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode")
const path = require("path")
const fs = require("fs")

/**
 * Deep iterate objects
 *
 * @param {Object} obj - Any object
 * @return {string[][]} lists of key-lists
 *
 * @example
 *
 *     recursivelyAllKeysOf({ a: { b: 1} })
 *     >>> [
 *         [ 'a', ],
 *         [ 'a', 'b' ],
 *     ]
 */
const recursivelyAllKeysOf = (obj) => {
    // if not an object then add no attributes
    if (!(obj instanceof Object)) {
        return []
    }
    // else check all keys for sub-attributes
    const output = []
    for (let eachKey of Object.keys(obj)) {
        try {
            // add the key itself (alone)
            output.push([eachKey])
            // add all of its children
            let newAttributes = recursivelyAllKeysOf(obj[eachKey])
            // if nested
            for (let eachNewAttributeList of newAttributes) {
                // add the parent key
                eachNewAttributeList.unshift(eachKey)
                output.push(eachNewAttributeList)
            }
        } catch (error) {
            console.warn(`warning: Issue getting children of ${obj}`)
        }
    }
    return output
}

const homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
const dotVscode = path.join(homePath, ".vscode")
const examplePath = path.join(__dirname, "selection-convert.js")
const convertersPath = path.join(dotVscode, "selection-convert.js")

const openConverters = async () => {
    // create file if needed
    if (!fs.existsSync(convertersPath)) {
        fs.mkdirSync(dotVscode, { recursive: true })
        fs.copyFileSync(examplePath, convertersPath)
    }
    const document = await vscode.workspace.openTextDocument(convertersPath)
    vscode.window.showTextDocument(document)
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
module.exports = {
    activate(context) {
        console.log('"selection-convert" is now active!')
        
        // 
        // edit converters
        // 
        context.subscriptions.push( // NOTE: I'm not sure why (or even if) this needs to be attached to context.subscriptions
            vscode.commands.registerCommand("selection-convert.addConverter", openConverters)
        )

        // 
        // use converters
        // 
        context.subscriptions.push(
            vscode.commands.registerCommand("selection-convert.convertSelectedText", async () => {
                // needs a selection
                if (!vscode.window.activeTextEditor) {
                    return
                }
                
                try {
                    let converters
                    try {
                        delete require.cache[require.resolve(convertersPath)]
                        converters = require(convertersPath)
                    } catch (e) {
                        if (!fs.existsSync(convertersPath)) {
                            await openConverters()
                            vscode.window.showErrorMessage("Please define your custom converters first.")
                        } else {
                            await openConverters()
                            vscode.window.showErrorMessage(`There's an issue loading the converters: ${e}`)
                        }
                        return
                    }

                    const converterKeys = Object.getOwnPropertyNames(converters).filter((k) => typeof converters[k] === "function")

                    if (converterKeys.length === 0) {
                        await openConverters()
                        vscode.window.showErrorMessage("Please define your custom converters first.")
                        return
                    }

                    const selectedConvertKey = await vscode.window.showQuickPick(converterKeys)
                    
                    if (!selectedConvertKey) {
                        return
                    }

                    const converter = converters[selectedConvertKey]
                    const editor = vscode.window.activeTextEditor
                    const selectionsAndResults = []
                    for (const selection of editor.selections) {
                        const selectedText = editor.document.getText(selection)
                        try {
                            const result = converter(selectedText)
                            if (typeof result != 'string') {
                                throw Error(`The ${converter} didn't return a string, instead I got ${result}`)
                            }
                            selectionsAndResults.push([selection, result])
                        } catch (e) {
                            vscode.window.showErrorMessage(e)
                        }
                    }
                    // perform one editor action
                    await editor.edit((builder) => {
                        for (const [ selection, result ] of selectionsAndResults) {
                            builder.replace(selection, result)
                        }
                    })
                } catch (error) {
                    vscode.window.showErrorMessage(error)
                }
            })
        )

    },
    deactivate() {},
}
