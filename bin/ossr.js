#!/usr/bin/env node
'use strict'

var { createReadStream } = require('fs')
var path = require('path')
var fs = require('fs')
var chalk = require('chalk')
var program = require('commander')
var OSS = require('ali-oss')
var AgentKeepAlive = require('agentkeepalive')

var argv = process.argv
var ossClient
var ossConfigFile = path.join(__dirname, 'ossConfig.json')
var ossConfig = {
  accessKeyId: '',
  accessKeySecret: ''
}
if (fs.existsSync(ossConfigFile)) {
  try {
    ossConfig = JSON.parse(fs.readFileSync(ossConfigFile, { encoding: 'utf8' }))
  } catch(e) {
    console.error(e)
  }
}

program
  .version('0.1.0', '-v, --version')
  .arguments('<local-path>')
  .usage(`${chalk.green('<local-path> [-p online-path]')} [...options]`)

  .option('-p, --onlinePath [onlinePath]', 'set upload online pathname')
  .option('-r, --region [region]', 'set config region')
  .option('-i, --accessKeyId [accessKeyId]', 'set config accessKeyId')
  .option('-s, --accessKeySecret [accessKeySecret]', 'set config accessKeySecret')
  .option('-b, --bucket [bucket]', 'set config bucket')
  .option('-t, --timeout [timeout]', 'set config timeout')

  .option('-c, --command', 'use command line', () => {

  })
  .action(function(localPath) {
    updateOSSClient()
    if (ossConfig.accessKeyId && ossConfig.accessKeySecret) {
      uploadFileOrDir(localPath, program.onlinePath || '/')
    } else {
      console.error("Please set config <accessKeyId> and <accessKeySecret>.")
    }
  })


function updateOSSClient() {
 var keys = ['accessKeyId', 'accessKeySecret', 'region', 'bucket', 'timeout']
  keys.forEach(key => {
    if (program[key]) {
      ossConfig[key] = program[key]
    }
  })
  if (ossConfig.timeout) {
    ossConfig.agent = new AgentKeepAlive({
      timeout: ossConfig.timeout
    })
  }

  if (ossConfig.accessKeyId && ossConfig.accessKeySecret) {
    ossClient = new OSS(ossConfig)
    fs.writeFileSync(ossConfigFile,  JSON.stringify(ossConfig, null, 2), { encoding: 'utf-8' })
  }
}

program.parse(argv)
updateOSSClient()


function uploadToOSS(absolutePath = '', remotePath = '', options) {
  var isFile = remotePath.slice(-1) !== '/'
  var stream = createReadStream(absolutePath)
  if (options && options.encoding) {
    stream.setEncoding(options.encoding)
  }
  var fullPath = remotePath
  if (!isFile) {
    var baseFileName = path.basename(absolutePath)
    fullPath = remotePath + baseFileName
  }

  ossClient.putStream(`${fullPath}`, stream)
    .then(res => {
      console.log(`${absolutePath} is uploaded.`)
      console.log(`url is https://storage.zego.im${fullPath}`)
    })
    .catch(err => console.error(err))
}

function uploadFileOrDir(uploadPath = '', remotePath = '', options) {
  var absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(uploadPath)
  if (!fs.existsSync(absolutePath)) {
    console.error('upload path: ' + uploadPath +  ' is doesn\'t')
    return
  }
  var isDir = fs.statSync(uploadPath).isDirectory()

  if (isDir) {
    var files = fs.readdirSync(absolutePath)
    files.forEach(file => {
      uploadToOSS(path.join(absolutePath, file), remotePath, options)
    })
  } else {
    uploadToOSS(absolutePath, remotePath, options)
  }
}

module.exports = {
  uploadFileOrDir
}
