
import fs, { createReadStream } from "fs";
import OSS from "ali-oss";
import * as path from "path";
import chalk from "chalk";
import * as readline from "readline";
import * as crypto from "crypto";

import promptProcess from "./promptProcess";

type Checkpoint = {
  file: string,
  name: string,
  fileSize: number,
  partSize: number,
  uploadId: string,
  doneParts: { number: number; etag: string; }[];
}
export function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

export function setToSilence(bool: boolean) {
  disabledLog = bool;
  logger = getLogger();
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

const getLogger = () => disabledLog ? {
  exist: () => { },
  notExist: () => { },
  delete: () => { },
  local: () => { },
  remote: () => { },
  log: () => { },
  error: () => { }
} : {
    exist: (pathName: any) => console.log(`-- exist    : ${chalk.green(pathName)}`),
    notExist: (pathName: any) => console.log(`-- notExist : ${chalk.red(pathName)}`),
    delete: (pathName: any) => console.log(`-- delete   : ${chalk.red(pathName)}`),
    local: (pathName: any) => console.log(`-- local    : ${chalk.grey(pathName)}`),
    remote: (pathName: any) => console.log(`-- remote   : ${chalk.green(pathName)}`),
    log: (...args: any[]) => console.log(...args),
    error: (...args: any[]) => console.error(...args),
  }
export let logger = getLogger();
const ossConfigFile = path.join(__dirname, "ossConfig.json");
if (fs.existsSync(ossConfigFile)) {
  try {
    ossConfig = JSON.parse(fs.readFileSync(ossConfigFile, { encoding: "utf8" }));
  } catch (e) {
    logger.error(e);
  }
}
const AgentKeepAlive = require("agentkeepalive");
const Enquirer = require("enquirer");
const { Select, Confirm, Input } = Enquirer;
export let ossClient: OSS;

export function checkEnv() {
  return new Promise((resolve, reject) => {
    if (ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket) {
      updateClient();
      resolve();
    } else {
      const errMsg = "Please set config <accessKeyId> and <accessKeySecret> <bucket>."
      logger.error(errMsg);
      reject(errMsg);
    }
  });
}

export const configKeys = ["accessKeyId", "accessKeySecret", "region", "bucket", "timeout", "endpoint", "cname"];
export function updateClient(newConfig?: typeof ossConfig) {
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
    fs.writeFileSync(ossConfigFile, JSON.stringify(ossConfig, null, 2), { encoding: "utf-8" });
  }
}

export async function listObject(options: { prefix: string, selectedPath?: string; focusPath?: string; }) {
  const pros: Promise<any>[] = [];
  const { prefix, selectedPath, focusPath } = options;
  try {
    await checkEnv();
    const pro = ossClient.list({ prefix, delimiter: "/", "max-keys": 10e2 }, {});
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
              item.message = chalk.yellow(prefixCharacter + name);
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
            const index = typeItems.map(function (typeItem) {
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
                listObject({ prefix });
                break;
              }
              case "folder": {
                if (answer.name === "../") {
                  const parentPrefix = getParentPrefix();
                  listObject({ prefix: parentPrefix });
                } else {
                  listObject({ prefix: answer.name });
                }
                break;
              }
              case "file": {
                if (answer.name === selectedPath) {
                  listObject({ prefix, focusPath: answer.name });
                } else {
                  listObject({ prefix, selectedPath: answer.name });
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
                          await deleteObject(selectedPath)
                          listObject({ prefix, selectedPath: newPath });
                        } else {
                          listObject({ prefix, selectedPath });
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
                          listObject({ prefix, selectedPath: newPath });
                        } else {
                          listObject({ prefix, selectedPath });
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
                        await deleteObject(selectedPath);
                        listObject({ prefix })
                      } else {
                        listObject({ prefix });
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
          .catch(logger.error);
      } else {
        logger.error(chalk.red("Notfound by prefix: \"" + prefix + "\""));
        listObject({ prefix: "" });
      }
    })
      .catch(err => {
        logger.error(err);
      });
  } catch (err) { }

  return pros;
}


export async function getRemoteMd5(objectName: string) {
  let md5: string = null;
  try {
    const result = await (ossClient as any).getObjectTagging(objectName);
    md5 = result?.tag?.["Content-MD5"] || null;
  } catch (error) {}
  return md5;
}

export async function getLocalMd5(filename: string) {
  let md5: string = null;
  try {
    md5 = crypto.createHash("md5").update(fs.readFileSync(filename)).digest("hex").toString();
  } catch (error) {}
  return md5;
}

export async function deleteObject(deletePath: string) {
  async function deleteAllPath(currDeletePath) {
    async function removeSingleFile(removePath: string) {
      logger.delete(removePath);
      return ossClient.delete(removePath);
    }

    if (currDeletePath) {
      const isFile = currDeletePath.slice(-1) !== "/";
      await checkEnv();
      if (isFile) {
        return removeSingleFile(currDeletePath);
      } else {
        const { objects, prefixes } = await ossClient.list({ prefix: currDeletePath, delimiter: "/", "max-keys": 10e2 }, {});
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

  await checkEnv();
  return deleteAllPath(deletePath);
}

export type ProgressBarConfig = { total: number, complete: string, incomplete: string, width: number; }
export class ProgressBar {
  format: string;
  config: ProgressBarConfig;
  startTime: number;
  
  prevTickTime: number;
  prevValue: number;
  constructor(format: string, config?: Partial<ProgressBarConfig>) {
    const defaultConfig = {
      complete: "=",
      incomplete: " ",
      width: 20,
      total: 1
    };
    this.format = format || "[:bar] :rate/bps :percent :etas";
    this.config = { ...defaultConfig, ...config } as ProgressBarConfig;
    this.startTime = Date.now();
    this.prevTickTime = this.startTime;
    this.prevValue = 0;
  }

  tick(value: number) {
    const { config } = this;
    const now = Date.now();

    const ratio = value / config.total;
    const completeCharSize = Math.floor(ratio * config.width);
    const incompleteCharSize = config.width - completeCharSize;
    const barText = config.complete.repeat(completeCharSize) + config.incomplete.repeat(incompleteCharSize);

    const offsetValue = value - this.prevValue;
    const offsetTime = now - this.prevTickTime;
    const rateText = (offsetValue / offsetTime * 1000).toFixed(2);

    const percentText = `${(value / config.total * 100).toFixed(2)}%`;
    const etasText = `${((now - this.startTime) / 1000).toFixed(2)}s`;
    let text = this.format;
    text = text.replace(/:bar/im, () => barText);
    text = text.replace(/:rate/im, () => rateText);
    text = text.replace(/:percent/im, () => percentText);
    text = text.replace(/:etas/im, () => etasText);

    this.prevValue = value;
    this.prevTickTime = now;
  
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    process.stdout.write(text);
  }
}

/**
 * 
 * @source https://github.com/ali-sdk/ali-oss/blob/5ed82a0db33550018bf1cd40462b3d3feedec694/lib/browser/managed-upload.js#L35
 */
async function uploadByResume(absoluteFilePath = "", objectName = "") {
  let result: OSS.MultipartUploadResult;
  let checkpoint: Checkpoint;
  const fileKbSize = fs.statSync(absoluteFilePath).size / 10e2;
  // logger.log({ fileName: absoluteFilePath, fileSize: fileKbSize });

  const localMd5 = await getLocalMd5(absoluteFilePath);
  const remoteMd5 = await getRemoteMd5(objectName);
  function logByUploaded() {
    logger.log(`\n${path.basename(absoluteFilePath)} is uploaded.`);
  }
  if (localMd5 === remoteMd5) {
    logByUploaded();
    return null;
  }

  const headers = {
    "x-oss-tagging": `Content-MD5=${localMd5}` // "TagA=A&TagB=B"
  }

  // retry 10 times
  for (let i = 0; i < 10; i++) {
    try {
      const bar = new ProgressBar(`  uploading [${path.basename(absoluteFilePath)}/${fileKbSize}kb] [:bar] :rate/kps :percent :etas`, { total: fileKbSize, width: 30 });
      result = await ossClient.multipartUpload(objectName, absoluteFilePath, {
        checkpoint,
        async progress(percent: number, cpt: Checkpoint) {
          bar.tick(percent * fileKbSize);
          checkpoint = cpt;
        },
        headers
      });
      // break if success
      break;
    } catch (e) {
      logger.log(e);
    }
  }

  logByUploaded();
  return result;
}

export async function uploadByStream(absoluteFilePath = "", objectName = "", options: any) {
  const stream = createReadStream(absoluteFilePath, options);
  if (options && options.encoding) {
    stream.setEncoding(options.encoding);
  }
  return ossClient.putStream(objectName, stream)
    .then(res => {
      logger.local(absoluteFilePath);
      logger.remote(res.name);
      return res;
    })
    .catch(logger.error) as Promise<any>;
}

export async function uploadFile(absoluteFilePath = "", remotePath = "", options: any) {
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

  return await uploadByResume(absoluteFilePath, objectName);
}

export async function ossUpload(localPath = "", remotePath = "", options?: any) {
  async function uploadAllPath(uploadPath, remotePath) {
    const absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(process.cwd(), uploadPath);
    if (!fs.existsSync(absolutePath)) {
      logger.error("upload path: " + uploadPath + " is doesn't exist.");
      return Promise.resolve(null);
    }
    const isDir = fs.statSync(uploadPath).isDirectory();

    if (isDir) {
      const files = fs.readdirSync(absolutePath);
      const remotePathIsDir = remotePath.slice(-1) !== "/";
      if (remotePathIsDir) {
        remotePath = remotePath + "/";
      }
      
      const run = async () => {
        const file = files.shift();
        const newPath = path.join(absolutePath, file);
        const isDir = fs.statSync(newPath).isDirectory();
        let res: any = null;
        if (isDir) {
          res = await uploadAllPath(newPath, remotePath + file + "/");
        } else {
          res = await uploadFile(newPath, remotePath, options)
        }
        if (files.length > 0) {
          await run();
        }
        return res;
      }
      await run();
    } else {
      return await uploadFile(absolutePath, remotePath || path.basename(absolutePath), options)
    }
  }

  await checkEnv();
  return await uploadAllPath(localPath, remotePath);
}

export async function downloadFileByStream(objectName: string, localFile: string) {
  let result: OSS.GetStreamResult;
  const remoteMd5 = await getRemoteMd5(objectName);
  const localMd5 = await getLocalMd5(localFile);

  function logByDownloaded() {
    logger.log(`\n${path.basename(localFile)} is downloaded.`);
  }

  if (fs.existsSync(localFile) && remoteMd5 === localMd5) {
    logByDownloaded();
    return null;
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      result = await ossClient.getStream(objectName);
      let writeStream = fs.createWriteStream(localFile);
      result.stream.pipe(writeStream);
      const fileKbSize = Number(result.res.headers["content-length"]) / 1000;
      let currKbSize = 0;
      const bar = new ProgressBar(`  downloading [${path.basename(localFile)}/${fileKbSize}kb] [:bar] :rate/kps :percent :etas`, { total: fileKbSize, width: 30 });
      result.stream.on("data", chunk => {
        currKbSize += chunk.length / 1000;
        bar.tick(currKbSize);
      })
      result.stream.on("end", () => {
        logByDownloaded();
        resolve(null);
      });
      result.stream.on("error", (e) => {
        resolve(null);
        logger.error(e);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function ossDownload(remotePath = "", localPath = "") {
  localPath = path.isAbsolute(localPath) ? localPath : path.join(process.cwd(), localPath);
  ensureDirectoryExistence(localPath);
  
  const localPathIsDir = fs.existsSync(localPath) && fs.statSync(localPath).isDirectory();
  const remotePathIsDir = remotePath.endsWith("/");
  await checkEnv();
  if (remotePathIsDir) {
    const res = await ossClient.list({ prefix: remotePath, delimiter: "/", "max-keys": 10e2 }, {});
    if (res.objects && Array.isArray(res.objects)) {
      const run = async () => {
        const object = res.objects.shift();
        const localFile = path.join(localPath, path.basename(object.name));
        ossDownload(object.name, localFile);
        if (res.objects.length > 0) {
          await run();
        }
      }
      await run();
    }
  } else {
    const remoteBaseName = path.basename(remotePath);
    const localFile = localPathIsDir ? path.join(localPath, remoteBaseName) : localPath;
    await downloadFileByStream(remotePath, localFile);
  }
}

export async function ossIsExist(path: string): Promise<boolean> {
  await checkEnv();
  const pro = new Promise(async (resolve, reject) => {
    const cdnUrl = await ossClient.getObjectUrl(path);
    try {
      const result = await ossClient.get(path);
      logger.exist(cdnUrl);
      resolve(result.res.status === 200);
    } catch (e) {
      logger.notExist(cdnUrl);
      resolve(false);
    }
  });

  return pro as Promise<boolean>;
}
