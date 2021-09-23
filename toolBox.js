
/*
    This class is used to assign function to every button on the toolbox
    using a function array
*/
class ToolBox {
    constructor() {
        this.buttons = []
    }

    /*
        Adds a new button functionality to the buttons array
        needs a divId, a function that is called when clicked
        and a type (that can be click or toggle)
    */
    addButton(divId, execFunction, type = 'click', extraInfo = undefined) {
        let button = {
            div: document.getElementById(divId),
            execFunction: execFunction,
            type: type,
            enabled: false,
            extraInfo: extraInfo
        }

        button['div'].onclick = function () {
            if (button['type'] === 'toggle') {
                this.buttons.forEach((buttonAux) => {
                    if (buttonAux['type'] === 'toggle') {
                        buttonAux['enabled'] = false
                    }
                })

                button['enabled'] = true
            }

            execFunction(extraInfo)
        }

        this.buttons.push(button)
    }
}