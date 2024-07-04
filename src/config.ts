import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import Helper, { AppendPluginSettings } from "./helper";
import Lang from './lang';
import AppendPlugin from './main';
import Note from './note';

export class AppendSettingTab extends PluginSettingTab {
	helper: Helper;
	lang: Lang;
	plugin: AppendPlugin;
	app: App;
	
	constructor(app: App, plugin: AppendPlugin) {
		super(app, plugin);

		this.plugin = plugin;
		this.app    = app;
		this.helper = new Helper;
		this.lang   = new Lang;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// apiKey input
		new Setting(containerEl)
		.setName(this.lang.NAME_APIKEY)
		.setDesc(this.lang.DESC_APIKEY)
		.addText(text => text
			.setPlaceholder(this.lang.PH_APIKEY)
			.setValue(this.plugin.settings.apikey ?? "")
			.onChange(async (value) => {
				this.plugin.settings.apikey = value;
				await this.plugin.saveSettings();
			})
		);

		// saved folder dropdown
		const allFolders = this.helper.getAllFolder(this.app)
		new Setting(containerEl)
		.setName(this.lang.NAME_SAVEDIR)
		.setDesc(this.lang.DESC_SAVEDIR)
		.addDropdown(dropdown => {
			for (const k in allFolders) {
				const f = allFolders[k];
				dropdown.addOption(f, f)
			}
			if (this.plugin.settings.savedFolder.length < 1) {
				dropdown.setValue("/");
			} else {
				dropdown.setValue(this.plugin.settings.savedFolder);
			}
			dropdown.onChange(async (value) => {
				this.plugin.settings.savedFolder = value;
				await this.plugin.saveSettings();
			});
		});

		// filename dropdown 
		new Setting(containerEl)
		.setName(this.lang.NAME_FILENAME)
		.setDesc(this.lang.DESC_FILENAME)
		.addDropdown(dropdown => {
			dropdown.addOption("yyyy-mm-dd", "yyyy-mm-dd");
			dropdown.addOption("mm-dd", "mm-dd");
			dropdown.addOption(this.lang.FILENAME_RULE_CONTENT, this.lang.FILENAME_RULE_CONTENT);
			if (this.plugin.settings.filenameRule.length < 1) {
				dropdown.setValue("mm-dd");
			} else {
				dropdown.setValue(this.plugin.settings.filenameRule);
			}
			dropdown.onChange(async (value) => {
				this.plugin.settings.filenameRule = value;
				await this.plugin.saveSettings();
			});
		});

		// conflict filename rule 
		new Setting(containerEl)
		.setName(this.lang.NAME_CONFLICTFILE)
		.setDesc(this.lang.DESC_CONFLICTFILE)
		.addDropdown(dropdown => {
			dropdown.addOption("new", this.lang.CONFLICTFILE_NEW);
			dropdown.addOption("append", this.lang.CONFLICTFILE_APPEND);

			if (this.plugin.settings.conflictFileRule.length < 1) {
				dropdown.setValue("append");
			} else {
				dropdown.setValue(this.plugin.settings.conflictFileRule);
			}

			dropdown.onChange(async (value) => {
				this.plugin.settings.conflictFileRule = value;
				await this.plugin.saveSettings();
			});
		});


		// refresh interval
		new Setting(containerEl)
		.setName(this.lang.NAME_REFRESHINTERVAL)
		.setDesc(this.lang.DESC_REFRESHINTERVAL)
		.addDropdown(dropdown => {
			dropdown.addOption("10", "10");
			dropdown.addOption("30", "30");
			dropdown.addOption("60", "60");
			dropdown.addOption("180", "180");
			dropdown.addOption("300", "300");

			if (this.plugin.settings.refreshInterval.length < 1) {
				dropdown.setValue("30");
			} else {
				dropdown.setValue(this.plugin.settings.refreshInterval);
			}

			dropdown.onChange(async (value) => {
				this.plugin.settings.refreshInterval = value;
				await this.plugin.saveSettings();
			});
		});

		// verify apiKey button
		new Setting(containerEl)
		.setName(this.lang.NAME_VERIFYBTN)
		.setDesc(this.lang.DESC_VERIFYBTN)
		.addButton(button => {
			button.setButtonText(this.lang.NAME_VERIFYBTN)
			.setCta() 
			.onClick(async () => {
				await this.plugin.saveSettings();
				try {
					let note = new Note(this.app, this.plugin);
					await note.getAndSaveMessage(true);
				} catch (err) {
					new Notice(this.lang.APIKEY_VERIFYERR+err);
					return;
				}
			});
		});

        // desc 
        const p = containerEl.createEl('p');
        p.appendText(this.lang.MORE_DESC);
        p.createEl('a', {
            text: 'Here',
            href: 'https://wxob.pipebox.pro/jump',
        });
    }
}
