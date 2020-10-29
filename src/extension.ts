// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {parseBibFile, normalizeFieldValue} from "bibtex";

function parseBib(contents: string, insertTitle: boolean): vscode.CompletionItem[] {
	const bib = parseBibFile(contents);
	
	let completions: vscode.CompletionItem[] = [];
	
	for (const bibkey in bib.entries$) {
		const entry = bib.getEntry(bibkey);
		if (entry === undefined) {
			continue;
		}
		let title = normalizeFieldValue(entry.getField("TITLE"))?.toString();
		if (title === undefined) {
			title = 'No title for ' + bibkey;
		}

		// Completion for just the bib key
		const completion = new vscode.CompletionItem(bibkey);
		if (insertTitle) {
			completion.insertText = title;
		} else {
			completion.insertText = bibkey;
		}
		completion.filterText = bibkey + ' ' + title;
		completion.detail = title;
		completions.push(completion);
	};

	return completions;
}

export function activate(context: vscode.ExtensionContext) {
	const provider = vscode.languages.registerCompletionItemProvider('plaintext', {
		async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
			
			// Completion is provided if bib: or bibt: prefixes are used
			const linePrefix = document.lineAt(position).text.substr(0, position.character);
			if (!linePrefix.endsWith('bib:') && !linePrefix.endsWith('bibt:')) {
				return undefined;
			}
			const insertTitle = linePrefix.endsWith('bibt:');
			
			// Get all bibtex file from workspace
			const uris = await vscode.workspace.findFiles("*.bib");
			let documents:any = [];
			
			// Read contents of these files
			uris.forEach((uri) => {
				let document = vscode.workspace.openTextDocument(uri);
				documents.push(document);
			});

			// Parse these files and generate completion items
			return Promise.all(documents).then((docs) => {
				let allCompletions: vscode.CompletionItem[] = [];
				docs.forEach((doc: any) => {
					const completions = parseBib(doc.getText(), insertTitle);
					allCompletions = allCompletions.concat(completions);
				});
				return allCompletions;
			});
		}
	});

	context.subscriptions.push(provider);

}

export function deactivate() { }
