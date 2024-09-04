import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AppendPluginSettings } from "./helper";
import { AppendSettingTab } from './config';
import Note from './note';

export default class AppendPlugin extends Plugin {
	settings: AppendPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new AppendSettingTab(this.app, this));
		this.intervalRefresh();
	}

	onunload() {
	}

	async loadSettings(): Promise<AppendPluginSettings> {
		let oriData: AppendPluginSettings = await this.loadData()
		if (oriData != null && typeof oriData.apikey != 'undefined' && oriData.apikey.length > 1) {
			this.settings = Object.assign({}, oriData);
		} else {
			const defaultConf: AppendPluginSettings = {
				apikey: "",
				savedFolder: "",
				filenameRule: "",
				conflictFileRule: "",
				refreshInterval: "",
                fixedTitle: "",
                insertPosition: "",
                contentSuffix: "",
                contentPrefix: ""
			}
			this.settings = defaultConf;
		}

		return this.settings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// interval refresh 
	intervalRefresh() {
        let interval = 10
        if (this.settings != null && typeof this.settings.refreshInterval != "undefined" && this.settings.refreshInterval != null) {
            if (Number(this.settings.refreshInterval) > 1) {
		        interval = Number(this.settings.refreshInterval) * 1000
            } else {
                interval = 10 * 1000;
            }
        }

		this.registerInterval(window.setInterval(async () => {
            try {
                let note = new Note(this.app, this);
                await note.getAndSaveMessage(false);
            } catch(err) {
               console.error("Messager plugin err:", err); 
               sleep(interval)
            }
		}, interval));
	}
}
