#!/usr/bin/env node
"use strict";
import { polyfill } from "es6-promise";
import chalk from "chalk";
import program from "commander";
const { Confirm } = require("enquirer");
import * as oss from "./oss";
const {
  listObject,
  deleteObject,
  ossIsExist,
  ossUpload,
  uploadFile,
  checkEnv,
  updateClient,
  ossConfig,
  configKeys,
  setToSilence
} = oss;
polyfill();

export const isCliEnv = require.main === module;

const argv = process.argv;
let listAll = true;

program
  .version("1.1.0", "-v, --version")
  .arguments("<local-path> [upload-path]")
  .usage(`${chalk.green("<local-path>")}${chalk.blue(" [upload-path]")} [...options]`)

  .option(`-d, --delete ${chalk.yellow("<deletePath>")}`, `${chalk.green("[Action]")} delete remote exists path`, deletePath => {
    const prompt = new Confirm({
      name: "confirmDelete",
      message: "Make sure to remote the path: " + chalk.red(deletePath)
    });

    prompt.run().then(async confirm => {
      if (confirm) {
        await deleteObject(deletePath);
      }
    });
  })
  .option(`-l, --list ${chalk.blue("[prefix]")}`, `${chalk.green("[Action]")} list remote prefix files`, prefix => {
    listAll = false;
    listObject({ prefix });
  })
  .option(`--exist ${chalk.blue("[prefix]")}`, `${chalk.green("[Action]")} check exist remote prefix files`, prefix => {
    listAll = false;
    ossIsExist(prefix);
  })
  .option(`--silence ${chalk.blue("[boolean]")}`, `${chalk.green("[Action]")} use silent mode`, prefix => {})

  .option(`-a, --appName ${chalk.yellow("<appName>")}`, `${chalk.yellow("[Config]")} set appName ${chalk.yellow("<ali-oss | tencent-cos | qiniu-kodo>")}`)
  .option(`-r, --region ${chalk.yellow("<region>")}`, `${chalk.yellow("[Config]")} set region`)
  .option(`-i, --accessKeyId ${chalk.yellow("<accessKeyId>")}`, `${chalk.yellow("[Config]")} set accessKeyId`)
  .option(`-s, --accessKeySecret ${chalk.yellow("<accessKeySecret>")}`, `${chalk.yellow("[Config]")} set accessKeySecret`)
  .option(`-b, --bucket ${chalk.yellow("<bucket>")}`, `${chalk.yellow("[Config]")} set bucket`)
  .option(`-t, --timeout ${chalk.yellow("<timeout>")}`, `${chalk.yellow("[Config]")} set timeout`)
  .option(`-e, --endpoint ${chalk.yellow("<endpoint>")}`, `${chalk.yellow("[Config]")} set domain name`)

  .action(async (localPath, remotePath) => {
    try {
      await checkEnv();
      await ossUpload(localPath, (typeof remotePath === "string" && remotePath) ? remotePath : "/");
    } catch (err) {}
  });

program.parse(argv);
if (isCliEnv) {
  for (const key of configKeys) {
    if (program[key]) {
      ossConfig[key] = program[key];
    }
  }
  if (argv.includes("--silence")) {
    setToSilence(true);
  }
  if ((listAll && argv.includes("-l")) || (listAll && argv.length < 3)) {
    listObject({ prefix: "" });
  } else {
    updateClient();
  }
}


export { ossUpload };
export { listObject as ossList };
export { deleteObject as ossDelete };
export { ossIsExist };
export { updateClient as setConfig };
