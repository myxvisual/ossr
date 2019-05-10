#!/usr/bin/env node
"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var path = __importStar(require("path"));
var fs_1 = __importStar(require("fs"));
var chalk_1 = __importDefault(require("chalk"));
var commander_1 = __importDefault(require("commander"));
var ali_oss_1 = __importDefault(require("ali-oss"));
var agentkeepalive_1 = __importDefault(require("agentkeepalive"));
var promptProcess_1 = __importDefault(require("./promptProcess"));
var _a = require("enquirer"), Select = _a.Select, Confirm = _a.Confirm, Input = _a.Input;
var argv = process.argv;
var ossClient;
var ossConfigFile = path.join(__dirname, "ossConfig.json");
var ossConfig = {
    accessKeyId: "",
    accessKeySecret: ""
};
var listAll = true;
if (fs_1.default.existsSync(ossConfigFile)) {
    try {
        ossConfig = JSON.parse(fs_1.default.readFileSync(ossConfigFile, { encoding: "utf8" }));
    }
    catch (e) {
        console.error(e);
    }
}
commander_1.default
    .version("1.0.8", "-v, --version")
    .arguments("<local-path> [upload-path]")
    .usage(chalk_1.default.green("<local-path> [upload-path]") + " [...options]")
    .option("-d, --delete [deletePath]", "delete remote exists path", function (deletePath) {
    var prompt = new Confirm({
        name: "confirmDelete",
        message: "Make sure to remote the path: " + chalk_1.default.red(deletePath)
    });
    prompt.run().then(function (confirm) {
        if (confirm) {
            ossDelete(deletePath, function () { return __awaiter(_this, void 0, void 0, function () {
                var res, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, ossClient.get(deletePath)];
                        case 1:
                            res = _a.sent();
                            console.log(chalk_1.default.green(deletePath + " is removed."));
                            return [3 /*break*/, 3];
                        case 2:
                            e_1 = _a.sent();
                            console.error(chalk_1.default.red(deletePath + " is not removed."));
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
        }
    });
})
    .option("-l, --list [prefix]", "list remote prefix files", function (prefix) {
    listAll = false;
    listByPrefix(prefix);
})
    .option("-r, --region [region]", "[Config] set region")
    .option("-i, --accessKeyId [accessKeyId]", "[Config] set accessKeyId")
    .option("-s, --accessKeySecret [accessKeySecret]", "[Config] set accessKeySecret")
    .option("-b, --bucket [bucket]", "[Config] set bucket")
    .option("-t, --timeout [timeout]", "[Config] set timeout")
    .option("-e, --endpoint [endpoint]", "[Config] set domain name")
    .action(function (localPath, remotePath) { return __awaiter(_this, void 0, void 0, function () {
    var err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, checkOSSEnv()];
            case 1:
                _a.sent();
                uploadFileOrDir(localPath, (typeof remotePath === "string" && remotePath) ? remotePath : "/");
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
commander_1.default.parse(argv);
if ((listAll && argv.includes("-l")) || (listAll && argv.length < 3)) {
    listByPrefix({ prefix: "" });
}
else {
    updateOSSClient();
}
function checkOSSEnv() {
    return new Promise(function (resolve, reject) {
        if (ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket) {
            updateOSSClient();
            resolve();
        }
        else {
            var errMsg = "Please set config <accessKeyId> and <accessKeySecret> <bucket>.";
            console.error(errMsg);
            reject(errMsg);
        }
    });
}
function updateOSSClient() {
    var keys = ["accessKeyId", "accessKeySecret", "region", "bucket", "timeout", "endpoint"];
    keys.forEach(function (key) {
        if (commander_1.default[key]) {
            ossConfig[key] = commander_1.default[key];
        }
    });
    if (ossConfig.timeout) {
        ossConfig.agent = new agentkeepalive_1.default({
            timeout: ossConfig.timeout
        });
    }
    if (ossConfig.endpoint) {
        ossConfig.cname = true;
    }
    if (ossConfig.accessKeyId && ossConfig.accessKeySecret) {
        ossClient = new ali_oss_1.default(ossConfig);
        fs_1.default.writeFileSync(ossConfigFile, JSON.stringify(ossConfig, null, 2), { encoding: "utf-8" });
    }
}
function listByPrefix(options) {
    return __awaiter(this, void 0, void 0, function () {
        var prefix, selectedPath, focusPath, err_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prefix = options.prefix, selectedPath = options.selectedPath, focusPath = options.focusPath;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, checkOSSEnv()];
                case 2:
                    _a.sent();
                    ossClient.list({ prefix: prefix, delimiter: "/" }).then(function (res) {
                        if (res.objects || res.prefixes) {
                            var prefixes = res.prefixes || [];
                            var objects = res.objects || [];
                            var typeItems_1 = [{
                                    name: prefix,
                                    value: prefix,
                                    type: "root"
                                }];
                            if (prefix !== "") {
                                typeItems_1.push({
                                    name: "../",
                                    value: "",
                                    type: "folder",
                                    disabled: Boolean(selectedPath)
                                });
                            }
                            var hadSelectedPath_1 = false;
                            prefixes.forEach(function (name) {
                                typeItems_1.push({ name: name, value: name, type: "folder" });
                                if (selectedPath && selectedPath === name) {
                                    hadSelectedPath_1 = true;
                                }
                            });
                            objects.forEach(function (item) {
                                typeItems_1.push({
                                    name: item.name,
                                    value: item.name,
                                    type: "file"
                                });
                                if (selectedPath && selectedPath === item.name) {
                                    hadSelectedPath_1 = true;
                                    typeItems_1.push({
                                        name: item.url,
                                        value: item.url,
                                        type: "info"
                                    });
                                    typeItems_1.push({
                                        name: 'rename',
                                        value: 'rename',
                                        type: 'action'
                                    });
                                    typeItems_1.push({
                                        name: 'copy',
                                        value: 'copy',
                                        type: 'action'
                                    });
                                    typeItems_1.push({
                                        name: "delete",
                                        value: "delete",
                                        type: "action"
                                    });
                                }
                            });
                            var typeItemLastIndex_1 = typeItems_1.length - 1;
                            typeItems_1.map(function (item, index) {
                                var type = item.type, name = item.name;
                                switch (type) {
                                    case "root": {
                                        item.message = chalk_1.default.yellow(name);
                                        break;
                                    }
                                    case "action": {
                                        switch (item.name) {
                                            case "delete": {
                                                item.message = chalk_1.default.red("   └── " + name);
                                                break;
                                            }
                                            default: {
                                                item.message = chalk_1.default.blue("   ├── " + name);
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                    case "info": {
                                        item.message = chalk_1.default.grey("   ├── " + name);
                                        break;
                                    }
                                    case "file": {
                                        var isSelected = name === selectedPath;
                                        var prefixCharacter = typeItemLastIndex_1 === index ? "└── " : "" + (isSelected ? "└──┐" : "├── ");
                                        item.message = chalk_1.default.green(prefixCharacter + name);
                                        break;
                                    }
                                    case "folder": {
                                        var prefixCharacter = typeItemLastIndex_1 === index ? "└── " : "├── ";
                                        item.message = chalk_1.default.yellow(prefixCharacter + name);
                                        break;
                                    }
                                    default: {
                                        break;
                                    }
                                }
                            });
                            var choices = typeItems_1.map(function (typeItem) {
                                var name = typeItem.name;
                                var type = typeItem.type;
                                var disabled = type === "root" || (selectedPath && hadSelectedPath_1 && type !== "action" && selectedPath !== name);
                                return { name: name, message: typeItem.message, disabled: disabled };
                            });
                            var prompt_1 = new Select({
                                name: null,
                                message: prefix,
                                initial: focusPath || (selectedPath && hadSelectedPath_1 ? selectedPath : void 0),
                                choices: choices
                            });
                            promptProcess_1.default(prompt_1);
                            prompt_1
                                .run()
                                .then(function (answerStr) {
                                var index = typeItems_1.map(function (typeItem) {
                                    return typeItem.name;
                                }).indexOf(answerStr);
                                var answer = typeItems_1[index];
                                function getParentPrefix() {
                                    var parentPrefix = prefix.split("/");
                                    parentPrefix = parentPrefix.slice(0, parentPrefix.length - 2).join("/");
                                    if (parentPrefix !== "") {
                                        parentPrefix += "/";
                                    }
                                    return parentPrefix;
                                }
                                switch (answer.type) {
                                    case "root": {
                                        listByPrefix({ prefix: prefix });
                                        break;
                                    }
                                    case "folder": {
                                        if (answer.name === "../") {
                                            var parentPrefix = getParentPrefix();
                                            listByPrefix({ prefix: parentPrefix });
                                        }
                                        else {
                                            listByPrefix({ prefix: answer.name });
                                        }
                                        break;
                                    }
                                    case "file": {
                                        if (answer.name === selectedPath) {
                                            listByPrefix({ prefix: prefix, focusPath: answer.name });
                                        }
                                        else {
                                            listByPrefix({ prefix: prefix, selectedPath: answer.name });
                                        }
                                        break;
                                    }
                                    case "action": {
                                        switch (answerStr) {
                                            case "rename": {
                                                var prompt_2 = new Input({
                                                    name: "filename",
                                                    message: "input the new filename"
                                                });
                                                prompt_2.run().then(function (filename) {
                                                    filename = filename.trim();
                                                    var newPath = prefix + filename;
                                                    var prompt = new Confirm({
                                                        name: "confirmRename",
                                                        message: "Make sure to rename file : " + chalk_1.default.grey(selectedPath) + " --> " + chalk_1.default.green(newPath)
                                                    });
                                                    prompt.run().then(function (confirm) { return __awaiter(_this, void 0, void 0, function () {
                                                        var result;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    if (!confirm) return [3 /*break*/, 2];
                                                                    return [4 /*yield*/, ossClient.copy(newPath, selectedPath)];
                                                                case 1:
                                                                    result = _a.sent();
                                                                    ossDelete(selectedPath);
                                                                    listByPrefix({ prefix: prefix, selectedPath: newPath });
                                                                    return [3 /*break*/, 3];
                                                                case 2:
                                                                    listByPrefix({ prefix: prefix, selectedPath: selectedPath });
                                                                    _a.label = 3;
                                                                case 3: return [2 /*return*/];
                                                            }
                                                        });
                                                    }); });
                                                });
                                                break;
                                            }
                                            case "copy": {
                                                var prompt_3 = new Input({
                                                    name: "filename",
                                                    message: "input the copy new filename"
                                                });
                                                prompt_3.run().then(function (filename) {
                                                    filename = filename.trim();
                                                    var newPath = prefix + filename;
                                                    var prompt = new Confirm({
                                                        name: "confirmName",
                                                        message: "Make sure to copy file : " + chalk_1.default.grey(selectedPath) + " --> " + chalk_1.default.green(newPath)
                                                    });
                                                    prompt.run().then(function (confirm) { return __awaiter(_this, void 0, void 0, function () {
                                                        var result;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    if (!confirm) return [3 /*break*/, 2];
                                                                    return [4 /*yield*/, ossClient.copy(newPath, selectedPath)];
                                                                case 1:
                                                                    result = _a.sent();
                                                                    listByPrefix({ prefix: prefix, selectedPath: newPath });
                                                                    return [3 /*break*/, 3];
                                                                case 2:
                                                                    listByPrefix({ prefix: prefix, selectedPath: selectedPath });
                                                                    _a.label = 3;
                                                                case 3: return [2 /*return*/];
                                                            }
                                                        });
                                                    }); });
                                                });
                                                break;
                                            }
                                            case "delete": {
                                                var prompt_4 = new Confirm({
                                                    name: "confirmDelete",
                                                    message: "Make sure to remote the path: " + chalk_1.default.red(selectedPath)
                                                });
                                                prompt_4.run().then(function (confirm) {
                                                    if (confirm) {
                                                        ossDelete(selectedPath, function () {
                                                            listByPrefix({ prefix: prefix });
                                                        });
                                                    }
                                                    else {
                                                        listByPrefix({ prefix: prefix });
                                                    }
                                                });
                                                break;
                                            }
                                            default: {
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                    default: {
                                        break;
                                    }
                                }
                                process.stdin.resume();
                            })
                                .catch(console.error);
                        }
                        else {
                            console.error(chalk_1.default.red("Notfound by prefix: \"" + prefix + "\""));
                            listByPrefix({ prefix: "" });
                        }
                    })
                        .catch(function (err) {
                        console.error(err);
                    });
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function ossUpload(absolutePath, remotePath, options) {
    if (absolutePath === void 0) { absolutePath = ""; }
    if (remotePath === void 0) { remotePath = ""; }
    var isFile = remotePath.slice(-1) !== "/";
    var stream = fs_1.createReadStream(absolutePath);
    if (options && options.encoding) {
        stream.setEncoding(options.encoding);
    }
    var fullPath = remotePath;
    if (!isFile) {
        var baseFileName = path.basename(absolutePath);
        fullPath = remotePath + baseFileName;
    }
    return ossClient.putStream("" + fullPath, stream)
        .then(function (res) {
        console.log("-- local  path is : " + chalk_1.default.yellow(absolutePath));
        console.log("-- remote path is : " + chalk_1.default.green(res.res.requestUrls));
        return res;
    })
        .catch(function (err) { return console.error(err); });
}
function ossDelete(deletePath, susses, error) {
    function deleteAllPath(currDeletePath) {
        return __awaiter(this, void 0, void 0, function () {
            var isFile, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!currDeletePath) return [3 /*break*/, 4];
                        isFile = currDeletePath.slice(-1) !== "/";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, checkOSSEnv()];
                    case 2:
                        _a.sent();
                        if (isFile) {
                            ossClient.delete(currDeletePath).then(function (res) {
                                if (susses)
                                    susses();
                            });
                        }
                        else {
                            ossClient.list(({ prefix: currDeletePath, delimiter: "/" }))
                                .then(function (res) {
                                if (res.objects) {
                                    res.objects.forEach(function (obj) {
                                        ossClient.delete(obj.name);
                                    });
                                }
                                if (res.prefixes) {
                                    res.prefixes.forEach(function (newPath) {
                                        deleteAllPath(newPath);
                                    });
                                }
                            })
                                .catch(function (err) {
                                console.error(err);
                            });
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_3 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    deleteAllPath(deletePath);
}
function uploadFileOrDir(uploadPath, remotePath, options) {
    if (uploadPath === void 0) { uploadPath = ""; }
    if (remotePath === void 0) { remotePath = ""; }
    function uploadAllPath(uploadPath, remotePath) {
        var absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(process.cwd(), uploadPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            console.error("upload path: " + uploadPath + " is doesn't exist.");
            return;
        }
        var isDir = fs_1.default.statSync(uploadPath).isDirectory();
        if (isDir) {
            var files = fs_1.default.readdirSync(absolutePath);
            var remotePathIsDir = remotePath.slice(-1) !== "/";
            if (remotePathIsDir) {
                remotePath = remotePath + "/";
            }
            files.forEach(function (file) {
                var newPath = path.join(absolutePath, file);
                var isDir = fs_1.default.statSync(newPath).isDirectory();
                if (isDir) {
                    uploadAllPath(newPath, remotePath + file + "/");
                }
                else {
                    ossUpload(newPath, remotePath, options);
                }
            });
        }
        else {
            ossUpload(absolutePath, remotePath, options);
        }
    }
    uploadAllPath(uploadPath, remotePath);
}
module.exports = {
    uploadFileOrDir: uploadFileOrDir
};
