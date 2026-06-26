export {
    Color
}

class Color {
	/** @param {Number} red @param {Number} green @param {Number} blue */
	constructor(red, green, blue, alpha = 1) {
		this.#rgba = { r: red || 0, g: green || 0, b: blue || 0, a: alpha || 0 };
	}
	#rgba

	get rgba() { return this.#rgba; }
	get rgbaFullNames() { return { red: this.#rgba.r, green: this.#rgba.g, blue: this.#rgba.b, alpha: this.#rgba.a }; }

	get r() { return this.#rgba.r; }
	get g() { return this.#rgba.g; }
	get b() { return this.#rgba.b; }
	get a() { return this.#rgba.a; }

	/** @param {Number} red @param {Number} green @param {Number} blue */
	setRGBA(red, green, blue, alpha = 1) {
		this.#rgba = { r: red, g: green, b: blue, a: alpha };
		return this;
	}

	/** @param {Object} rgba @param {Number} [rgba.r] @param {Number} [rgba.g] @param {Number} [rgba.b] @param {Number} [rgba.a] */
	setSeparately(rgba) {
		Object.assign(this.#rgba, rgba);
		return this;
	}

	clone() { return new Color(this.#rgba.r, this.#rgba.g, this.#rgba.b, this.#rgba.a); }
	toArray() { return Object.values(this.#rgba); }

	/** @param {Number[] | Color} rgbaArray */
	static fromArray(rgbaArray) { return rgbaArray instanceof Color ? rgbaArray : new Color(...rgbaArray); }

	/** @param {String} hex */
	static fromHEX(hex) {
		hex = hex.replace('#', '');
		return new Color(...[0, 2, 4].map(start => parseInt(hex.slice(start, start+2), 16) / 255));
	}

	/** @param {Color} color1 @param {Color} color2 */
	static mix(color1, color2, color1Weight = 0.5) {
		const color2Weight = 1 - color1Weight;
		return new Color(
			color1.r*color1Weight + color2.r*color2Weight,
			color1.g*color1Weight + color2.g*color2Weight,
			color1.b*color1Weight + color2.b*color2Weight,
			color1.a*color1Weight + color2.a*color2Weight
		);
	}

	/** @param {[Color | Number[], Number][]} weighedColors */
	static weighedMix(weighedColors) {
		const totalWeight = weighedColors.reduce((total, weighedColor) => total + weighedColor[1], 0);
		return new Color(...Object.values(weighedColors.reduce((rgba, weighedColor) => {
			const color = Color.fromArray(weighedColor[0]);
			return {
				r: rgba.r + color.r*weighedColor[1]/totalWeight,
				g: rgba.g + color.g*weighedColor[1]/totalWeight,
				b: rgba.b + color.b*weighedColor[1]/totalWeight,
				a: rgba.a + color.a*weighedColor[1]/totalWeight
			};
		}, { r: 0, g: 0, b: 0, a: 0 })));
	}

	/** @param {Color} fromColor @param {Color} toColor */
	static gradient(fromColor, toColor, stepCount = 1) {
		return [fromColor, new Array(stepCount).fill(0).map((_, i) => {
			return Color.mix(fromColor, toColor, (stepCount-i-1)/stepCount);
		})].flat();
	}

	static Black = Color.fromHEX('#1d1d21');
	static Blue = Color.fromHEX('#3c44aa');
	static Brown = Color.fromHEX('#835432');
	static Cyan = Color.fromHEX('#169c9c');
	static Gray = Color.fromHEX('#474f52');
	static Green = Color.fromHEX('#5e7c16');
	static LightBlue = Color.fromHEX('#3ab3da');
	static Lime = Color.fromHEX('#80c71f');
	static Magenta = Color.fromHEX('#c74ebd');
	static Orange = Color.fromHEX('#f9801d');
	static Pink = Color.fromHEX('#f38baa');
	static Purple = Color.fromHEX('#8932b8');
	static Red = Color.fromHEX('#b02e26');
	static Silver = Color.fromHEX('#9d9d97');
	static White = Color.fromHEX('#f9fffe');
	static Yellow = Color.fromHEX('#80c71f');
}