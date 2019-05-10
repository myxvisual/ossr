#!/usr/bin/env node
"use strict";
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
            ossDelete(deletePath);
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
    .action(function (localPath, remotePath) {
    checkConfig(function () {
        uploadFileOrDir(localPath, (typeof remotePath === "string" && remotePath) ? remotePath : "/");
    });
});
function checkConfig(success) {
    if (ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket) {
        if (success && typeof success === "function") {
            updateOSSClient();
            success();
        }
    }
    else {
        console.error("Please set config <accessKeyId> and <accessKeySecret> <bucket>.");
    }
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
commander_1.default.parse(argv);
if ((listAll && argv.includes("-l")) || (listAll && argv.length < 3)) {
    listByPrefix("");
}
else {
    updateOSSClient();
}
function listByPrefix(prefix, selectedPath) {
    checkConfig(function () {
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
                            item.message = chalk_1.default.blue("    └── " + name);
                            break;
                        }
                        case "info": {
                            item.message = chalk_1.default.grey("    └── " + name);
                            break;
                        }
                        case "file": {
                            var prefixCharacter = typeItemLastIndex_1 === index ? "└── " : "├── ";
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
                    initial: (selectedPath && hadSelectedPath_1) ? selectedPath : void 0,
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
                            listByPrefix(prefix);
                            break;
                        }
                        case "folder": {
                            if (answer.name === "../") {
                                var parentPrefix = getParentPrefix();
                                listByPrefix(parentPrefix);
                            }
                            else {
                                listByPrefix(answer.name);
                            }
                            break;
                        }
                        case "file": {
                            if (answer.name === selectedPath) {
                                listByPrefix(prefix);
                            }
                            else {
                                listByPrefix(prefix, answer.name);
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
                                        listByPrefix(prefix, prefix + filename.trim());
                                    });
                                    break;
                                }
                                case "delete": {
                                    var prompt_3 = new Confirm({
                                        name: "confirmDelete",
                                        message: "Make sure to remote the path: " + chalk_1.default.red(selectedPath)
                                    });
                                    prompt_3.run().then(function (confirm) {
                                        if (confirm) {
                                            ossDelete(selectedPath, function () {
                                                listByPrefix(prefix);
                                            });
                                        }
                                        else {
                                            listByPrefix(prefix);
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
                listByPrefix("");
            }
        })
            .catch(function (err) {
            console.error(err);
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
function ossDelete(deletePath, callback) {
    function deleteAllPath(currDeletePath) {
        if (currDeletePath) {
            var isFile = currDeletePath.slice(-1) !== "/";
            if (isFile) {
                checkConfig(function () {
                    ossClient.delete(currDeletePath).then(function (res) {
                        if (callback)
                            callback();
                    });
                });
            }
            else {
                checkConfig(function () {
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
                });
            }
        }
    }
    deleteAllPath(deletePath);
}
function uploadFileOrDir(uploadPath, remotePath, options) {
    if (uploadPath === void 0) { uploadPath = ""; }
    if (remotePath === void 0) { remotePath = ""; }
    function uploadAllPath(uploadPath, remotePath) {
        var absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(process.cwd(), uploadPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            console.error("upload path: " + uploadPath + " is doesn't");
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
