import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, requestUrl, Setting, TFile } from 'obsidian';
    title: string
    createdAt: number
            if (this.plugin.settings == null || 
                this.plugin.settings.apikey == null || 
                this.plugin.settings.apikey == "") {
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
	async addNote(setting: AppendPluginSettings, note: string, title: string, created: number) {
        if (title == null || title.length < 1) {
		    title = this.getTitle(setting, note, created);
        }

        let fullpath = ""
	getTitle(setting: AppendPluginSettings, note: string, created: number): string {
            title = this.helper.formatDateInStr(setting.fixedTitle, created)
    dealPrefixOrSuffix(note: string, created: number): string {
                let prefix = this.helper.formatDateInStr(settings.contentPrefix, created)
                let suffix = this.helper.formatDateInStr(settings.contentSuffix, created)
        if (title.length < 1) { return "" }

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
        let imgInfo = this.checkImageExistence(this.getImageSavedPath(setting, url))
        let imgPath = imgInfo[0] 
        let imgName = imgInfo[1]
        if (imgPath == null || imgPath == "" || imgName == null || imgName == "") {
            console.error("save image to local err, imgPath or imgName empty:", imgPath, imgName)
            return msg
        }
        const file = await this.app.vault.createBinary(imgPath, imgData);
        if (file == null || typeof file.basename == "undefined" || file.basename.length < 1) {
            console.error("vault.createBinary err,file not saved.")
            return msg
        }
        // save success, return local file link 
        let localMsg = "![[" + imgPath + "|400]]";
        return localMsg
    }
    
    // get image saved path
    // @return  [pathWithImgName: var/to/folder/a.jpg or "a.jpg", fileName]
    getImageSavedPath(setting: AppendPluginSettings, url: string): [string, string] {
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
        let systemPath = app.vault.getConfig('attachmentFolderPath');
        if (systemPath == null || systemPath.length < 1) {
            return [pluginPath + "/" + fileName, fileName]
        }
        // 附件保存到当前目录
        if (systemPath == "./") {
            return [pluginPath + "/" + fileName, fileName]
        }
        // 附件保存到根目录
        if (systemPath == "/") {
            return [fileName, fileName]
        }
        // 附件保存到当前目录下的子目录
        if (systemPath.substr(0, 2) == "./") {
            if (pluginPath == "") {
                return [systemPath + "/" + fileName, fileName]
            } else {
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