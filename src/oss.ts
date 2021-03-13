
import fs, { createReadStream } from "fs";
import OSS from "ali-oss";
import * as path from "path";
import chalk from "chalk";

import promptProcess from "./promptProcess";

export function setToSilence(bool: boolean) {
  disabledLog = bool;
  pathLogs = getPathLogs();
}

export let disabledLog = false;

export let ossConfig: {
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

const ossConfigFile = path.join(__dirname, "ossConfig.json");
if (fs.existsSync(ossConfigFile)) {
  try {
    ossConfig = JSON.parse(fs.readFileSync(ossConfigFile, { encoding: "utf8" }));
  } catch (e) {
    console.error(e);
  }
}
const AgentKeepAlive = require("agentkeepalive");
const Enquirer = require("enquirer");
const enquirer = new Enquirer();
const { Select, Confirm, Input } = Enquirer;
const getPathLogs = () => disabledLog ? {
  exist:    () => {},
  notExist: () => {},
  delete:   () => {},
  local:    () => {},
  remote:   () => {}
} : {
  exist:    (pathName: string) => console.log(`-- exist    : ${chalk.green(pathName)}`),
  notExist: (pathName: string) => console.log(`-- notExist : ${chalk.red(pathName)}`),
  delete:   (pathName: string) => console.log(`-- delete   : ${chalk.red(pathName)}`),
  local:    (pathName: string) => console.log(`-- local    : ${chalk.grey(pathName)}`),
  remote:   (pathName: string) => console.log(`-- remote   : ${chalk.green(pathName)}`),
}
export let pathLogs = getPathLogs();
export let ossClient: any;

export function checkOSSEnv() {
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

export const configKeys = ["accessKeyId", "accessKeySecret", "region", "bucket", "timeout", "endpoint", "cname"];
export function updateOSSClient(newConfig?: typeof ossConfig) {
  configKeys.forEach(key => {
    if (newConfig && newConfig[key]) {
      ossConfig[key] = newConfig[key];
    }
  });

  if (ossConfig.timeout) {
    ossConfig.agent = new AgentKeepAlive({
      timeout: ossConfig.timeout as any
    });
  }
  // TODO: add cname
  // if (ossConfig.cname) {
  //   ossConfig.cname = true;
  // }

  if (ossConfig.accessKeyId && ossConfig.accessKeySecret) {
    ossClient = new OSS(ossConfig);
    fs.writeFileSync(ossConfigFile,  JSON.stringify(ossConfig, null, 2), { encoding: "utf-8" });
  }
}

export async function ossList(options: { prefix: string, selectedPath?: string; focusPath?: string; }) {
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
                name: 'edit',
                value: 'edit',
                type: 'action'
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
                name: 'move',
                value: 'move',
                type: 'action'
              });
              typeItems.push({
                name: "delete",
                value: "delete",
                type: "action"
              });
              typeItems.push({
                name: item.url,
                value: item.url,
                type: "info"
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
                    item.message = chalk.red("   ├── " + name);
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
                item.message = chalk.grey("   └── " + name);
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
                    case "edit": {
                      break;
                    }
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

export async function ossDelete(deletePath: string) {
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


let checkpoint;
async function resumeUpload(absoluteFilePath = "", objectName = "") {
  let result: any;
  // retry 10 times
  for (let i = 0; i < 10; i++) {
      try {
          result = await ossClient.multipartUpload(objectName, absoluteFilePath, {
              checkpoint,
              async progress(percentage, cpt) {
                  console.log(percentage); // Object 的上传进度。
                  
                  console.log({ ...cpt, doneParts: null, donePartsSize: cpt && cpt.doneParts && cpt.doneParts.length  }); // 分片上传的断点信息。
                  checkpoint = cpt;
              },
          });
          console.log(result);
          break; // break if success
      } catch (e) {
          console.log(e);
      }
  }

  return result;
}

export async function streamUpload(absoluteFilePath = "", objectName = "", options: any) {
  const stream = createReadStream(absoluteFilePath, options);
  if (options && options.encoding) {
    stream.setEncoding(options.encoding);
  }
  return ossClient.putStream(objectName, stream)
    .then(res => {
      pathLogs.local(absoluteFilePath);
      pathLogs.remote(res.res.requestUrls);
      return res;
    })
    .catch(err => console.error(err)) as Promise<any>;
}

export async function ossUploadFile(absoluteFilePath = "", remotePath = "", options: any) {
  const isFile = remotePath.slice(-1) !== "/";
  const extName = path.extname(absoluteFilePath);
  if ([".yml"].includes(extName)) {
    if (!options) {
      options = {};
    }
    options.encoding = "utf8";
  }
  let objectName = remotePath;
  if (!isFile) {
    const baseFileName = path.basename(absoluteFilePath);
    objectName = remotePath + baseFileName;
  }

  return await resumeUpload(absoluteFilePath, objectName);
}

export async function ossUpload(uploadPath = "", remotePath = "", options?: any) {
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

export async function ossIsExist(path: string): Promise<boolean> {
  await checkOSSEnv();
  const pro = new Promise(async (resolve, reject) => {
    const cdnUrl = await ossClient.getObjectUrl(path);
    try {
      const result = await ossClient.get(path);
      pathLogs.exist(cdnUrl);
      resolve(result.res.status === 200);
    } catch (e) {
      pathLogs.notExist(cdnUrl);
      resolve(false);
    }

    // const req = request.head(cdnUrl, (err, res, body) => {
    //   if (res) {
    //     if (res.statusCode === 200) {
    //       pathLogs.exist(cdnUrl);
    //       resolve(true);
    //     } else {
    //       resolve(false);
    //       pathLogs.notExist(cdnUrl);
    //     }
    //   } else {
    //     resolve(false);
    //   }
    // });
    // req.on("error", () => {
    //   resolve(false);
    // });
    // req.end();
  });

  return pro as Promise<boolean>;
}
