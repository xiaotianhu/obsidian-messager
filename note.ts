import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import AppendPlugin from 'main';
import Helper,{ AppendPluginSettings } from "helper";
import Lang from 'lang';
import Message from 'message';

interface RespMsg {
	content: string
	id: number
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
			let note = new Note(this.app, this.plugin);
			let messages = await (new Message).getMessage(this.plugin.settings.apikey, isVerify);
			for (let k in messages) {
				let msg = messages[k] as RespMsg;
				if (typeof msg !== "undefined" && msg.content.length > 0) {
					await note.addNote(this.plugin.settings, msg["content"]);
				}
			}
		} catch (err) {
			throw err
		}
	}

	// add note to vault
	async addNote(setting: AppendPluginSettings, note: string) {
		let title = this.getTitle(setting, note);
		let fullpath = setting.savedFolder + "/" + title;
		try {
			// append mode
			if (setting.conflictFileRule == "append") {
				if (this.fileExists(fullpath) ) {
					let originFile = this.app.vault.getAbstractFileByPath(fullpath)
					if (originFile instanceof TFile) {
						let originData = await this.app.vault.read(originFile);
						let newData = originData + "\n" + note;
						await this.app.vault.modify(originFile, newData);
					} else {
						// error, should'n be here
						new Notice(this.lang.ERROR + "file:" + fullpath + " not exist with append mode.");
					}
				} else {
					// file not exist, just add it 
					await this.app.vault.create(fullpath, note);
				}
			}
			// new file mode
			if (setting.conflictFileRule == "new") {
				await this.app.vault.create(fullpath, note);
			}

			this.helper.addStatus("new message to note:"+fullpath, this.plugin);
		} catch (err) {
			console.log("MessageToObsidian addNote exception:", err);
			new Notice(this.lang.ERROR + "file:" + fullpath + " addNote exception:" + err);
		}
	}

	// generate title 
	getTitle(setting: AppendPluginSettings, note: string): string {
		var title = "";
		let date  = new Date();
		if (setting.filenameRule == "yyyy-mm-dd") {
			const year  = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, '0');
			const day   = date.getDate().toString().padStart(2, '0');
			title = `${year}-${month}-${day}`;
		}

		if (setting.filenameRule == "mm-dd") {
			const month = (date.getMonth() + 1).toString().padStart(2, '0');
			const day   = date.getDate().toString().padStart(2, '0');
			title = `${month}-${day}`;
		}

		if (setting.filenameRule == this.lang.FILENAME_RULE_CONTENT) {
			title = note.substr(0, 20);
			let split = note.split("\n");
			if (typeof split[0] != "undefined" && split[0] != null && split[0].length > 0) {
				title = split[0].substr(0, 20)	
			}
		}
		// append to exist file, so no need to detect if file exists
		if (setting.conflictFileRule == "append") {
			return title + ".md";
		}
		// file not exist 
		let f = setting.savedFolder + "/" + title + ".md";
		if (!this.fileExists(f)) {
			return title + ".md";
		}

		// just need a new name
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
	fileExists(file: string): boolean {
		if (this.app.vault.getAbstractFileByPath(file) == null) {
			return false;
		}
		return true;
	}
}
