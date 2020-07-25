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
	origin: string;
}

const cMapUrl = '../node_modules/pdfjs-dist/cmaps/';

const generateVinyl = (buffer, config: Config, data: ImageData): Vinyl => {
	const { filePrefix, format = 'png' } = config;
	const { pageNum, origin } = data;

	const filename = filePrefix
		? `${filePrefix}_page-${pageNum}.${format}`
		: `${path.basename(origin)}_page-${pageNum}.${format}`;
	const vinyl = new Vinyl({
		contents: buffer,
		path: filename,
	});
	return vinyl;
};

const pdfToImage = (config: Config = {}): NodeJS.ReadWriteStream => new Transform({
	objectMode: true,
	transform(file, enc, cb) {
		const data = new Uint8Array(file.contents);
		const cMapPacked = true;
		const origin = path.basename(file.path, path.extname(file.path));
		const imageData: ImageData[] = [];
		const { disableFontFace = true } = config;
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
					imageData.push({
						page,
						pageNum,
						origin,
					});
				};
				for (let i = 1; i <= numPages; i++) {
					promises.push(split(i));
				}
				return Promise.all(promises);
			});
			
		const convertPdf = async (data: ImageData): Promise<void> => {
			const { scale = 1.0 } = config;
			const { page } = data;
			const viewport = page.getViewport({ scale });
			const canvasFactory = new CanvasFactory();
			const canvas = canvasFactory.create(viewport.width, viewport.height);
			const renderContext = {
				canvasContext: canvas.context,
				viewport,
				canvasFactory,
			};
			await page.render(renderContext).promise;
			this.push(generateVinyl(canvas.canvas.toBuffer(), config, data));
		};
		
		splitPdf()
			.then(() => Promise.all(imageData.map(convertPdf)))
			.then(() => cb())
			.catch((err) => cb(new PluginError('pdf-to-image', err)));
	},
});

export = pdfToImage;
