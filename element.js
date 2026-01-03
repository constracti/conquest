/**
 * @param {object} options
 * @param {?string} options.tag
 * @param {?string} options.class
 * @param {?string} options.value
 * @param {?string} options.name
 * @param {?string} options.placeholder
 * @param {?boolean} options.required
 * @param {?{[k: string]: string}} options.style
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
 * @param {?string} option_null
 * @returns {HTMLOptionElement[]}
 */
export function n_option_list(option_list, option_null) {
	if (option_null === undefined)
		option_null = null;
	/**
	 * @type {HTMLOptionElement[]}
	 */
	const element_list = [];
	if (option_null !== null) {
		element_list.push(n({
			tag: 'option',
			value: '',
			content: option_null,
		}));
	}
	for (const option of option_list) {
		element_list.push(n({
			tag: 'option',
			value: `${option.id}`,
			content: option.name,
		}));
	}
	return element_list;
}
