function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	return results === null
		? ""
		: decodeURIComponent(results[1].replace(/\+/g, " "));
}

var iframe = document.getElementById("api-frame");
var url = getParameterByName("urlid");
var prefix = getParameterByName("prefix");
var DEFAULT_URLID = "a24448725afb49159cb1bc7afea816ac";
var DEFAULT_PREFIX = "seat ";
var CONFIG = {
	urlid: url !== "" ? url : DEFAULT_URLID,
	prefix: prefix !== "" ? prefix : DEFAULT_PREFIX,
};

var Configurator = {
	api: null,
	config: null,
	options: [],

	/**
	 * Initialize viewer
	 */
	init: function (config, iframe) {
		this.config = config;
		var client = new Sketchfab(iframe);
		client.init(config.urlid, {
			ui_infos: 0,
			ui_controls: 0,
			graph_optimizer: 0,
			success: function onSuccess(api) {
				api.start();
				api.addEventListener(
					"viewerready",
					function () {
						this.api = api;
						this.initializeOptions(
							function () {
								console.log(
									"Found the following options:",
									this.options
								);
								this.selectOption(0);
								UI.init(this.config, this.options);
							}.bind(this)
						);
					}.bind(this)
				);
			}.bind(this),
			error: function onError() {
				console.log("Viewer error");
			},
		});
	},

	/**
	 * Initialize options from scene
	 */
	initializeOptions: function initializeOptions(callback) {
		console.log(this.api);
		const api = this.api;
		let theMaterials;
		let theTextures;
		api.getMaterialList(function (err, materials) {
			if (!err) {
				console.log("materials --> ", materials);
				theMaterials = materials;
			}
		});
		api.getTextureList(function (err, textures) {
			if (!err) {
				console.log("textures --> ", textures);
				theTextures = textures;
			}
		});
		api.getNodeMap(
			function (err, nodes) {
				if (err) {
					console.error(err);
					return;
				}
				var node;
				var isOptionObject = false;
				var keys = Object.keys(nodes);

				// apply a texture to a material
				const materialToUpdate = theMaterials[2];
				const texture = theTextures[1];
				materialToUpdate.channels.AlbedoPBR.enable = true;
				materialToUpdate.channels.AlbedoPBR.texture =
					texture;
				materialToUpdate.channels.AlbedoPBR.color = false;
				api.setMaterial(materialToUpdate);

				for (var i = 0; i < keys.length; i++) {
					node = nodes[keys[i]];

					// assigns the material to all nodes
					api.assignMaterial(
						node,
						theMaterials[2].id,
						function () {
							console.log("Material updated");
						}
					);

					isOptionObject =
						node.name &&
						node.name.indexOf(this.config.prefix) !==
							-1 &&
						(node.type === "Geometry" ||
							node.type === "Group");
					if (isOptionObject) {
						this.options.push({
							id: node.instanceID,
							name: node.name,
							selected: false,
						});
					}
				}
				callback();
			}.bind(this)
		);
	},

	/**
	 * Select option to show
	 */
	selectOption: function selectOption(index) {
		const api = this.api;
		var options = this.options;
		for (var i = 0, l = options.length; i < l; i++) {
			if (i === index) {
				options[i].selected = true;
				//api.show(options[i].id);
			} else {
				options[i].selected = false;
				//api.hide(options[i].id);
			}
		}
	},
};

var UI = {
	config: null,
	options: null,
	init: function init(config, options) {
		this.config = config;
		this.options = options;
		this.el = document.querySelector(".options");
		this.render();
		this.el.addEventListener(
			"change",
			function (e) {
				e.preventDefault();
				var index = parseInt(
					this.el.elements["color"].value,
					10
				);
				this.select(index);
			}.bind(this)
		);
	},

	select: function (index) {
		Configurator.selectOption(parseInt(index, 10));
		this.render();
	},

	render: function () {
		if (this.config.urlid === DEFAULT_URLID) {
			this.renderRadio();
		} else {
			this.renderSelect();
		}
	},

	/**
	 * Render options as multiple `<input type="radio">`
	 */
	renderRadio: function render() {
		var html = this.options
			.map(
				function (option, i) {
					var checkedState = option.selected
						? 'checked="checked"'
						: "";
					var className = option.name.replace(
						this.config.prefix,
						""
					);
					return [
						'<label class="options__option">',
						'<input type="radio" name="color" value="' +
							i +
							'" ' +
							checkedState +
							">",
						'<span class="' +
							className +
							'">' +
							option.name +
							"</span>",
						"</label>",
					].join("");
				}.bind(this)
			)
			.join("");
		this.el.innerHTML = html;
	},

	/**
	 * Render option as `<select>`
	 */
	renderSelect: function () {
		var html = this.options
			.map(function (option, i) {
				var checkedState = option.selected
					? 'selected="selected"'
					: "";
				return [
					'<option value="' +
						i +
						'" ' +
						checkedState +
						">",
					option.name,
					"</option>",
				].join("");
			})
			.join("");
		this.el.innerHTML =
			'<select name="color">' + html + "</select>";
	},
};

Configurator.init(CONFIG, iframe);