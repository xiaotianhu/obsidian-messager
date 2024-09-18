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
    // lang: cn / en  created: unix timestamp in seconds
    formatDate(format: string, lang: string = "cn", created: number = 0): string {
        let now: Date
        if (created < 1) {
            now = new Date()
        } else {
            now = new Date(created * 1000);
        }
        const tokens: { [key: string]: number } = {
            'y': now.getFullYear(),         // 四位年份
            'm': now.getMonth() + 1,        // 月份，0 开始所以加 1
            'd': now.getDate(),             // 日
            'h': now.getHours(),            // 24 小时制小时
            'i': now.getMinutes(),          // 分钟
            's': now.getSeconds(),          // 秒
            'w': now.getDay(),              // 星期，0是星期日
        };

        const weekdays = {
            cn: ['日', '一', '二', '三', '四', '五', '六'],
            en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        };

        // 辅助函数，确保所有单数字的时间值以两位数字形式显示
        const pad = (value: number): string => value.toString().padStart(2, '0');
        //return format.replace(/y|m|d|h|i|s/g, match => pad(tokens[match]));
        return format.replace(/y|m|d|h|i|s|w|W/g, match => {
            if (match === 'w') {
                return lang === 'cn' ? "周"+weekdays.cn[tokens.w as number] : weekdays.en[tokens.w as number].slice(0, 3);
            }
            if (match === 'W') {
                return lang === 'cn' ? `星期${weekdays.cn[tokens.w as number]}` : weekdays.en[tokens.w as number];
            }
            return pad(tokens[match] as number);
        });
    }

    // if string needed tobe formated
    formatDateInStr(str: string, createdAt: number): string {
        let lang = this.detectLang()
        return str.replace(/\{([^}]+)\}/g, (match, p1) => this.formatDate(p1, lang, createdAt));
    }

    // detect language, returns  cn or en 
    detectLang(): string {
        let lang = window.localStorage.getItem('language');
        if (lang == "zh" || lang == "zh-cn" || lang == "zh-TW") {
		    return "cn"
        } 
        return "en"
    }

    now(): number {
        return Math.floor(Date.now() / 1000);
    }
}
