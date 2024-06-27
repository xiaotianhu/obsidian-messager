import { App, Plugin, TFolder, TAbstractFile } from 'obsidian';

export default class Lang {
	NAME_APIKEY: string  = "ApiKey";
	DESC_APIKEY: string = "Get ApiKey from MessageToObsidian.com";
	PH_APIKEY: string = "Enter your ApiKey";

	NAME_SAVEDIR: string = "Select folder to save";
	DESC_SAVEDIR: string = "Select which folder to save new messages";

	NAME_FILENAME: string         = "File name rule";
	DESC_FILENAME: string         = "Rule of added filename when received messages";
	FILENAME_RULE_CONTENT: string = "First line of message";

	NAME_CONFLICTFILE: string   = "Conflict filename rule";
	DESC_CONFLICTFILE: string   = "How to deal when filename already existed";
	CONFLICTFILE_NEW: string    = "Create new file";
	CONFLICTFILE_APPEND: string = "Append to existed file";

	NAME_REFRESHINTERVAL: string = "Refresh new message interval";
	DESC_REFRESHINTERVAL: string = "Refresh new message interval in seconds";

	APIKEY_VERIFYOK: string = "Apikey verify ok.";

	NAME_VERIFYBTN: string = "Verify ApiKey";
	DESC_VERIFYBTN: string = "Check whether ApiKey is valid";

	ERROR: string = "Message Plugin error:";
	API_ERROR: string = "Message Plugin server response error:";
	API_USERERR: string = "Apikey not found, user not exist.";

	constructor() {
		this.loadChineseLang();	
	}
	
	// load chinese lang 
	loadChineseLang() {
		this.NAME_APIKEY = "ApiKey";
		this.DESC_APIKEY = "前往MessageToObsidian.com获取ApiKey";
		this.PH_APIKEY   = "请输入ApiKey";

		this.NAME_SAVEDIR = "选择目录";
		this.DESC_SAVEDIR = "选择新消息要保存到的目录";

		this.NAME_FILENAME         = "文件名规则";
		this.DESC_FILENAME         = "收到新消息时保存文件的名字规则";
		this.FILENAME_RULE_CONTENT = "消息首行内容";

		this.NAME_CONFLICTFILE   = "文件名已存在时处理规则";
		this.DESC_CONFLICTFILE   = "当文件名已经存在时如何处理";
		this.CONFLICTFILE_NEW    = "创建新文件";
		this.CONFLICTFILE_APPEND = "在已存在的文件后添加";
	
		this.NAME_REFRESHINTERVAL = "新消息刷新间隔";
		this.DESC_REFRESHINTERVAL = "单位为秒";

		this.APIKEY_VERIFYOK = "Apikey 验证成功！";

		this.NAME_VERIFYBTN = "检查ApiKey";
		this.DESC_VERIFYBTN = "测试ApiKey是否正确";
		
		this.ERROR = "Message插件错误:";
		this.API_ERROR = "Message插件服务器错误:"; 
		this.API_USERERR = "Apikey验证失败，用户不存在。";
	}
}
