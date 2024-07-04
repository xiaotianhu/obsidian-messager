import { App, PluginSettingTab, Setting, Notice, requestUrl} from 'obsidian';
import Lang from './lang';
export default class Message {
	apiUrl: string ;
	lang: Lang;

	constructor() {
		this.lang   = new Lang;
		this.apiUrl = "https://wechatobsidian.com/api/get_message"
	}

	// get message from API 
	async getMessage(apikey: string, verify: boolean): Promise<Object[]> {
		try {
			let reqUrl = this.apiUrl + "?apikey="+apikey; 
			if (verify) {
				reqUrl += "&verify=true";
			}
            let resp = await requestUrl(reqUrl);

            if (resp.status != 200) {
                throw Error(this.lang.API_ERROR + " API server status err:" + resp.status);
            }
            if (resp.json.length < 1) {
                throw Error(this.lang.API_ERROR + " API server response empty.")
            }
            let r = resp.json;
			if (typeof r["status"] == "undefined" || r["status"] < 1) {
				throw Error(this.lang.API_ERROR + "resp err.");
			}
			// apikey user not exist.
			if (r["status"] == 204) {
				throw Error(this.lang.API_USERERR);
			}

			if (r["status"] != 200) {
				if (typeof r["msg"] != "undefined" && r["msg"].length > 0) {
					throw Error(this.lang.API_ERROR + "getMessage:" + r["msg"]);
				} else {
					throw Error(this.lang.API_ERROR + " getMessage status err:" + resp.status);
				}
			}
	
			if (r["data"].length > 0) {
				new Notice("Success get " + r["data"].length + " new messages.");
			}
			return r["data"];
		} catch(err) {
			console.error(this.lang.API_ERROR + " getMessage err,fetch exception", err);
			throw err;
		}
	}
}
