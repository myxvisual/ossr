#!/usr/bin/env node
"use strict";
import * as path from "path";
import fs, { createReadStream } from "fs";
import chalk from "chalk";
import program from "commander";
import OSS from "ali-oss";
import AgentKeepAlive from "agentkeepalive";
import promptProcess from "./promptProcess";
const { Select, Confirm, Input } = require("enquirer");

const argv = process.argv;
let ossClient: any;
const ossConfigFile = path.join(__dirname, "ossConfig.json");
let ossConfig: {
  accessKeyId: string;
  accessKeySecret: string;
  timeout?: string | number;
  bucket?: string;
  agent?: any;
  endpoint?: string;
  cname?: boolean;
} = {
  accessKeyId: "",
  accessKeySecret: ""
};
let listAll = true;
if (fs.existsSync(ossConfigFile)) {
  try {
    ossConfig = JSON.parse(fs.readFileSync(ossConfigFile, { encoding: "utf8" }));
  } catch (e) {
    console.error(e);
  }
}

program
  .version("1.0.8", "-v, --version")
  .arguments("<local-path> [upload-path]")
  .usage(`${chalk.green("<local-path> [upload-path]")} [...options]`)

  .option("-d, --delete [deletePath]", "delete remote exists path", deletePath => {
    const prompt = new Confirm({
      name: "confirmDelete",
      message: "Make sure to remote the path: " + chalk.red(deletePath)
    });

    prompt.run().then(confirm => {
      if (confirm) {
        ossDelete(deletePath, async () => {
          try {
            const res = await ossClient.get(deletePath)
            console.log(chalk.green(`${deletePath} is removed.`));
          } catch (e) {
            console.error(chalk.red(`${deletePath} is not removed.`));
          }
        });
      }
    });
  })
  .option("-l, --list [prefix]", "list remote prefix files", prefix => {
    listAll = false;
    listByPrefix(prefix);
  })

  .option("-r, --region [region]", "[Config] set region")
  .option("-i, --accessKeyId [accessKeyId]", "[Config] set accessKeyId")
  .option("-s, --accessKeySecret [accessKeySecret]", "[Config] set accessKeySecret")
  .option("-b, --bucket [bucket]", "[Config] set bucket")
  .option("-t, --timeout [timeout]", "[Config] set timeout")
  .option("-e, --endpoint [endpoint]", "[Config] set domain name")

  .action(async (localPath, remotePath) => {
    try {
      await checkOSSEnv();
      uploadFileOrDir(localPath, (typeof remotePath === "string" && remotePath) ? remotePath : "/");
    } catch (err) {}
  });
program.parse(argv);

if ((listAll && argv.includes("-l")) || (listAll && argv.length < 3)) {
  listByPrefix({ prefix: "" });
} else {
  updateOSSClient();
}

function checkOSSEnv() {
  return new Promise((resolve, reject) => {
    if (ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket ) {
      updateOSSClient();
      resolve();
    } else {
      const errMsg = "Please set config <accessKeyId> and <accessKeySecret> <bucket>."
      console.error(errMsg);
      reject(errMsg);
    }
  });
}

function updateOSSClient() {
 const keys = ["accessKeyId", "accessKeySecret", "region", "bucket", "timeout", "endpoint"];
  keys.forEach(key => {
    if (program[key]) {
      ossConfig[key] = program[key];
    }
  });

  if (ossConfig.timeout) {
    ossConfig.agent = new AgentKeepAlive({
      timeout: ossConfig.timeout as any
    });
  }
  if (ossConfig.endpoint) {
    ossConfig.cname = true;
  }

  if (ossConfig.accessKeyId && ossConfig.accessKeySecret) {
    ossClient = new OSS(ossConfig);
    fs.writeFileSync(ossConfigFile,  JSON.stringify(ossConfig, null, 2), { encoding: "utf-8" });
  }
}

async function listByPrefix(options: { prefix: string, selectedPath?: string; focusPath?: string; }) {
  const { prefix, selectedPath, focusPath } = options;
  try {
    await checkOSSEnv();
    ossClient.list({ prefix, delimiter: "/" }).then(res => {
        if (res.objects || res.prefixes) {
          const prefixes: string[] = res.prefixes || [];
          const objects: any[] = res.objects || [];
          const typeItems: {
            name?: string;
            value?: string;
            message?: string;
            type?: "root" | "folder" | "file" | "action" | "info";
            disabled?: boolean;
          }[] = [{
            name: prefix,
            value: prefix,
            type: "root"
          }];
          if (prefix !== "") {
            typeItems.push({
              name: "../",
              value: "",
              type: "folder",
              disabled: Boolean(selectedPath)
            });
          }

          let hadSelectedPath = false;
          prefixes.forEach(name => {
            typeItems.push({ name, value: name, type: "folder" });
            if (selectedPath && selectedPath === name) {
              hadSelectedPath = true;
            }
          });
          objects.forEach(item => {
            typeItems.push({
              name: item.name,
              value: item.name,
              type: "file"
            });
            if (selectedPath && selectedPath === item.name) {
              hadSelectedPath = true;
              typeItems.push({
                name: item.url,
                value: item.url,
                type: "info"
              });
              typeItems.push({
                name: 'rename',
                value: 'rename',
                type: 'action'
              });
              typeItems.push({
                name: 'copy',
                value: 'copy',
                type: 'action'
              });
              typeItems.push({
                name: "delete",
                value: "delete",
                type: "action"
              });
            }
          });

          const typeItemLastIndex = typeItems.length - 1;
          typeItems.map((item, index) => {
            const { type, name } = item;
            switch (type) {
              case "root": {
                item.message = chalk.yellow(name);
                break;
              }
              case "action": {
                switch (item.name) {
                  case "delete": {
                    item.message = chalk.red("   └── " + name);
                    break
                  }
                  default: {
                    item.message = chalk.blue("   ├── " + name);
                    break
                  }
                }
                break;
              }
              case "info": {
                item.message = chalk.grey("   ├── " + name);
                break;
              }
              case "file": {
                const isSelected = name === selectedPath;
                const prefixCharacter = typeItemLastIndex === index ? "└── " : `${isSelected ? "└──┐" : "├── "}`;
                item.message = chalk.green(prefixCharacter + name);
                break;
              }
              case "folder": {
                const prefixCharacter = typeItemLastIndex === index ? "└── " : "├── ";
                item.message =  chalk.yellow(prefixCharacter + name);
                break;
              }
              default: {
                break;
              }
            }
          });

          const choices = typeItems.map(typeItem => {
            const name = typeItem.name;
            const type = typeItem.type;
            const disabled = type === "root" || (selectedPath && hadSelectedPath && type !== "action" && selectedPath !== name);
            return { name, message: typeItem.message, disabled };
          });
          const prompt = new Select({
            name: null,
            message: prefix,
            initial: focusPath || (selectedPath && hadSelectedPath ? selectedPath : void 0),
            choices
          });
          promptProcess(prompt);
          prompt
            .run()
            .then(answerStr => {
              const index = typeItems.map(function(typeItem) {
                return typeItem.name;
              }).indexOf(answerStr);
              const answer = typeItems[index];
              function getParentPrefix() {
                let parentPrefix: string | string[] = prefix.split("/");
                parentPrefix = parentPrefix.slice(0, parentPrefix.length - 2).join("/");
                if (parentPrefix !== "") {
                  parentPrefix += "/";
                }
                return parentPrefix;
              }

              switch (answer.type) {
                case "root": {
                  listByPrefix({ prefix });
                  break;
                }
                case "folder": {
                  if (answer.name === "../") {
                    const parentPrefix = getParentPrefix();
                    listByPrefix({ prefix: parentPrefix });
                  } else {
                    listByPrefix({ prefix: answer.name });
                  }
                  break;
                }
                case "file": {
                  if (answer.name === selectedPath) {
                    listByPrefix({ prefix, focusPath: answer.name });
                  } else {
                    listByPrefix({ prefix, selectedPath: answer.name });
                  }
                  break;
                }
                case "action": {
                  switch (answerStr) {
                    case "rename": {
                      const prompt = new Input({
                        name: "filename",
                        message: "input the new filename"
                      });

                      prompt.run().then(filename => {
                        filename = filename.trim();
                        const newPath = prefix + filename;
                        const prompt = new Confirm({
                          name: "confirmRename",
                          message: "Make sure to rename file : " + chalk.grey(selectedPath) + " --> " + chalk.green(newPath)
                        });

                        prompt.run().then(async confirm => {
                          if (confirm) {
                            let result = await ossClient.copy(newPath, selectedPath);
                            ossDelete(selectedPath)
                            listByPrefix({ prefix, selectedPath: newPath });
                          } else {
                            listByPrefix({ prefix, selectedPath });
                          }
                        });
                      });
                      break;
                    }
                    case "copy": {
                      const prompt = new Input({
                        name: "filename",
                        message: "input the copy new filename"
                      });

                      prompt.run().then(filename => {
                        filename = filename.trim();
                        const newPath = prefix + filename;
                        const prompt = new Confirm({
                          name: "confirmName",
                          message: "Make sure to copy file : " + chalk.grey(selectedPath) + " --> " + chalk.green(newPath)
                        });

                        prompt.run().then(async confirm => {
                          if (confirm) {
                            let result = await ossClient.copy(newPath, selectedPath);
                            listByPrefix({ prefix, selectedPath: newPath });
                          } else {
                            listByPrefix({ prefix, selectedPath });
                          }
                        });
                      });
                      break;
                    }
                    case "delete": {
                      const prompt = new Confirm({
                        name: "confirmDelete",
                        message: "Make sure to remote the path: " + chalk.red(selectedPath)
                      });

                      prompt.run().then(confirm => {
                        if (confirm) {
                          ossDelete(selectedPath, () => {
                            listByPrefix({ prefix });
                          });
                        } else {
                          listByPrefix({ prefix });
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
        } else {
          console.error(chalk.red("Notfound by prefix: \"" + prefix + "\""));
          listByPrefix({ prefix: "" });
        }
      })
      .catch(err => {
        console.error(err);
      });
  
  } catch (err) {}
}

function ossUpload(absolutePath = "", remotePath = "", options) {
  const isFile = remotePath.slice(-1) !== "/";
  const stream = createReadStream(absolutePath);
  if (options && options.encoding) {
    stream.setEncoding(options.encoding);
  }
  let fullPath = remotePath;
  if (!isFile) {
    const baseFileName = path.basename(absolutePath);
    fullPath = remotePath + baseFileName;
  }

  return ossClient.putStream(`${fullPath}`, stream)
    .then(res => {
      console.log("-- local  path is : " + chalk.yellow(absolutePath));
      console.log("-- remote path is : "  + chalk.green(res.res.requestUrls));
      return res;
    })
    .catch(err => console.error(err));
}

function ossDelete(deletePath: string, susses?: Function, error?: Function) {
  async function deleteAllPath(currDeletePath) {
    if (currDeletePath) {
      const isFile = currDeletePath.slice(-1) !== "/";
      try {
        await checkOSSEnv();
        if (isFile) {
          ossClient.delete(currDeletePath).then(res => {
            if (susses) susses();
          });
        } else {
          ossClient.list(({ prefix: currDeletePath, delimiter: "/" }))
            .then(res => {
              if (res.objects) {
                res.objects.forEach(obj => {
                  ossClient.delete(obj.name);
                });
              }
              if (res.prefixes) {
                res.prefixes.forEach(newPath => {
                  deleteAllPath(newPath);
                });
              }
            })
            .catch(err => {
              console.error(err);
            });
        }
      } catch (err) {}
    }
  }

  deleteAllPath(deletePath);
}

function uploadFileOrDir(uploadPath = "", remotePath = "", options?: any) {
  function uploadAllPath(uploadPath, remotePath) {
    const absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(process.cwd(), uploadPath);
    if (!fs.existsSync(absolutePath)) {
      console.error("upload path: " + uploadPath +  " is doesn't exist.");
      return;
    }
    const isDir = fs.statSync(uploadPath).isDirectory();

    if (isDir) {
      const files = fs.readdirSync(absolutePath);
      const remotePathIsDir = remotePath.slice(-1) !== "/";
      if (remotePathIsDir) {
        remotePath = remotePath + "/";
      }
      files.forEach(file => {
        const newPath = path.join(absolutePath, file);
        const isDir = fs.statSync(newPath).isDirectory();
        if (isDir) {
          uploadAllPath(newPath, remotePath + file + "/");
        } else {
          ossUpload(newPath, remotePath, options);
        }
      });
    } else {
      ossUpload(absolutePath, remotePath, options);
    }
  }

  uploadAllPath(uploadPath, remotePath);
}

module.exports = {
  uploadFileOrDir
};
