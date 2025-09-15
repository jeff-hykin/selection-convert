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

const getConverters = async () => {
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
    return {converters, converterKeys }
}
const callConverter = async (converter) => {
    const editor = vscode.window.activeTextEditor
    const selectionsAndResults = []
    for (const selection of editor.selections) {
        const selectedText = editor.document.getText(selection)
        try {
            const result = await converter(selectedText)
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
}

const knownConverters = {}
const addConvertersAsCommands = async (context, {converters, converterKeys}) => {
    const wereRegisteredKeys = [...Object.keys(knownConverters)]
    const maybeUnregisterdKeys = [...converterKeys] 
    const alreadyRegisteredKeys = []
    const needToSendToJson = []
    let needToUpdatePackageJson = false
    for (const converterKey of maybeUnregisterdKeys) {
        if (wereRegisteredKeys.includes(converterKey)) {
            alreadyRegisteredKeys.push(converterKey)
            continue
        }
        needToUpdatePackageJson = true
        const commandName = `selection-convert.run ${converterKey}`
        needToSendToJson.push({commandName, commandTitle: `Convert ${converterKey}`})
        // update the known converters
        knownConverters[converterKey] = converters[converterKey]
        context.subscriptions.push(
            vscode.commands.registerCommand(commandName, async () => {
                try {
                    await callConverter(knownConverters[converterKey])
                } catch (error) {
                    vscode.window.showErrorMessage(error.stack)
                    vscode.window.showErrorMessage(error.message)
                }
            })
        )
    }
    registerCommandsToPackageJson(needToSendToJson)

    // for (const converterKey of wereRegisteredKeys) {
    //     if (!alreadyRegisteredKeys.includes(converterKey)) {
    //         // TODO: unregister (not sure what the VS Code API is for this)
    //     }
    // }
}

const projectsPackageJsonPath = path.join(__dirname, "..", "package.json")
let jsonData
function registerCommandsToPackageJson(commands) {
    if (!jsonData) {
        jsonData = JSON.parse(fs.readFileSync(projectsPackageJsonPath, 'utf8'))
    }
    const jsonBefore = JSON.stringify(jsonData)
    if (!jsonData.contributes) {
        jsonData.contributes = {}
    }
    if (!jsonData.contributes.commands) {
        jsonData.contributes.commands = []
    }
    for (const {commandName, commandTitle} of commands) {
        jsonData.contributes.commands = jsonData.contributes.commands.filter(each => each.command != commandName)
        jsonData.contributes.commands.push({
            "command": commandName,
            "title": commandTitle,
        })
    }
    const jsonAfter = JSON.stringify(jsonData)
    if (jsonBefore != jsonAfter) {
        fs.writeFileSync(projectsPackageJsonPath, JSON.stringify(jsonData, null, 4))
        vscode.window.showInformationMessage(`Reload window to see new commands!`)
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
module.exports = {
    async activate(context) {
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
                    let {converters, converterKeys} = await getConverters()
                    addConvertersAsCommands(context, {converters, converterKeys}).catch(vscode.window.showErrorMessage)
                    
                    if (converterKeys.length === 0) {
                        await openConverters()
                        vscode.window.showErrorMessage("Please define your custom converters first.")
                        return
                    }

                    const selectedConvertKey = await vscode.window.showQuickPick(converterKeys)
                    
                    if (!selectedConvertKey) {
                        return
                    }
                    
                    await callConverter(converters[selectedConvertKey])
                } catch (error) {
                    vscode.window.showErrorMessage(error)
                }
            })
        )

        // 
        // register list of commands
        // 
        addConvertersAsCommands(context, await getConverters()).catch(vscode.window.showErrorMessage)
    },
    deactivate() {},
}
