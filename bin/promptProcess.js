"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var roles = require('enquirer/lib/roles');
var utils = require('enquirer/lib/utils');
var colors = require('ansi-colors');
function promptProcess(prompt) {
    prompt.toChoice = function (ele, i, parent) {
        return __awaiter(this, void 0, void 0, function () {
            var origVal, role, choice, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(typeof ele === 'function')) return [3 /*break*/, 2];
                        return [4 /*yield*/, ele.call(this, this)];
                    case 1:
                        ele = _b.sent();
                        _b.label = 2;
                    case 2:
                        if (!(ele instanceof Promise)) return [3 /*break*/, 4];
                        return [4 /*yield*/, ele];
                    case 3:
                        ele = _b.sent();
                        _b.label = 4;
                    case 4:
                        if (typeof ele === 'string')
                            ele = { name: ele };
                        if (ele.normalized)
                            return [2 /*return*/, ele];
                        ele.normalized = true;
                        origVal = ele.value;
                        role = roles(ele.role, this.options);
                        ele = role(this, ele);
                        if (typeof ele.disabled === 'string' && !ele.hint) {
                            ele.hint = ele.disabled;
                            ele.disabled = true;
                        }
                        if (ele.disabled === true && ele.hint == null) {
                            // ele.hint = '(disabled)';
                        }
                        // if the choice was already normalized, return it
                        if (ele.index != null)
                            return [2 /*return*/, ele];
                        ele.name = ele.name || ele.key || ele.title || ele.value || ele.message;
                        ele.message = ele.message || ele.name || '';
                        ele.value = [ele.value, ele.name].find(this.isValue.bind(this));
                        ele.input = '';
                        ele.index = i;
                        ele.cursor = 0;
                        utils.define(ele, 'parent', parent);
                        ele.level = parent ? parent.level + 1 : 1;
                        if (ele.indent == null) {
                            ele.indent = parent ? parent.indent + '  ' : (ele.indent || '');
                        }
                        ele.path = parent ? parent.path + '.' + ele.name : ele.name;
                        ele.enabled = !!(this.multiple && !this.isDisabled(ele) && (ele.enabled || this.isSelected(ele)));
                        if (!this.isDisabled(ele)) {
                            this.longest = Math.max(this.longest, colors.unstyle(ele.message).length);
                        }
                        choice = __assign({}, ele);
                        // then allow the choice to be reset using the "original" values
                        ele.reset = function (input, value) {
                            if (input === void 0) { input = choice.input; }
                            if (value === void 0) { value = choice.value; }
                            for (var _i = 0, _a = Object.keys(choice); _i < _a.length; _i++) {
                                var key = _a[_i];
                                ele[key] = choice[key];
                            }
                            ele.input = input;
                            ele.value = value;
                        };
                        if (!(origVal == null && typeof ele.initial === 'function')) return [3 /*break*/, 6];
                        _a = ele;
                        return [4 /*yield*/, ele.initial.call(this, this.state, ele, i)];
                    case 5:
                        _a.input = _b.sent();
                        _b.label = 6;
                    case 6: return [2 /*return*/, ele];
                }
            });
        });
    };
    prompt.render = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, submitted, size, prompt, header, prefix, separator, message, output, help, _b, body, footer;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this.state, submitted = _a.submitted, size = _a.size;
                        prompt = '';
                        return [4 /*yield*/, this.header()];
                    case 1:
                        header = _c.sent();
                        return [4 /*yield*/, this.prefix()];
                    case 2:
                        prefix = _c.sent();
                        return [4 /*yield*/, this.separator()];
                    case 3:
                        separator = _c.sent();
                        return [4 /*yield*/, this.message()];
                    case 4:
                        message = _c.sent();
                        if (this.options.promptLine !== false) {
                            prompt = [prefix, message, separator, ''].join(' ');
                            this.state.prompt = prompt;
                        }
                        return [4 /*yield*/, this.format()];
                    case 5:
                        output = _c.sent();
                        return [4 /*yield*/, this.error()];
                    case 6:
                        _b = (_c.sent());
                        if (_b) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.hint()];
                    case 7:
                        _b = (_c.sent());
                        _c.label = 8;
                    case 8:
                        help = _b;
                        return [4 /*yield*/, this.renderChoices()];
                    case 9:
                        body = _c.sent();
                        return [4 /*yield*/, this.footer()];
                    case 10:
                        footer = _c.sent();
                        if (output)
                            prompt += output;
                        if (help && !prompt.includes(help))
                            prompt += ' ' + help;
                        if (submitted && !output && !body.trim() && this.multiple && this.emptyError != null) {
                            prompt += this.styles.danger(this.emptyError);
                        }
                        this.clear(size);
                        this.write([header, body, footer].filter(Boolean).join('\n'));
                        this.write(this.margin[2]);
                        this.restore();
                        return [2 /*return*/];
                }
            });
        });
    };
}
exports.promptProcess = promptProcess;
exports.default = promptProcess;
