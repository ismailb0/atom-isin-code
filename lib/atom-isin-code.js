'use babel';

import { CompositeDisposable } from 'atom';
var request = require('request');

export default {

  subscriptions: null,
  selectionManager: null,
  isSelectionManagerToggled: false,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-isin-code:displayAssetName': () => this.toggleSelectionManager()
    }));

  },

  deactivate() {
    this.subscriptions.dispose();
    this.selectionSubscriptions.dispose();
    this.selectionManager.dispose();
  },

  toggleSelectionManager() {
    var editor = atom.workspace.getActiveTextEditor();
    if (this.isSelectionManagerToggled) {
      this.selectionManager.dispose();
    } else {
      this.selectionManager = new CompositeDisposable();
      this.selectionManager.add(
        editor.onDidChangeSelectionRange(() => this.displayAssetName())
      )
    }
    this.isSelectionManagerToggled = !this.isSelectionManagerToggled
  },

  serialize() {},

  isAssetNameValid(selection) {
    if (typeof(selection) != "string") {
      return false
    }
    return /([A-Z]{2})([0-9]{10})/g.test(selection)
  },

  displayAssetName() {
    let editor
    if (editor = atom.workspace.getActiveTextEditor()) {
      let selection = editor.getSelectedText()
      if (this.isAssetNameValid(selection)) {
        this.getAssetName(selection).then((response) => {
          this.toggleTooltip(response[0].data[0].name);
        }).catch((error) => {
          console.log("error")
          console.log(error)
        })
      }
    }
  },

  toggleTooltip(assetName) {
    var editor = atom.workspace.getActiveTextEditor()

    const editorView = atom.views.getView(editor);
    const cursorPos = editorView.querySelector('.cursor');

    tooltips = atom.tooltips.add(cursorPos, {
       title: assetName,
       trigger: "manual",
       placement: "bottom",
       template: "<div class='tooltip' role='tooltip'><div class='tooltip-arrow tooltip-arrow-isin-code'></div><div class='tooltip-inner tooltip-inner-isin-code'></div></div>"
    });

    atom.workspace.onDidChangeActivePaneItem(() => {
       tooltips.dispose();
    });
    editor.onDidChangeSelectionRange((event) => {
       tooltips.dispose();
    });
     atom.views.getView(editor).onDidChangeScrollTop(() => {
       tooltips.dispose();
    });
},

  getAssetName(isinCode) {
    return new Promise((resolve, reject) => {
      request.post({
        headers: {
          'Content-Type' : 'text/json'
        },
        url: 'https://api.openfigi.com/v1/mapping',
        json: true,
        body: [{
          idType:'ID_ISIN',
          idValue: isinCode
        }]
      }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve(body)
        } else {
          reject({
            reason: 'Unable to download page'
          })
        }
      })
    });
  }
}
