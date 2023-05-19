// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

class FileItem extends vscode.TreeItem {
  constructor(public readonly uri: vscode.Uri) {
    super(uri.fsPath, vscode.TreeItemCollapsibleState.Collapsed);
  }

  contextValue = 'file';
}

class RegionProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined
  > = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      // return the root elements (files) when no element is provided
      if (!vscode.workspace.workspaceFolders) {
        return Promise.resolve([]);
      }
      const files = vscode.workspace.workspaceFolders;
      return Promise.resolve(files.map((file) => new FileItem(file.uri)));
    } else if (element.contextValue === 'file') {
      // when a file node is given, return its regions
      const document = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.fsPath === element.label
      )!;
      const regionLines: vscode.TreeItem[] = [];
      if (document) {
        for (let line = 0; line < document.lineCount; line++) {
          const { text } = document.lineAt(line);
          if (text.includes('#region')) {
            regionLines.push(new vscode.TreeItem(text.trim()));
          }
        }
      }
      return Promise.resolve(regionLines);
    }
    return Promise.resolve([]);
  }

  refresh(element?: vscode.TreeItem): void {
    this._onDidChangeTreeData.fire(element);
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Region Wrapping Handler
  const baseRegionWrapping = vscode.commands.registerCommand(
    'extension.wrapWithRegion',
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return; // No open text editor
      }

      let selection = editor.selection;
      let text = editor.document.getText(selection);

      //Prompt user to enter region name
      const regionName = await vscode.window.showInputBox({
        prompt: 'Enter the region name.',
      });

      if (!regionName) {
        return;
      }

      const wrappedCode = `// #region ${regionName}\n${text}\n// #endregion`;

      // Replace selection with wrapped version.
      editor.edit((editBuilder) => editBuilder.replace(selection, wrappedCode));
      // format the document
      await vscode.commands.executeCommand('editor.action.formatDocument');
    }
  );

  // Regions on Explorer Provider setup
  const regionTreeCreate = vscode.window.createTreeView('regionTreeView', {
    treeDataProvider: new RegionProvider(),
    showCollapseAll: true,
  });

  // Region Tree change handler and Refresh
  const onRegionChangeHandler = vscode.window.createTreeView('regionTreeView', {
    treeDataProvider: new RegionProvider(),
    showCollapseAll: true,
  });

  context.subscriptions.push(
    baseRegionWrapping,
    regionTreeCreate,
    onRegionChangeHandler
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
