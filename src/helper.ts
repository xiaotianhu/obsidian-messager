import { App, Plugin, TFolder, TAbstractFile } from 'obsidian';

export interface AppendPluginSettings {
	apikey: string;
	savedFolder: string;
	filenameRule: string;
	conflictFileRule: string;
	refreshInterval: string;
    fixedTitle: string; // not empty if conflictFileRule=fixedTitle
    contentPrefix: string; // add prefix for each content 
    contentSuffix: string; // add suffix for each content 
    insertPosition: string; // insert_before / insert_after 
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

    // format data string 
    formatDate(format: string): string {
        const now = new Date();
        const tokens: { [key: string]: number } = {
            'y': now.getFullYear(),         // 四位年份
            'm': now.getMonth() + 1,        // 月份，0 开始所以加 1
            'd': now.getDate(),             // 日
            'h': now.getHours(),            // 24 小时制小时
            'i': now.getMinutes(),          // 分钟
            's': now.getSeconds(),          // 秒
        };

        // 辅助函数，确保所有单数字的时间值以两位数字形式显示
        const pad = (value: number): string => value.toString().padStart(2, '0');
        // 替换所有标记的正则表达式，确保传入pad的总是数字
        return format.replace(/y|m|d|h|i|s/g, match => pad(tokens[match]));
    }

    // if string needed tobe formated
    formatDateInStr(str: string): string {
        return str.replace(/\{([^}]+)\}/g, (match, p1) => this.formatDate(p1));
    }
}
