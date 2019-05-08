#!/usr/bin/env node
'use strict'

var { createReadStream } = require('fs')
var inquirer = require('inquirer')
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
var listAll = true
if (fs.existsSync(ossConfigFile)) {
  try {
    ossConfig = JSON.parse(fs.readFileSync(ossConfigFile, { encoding: 'utf8' }))
  } catch(e) {
    console.error(e)
  }
}

program
  .version('0.1.0', '-v, --version')
  .arguments('<local-path> [online-path]')
  .usage(`${chalk.green('<local-path> [online-path]')} [...options]`)

  .option('-d, --delete [deletePath]', 'delete remote exists file', function(deletePath) {
    function deleteAllPath(currDeletePath) {
      if (currDeletePath) {
        var isFile = currDeletePath.slice(-1) !== '/'
        if (isFile) {
          checkConfig(function() {
            ossClient.delete(currDeletePath)
          })
        } else {
          checkConfig(function() {
            ossClient.list(({ prefix: currDeletePath, delimiter: '/' }))
              .then(res => {
                if (res.objects) {
                  res.objects.forEach(obj => {
                    ossClient.delete(obj.name)
                  })
                }
                if (res.prefixes) {
                  res.prefixes.forEach(newPath => {
                    deleteAllPath(newPath)
                  })
                }
              })
              .catch(err => {
                console.error(err)
              })
          })
        }
      }
    }
    inquirer.prompt({
      type: 'confirm',
      name: 'confirmDelete',
      message: 'Make sure to remote the path: ' + chalk.red(deletePath)
    }).then(answers => {
      if (answers.confirmDelete) {
        deleteAllPath(deletePath)
      }
    })
  })
  .option('-l, --list [prefix]', 'list remote prefix files', function(prefix) {
    listAll = false
    checkConfig(function() {
      ossClient.list(({ prefix, delimiter: '/' })).then(res => {
          if (res.objects || res.prefixes) {
            console.log({
              prefixes: res.prefixes,
              objecst: res.objects ? res.objects.map(obj => obj.url) : []
            })
          } else {
            console.error(chalk.red('notfound ' + prefix))
          }
        })
        .catch(err => {
          console.error(err)
        })
    })
  })

  .option('-r, --region [region]', 'set config region')
  .option('-i, --accessKeyId [accessKeyId]', 'set config accessKeyId')
  .option('-s, --accessKeySecret [accessKeySecret]', 'set config accessKeySecret')
  .option('-b, --bucket [bucket]', 'set config bucket')
  .option('-t, --timeout [timeout]', 'set config timeout')
  .option('-e, --endpoint [endpoint]', 'set config custom domain name')

  .option('-c, --command', 'use command line', function() {})
  .action(function(localPath, onlinePath) {
    checkConfig(function() {
      uploadFileOrDir(localPath, (typeof onlinePath === 'string' && onlinePath) ? onlinePath : '/')
    })
  })

function checkConfig(success) {
  if (ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket ) {
    if (success && typeof success === 'function') {
      updateOSSClient()
      success()
    }
  } else {
    console.error("Please set config <accessKeyId> and <accessKeySecret> <bucket>.")
  }
}

function updateOSSClient() {
 var keys = ['accessKeyId', 'accessKeySecret', 'region', 'bucket', 'timeout', 'endpoint']
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
  if (ossConfig.endpoint) {
    ossConfig.cname = true
  }

  if (ossConfig.accessKeyId && ossConfig.accessKeySecret) {
    ossClient = new OSS(ossConfig)
    fs.writeFileSync(ossConfigFile,  JSON.stringify(ossConfig, null, 2), { encoding: 'utf-8' })
  }
}
program.parse(argv)

if (listAll && argv.includes('-l')) {
  checkConfig(function() {
    ossClient.list(({ prefix: '', delimiter: '/' })).then(res => {
        if (res.objects) {
          console.log({
            prefixes: res.prefixes,
            objecst: res.objects.map(obj => obj.url)
          })
        } else {
          console.error(chalk.red('notfound ' + '/'))
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
} else {
  updateOSSClient()
}

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
      console.log('-- local  path is : ' + chalk.yellow(absolutePath))
      console.log('-- remote path is : '  + chalk.green(res.res.requestUrls))
    })
    .catch(err => console.error(err))
}

function uploadFileOrDir(uploadPath = '', remotePath = '', options) {
  function uploadAllPath(uploadPath, remotePath) {
    var absolutePath = path.isAbsolute(uploadPath) ? uploadPath : path.join(process.cwd(), uploadPath)
    if (!fs.existsSync(absolutePath)) {
      console.error('upload path: ' + uploadPath +  ' is doesn\'t')
      return
    }
    var isDir = fs.statSync(uploadPath).isDirectory()

    if (isDir) {
      var files = fs.readdirSync(absolutePath)
      var remotePathIsDir = remotePath.slice(-1) !== '/'
      if (remotePathIsDir) {
        remotePath = remotePath + '/'
      }
      files.forEach(file => {
        var newPath = path.join(absolutePath, file)
        var isDir = fs.statSync(newPath).isDirectory()
        if (isDir) {
          uploadAllPath(newPath, remotePath + file + '/')
        } else {
          uploadToOSS(newPath, remotePath, options)
        }
      })
    } else {
      uploadToOSS(absolutePath, remotePath, options)
    }
  }

  uploadAllPath(uploadPath, remotePath)
}

module.exports = {
  uploadFileOrDir
}
