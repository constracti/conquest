/**
 * @param {object} options
 * @param {?string} options.tag
 * @param {?string} options.class
 * @param {?string} options.value
 * @param {?string} options.name
 * @param {?string} options.placeholder
 * @param {?boolean} options.required
 * @param {?{[k: string]: string}} options.style
 * @param {?string} options.title
 * @param {?string} options.type
 * @param {?{() => void}} options.click
 * @param {?{(event: Event) => void}} options.submit
 * @param {?(string|HTMLElement[])} options.content
 * @param {?{(element: HTMLElement) => void}} options.custom
 * @returns {HTMLElement}
 */
export function n(options) {
	if (options.tag === undefined)
		options.tag = 'div';
	if (options.class === undefined)
		options.class = null;
	if (options.value === undefined)
		options.value = null;
	if (options.name === undefined)
		options.name = null;
	if (options.placeholder === undefined)
		options.placeholder = null;
	if (options.required === undefined)
		options.required = null;
	if (options.style === undefined)
		options.style = null;
	if (options.title === undefined)
		options.title = null;
	if (options.type === undefined)
		options.type = null;
	if (options.click === undefined)
		options.click = null;
	if (options.submit === undefined)
		options.submit = null;
	if (options.content === undefined)
		options.content = null;
	if (options.custom === undefined)
		options.custom = null;
	const element = document.createElement(options.tag);
	if (options.class !== null)
		element.className = options.class;
	if (options.content === null) {
	} else if (typeof(options.content) === 'string') {
		element.innerHTML = options.content;
	} else {
		for (const child of options.content)
			element.appendChild(child);
	}
	if (options.value !== null)
		element.value = options.value;
	if (options.name !== null)
		element.name = options.name;
	if (options.placeholder !== null)
		element.placeholder = options.placeholder;
	if (options.required !== null)
		element.required = options.required;
	if (options.style !== null) {
		Object.entries(options.style).forEach(entry => {
			element.style[entry[0]] = entry[1];
		});
	}
	if (options.title !== null)
		element.title = options.title;
	if (options.type !== null)
		element.type = options.type;
	if (options.click !== null) {
		element.addEventListener('click', () => {
			options.click();
		});
	}
	if (options.submit !== null) {
		element.addEventListener('submit', event => {
			options.submit(event);
		});
	}
	if (options.custom !== null)
		options.custom(element);
	return element;
}

/**
 * @param {{id: number, name: string}[]} option_list
 * @returns {HTMLOptionElement[]}
 */
export function n_option_list(option_list) {
	const select_option = document.createElement('option');
	select_option.value = '';
	select_option.innerHTML = '-';
	return [
		select_option,
		...option_list.map(option => {
			const select_option = document.createElement('option');
			select_option.value = option.id.toFixed();
			select_option.innerHTML = option.name;
			return select_option;
		}),
	];
}

/**
 * @param {object} options
 * @param {?string} options.type - default: text
 * @param {string} options.id
 * @param {string} options.label
 * @param {string} options.name
 * @param {?string} options.min
 * @param {?{id: number, name: string}[]} options.option_list
 * @param {?string} options.value
 * @param {?boolean} options.required - default: false
 * @param {?string} options.text
 * @returns {HTMLDivElement}
 */
export function n_form_control(options) {
	if (options.type === undefined)
		options.type = null;
	if (options.type === null)
		options.type = 'text';
	if (options.min === undefined)
		options.min = null;
	if (options.option_list === undefined)
		options.option_list = null;
	if (options.value === undefined)
		options.value = null;
	if (options.required === undefined)
		options.required = null;
	if (options.required === null)
		options.required = false;
	if (options.text === undefined)
		options.text = null;
	const div = document.createElement('div');
	div.className = 'm-1 flex-grow-1';
	const label = document.createElement('label');
	label.htmlFor = options.id;
	label.className = 'mb-1 form-label';
	const label_text = document.createElement('span');
	label_text.innerHTML = options.label;
	label.append(label_text);
	if (options.required) {
		const label_ast = document.createElement('span');
		label_ast.className = 'text-danger';
		label_ast.innerHTML = '*';
		label.append(' ', label_ast);
	}
	div.append(label);
	if (options.type !== 'select') {
		const input = document.createElement('input');
		input.type = options.type;
		input.name = options.name;
		if (options.min !== null)
			input.min = options.min;
		if (options.value !== null)
			input.value = options.value;
		input.required = options.required;
		input.id = options.id;
		input.className = 'form-control form-control-sm';
		div.append(input);
	} else {
		const select = document.createElement('select');
		select.name = options.name;
		if (options.option_list !== null)
			select.append(...n_option_list(options.option_list));
		if (options.value !== null)
			select.value = options.value;
		select.required = options.required;
		select.id = options.id;
		select.className = 'form-select form-select-sm';
		div.append(select);
	}
	if (options.text !== null) {
		const text = document.createElement('div');
		text.className = 'mt-1 form-text';
		text.innerHTML = options.text;
		div.append(text);
	}
	return div;
}

/**
 * @param {string} name
 * @param {?string} value
 * @returns {HTMLInputElement}
 */
export function n_form_hidden(name, value) {
	if (value === undefined)
		value = null;
	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = name;
	if (value !== null)
		input.value = value;
	return input;
}

/**
 * @returns {HTMLDivElement}
 */
export function n_form_submit() {
	const div = document.createElement('div');
	div.className = 'm-1';
	const label = document.createElement('label');
	label.className = 'mb-1 form-label d-block';
	label.innerHTML = '&nbsp;';
	div.append(label);
	const button = document.createElement('button');
	button.type = 'submit';
	button.className = 'btn btn-primary btn-sm';
	button.innerHTML = 'Submit';
	div.append(button);
	return div;
}

/**
 * @param {HTMLElement[]} element_list
 * @returns {HTMLDivElement}
 */
export function n_form_cancel(element_list) {
	const div = document.createElement('div');
	div.className = 'm-1';
	const label = document.createElement('label');
	label.className = 'mb-1 form-label d-block';
	label.innerHTML = '&nbsp;';
	div.append(label);
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'btn btn-secondary btn-sm';
	button.innerHTML = 'Cancel';
	button.addEventListener('click', () => {
		element_list.forEach(element => element.classList.toggle('d-none'));
	});
	div.append(button);
	return div;
}
