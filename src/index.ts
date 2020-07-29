import path = require('path');
import pdfjs = require('pdfjs-dist/es5/build/pdf.js');
import { Transform } from 'stream';
import PluginError = require('plugin-error');
import Vinyl = require('vinyl');
import CanvasFactory = require('./CanvasFactory');
import { PDFPageProxy } from 'pdfjs-dist';

type OutputFormat = 'gif' | 'tiff' | 'jpg' | 'jpeg' | 'png';

interface Config {
	scale?: number;
	filePrefix?: string;
	format?: OutputFormat;
	disableFontFace?: boolean;
}

interface ImageData {
	page: PDFPageProxy;
	pageNum: number;
}

const pdfToImage = (config: Config = {}): NodeJS.ReadWriteStream => new Transform({
	objectMode: true,
	transform(file, enc, cb) {
		const data = new Uint8Array(file.contents);
		const cMapPacked = true;
		const cMapUrl = '../node_modules/pdfjs-dist/cmaps/';
		const origin = path.basename(file.path, path.extname(file.path));
		const imageData: ImageData[] = [];
		const {
			disableFontFace = true,
			format = 'png',
			filePrefix,
			scale = 1.0,
		} = config;
		
		const generateFilename = (pageNum) => filePrefix
			? `${filePrefix}_page-${pageNum}.${format}`
			: `${path.basename(origin)}_page-${pageNum}.${format}`;
		
		const splitPdf = (): Promise<void> => pdfjs
			.getDocument({
				data,
				cMapUrl,
				cMapPacked,
				disableFontFace,
			})
			.promise
			.then((doc) => {
				const { numPages } = doc;
				const promises = [];
				const split = async (pageNum): Promise<void> => {
					const page = await doc.getPage(pageNum);
					imageData.push({ page, pageNum });
				};
				for (let i = 1; i <= numPages; i++) {
					promises.push(split(i));
				}
				return Promise.all(promises);
			});
			
		const convertPdf = async (data: ImageData): Promise<void> => {
			const { page, pageNum } = data;
			const viewport = page.getViewport({ scale });
			const canvasFactory = new CanvasFactory();
			const canvas = canvasFactory.create(viewport.width, viewport.height);
			const renderContext = {
				canvasContext: canvas.context,
				viewport,
				canvasFactory,
			};
			const fileName = generateFilename(pageNum);
			await page.render(renderContext).promise;
			this.push(new Vinyl({
				contents: canvas.canvas.toBuffer(),
				path: fileName,
			}));
		};
		
		splitPdf()
			.then(() => Promise.all(imageData.map(convertPdf)))
			.then(() => cb())
			.catch((err) => cb(new PluginError('pdf-to-image', err)));
	},
});

export = pdfToImage;
