import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, requestUrl, Setting, TFile } from 'obsidian';
import AppendPlugin from './main';
import Helper,{ AppendPluginSettings } from "./helper";
import Lang from './lang';
import Message from './message';

interface RespMsg {
    title: string
	content: string
	id: number
    createdAt: number
}

export default class Note {
	lang: Lang;
	app: App;
	plugin: AppendPlugin;
	helper: Helper;

	constructor(app: App, plugin:  AppendPlugin) {
		this.lang   = new Lang;
		this.app    = app;
		this.plugin = plugin;
		this.helper = new Helper
	}

	// get message and save to vault
	async getAndSaveMessage(isVerify: boolean) {
		try {
            if (this.plugin.settings == null || 
                this.plugin.settings.apikey == null || 
                this.plugin.settings.apikey == "") {
                throw Error(this.lang.PH_APIKEY);
            }
			let note = new Note(this.app, this.plugin);
			let messages = await (new Message).getMessage(this.plugin.settings.apikey, isVerify);
			for (let k in messages) {
				let msg = messages[k] as RespMsg;
                if (typeof msg == "undefined" || msg.content == null || msg.content.length < 1) {
                    console.error("get msg err, empty content.", msg);
                    continue;
                }
                let content = msg["content"];
                // if msg is a link of image, save it to local.
                if (this.judgeImageMessage(content)) {
                    content = await this.saveImage(this.plugin.settings, content);
                }
                // process prefix/suffix if setting exists
                content = this.dealPrefixOrSuffix(content, msg["createdAt"]);

                let title = msg["title"];
                if (title != null && title.length > 1) {
                    title = this.filterTitle(title) + ".md";
                }

                await note.addNote(this.plugin.settings, content, title, msg["createdAt"]);
			}
		} catch (err) {
            console.error("getAndSaveMessage err:", err);
			throw err
		}
	}

	// add note to vault
	async addNote(setting: AppendPluginSettings, note: string, title: string, created: number) {
        if (title == null || title.length < 1) {
		    title = this.getTitle(setting, note, created);
        }

        let savedFolder = setting.savedFolder ?? "/"
        let fullpath = ""
        if (savedFolder[savedFolder.length - 1] == "/") {
            if (savedFolder == "/") {
		        fullpath = title;
            } else {
		        fullpath = savedFolder + title;
            }
        } else if (savedFolder.length < 1) {
		    fullpath = title;
        } else {
		    fullpath = savedFolder + "/" + title;
        }
		try {
			// append mode default
			if (setting.conflictFileRule == null ||
                setting.conflictFileRule == "append" || 
                setting.conflictFileRule.length < 1) {
				if (this.fileExists(fullpath) ) {
					let originFile = this.app.vault.getAbstractFileByPath(fullpath)
					if (originFile instanceof TFile) {
						let originData = await this.app.vault.read(originFile);
                        var newData = ""
                        if (setting.insertPosition != null && setting.insertPosition == "beginning") {
						    newData = note + "\n" + originData;
                        } else {
                            // default insert at the end.
						    newData = originData + "\n" + note;
                        }
						await this.app.vault.modify(originFile, newData);
                        return
					} else {
						// error, should'n be here
						new Notice(this.lang.ERROR + "file:" + fullpath + " not exist with append mode.");
                        return
					}
				} else {
					// file not exist, just add it 
					await this.app.vault.create(fullpath, note);
                    return
				}
			} else {
			    // new file mode
				await this.app.vault.create(fullpath, note);
			}
        
			this.helper.addStatus("new message to note:"+fullpath, this.plugin);
		} catch (err) {
			console.error("MessageToObsidian addNote exception:", err);
			new Notice(this.lang.ERROR + "file:" + fullpath + " addNote exception:" + err);
		}
	}

	// generate title 
	getTitle(setting: AppendPluginSettings, note: string, created: number): string {
		let title = "";
		let date  = new Date();
        const year  = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day   = date.getDate().toString().padStart(2, '0');
		if (setting.filenameRule == "yyyy-mm-dd") {
			title = `${year}-${month}-${day}`;
		}

		if (setting.filenameRule == "mm-dd") {
			title = `${month}-${day}`;
		}

		if (setting.filenameRule == this.lang.FILENAME_RULE_CONTENT) {
			title = note.substr(0, 20);
			let split = note.split("\n");
			if (typeof split[0] != "undefined" && split[0] != null && split[0].length > 0) {
				title = split[0].substr(0, 20)	
			}
		}

        if (setting.filenameRule == "fixed" && setting.fixedTitle.length > 0) {
            title = this.helper.formatDateInStr(setting.fixedTitle, created)
        }

        // if title is empty, give it a default name
        if (title == "") {
			title = `${year}-${month}-${day}`;
        }
        // filter special char 
        title = this.filterTitle(title)
        
		// append to exist file, so no need to detect if file exists
		if (setting.conflictFileRule != "new") {
			return title + ".md";
		}

		// 'new mode', need to check if file exist or not
		let f = setting.savedFolder + "/" + title + ".md";
		if (!this.fileExists(f)) {
			return title + ".md";
		}

		// just need a new name to resolve conflict
		for (let i = 0; i <= 1000; i++){
			let newFile = setting.savedFolder + "/" + title + "(" + i + ")" + ".md";
			if (!this.fileExists(newFile)) {
				return 	title + "(" + i + ")" + ".md";
			}
		}

		// shouldn't be here.
		new Notice(this.lang.ERROR + "generate filename err...");
		return Math.random() + ".md";
	}

	// detect if file exists 
    // file MUST NOT start with /, eg: Inbox/22-22.md  22-11.md
	fileExists(file: string): boolean {
        let f = this.app.vault.getAbstractFileByPath(file)
		if (f == null) {
			return false;
		}
		return f instanceof TFile;
	}

    // deal with prefix/suffix of content 
    dealPrefixOrSuffix(note: string, created: number): string {
        let settings = this.plugin.settings
        if (settings.contentPrefix != null) {
            if (settings.contentPrefix.length > 0) {
                let prefix = this.helper.formatDateInStr(settings.contentPrefix, created)
                prefix = prefix.replace(/\\n/g, '\n')
                note = prefix + note
            }
        }
        if (settings.contentSuffix != null) {
            if (settings.contentSuffix.length > 0) {
                let suffix = this.helper.formatDateInStr(settings.contentSuffix, created)
                suffix = suffix.replace(/\\n/g, '\n')
                note = note + suffix
            }
        }

        return note
    }

    // filter title special char 
    filterTitle(title: string): string {
        if (title.length < 1) { return "" }
        const validChars = title.match(/[a-zA-Z0-9\u4e00-\u9fa5+-_.@]+/g);
        if (!validChars) {
            return 'undefined';
        }
        let newTitle = validChars.join('');
        return newTitle.replace(/[/\\^:]/g, "")
    }

    // judge if message is image only
    // @return true if message is image only
    judgeImageMessage(msg: string): boolean {
  		const fullStringRegex = /^\!\[.*?\]\((.+?)\)$/;
        const imageSuffix = ["jpg", "jpeg", "png", "gif"]
		if (!fullStringRegex.test(msg)) {
			return false;
	  	}
  		const urlRegex = /\]\((https?:\/\/[^\s)]+)\)/;
  		const match = msg.match(urlRegex);
		if (match == null || match.length < 2) {
            return false
		}
		let url = match[1]
		// get suffix of file
		let suffix = url.substr(-3, 3)
        if (imageSuffix.indexOf(suffix) >= 0) {
            return true
        }
		suffix = url.substr(-4, 4) // case for jpeg
        if (imageSuffix.indexOf(suffix) >= 0) {
            return true
        }

        return false
    }

    // save image to local 
    // @return localfile note, eg:  ![[somgpic.png]]
    async saveImage(setting: AppendPluginSettings, msg: string): Promise<string> {
  		const urlRegex = /\]\((https?:\/\/[^\s)]+)\)/;
  		const match = msg.match(urlRegex);
		if (match == null || match.length < 2) {
            return msg
		}
		let url = match[1]
        let resp = await requestUrl(url) 
        if (resp.status != 200 || resp.arrayBuffer.byteLength < 1) {
            return msg
        }
        let imgData = new Uint8Array(resp.arrayBuffer)
        let imgInfo = this.checkImageExistence(await this.getImageSavedPath(setting, url))
        let imgPath = imgInfo[0] 
        let imgName = imgInfo[1]
        if (imgPath == null || imgPath == "" || imgName == null || imgName == "") {
            console.error("save image to local err, imgPath or imgName empty:", imgPath, imgName)
            return msg
        }
        try {
            const file = await this.app.vault.createBinary(imgPath, imgData);
            if (file == null || typeof file.basename == "undefined" || file.basename.length < 1) {
                console.error("vault.createBinary err,file not saved.")
                return msg
            }
            // save success, return local file link 
            let localMsg = "![[" + imgPath + "|400]]";
            return localMsg
        } catch (err) {
            console.error("saveImage createBinary err:", err)
            return msg
        }
    }
    
    // get image saved path
    // @return  [pathWithImgName: var/to/folder/a.jpg or "a.jpg", fileName]
    async getImageSavedPath(setting: AppendPluginSettings, url: string): Promise<[string, string]> {
        let fileName = ""
        // get filename from url
        let urlObj = new URL(url) 
        let urlPath = urlObj.pathname 
        if (urlPath == null || urlPath.length < 1) {
            fileName = this.helper.now().toString() + ".jpg"
        } else {
            fileName = urlPath.substring(urlPath.lastIndexOf("/") + 1)
        }

        let pluginPath = setting.savedFolder ?? ""
        if (pluginPath == "/") { 
            pluginPath = ""
        }
        // system's config of saved file path 
        let systemPath = (this.app.vault as any).getConfig('attachmentFolderPath');
        if (systemPath == null || systemPath.length < 1) {
            return [pluginPath + "/" + fileName, fileName]
        }
        // option: save at current folder
        if (systemPath == "./") {
            return [pluginPath + "/" + fileName, fileName]
        }
        // option: save at root folder
        if (systemPath == "/") {
            return [fileName, fileName]
        }
        // option: save to current's child folder
        if (systemPath.length > 2 && systemPath.substr(0, 2) == "./") {
            systemPath = systemPath.substring(2) // turn folder ./abc -> abc
            if (pluginPath == "") {
                await this.checkAndCreateFolder(systemPath)
                return [systemPath + "/" + fileName, fileName]
            } else {
                await this.checkAndCreateFolder(pluginPath + "/" + systemPath)
                return [pluginPath + "/" + systemPath + "/" + fileName, fileName]
            }
        } else {
            // 附件全部保存到指定的目录
            return [systemPath + "/" + fileName, fileName]
        }
    }

    // get a new name for image file if already exists 
    checkImageExistence(info: [string, string]): [string, string] {
        if (info.length != 2) {
            return ["", ""]
        }
        let path     = info[0]
        let fileName = info[1]
        if (!this.fileExists(path)) {
            return [path, fileName]
        }
        // file exists, replace a new name
        let newFile = this.helper.now().toString() + fileName
        let newPath = path.replace(fileName, newFile)
        return [newPath, newFile]
    }

    // create folder if not exist 
    async checkAndCreateFolder(folder: string) {
        let exist = await this.app.vault.adapter.exists(folder)
        if (exist) {
            return
        }
        // not exist,need tobe created
        let tf = await this.app.vault.createFolder(folder)
    }
}
