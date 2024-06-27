import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AppendPluginSettings } from "helper";
import { AppendSettingTab } from 'config';
import Note from 'note';

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
		if (oriData.apikey.length > 1) {
			this.settings = Object.assign({}, oriData);
		} else {
			const defaultConf: AppendPluginSettings = {
				apikey: "",
				savedFolder: "",
				filenameRule: "",
				conflictFileRule: "",
				refreshInterval: "",
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
		let interval = Number(this.settings.refreshInterval) * 1000
		this.registerInterval(window.setInterval(async () => {
			let note = new Note(this.app, this);
			await note.getAndSaveMessage(false);
		}, interval));
	}
}
