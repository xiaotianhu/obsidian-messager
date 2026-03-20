import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, requestUrl, Setting, TFile } from 'obsidian';
import AppendPlugin from './main';
import Helper,{ AppendPluginSettings } from "./helper";
import Lang from './lang';
import Message from './message';
import WxArticleService from './wxarticle_service';

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
                    content = await this.parseImageOnly(content);
                }
                // save email's img to local 
                content = await this.parseEmailContent(content)

                // fetch WeChat article content if enabled and content is a single WeChat link
                if (this.plugin.settings.fetchWechatArticleContent && this.isSingleWeChatLink(content)) {
                    const wxService = new WxArticleService(this.app, this.plugin);
                    const articleResult = await wxService.processMessage(content);
                    if (articleResult && articleResult.content) {
                        await note.saveWxArticleToNewFile(articleResult.title, articleResult.content, msg["createdAt"]);
                        continue;
                    }
                }

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

        console.log("准备addNote", title)
        // process prefix/suffix if setting exists
        note = this.dealPrefixOrSuffix(note, created);

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
					let newFile = await this.app.vault.create(fullpath, note);
                    // open the file 
                    const leaf = this.app.workspace.getLeaf(true);
                    await leaf.openFile(newFile as TFile);
                    // insert Template if configured
                    if (this.plugin.settings.templateName != null && 
                        this.plugin.settings.templateName.length > 1) {
                        await this.insertTemplate()
                    }
                    return
				}
			} else {
			    // new file mode
				let newFile = await this.app.vault.create(fullpath, note);
                // open the file
                const leaf = this.app.workspace.getLeaf(true);
                await leaf.openFile(newFile as TFile);
                // insert Template if configured
                if (this.plugin.settings.templateName != null && 
                    this.plugin.settings.templateName.length > 1) {
                    await this.insertTemplate()
                }
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
        const validChars = title.match(/[a-zA-Z0-9\u4e00-\u9fa5+-_.@｜]+/g);
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
        // wechat url 
        if (url.indexOf("qpic.cn") > 0) {
            return true
        }

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

    // parse imageOnly message and save image to local 
    // @return localfile note, eg:  ![[somgpic.png]]
    async parseImageOnly(msg: string): Promise<string> {
  		const urlRegex = /\]\((https?:\/\/[^\s)]+)\)/;
  		const match = msg.match(urlRegex);
		if (match == null || match.length < 2) {
            return msg
		}
		let url = match[1]
        let localPath = await this.saveUrlToLocal(url)
        if (localPath != "") {
            let localMsg = "![[" + localPath + "|400]]";
            return localMsg
        }

        return ""
    }

    // save image's url to local
    // return local path, eg: localFolder/media/somgPic.jpg
    async saveUrlToLocal(url: string): Promise<string> {
        let settings = this.plugin.settings
        let resp = await requestUrl(url) 
        if (resp.status != 200 || resp.arrayBuffer.byteLength < 1) {
            console.error("saveUrlToLocal err,url:", url, "resp err:", resp)
            return ""
        }
        let imgData = new Uint8Array(resp.arrayBuffer)
        let imgInfo = this.checkImageExistence(await this.getImageSavedPath(settings, url))
        let imgPath = imgInfo[0] 
        let imgName = imgInfo[1]
        if (imgPath == null || imgPath == "" || imgName == null || imgName == "") {
            console.error("saveUrlToLocal err, imgPath or imgName empty:", imgPath, imgName)
            return ""
        }
        try {
            const file = await this.app.vault.createBinary(imgPath, imgData);
            if (file == null || typeof file.basename == "undefined" || file.basename.length < 1) {
                console.error("saveUrlToLocal vault.createBinary err,file not saved.")
                return ""
            }
            // save success, return local file link 
            //let localMsg = "![[" + imgPath + "|400]]";
            return imgPath
        } catch (err) {
            console.error("saveUrlToLocal createBinary err:", err)
            return ""
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
            fileName = 
                this.helper.now().toString() + urlPath.substring(urlPath.lastIndexOf("/") + 1)
        }
        if (fileName.indexOf(".") < 0) {
            fileName = fileName + ".jpg"
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
            if (pluginPath == "") {
                return [fileName, fileName]
            } else {
                return [pluginPath + "/" + fileName, fileName]
            }
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
        await this.app.vault.createFolder(folder)
    }

    // insert template to current opening file
    async insertTemplate() {
        let configTmpName = this.plugin.settings.templateName
        if (configTmpName.length < 1) {
            console.error("no configTmpName err.")
            return
        }
        const templatePlugin = (this.app as any).internalPlugins?.plugins?.templates?.instance;
        if (!templatePlugin) {
            console.log("template plugin not available.")
            return;
        }

        const templates = this.helper.getAllTemplates(this.app)
        let tmpFile: TFile | null = null;
        for (let k in templates) {
            if (templates[k].name == configTmpName) {
                tmpFile = templates[k]
            }
        }
        
        if (tmpFile == null || tmpFile.path == null || tmpFile.path.length < 1) {
            console.error("parse template err, template may not exist,path empty.")
            return
        }

        const templateContent = await this.app.vault.read(tmpFile)
        if (templateContent.length < 1) {
            console.error("template content empty.", tmpFile.path)
            return
        }
        // render template content into file
        await templatePlugin.insertTemplate(tmpFile);
    }
    
    // parse email's content, save embended file && attach file to local
    async parseEmailContent(content: string): Promise<string> {
        console.log("开始解析email", content)
        let emailAttachApi    = "https://wechatobsidian.com/api/email_attach";
        let settings          = this.plugin.settings;
        let apiKey            = settings.apikey;
        let matches: string[] = [];
        let match
        // process images in <img src="cid:xxx.jpg"> 
        const regex = /<img[^>]+src=\"(.*?)\"/gi;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        console.log("匹配了matches",matches)
        for (let k in matches) {
            let url = matches[k]; 
            if (url.substring(0, 8) == "https://") {
                // save image to local and replace the note content
                let localPath = await this.saveUrlToLocal(url);
                if (localPath.length > 0) {
                    content = content.replace(url, localPath);
                }
            } else if (url.substring(0, 4) == "cid:") {
                let filename = url.substring(4);
                // only with filename(Email embended image), find in server 
                let req = emailAttachApi + "?apikey=" + apiKey + "&filename=" + filename;
                let localPath = await this.saveUrlToLocal(req);
                if (localPath.length > 0) {
                    content = content.replace(url, localPath); 
                }
            }
        }

        // process attachments 
        const attRegex = /!\[\[#Attachment#([^\]]+)\]\]/g;
        while ((match = attRegex.exec(content)) !== null) {
            if (match.length != 2) {
                console.error("attachment regex match result not 2");
                continue;
            }
            // download attachment
            let req = emailAttachApi + "?apikey=" + apiKey + "&filename=" + match[1];
            let localPath = await this.saveUrlToLocal(req);
            if (localPath.length < 1) {
                console.error("save attachment:"+match[1]+"-failed.."+req);
                continue;
            }
            let replaced = "![[" + localPath + "|400]]";
            content = content.replace(match[0], replaced);
        }
        
        return content
    }

    // save WeChat article to a new file using the article title as filename
    async saveWxArticleToNewFile(articleTitle: string, content: string, created: number) {
        const settings = this.plugin.settings;

        let fileName = this.filterWxArticleTitle(articleTitle);
        if (!fileName || fileName.length < 1) {
            const d = new Date();
            fileName = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        }

        let savedFolder = settings.savedFolder ?? "/";

        const buildPath = (name: string): string => {
            if (savedFolder === "/" || savedFolder.length < 1) {
                return name + ".md";
            }
            const sep = savedFolder.endsWith("/") ? "" : "/";
            return savedFolder + sep + name + ".md";
        };

        let fullpath = buildPath(fileName);
        if (this.fileExists(fullpath)) {
            for (let i = 0; i <= 1000; i++) {
                const candidate = buildPath(fileName + "(" + i + ")");
                if (!this.fileExists(candidate)) {
                    fullpath = candidate;
                    break;
                }
            }
        }

        content = this.dealPrefixOrSuffix(content, created);

        try {
            const newFile = await this.app.vault.create(fullpath, content);
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(newFile as TFile);
            if (this.plugin.settings.templateName != null &&
                this.plugin.settings.templateName.length > 1) {
                await this.insertTemplate();
            }
            this.helper.addStatus("wx article saved: " + fullpath, this.plugin);
        } catch (err) {
            console.error("saveWxArticleToNewFile err:", err);
            new Notice(this.lang.ERROR + "file:" + fullpath + " err:" + err);
        }
    }

    // filter WeChat article title: only keep Chinese/English/numbers
    filterWxArticleTitle(title: string): string {
        if (!title || title.length < 1) { return ""; }
        const validChars = title.match(/[a-zA-Z0-9\u4e00-\u9fa5]+/g);
        if (!validChars) { return ""; }
        return validChars.join("");
    }

    /**
     * Check if content is a single WeChat article link
     * Returns true if content contains only a WeChat article URL (mp.weixin.qq.com)
     */
    isSingleWeChatLink(content: string): boolean {
        if (!content || content.trim().length < 1) {
            return false;
        }

        content = content.trim();

        // Try to extract URL from markdown format [text](url)
        const markdownUrlRegex = /^\[.*?\]\s*\((https?:\/\/[^\s)]+)\)$/;
        let match = content.match(markdownUrlRegex);
        if (match && match[1]) {
            return match[1].includes('mp.weixin.qq.com');
        }

        // Try to extract URL from plain text
        const plainUrlRegex = /^(https?:\/\/[^\s\n]+)$/;
        match = content.match(plainUrlRegex);
        if (match && match[1]) {
            return match[1].includes('mp.weixin.qq.com');
        }

        // Check if content contains other text besides URL
        // Remove markdown URLs and plain URLs, check if anything remains
        const cleanContent = content
            .replace(/\[.*?\]\s*\(https?:\/\/[^\s)]+\)/g, '')
            .replace(/https?:\/\/[^\s\n]+/g, '')
            .trim();
        
        // If there's other text content, not a single link
        if (cleanContent.length > 0) {
            return false;
        }

        // Extract any URL and check if it's WeChat
        const anyUrlRegex = /(https?:\/\/[^\s\n]+)/;
        match = content.match(anyUrlRegex);
        if (match && match[1]) {
            return match[1].includes('mp.weixin.qq.com');
        }

        return false;
    }


}
