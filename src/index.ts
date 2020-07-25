import path = require('path');
import pdfjs = require('pdfjs-dist/es5/build/pdf.js');
import { Transform } from 'stream';
import PluginError = require('plugin-error');
import Vinyl = require('vinyl');
import CanvasFactory = require('./CanvasFactory');

type OutputFormat = 'gif' | 'tiff' | 'jpg' | 'jpeg' | 'png';

interface Config {
	scale?: number;
	filePrefix?: string;
	format?: OutputFormat;
}

const cMapUrl = '../node_modules/pdfjs-dist/cmaps/';

const generateVinyl = (buffer, config: Config, pageNum: number, origin: string): Vinyl => {
	const { filePrefix, format = 'png' } = config;
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
	async transform(file, enc, cb) {
		const data = new Uint8Array(file.contents);
		const cMapPacked = true;
		const origin = path.basename(file.path, path.extname(file.path));
		const pages = [];
		
		const splitPdf = async () => await pdfjs
			.getDocument({
				data,
				cMapUrl,
				cMapPacked,
			})
			.promise
			.then(async (doc) => {
				const { numPages } = doc;
				const promises = [];
				const split = async (pageNum): Promise<void> => {
					const page = await doc.getPage(pageNum);
					pages.push({
						page,
						pageNum,
						origin,
					});
				};
				for (let i = 1; i <= numPages; i++) {
					promises.push(split(i));
				}
				await Promise
					.all(promises)
					.catch((err) => cb(new PluginError(err)));
			});
			
		const convertPdf = async (file) => {
			const { scale = 1.0 } = config;
			const { page, pageNum, origin } = file;
			const viewport = page.getViewport({ scale });
			const canvasFactory = new CanvasFactory();
			const canvas = canvasFactory.create(viewport.width, viewport.height);
			const renderContext = {
				canvasContext: canvas.context,
				viewport,
				canvasFactory,
			};
			await page.render(renderContext).promise;
			this.push(generateVinyl(canvas.canvas.toBuffer(), config, pageNum, origin));
		};
		
		splitPdf()
			.then(() => Promise.all(pages.map(convertPdf)))
			.then(() => cb())
			.catch((err) => cb(new PluginError(err)));
	},
});

export = pdfToImage;
