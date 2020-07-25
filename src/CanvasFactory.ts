import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';

interface CanvasWithContext {
	canvas: Canvas;
	context: CanvasRenderingContext2D;
}

export = class CanvasFactory {
	create(width: number, height: number): CanvasWithContext {
		const canvas  = createCanvas(width, height);
		const context = canvas.getContext('2d');

		return {
			canvas,
			context
		};
	}
	
	reset(canvasWithContext: CanvasWithContext, width: number, height: number): void {
		canvasWithContext.canvas.width = width;
		canvasWithContext.canvas.height = height;
	}
	
	destroy(canvasWithContext: CanvasWithContext): void {
		canvasWithContext.canvas.width = 0;
		canvasWithContext.canvas.height = 0;
		canvasWithContext.canvas = null;
		canvasWithContext.context = null;
	}
}
