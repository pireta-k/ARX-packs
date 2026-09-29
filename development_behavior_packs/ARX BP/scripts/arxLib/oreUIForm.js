import { ModalFormData, CustomForm, ObservableString, ObservableNumber, ObservableBoolean } from "@minecraft/server-ui"
import { ButtonState, InputButton, InputPermissionCategory, Player, system, world } from "@minecraft/server"

/**
 * @template {string | number | boolean} T
 */
class CustomObservable {
	/**
	 * @param {String} id
	 * @param {T} value
	 * @param {Object} [options]
	 * @param {import('@minecraft/server-ui').ObservableOptions} [options.observableOptions] 
	 * @param {(observable: CustomObservable<T>, menu: CustomMenu) => Void} [options.onTick]
	 * @param {(observable: CustomObservable<T>, menu: CustomMenu) => Void} [options.onChange]
	 * @param {(id: String, newValue: String | Number | Boolean, observable: CustomObservable<T>, menu: CustomMenu) => Void} [options.onVariableUpdate]
	 * @param {String} [options.bindTo]
	 */
	constructor(id, value, options = {}) {
		this.id = id;
		this.options = options;
		this.initialValue = value;

		const observableOptions = { clientWritable: true, ...(options.observableOptions || {}) };

		/** @type {import('@minecraft/server-ui').Observable<T>}*/
		const observable = typeof value == 'string' ? new ObservableString(value, observableOptions) : (typeof value == 'number' ? new ObservableNumber(value, observableOptions) : new ObservableBoolean(value, observableOptions));
		this.observable = observable;

		this.#triggerOnChangeCallback = false;
		if (this.options.onChange) { this.observable.subscribe(() => this.#triggerOnChangeCallback = true); }
	}
	#triggerOnChangeCallback

	get data() { return this.observable.getData(); }
	set data(data) { this.observable.setData(data); }

	/** @param {CustomMenu} menu */
	tick(menu) {
		if (this.options.bindTo) menu.setVar(this.options.bindTo, this.data);

		if (this.options.onChange && this.#triggerOnChangeCallback) { this.#triggerOnChangeCallback = false; this.options.onChange(this, menu); }
		if (this.options.onTick != undefined) this.options.onTick(this, menu);
	}
}

/**
 * @typedef CustomMenuParamBindOptions
 * @property {String} bindTo
 */

/**
 * @template {String | Number | Boolean} T
 * @typedef {T | ((obs: CustomObservable<T>) => T) | CustomObservable<T> | CustomMenuParamBindOptions} CustomMenuParam
 */

class CustomMenu {
	/**
	 * @param {Player} player 
	 * @param {CustomMenuParam<String>} title 
	 */
	constructor(player, title) {
		this.#player = player;

		this.#data = {
			/** @type {Record<String, CustomObservable>} */
			observableMap: {},
			/** @type {Number | undefined} */ intervalId: undefined,
			/** @type {((menu: CustomMenu, reason: import('@minecraft/server-ui').DataDrivenScreenClosedReason) => Void)[]} */ onCloseCallbacks: [],
			/** @type {((menu: CustomMenu) => Void)[]} */ onTickCallbacks: [],
			/** @type {((observable: CustomObservable, menu: CustomForm) => Void)[]} */ onObservableChangeCallbacks: [],
			/** @type {Record<String, String | Number | Boolean>} */ variables: {}
		};

		this.#form = new CustomForm(player, this.#parseParam('Untitled', title));
	}
	#player
	#form
	#data

	get player() { return this.#player; }

	isShowing() { return this.#form.isShowing(); }

	show() {
		const promise = this.#form.show();
		promise.then(reason => {
			for (const callback of this.#data.onCloseCallbacks) callback(this, reason);
		});

		this.#runInterval();
		return promise;
	}

	close() { return this.#form.close(); }

	/** @param {(menu: CustomMenu, reason: import('@minecraft/server-ui').DataDrivenScreenClosedReason) => Void} callback */
	onClose(callback) {
		this.#data.onCloseCallbacks.push(callback);
	}

	/** @param {(menu: CustomForm) => Void} callback */
	onTick(callback) {
		this.#data.onTickCallbacks.push(callback);
	}

	/** @param {(observable: CustomObservable, menu: CustomForm) => Void} callback */
	onObservableChange(callback) {
		this.#data.onObservableChangeCallbacks.push(callback);
	}

	/** @param {String} id @returns {String | Number | Boolean | undefined} */
	getVar(id) { return this.#data.variables[id]; }

	/** @param {String} id @param {String | Number | Boolean} [value] */
	setVar(id, value = undefined) {
		if (this.#data.variables[id] == value) return;
		this.#data.variables[id] = value;

		for (const obs of this.getAllObservables()) {
			if (obs.options.onVariableUpdate != undefined) obs.options.onVariableUpdate(id, value, obs, this);

			if (obs.options.bindTo != id) continue;
			if ((typeof obs.data) != (typeof value)) continue;

			obs.data = value;
		}
	}

	/**
	 * @param {CustomMenuParam<String>} label 
	 * @param {(() => Void)} onClick 
	 * @param {Object} [options]
	 * @param {CustomMenuParam<Boolean>} [options.disabled]
	 * @param {CustomMenuParam<String>} [options.tooltip]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	button(label, onClick, options = {}) {
		this.#form.button(this.#parseParam('', label), onClick, {
			disabled: this.#parseParam(false, options.disabled),
			tooltip: this.#parseParam('', options.tooltip),
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {CustomMenuParam<String>} label 
	 * @param {CustomObservable<Number>} value
	 * @param {{ description?: CustomMenuParam<String>, label: CustomMenuParam<String>, value: Number }[]} items
	 * @param {Object} [options]
	 * @param {CustomMenuParam<String>} [options.description]
	 * @param {CustomMenuParam<Boolean>} [options.disabled]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	dropdown(label, value, items, options = {}) {
		this.#addToObservableMap(value);

		this.#form.dropdown(this.#parseParam('', label), value.observable, items.map(item => {
			return {
				description: this.#parseParam('', item.description),
				label: this.#parseParam('', item.label),
				value: item.value
			};
		}), {
			description: this.#parseParam('', options.tooltip),
			disabled: this.#parseParam(false, options.disabled),
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {CustomMenuParam<String>} label 
	 * @param {CustomObservable<Number>} value
	 * @param {CustomMenuParam<Number>} minValue
	 * @param {CustomMenuParam<Number>} maxValue
	 * @param {Object} [options]
	 * @param {CustomMenuParam<String>} [options.description]
	 * @param {CustomMenuParam<Boolean>} [options.disabled]
	 * @param {CustomMenuParam<Number>} [options.step]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	slider(label, value, minValue, maxValue, options = {}) {
		this.#addToObservableMap(value);

		this.#form.slider(this.#parseParam('', label), value.observable, this.#parseParam(0, minValue), this.#parseParam(1, maxValue), {
			description: this.#parseParam('', options.description),
			disabled: this.#parseParam(false, options.disabled),
			step: this.#parseParam(1, options.step),
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {CustomMenuParam<String>} label 
	 * @param {CustomObservable<String>} text 
	 * @param {Object} [options]
	 * @param {CustomMenuParam<String>} [options.description]
	 * @param {CustomMenuParam<Boolean>} [options.disabled]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	textField(label, text, options = {}) {
		this.#addToObservableMap(text);

		this.#form.textField(this.#parseParam('', label), text.observable, {
			description: this.#parseParam('', options.description),
			disabled: this.#parseParam(false, options.disabled),
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {CustomMenuParam<String>} label 
	 * @param {CustomObservable<Boolean>} toggled 
	 * @param {Object} [options]
	 * @param {CustomMenuParam<String>} [options.description]
	 * @param {CustomMenuParam<Boolean>} [options.disabled]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	toggle(label, toggled, options = {}) {
		this.#addToObservableMap(toggled);

		this.#form.toggle(this.#parseParam('', label), toggled.observable, {
			description: this.#parseParam('', options.description),
			disabled: this.#parseParam(false, options.disabled),
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {Object} [options]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	divider(options = {}) {
		this.#form.divider({
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {Object} [options]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	spacer(options = {}) {
		this.#form.spacer({
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {CustomMenuParam<String>} text 
	 * @param {Object} [options]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	header(text, options = {}) {
		this.#form.header(this.#parseParam('', text), {
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {CustomMenuParam<String>} text 
	 * @param {Object} [options]
	 * @param {CustomMenuParam<Boolean>} [options.visible]
	 */
	label(text, options = {}) {
		this.#form.label(this.#parseParam('', text), {
			visible: this.#parseParam(false, options.visible)
		});

		return this;
	}

	/**
	 * @param {String | CustomObservable<String>} src 
	 * @param {String | CustomObservable<String>} pack 
	 * @param {Object} [options]
	 * @param {Boolean | CustomObservable<Boolean>} [options.visible]
	 * @param {Number | CustomObservable<Number>} [options.width]
	 */
	image(src, pack, options = {}) {
		this.#addToObservableMap(src, pack, options.visible, options.width);
		this.#form.image(src instanceof CustomObservable ? src.observable : src, pack instanceof CustomObservable ? pack.observable : pack, {
			visible: options.visible instanceof CustomObservable ? options.visible.observable : options.visible,
			width: options.width instanceof CustomObservable ? options.width.observable : options.width
		});

		return this;
	}

	/**
	 * @param {String} id
	 * @template {String | Number | Boolean} T
	 * @param {T} defaultValue
	 * @param {(obs: CustomObservable<T>) => Void} onTick
	 * @returns {CustomObservable<T>}
	 */
	tickObservable(id, defaultValue, onTick) {
		const obs = new CustomObservable(id, defaultValue, {
			onTick
		});

		this.#addToObservableMap(obs);
		return obs;
	}

	/** @param {String} id @returns {CustomObservable | undefined} */
	getObservable(id) { return this.#data.observableMap[id]; }
	getAllObservables() { return Object.values(this.#data.observableMap); }

	tick() {
		for (const callback of this.#data.onTickCallbacks) callback(this);

		for (const observable of this.getAllObservables()) {
			observable.tick(this);
		}
	}

	#clearInterval() {
		if (this.#data.intervalId) system.clearRun(this.#data.intervalId);
		this.#data.intervalId = undefined;
	}

	#runInterval() {
		this.#clearInterval();
		this.#data.intervalId = system.runInterval(() => {
			if (!this.#form.isShowing()) return this.#clearInterval();

			this.tick();
		});
	}

	/** @param {CustomObservable[]} observables */
	#addToObservableMap(...observables) {
		for (const observable of observables) {
			if (!(observable instanceof CustomObservable)) continue;
			this.#data.observableMap[observable.id] = observable;
		}
	}

	/**
	 * @template {String | Number | Boolean} T
	 * @param {T} defaultValue
	 * @param {CustomMenuParam<T>} param
	 * @returns {import('@minecraft/server-ui').Observable<T> | undefined} 
	*/
	#parseParam(defaultValue, param) {
		if (param == undefined) return;

		if (typeof param.bindTo == 'string') param = new CustomObservable(Math.random() + '', defaultValue, { bindTo: param.bindTo });

		if (typeof param == 'function') {
			const func = param;
			param = this.tickObservable(Math.random() + '', defaultValue, (obs => {
				const data = func(obs);
				if (data != undefined) obs.data = data;
			}));
		} else if (param instanceof CustomObservable) this.#addToObservableMap(param);

		return param instanceof CustomObservable ? param.observable : param;
	}
}