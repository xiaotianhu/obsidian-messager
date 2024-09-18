import { App, Plugin, TFolder, TAbstractFile } from 'obsidian';

export default class Lang {
	NAME_APIKEY: string = "API Key";
	DESC_APIKEY: string = "Get API key from wechatobsidian.com";
	PH_APIKEY: string   = "Enter your API key";
    MORE_DESC:string    = "For more usage methods, to register a new account, or to provide feedback, please visit:";

	NAME_SAVEDIR: string = "Select folder to save";
	DESC_SAVEDIR: string = "Select which folder to save new messages";

	NAME_FILENAME: string         = "File name rule";
	DESC_FILENAME: string         = "Rule of added filename when received messages";
	FILENAME_RULE_CONTENT: string = "First line of message";

    INSERT_POSITION: string = "Insert new message at position";
    INSERT_POSITION_DESC: string = "Insert new message at the beginning or the end";
    INSERT_POSITION_BEGIN: string = "Beginning of the file";
    INSERT_POSITION_END: string = "End of the file";

	NAME_CONFLICTFILE: string   = "Conflict filename rule";
    TITLE_FIXED: string = "fixed title(supports date variables)";
    SET_TITLE_FIXED: string = "set fixed title, supports timestamp variables, see the instructions below";
    TITLE_FIXED_DESC: string = "Set a fixed file name without needing to include the .md file extension.";
    TITLE_FIXED_ERR: string = "Fixed title error:";
	DESC_CONFLICTFILE: string   = "How to deal when filename already existed";
	CONFLICTFILE_NEW: string    = "Create new file";
	CONFLICTFILE_APPEND: string = "Append to existed file";
    PREFIX_TITLE: string = "Add prefix for each content";
    PREFIX_DESC: string = "Supports timestamp variables, see the instructions below for details";
    SUFFIX_TITLE: string = "Add suffix for each content";
    SUFFIX_DESC: string = "Supports timestamp variables, see the instructions below for details";
    SUFFIX_PREFIX_USAGE: string = `
Prefix/Suffix/Fixed title configuration usage:
Supports date variables (must be enclosed in curly braces), prefix/suffix supports using \\n for new lines
{y-m-d h:i:s W w} corresponds to year-month-day hour:minute:second Sunday Sun
  For example:
  "date@{y-m-d-W}"
  "{ymd@h:i w} \\n"
  "{y-m-d h:i:s} \\n --- \\n"
`

	NAME_REFRESHINTERVAL: string = "Refresh new message interval";
	DESC_REFRESHINTERVAL: string = "Refresh new message interval in seconds";

	APIKEY_VERIFYOK: string  = "API key verify ok.";
    APIKEY_VERIFYERR: string = "API key verify err:";

	NAME_VERIFYBTN: string = "Verify API key";
	DESC_VERIFYBTN: string = "Check whether API key is valid";

	ERROR: string       = "Messager error:";
	API_ERROR: string   = "Messager server response error:";
	API_USERERR: string = "API key not found, user not exist.";
    LATEST_UPDATE: string = `
UpdateNotes:
    (v1.1.1@24-09-18): Support custom title for HTTPApi;Save image to local vault.
    (v1.1.0@24-09-09): Fix bugs.
    (v1.0.9@24-09-07): Support date variables for fixed title.
`
	constructor() {
        let lang = window.localStorage.getItem('language');
        if (lang == "zh" || lang == "zh-cn" || lang == "zh-TW") {
		    this.loadChineseLang();	
        } 
	}
	
	// load chinese lang 
	loadChineseLang() {
		this.NAME_APIKEY = "API Key";
		this.DESC_APIKEY = "前往wechatobsidian.com获取API key";
		this.PH_APIKEY   = "请输入API key";
        this.MORE_DESC   = "更多使用方法，注册新账户，意见反馈等 请访问:";

		this.NAME_SAVEDIR = "选择目录";
		this.DESC_SAVEDIR = "选择新消息要保存到的目录";

		this.NAME_FILENAME         = "文件名规则";
		this.DESC_FILENAME         = "收到新消息时保存文件的名字规则";
		this.FILENAME_RULE_CONTENT = "消息首行内容";
        
        this.INSERT_POSITION       = "新消息的插入位置";
        this.INSERT_POSITION_DESC  = "新消息插入在文档开始或结束位置";
        this.INSERT_POSITION_BEGIN = "文件头部";
        this.INSERT_POSITION_END   = "文件尾部";

		this.NAME_CONFLICTFILE   = "文件名已存在时处理规则";
        this.SET_TITLE_FIXED     = "设置固定标题";
        this.TITLE_FIXED_DESC    = "设置固定的文件名，不需要包含 .md 后缀;支持时间戳变量，具体参考下方说明";
        this.TITLE_FIXED         = "固定标题(支持时间戳变量)";
        this.TITLE_FIXED_ERR     = "固定标题设置错误：";
		this.DESC_CONFLICTFILE   = "当文件名已经存在时如何处理";
		this.CONFLICTFILE_NEW    = "创建新文件";
		this.CONFLICTFILE_APPEND = "在已存在的文件后添加";
        this.PREFIX_TITLE        = "为每条内容添加前缀";
        this.PREFIX_DESC         = "支持时间戳变量，具体参考下方说明";
        this.SUFFIX_TITLE        = "为每条内容添加后缀";
        this.SUFFIX_DESC         = "支持时间戳变量，具体参考下方说明";
        this.SUFFIX_PREFIX_USAGE = 
`前缀/后缀/固定文件名 时间戳变量用法说明： 
日期变量(需要用花括号括起来)，前缀/后缀支持用 \\n 换行(文件名不支持)
{y-m-d h:i:s W w} 对应 年-月-日 时:分:秒 星期六(大写W) 周六(小写w)
  例如: 
  "日期@{y-m-d-W}"
  "{ymd@h:i_w} \\n"
  "{y-m-d h:i:s} \\n --- \\n"
`
	
		this.NAME_REFRESHINTERVAL = "新消息刷新间隔";
		this.DESC_REFRESHINTERVAL = "单位为秒";

		this.APIKEY_VERIFYOK  = "API key 验证成功！";
		this.APIKEY_VERIFYERR = "API key 验证失败:";

		this.NAME_VERIFYBTN = "检查API key";
		this.DESC_VERIFYBTN = "测试API key是否正确";
		
		this.ERROR       = "Messager 错误:";
		this.API_ERROR   = "Messager 服务器错误:";
		this.API_USERERR = "用户不存在。";

        this.LATEST_UPDATE = `
更新记录：
(v1.1.1@24-09-18): 支持HTTP接口自定义标题；图片消息把图片保存到本地
(v1.1.0@24-09-09): Fix bugs.
(v1.0.9@24-09-07): 固定标题支持使用时间戳变量。
`
	}
}
