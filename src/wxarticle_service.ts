import { App, requestUrl } from 'obsidian';
import AppendPlugin from './main';
import Helper from "./helper";
import Lang from './lang';

export interface WxArticleResult {
	title: string;
	content: string;
}

/**
 * WeChat Article Service
 * Handles fetching and converting WeChat official account articles to Markdown
 */
export default class WxArticleService {
	lang: Lang;
	app: App;
	plugin: AppendPlugin;
	helper: Helper;

	constructor(app: App, plugin: AppendPlugin) {
		this.lang = new Lang;
		this.app = app;
		this.plugin = plugin;
		this.helper = new Helper;
	}

	/**
	 * Check if a URL is a WeChat article link
	 */
	isWeChatArticle(url: string): boolean {
		if (!url || url.length < 1) {
			return false;
		}
		// WeChat article URLs typically contain mp.weixin.qq.com
		return url.includes('mp.weixin.qq.com');
	}

	/**
	 * Extract URL from message content
	 * Returns the first URL found, or empty string if no URL
	 */
	extractUrl(content: string): string {
		if (!content || content.length < 1) {
			return '';
		}
		// Match URLs in markdown format [text](url) or plain URLs
		const markdownUrlRegex = /\[.*?\]\((https?:\/\/[^\s)]+)\)/;
		const plainUrlRegex = /(https?:\/\/[^\s\n]+)/;
		
		let match = content.match(markdownUrlRegex);
		if (match && match[1]) {
			return match[1];
		}
		
		match = content.match(plainUrlRegex);
		if (match && match[1]) {
			return match[1];
		}
		
		return '';
	}

	/**
	 * Fetch WeChat article content and convert to Markdown
	 */
	async fetchArticle(url: string): Promise<WxArticleResult | null> {
		try {
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				}
			});

			if (response.status !== 200) {
				console.error('Failed to fetch WeChat article, status:', response.status);
				return null;
			}

			const html = response.text;
			return this.parseHtmlToMarkdown(html, url);
		} catch (error) {
			console.error('Error fetching WeChat article:', error);
			return null;
		}
	}

	/**
	 * Parse HTML content to Markdown
	 */
	private parseHtmlToMarkdown(html: string, baseUrl: string): WxArticleResult {
		// Create a temporary DOM element to parse HTML
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		// Extract article title - try multiple selectors
		let title = '';
		const titleEl = doc.querySelector('h2.rich_media_title') ||
						doc.querySelector('.rich_media_title') ||
						doc.querySelector('h1.title') ||
						doc.querySelector('#activity_name');
		if (titleEl) {
			title = titleEl.textContent?.trim() || '';
		}

		// Fallback to meta tag
		if (!title) {
			const metaTitle = doc.querySelector('meta[property="og:title"]');
			if (metaTitle) {
				title = metaTitle.getAttribute('content')?.trim() || '';
			}
		}

		// Extract article content
		const contentEl = doc.querySelector('#js_content');
		if (!contentEl) {
			console.error('Could not find article content in HTML');
			return { title, content: '' };
		}

		// Convert HTML to Markdown
		let markdown = '';
		// Add article URL at the beginning
		markdown += `${baseUrl}\n\n`;
		if (title) {
			markdown += `# ${title}\n\n`;
		}

		markdown += this.convertElementToMarkdown(contentEl, baseUrl);

		// Add source information
		markdown += `\n\n---\n*Source: [WeChat Article](${baseUrl})*`;

		return { title, content: markdown };
	}

	/**
	 * Convert DOM element to Markdown recursively
	 */
	private convertElementToMarkdown(element: Element, baseUrl: string): string {
		let result = '';

		for (const node of Array.from(element.childNodes)) {
			if (node.nodeType === Node.TEXT_NODE) {
				result += node.textContent || '';
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as Element;
				const tagName = el.tagName.toLowerCase();

				switch (tagName) {
					case 'p':
						result += this.convertElementToMarkdown(el, baseUrl) + '\n\n';
						break;
					case 'br':
						result += '\n';
						break;
					case 'strong':
					case 'b':
						result += `**${this.convertElementToMarkdown(el, baseUrl)}**`;
						break;
					case 'em':
					case 'i':
						result += `*${this.convertElementToMarkdown(el, baseUrl)}*`;
						break;
					case 'u':
						result += `<u>${this.convertElementToMarkdown(el, baseUrl)}</u>`;
						break;
					case 's':
					case 'strike':
					case 'del':
						result += `~~${this.convertElementToMarkdown(el, baseUrl)}~~`;
						break;
					case 'h1':
						result += `# ${this.convertElementToMarkdown(el, baseUrl)}\n\n`;
						break;
					case 'h2':
						result += `## ${this.convertElementToMarkdown(el, baseUrl)}\n\n`;
						break;
					case 'h3':
						result += `### ${this.convertElementToMarkdown(el, baseUrl)}\n\n`;
						break;
					case 'h4':
						result += `#### ${this.convertElementToMarkdown(el, baseUrl)}\n\n`;
						break;
					case 'h5':
						result += `##### ${this.convertElementToMarkdown(el, baseUrl)}\n\n`;
						break;
					case 'h6':
						result += `###### ${this.convertElementToMarkdown(el, baseUrl)}\n\n`;
						break;
					case 'ul':
						result += this.convertListToMarkdown(el, baseUrl, false) + '\n';
						break;
					case 'ol':
						result += this.convertListToMarkdown(el, baseUrl, true) + '\n';
						break;
					case 'li':
						// Handled by convertListToMarkdown
						result += this.convertElementToMarkdown(el, baseUrl);
						break;
					case 'a':
						const href = el.getAttribute('href') || '';
						const text = this.convertElementToMarkdown(el, baseUrl);
						result += `[${text}](${href})`;
						break;
					case 'img':
						const src = this.decodeHtmlEntities(el.getAttribute('data-src') || el.getAttribute('src') || '');
						const alt = el.getAttribute('alt') || '';
						if (src) {
							result += `![${alt}](${src})\n\n`;
						}
						break;
					case 'blockquote':
						const quoteContent = this.convertElementToMarkdown(el, baseUrl).trim();
						result += quoteContent.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
						break;
					case 'pre':
					case 'code':
						if (tagName === 'pre' || el.parentElement?.tagName.toLowerCase() !== 'pre') {
							const codeContent = el.textContent || '';
							result += '```\n' + codeContent + '\n```\n\n';
						} else {
							result += this.convertElementToMarkdown(el, baseUrl);
						}
						break;
					case 'span':
						result += this.convertElementToMarkdown(el, baseUrl);
						break;
					case 'section':
					case 'div':
						result += this.convertElementToMarkdown(el, baseUrl);
						break;
					default:
						result += this.convertElementToMarkdown(el, baseUrl);
				}
			}
		}

		return result;
	}

	/**
	 * Convert list elements to Markdown
	 */
	private convertListToMarkdown(element: Element, baseUrl: string, isOrdered: boolean): string {
		let result = '';
		const items = element.querySelectorAll(':scope > li');
		
		items.forEach((item, index) => {
			const content = this.convertElementToMarkdown(item, baseUrl).trim();
			if (isOrdered) {
				result += `${index + 1}. ${content}\n`;
			} else {
				result += `- ${content}\n`;
			}
		});

		return result;
	}

	/**
	 * Process article content: download images and replace URLs
	 */
	async processArticleImages(content: string): Promise<string> {
		const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		let match;
		let processedContent = content;

		while ((match = imgRegex.exec(content)) !== null) {
			const alt = match[1];
			const imgUrl = match[2];
			
			// Skip if already local
			if (imgUrl.startsWith('![[') || !imgUrl.startsWith('http')) {
				continue;
			}

			try {
				const localPath = await this.saveImageToLocal(imgUrl);
				if (localPath) {
					processedContent = processedContent.replace(
						match[0],
						`![${alt}](${localPath})`
					);
				}
			} catch (error) {
				console.error('Error processing image:', imgUrl, error);
			}
		}

		return processedContent;
	}

	/**
	 * Save image from URL to local vault
	 * Follows Obsidian's attachmentFolderPath setting
	 */
	private async saveImageToLocal(url: string): Promise<string | null> {
		try {
			const response = await requestUrl(url);
			if (response.status !== 200 || response.arrayBuffer.byteLength < 1) {
				console.error('Failed to download image:', url);
				return null;
			}

			const imgData = new Uint8Array(response.arrayBuffer);
			const fileName = this.generateImageFileName(url);
			
			// Get the save path based on Obsidian's attachment settings
			const filePath = await this.getImageSavedPath(fileName);
			if (!filePath) {
				console.error('Failed to determine image save path');
				return null;
			}

			// Check if file exists and generate unique name if needed
			const finalPath = await this.checkImageExistence(filePath);

			await this.app.vault.createBinary(finalPath, imgData);
			return finalPath;
		} catch (error) {
			console.error('Error saving image:', url, error);
			return null;
		}
	}

	/**
	 * Get image save path based on Obsidian's attachmentFolderPath setting
	 * @returns The full path where the image should be saved
	 */
	private async getImageSavedPath(fileName: string): Promise<string | null> {
		const settings = this.plugin.settings;
		let pluginPath = settings.savedFolder ?? '';
		if (pluginPath === '/') {
			pluginPath = '';
		}

		// Get Obsidian's attachment folder setting
		const systemPath = (this.app.vault as any).getConfig('attachmentFolderPath');
		
		if (!systemPath || systemPath.length < 1) {
			// No system setting, use plugin's saved folder
			return pluginPath ? `${pluginPath}/${fileName}` : fileName;
		}

		// Option: save at current folder (./)
		if (systemPath === './') {
			return pluginPath ? `${pluginPath}/${fileName}` : fileName;
		}

		// Option: save at root folder (/)
		if (systemPath === '/') {
			return fileName;
		}

		// Option: save to current's child folder (./folder)
		if (systemPath.length > 2 && systemPath.substr(0, 2) === './') {
			const subFolder = systemPath.substring(2);
			if (pluginPath === '') {
				await this.checkAndCreateFolder(subFolder);
				return `${subFolder}/${fileName}`;
			} else {
				const fullFolder = `${pluginPath}/${subFolder}`;
				await this.checkAndCreateFolder(fullFolder);
				return `${fullFolder}/${fileName}`;
			}
		}

		// Option: save to specified directory
		await this.checkAndCreateFolder(systemPath);
		return `${systemPath}/${fileName}`;
	}

	/**
	 * Check if image file exists and generate unique name if needed
	 */
	private async checkImageExistence(filePath: string): Promise<string> {
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (!existingFile) {
			return filePath;
		}

		// File exists, generate unique filename
		const lastSlash = filePath.lastIndexOf('/');
		const folder = lastSlash >= 0 ? filePath.substring(0, lastSlash + 1) : '';
		const fileName = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
		
		// Insert timestamp before extension
		const lastDot = fileName.lastIndexOf('.');
		const name = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName;
		const ext = lastDot >= 0 ? fileName.substring(lastDot) : '';
		
		const uniqueFileName = `${name}_${Date.now()}${ext}`;
		return folder + uniqueFileName;
	}

	/**
	 * Create folder if it doesn't exist
	 */
	private async checkAndCreateFolder(folder: string): Promise<void> {
		const exist = await this.app.vault.adapter.exists(folder);
		if (exist) {
			return;
		}
		await this.app.vault.createFolder(folder);
	}

	/**
	 * Decode HTML entities in a string
	 */
	private decodeHtmlEntities(text: string): string {
		const textarea = document.createElement('textarea');
		textarea.innerHTML = text;
		return textarea.value;
	}

	/**
	 * Generate a file name for the image
	 */
	private generateImageFileName(url: string): string {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;
		let ext = 'jpg';
		
		// Try to extract extension from URL
		const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
		if (match) {
			ext = match[1].toLowerCase();
		}

		// Generate unique filename
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000);
		return `wechat_img_${timestamp}_${random}.${ext}`;
	}

	/**
	 * Main method to process a message containing WeChat article URL
	 * Returns {title, content} or null if not a WeChat article or fetch failed
	 */
	async processMessage(content: string): Promise<WxArticleResult | null> {
		// Check if feature is enabled
		if (!this.plugin.settings.fetchWechatArticleContent) {
			return null;
		}

		// Extract URL from content
		const url = this.extractUrl(content);
		if (!url) {
			return null;
		}

		// Check if it's a WeChat article
		if (!this.isWeChatArticle(url)) {
			return null;
		}

		// Fetch and convert article
		const result = await this.fetchArticle(url);
		if (!result || !result.content) {
			return null;
		}

		// Process images
		const processedContent = await this.processArticleImages(result.content);
		return { title: result.title, content: processedContent };
	}
}
