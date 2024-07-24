import { App, Plugin, TFolder, TAbstractFile } from 'obsidian';

export interface AppendPluginSettings {
	apikey: string;
	savedFolder: string;
	filenameRule: string;
	conflictFileRule: string;
	refreshInterval: string;
    fixedTitle: string; // not empty if conflictFileRule=fixedTitle
}

export default class Helper {
	 // get all folders of this vault.
	 // @return ['/', 'folder1/folder2/folder3', 'folder1/folder2/folder4' ...]
	getAllFolder(app: App): string[]{
		const rootPath = app.vault.getRoot();
		const directories: TFolder[] = [];
		// 递归遍历文件树
		const traverse = (folder: TFolder) => {
			directories.push(folder);
			folder.children.forEach((child: TAbstractFile) => {
				if (child instanceof TFolder) {
					traverse(child);
				}
			});
		};
		traverse(rootPath);	
		let dirs: string[] = []
		if (directories.length < 1) return dirs;
		for (const k in directories) {
			const dir: TFolder = directories[k];
			dirs.push(dir.path);
		}
		return dirs;
	}

	// add msg to status bar and auto hide
	addStatus(msg: string, plugin: Plugin) {
		const statusBarItemEl = plugin.addStatusBarItem();
		statusBarItemEl.setText(msg);
		setTimeout(() => {
			statusBarItemEl.detach();
		}, 3000);
	}
}
