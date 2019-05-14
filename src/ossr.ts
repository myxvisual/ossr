#!/usr/bin/env node
"use strict";
import * as path from "path";
import { polyfill } from "es6-promise";
import fs, { createReadStream } from "fs";
import chalk from "chalk";
import program from "commander";
import OSS from "ali-oss";
import promptProcess from "./promptProcess";
import request from "request";
const AgentKeepAlive = require("agentkeepalive");
const { Select, Confirm, Input } = require("enquirer");
polyfill();

const isCliEnv = require.main === module;
const argv = process.argv;
const pathLogs = {
  exist:    (pathName: string) => console.log(`-- exist    : ${chalk.green(pathName)}`),
  notExist: (pathName: string) => console.log(`-- notExist : ${chalk.red(pathName)}`),
  delete:   (pathName: string) => console.log(`-- delete   : ${chalk.red(pathName)}`),
  local:    (pathName: string) => console.log(`-- local    : ${chalk.grey(pathName)}`),
  remote:   (pathName: string) => console.log(`-- remote   : ${chalk.green(pathName)}`),
};
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
  .version("1.0.9", "-v, --version")
  .arguments("<local-path> [upload-path]")
  .usage(`${chalk.green("<local-path> [upload-path]")} [...options]`)

  .option("-d, --delete [deletePath]", "delete remote exists path", deletePath => {
    const prompt = new Confirm({
      name: "confirmDelete",
      message: "Make sure to remote the path: " + chalk.red(deletePath)
    });

    prompt.run().then(async confirm => {
      if (confirm) {
        await ossDelete(deletePath);
      }
    });
  })
  .option("-l, --list [prefix]", "list remote prefix files", prefix => {
    listAll = false;
    ossList({ prefix });
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
      await ossUpload(localPath, (typeof remotePath === "string" && remotePath) ? remotePath : "/");
    } catch (err) {}
  });
program.parse(argv);

if (isCliEnv) {
  if ((listAll && argv.includes("-l")) || (listAll && argv.length < 3)) {
    ossList({ prefix: "" });
  } else {
    updateOSSClient();
  }
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

function updateOSSClient(newConfig?: typeof ossConfig) {
  const keys = ["accessKeyId", "accessKeySecret", "region", "bucket", "timeout", "endpoint"];
  keys.forEach(key => {
    if (isCliEnv) {
      if (program[key]) {
        ossConfig[key] = program[key];
      }
    } else {
      if (newConfig && newConfig[key]) {
        ossConfig[key] = newConfig[key];
      }
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

async function ossList(options: { prefix: string, selectedPath?: string; focusPath?: string; }) {
  const pros: Promise<any>[] = [];
  const { prefix, selectedPath, focusPath } = options;
  try {
    await checkOSSEnv();
    const pro = ossClient.list({ prefix, delimiter: "/" });
    pros.push(pro);
    pro.then(res => {
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
                  ossList({ prefix });
                  break;
                }
                case "folder": {
                  if (answer.name === "../") {
                    const parentPrefix = getParentPrefix();
                    ossList({ prefix: parentPrefix });
                  } else {
                    ossList({ prefix: answer.name });
                  }
                  break;
                }
                case "file": {
                  if (answer.name === selectedPath) {
                    ossList({ prefix, focusPath: answer.name });
                  } else {
                    ossList({ prefix, selectedPath: answer.name });
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
                            await ossClient.copy(newPath, selectedPath);
                            await ossDelete(selectedPath)
                            ossList({ prefix, selectedPath: newPath });
                          } else {
                            ossList({ prefix, selectedPath });
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
                            await ossClient.copy(newPath, selectedPath);
                            ossList({ prefix, selectedPath: newPath });
                          } else {
                            ossList({ prefix, selectedPath });
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

                      prompt.run().then(async confirm => {
                        if (confirm) {
                          await ossDelete(selectedPath);
                          ossList({ prefix })
                        } else {
                          ossList({ prefix });
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
          ossList({ prefix: "" });
        }
      })
      .catch(err => {
        console.error(err);
      });
  } catch (err) {}

  return pros;
}

async function ossDelete(deletePath: string) {
  async function deleteAllPath(currDeletePath) {
    async function removeSingleFile(removePath: string) {
      pathLogs.delete(removePath);
      return ossClient.delete(removePath);
    }

    if (currDeletePath) {
      const isFile = currDeletePath.slice(-1) !== "/";
      await checkOSSEnv();
      if (isFile) {
        return removeSingleFile(currDeletePath);
      } else {
        const { objects, prefixes } = await ossClient.list(({ prefix: currDeletePath, delimiter: "/" }))
        if (objects) {
          return Promise.resolve(Promise.all(
            objects.map(obj => removeSingleFile(obj.name))
          ));
        }
        if (prefixes) {
          return Promise.resolve(Promise.all(
            prefixes.map(newPath => deleteAllPath(newPath))
          ));
        }
      }
    }
  }

  await checkOSSEnv();
  return deleteAllPath(deletePath);
}

function ossUploadFile(absolutePath = "", remotePath = "", options) {
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

  return ossClient.putStream(fullPath, stream)
    .then(res => {
      pathLogs.local(absolutePath);
      pathLogs.remote(res.res.requestUrls);
      return res;
    })
    .catch(err => console.error(err)) as Promise<any>;
}

async function ossUpload(uploadPath = "", remotePath = "", options?: any) {
  function uploadAllPath(uploadPath, remotePath) {
    const absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(process.cwd(), uploadPath);
    if (!fs.existsSync(absolutePath)) {
      console.error("upload path: " + uploadPath +  " is doesn't exist.");
      return Promise.resolve(null);
    }
    const isDir = fs.statSync(uploadPath).isDirectory();

    if (isDir) {
      const files = fs.readdirSync(absolutePath);
      const remotePathIsDir = remotePath.slice(-1) !== "/";
      if (remotePathIsDir) {
        remotePath = remotePath + "/";
      }
      return Promise.resolve(Promise.all(files.map(file => {
        const newPath = path.join(absolutePath, file);
        const isDir = fs.statSync(newPath).isDirectory();
        if (isDir) {
          return uploadAllPath(newPath, remotePath + file + "/");
        } else {
          return ossUploadFile(newPath, remotePath, options)
        }
      })));
    } else {
      return ossUploadFile(absolutePath, remotePath || path.basename(absolutePath), options)
    }
  }

  await checkOSSEnv();
  return uploadAllPath(uploadPath, remotePath);
}

async function ossIsExist(path: string): Promise<boolean> {
  await checkOSSEnv();
  const cdnUrl = await ossClient.getObjectUrl(path);
  const pro = new Promise((resolve, reject) => {
    const req = request.head(cdnUrl, (err, res, body) => {
      if (res) {
        if (res.statusCode === 200) {
          pathLogs.exist(cdnUrl);
          resolve(true);
        } else {
          resolve(false);
          pathLogs.notExist(cdnUrl);
        }
      } else {
        resolve(false);
      }
    });
    req.on("error", () => {
      resolve(false);
    });
    req.end();
  });

  return pro as Promise<boolean>;
}

export { ossUpload };
export { ossList };
export { ossDelete };
export { ossIsExist };
export { updateOSSClient as setConfig };
