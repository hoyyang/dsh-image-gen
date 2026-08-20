Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let react = require("react");
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/client/locales.ts
const zh = {
	title: "图像生成配置 (dsh-image-gen)",
	baseUrl: "网关 Base URL",
	baseUrlHint: "OpenAI 兼容生图网关根地址（不含路径），如网关文档给出的 /v1 根。必须 https。",
	model: "模型",
	modelHint: "网关接受的生图模型名，例如 gpt-image-2 或你的代理自定义模型名。",
	imagesPath: "接口路径",
	imagesPathHint: "生图接口路径，默认 /images/generations。",
	apiKey: "API Key",
	apiKeyHint: "网关密钥；仅保存在本机设置存储中。",
	outputDir: "输出目录",
	outputDirHint: "留空则使用 ~/.dsh/generated_images/dsh-image-gen。",
	timeoutMs: "超时（毫秒）",
	save: "保存",
	saved: "已保存 ✓",
	saving: "保存中…",
	empty: "尚未配置——填好网关信息并保存后即可用 /dsh-image-gen 或 dsh_image_gen 生成图片。",
	scopeHint: "配置即时生效；也可用环境变量 DSH_IMAGE_* 或 ~/.dsh/dsh-image-gen.json 覆盖。"
};
const en = {
	title: "Image generation (dsh-image-gen)",
	baseUrl: "Gateway base URL",
	baseUrlHint: "Root of an OpenAI-compatible image gateway (path-less, e.g. the /v1 root). Must be https.",
	model: "Model",
	modelHint: "Image model name your gateway accepts, e.g. gpt-image-2 or a custom model id.",
	imagesPath: "Endpoint path",
	imagesPathHint: "Images endpoint path; defaults to /images/generations.",
	apiKey: "API key",
	apiKeyHint: "Gateway secret; stored only in local settings storage.",
	outputDir: "Output directory",
	outputDirHint: "Leave empty for ~/.dsh/generated_images/dsh-image-gen.",
	timeoutMs: "Timeout (ms)",
	save: "Save",
	saved: "Saved ✓",
	saving: "Saving…",
	empty: "Not configured yet — fill in the gateway details, save, then use /dsh-image-gen or the dsh_image_gen tool.",
	scopeHint: "Changes apply live; DSH_IMAGE_* env vars or ~/.dsh/dsh-image-gen.json also work."
};
//#endregion
//#region src/client/SettingsCard.tsx
function Field(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: 4
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 12,
					fontWeight: 600,
					opacity: .85
				},
				children: props.label
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				type: props.type ?? "text",
				autoComplete: props.type === "password" ? "new-password" : "off",
				value: props.value,
				onChange: (e) => props.onChange(e.target.value)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 11,
					opacity: .6,
					lineHeight: 1.4
				},
				children: props.hint
			})
		]
	});
}
function SettingsCard(props) {
	const { t, scope } = props;
	const [open, setOpen] = (0, react.useState)(false);
	const [saving, setSaving] = (0, react.useState)(false);
	const [saved, setSaved] = (0, react.useState)(false);
	const value = (0, react.useSyncExternalStore)(scope.subscribe, scope.getSnapshot).value ?? {};
	const str = (key) => String(value[key] ?? "");
	const [draft, setDraft] = (0, react.useState)({});
	const draftOr = (key) => key in draft ? draft[key] : str(key);
	const setField = (key, v) => setDraft((d) => ({
		...d,
		[key]: v
	}));
	const save = async () => {
		setSaving(true);
		setSaved(false);
		try {
			for (const key of [
				"baseUrl",
				"model",
				"imagesPath",
				"apiKey",
				"outputDirectory",
				"timeoutMs"
			]) {
				if (!(key in draft)) continue;
				const raw = draft[key].trim();
				if (key === "timeoutMs") await scope.set(key, Number(raw) >= 1e3 ? Number(raw) : Number(str("timeoutMs")) || 3e5);
				else await scope.set(key, raw);
			}
			setDraft({});
			setSaved(true);
		} finally {
			setSaving(false);
		}
	};
	const configured = str("baseUrl") !== "" && str("apiKey") !== "";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
		icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { size: 14 }),
		title: t("title") + (configured ? " · ✓" : ""),
		open,
		expandable: true,
		onToggle: () => setOpen((o) => !o),
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 10,
				padding: "4px 0 8px"
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						opacity: .7
					},
					children: t("empty")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: t("baseUrl"),
					hint: t("baseUrlHint"),
					value: draftOr("baseUrl"),
					onChange: (v) => setField("baseUrl", v)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: t("model"),
					hint: t("modelHint"),
					value: draftOr("model"),
					onChange: (v) => setField("model", v)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: t("apiKey"),
					hint: t("apiKeyHint"),
					type: "password",
					value: draftOr("apiKey"),
					onChange: (v) => setField("apiKey", v)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: t("imagesPath"),
					hint: t("imagesPathHint"),
					value: draftOr("imagesPath"),
					onChange: (v) => setField("imagesPath", v)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: t("outputDir"),
					hint: t("outputDirHint"),
					value: draftOr("outputDir"),
					onChange: (v) => setField("outputDir", v)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					label: t("timeoutMs"),
					hint: "",
					value: draftOr("timeoutMs"),
					onChange: (v) => setField("timeoutMs", v)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 8,
						alignItems: "center"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						size: "sm",
						disabled: saving,
						onClick: () => void save(),
						children: saving ? t("saving") : t("save")
					}), saved && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 12,
							color: "#22c55e"
						},
						children: t("saved")
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						opacity: .6,
						lineHeight: 1.5
					},
					children: t("scopeHint")
				})
			]
		})
	});
}
//#endregion
//#region src/client/index.ts
/**
* dsh-image-gen client: registers the plugin-configuration card on the DSH
* settings Plugins page. The card binds the 'dsh-image-gen' settings
* namespace through the client settings scope, so saved fields reach the
* host immediately (live) — no restart required.
* Built by tsdown into client/client.js; react and the primitives module
* are resolved through the loader module table at runtime.
*/
const NS = "dsh-image-gen";
const REQUIRED_PRIMITIVES = [
	"DisclosureRow",
	"Input",
	"Button",
	"IconSettingsOutline16"
];
const name = NS;
const inject = ["slots", "locale"];
function apply(ctx) {
	const missing = REQUIRED_PRIMITIVES.filter((n) => _deepseek_ai_dsh_client_ui_primitives[n] === void 0);
	if (missing.length > 0) {
		console.warn("[dsh-image-gen] host ui-primitives missing " + missing.join(", ") + " — settings card disabled");
		return;
	}
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "dsh-image-gen: dictionaries");
	const t = ctx.locale.bind(NS);
	ctx.inject(["settingsScope"], (scoped) => {
		const scope = scoped.settingsScope.bind({ namespace: NS });
		scoped.slots.inject("settings.plugin.item", () => scoped.slots.register({
			name: "settings.plugin.item",
			key: NS,
			locale: NS,
			inject: () => ({ t })
		}, () => (0, react.createElement)(SettingsCard, {
			t,
			scope
		})));
	});
}
//#endregion
exports.apply = apply;
exports.inject = inject;
exports.name = name;
