#!/usr/bin/env node
'use strict'

var { createReadStream } = require('fs')
var path = require('path')
var fs = require('fs')
var chalk = require('chalk')
var program = require('commander')
var OSS = require('ali-oss')
var AgentKeepAlive = require('agentkeepalive')
var { Select, Confirm, Input } = require('enquirer')
const promptProcess = require('./promptProcess')

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
  .version('1.0.6', '-v, --version')
  .arguments('<local-path> [upload-path]')
  .usage(`${chalk.green('<local-path> [upload-path]')} [...options]`)

  .option('-d, --delete [deletePath]', 'delete remote exists path', function(deletePath) {
    var prompt = new Confirm({
      name: 'confirmDelete',
      message: 'Make sure to remote the path: ' + chalk.red(deletePath)
    })
    
    prompt.run().then(confirm => {
      if (confirm) {
        ossDelete(deletePath)
      }
    })
  })
  .option('-l, --list [prefix]', 'list remote prefix files', function(prefix) {
    listAll = false
    listByPrefix(prefix)
  })

  .option('-r, --region [region]', '[Config] set region')
  .option('-i, --accessKeyId [accessKeyId]', '[Config] set accessKeyId')
  .option('-s, --accessKeySecret [accessKeySecret]', '[Config] set accessKeySecret')
  .option('-b, --bucket [bucket]', '[Config] set bucket')
  .option('-t, --timeout [timeout]', '[Config] set timeout')
  .option('-e, --endpoint [endpoint]', '[Config] set domain name')

  .action(function(localPath, remotePath) {
    checkConfig(function() {
      uploadFileOrDir(localPath, (typeof remotePath === 'string' && remotePath) ? remotePath : '/')
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
  listByPrefix('')
} else {
  updateOSSClient()
}

function listByPrefix(prefix, selectedPath) {
  checkConfig(function() {
    ossClient.list(({ prefix, delimiter: '/' })).then(res => {
        if (res.objects || res.prefixes) {
          var prefixes = res.prefixes || []
          var objects = res.objects || []
          var typeItems = [{
            name: prefix,
            value: prefix,
            type: 'root',
            onPress: function() {}
          }]
          if (prefix !== '') {
            typeItems.push({
              name: '../',
              value: '',
              // root | folder | file | action | info
              type: 'folder',
              disabled: Boolean(selectedPath),
              onPress: function() {}
            })
          }
          prefixes.forEach(function(name) {
            typeItems.push({ name, value: name, type: 'folder', onPress: function() {} })
          })
          objects.forEach(function(item) {
            typeItems.push({ name: item.name, value: item.name, type: 'file', onPress: function() {} })
            if (selectedPath === item.name) {
              typeItems.push({ name: item.url, value: item.url, type: 'info', onPress: function() {} })
              // typeItems.push({ name: 'rename', value: 'rename', type: 'action', onPress: function() {} })
              typeItems.push({ name: 'delete', value: 'delete', type: 'action', onPress: function() {} })
            }
          })
          var typeItemLastIndex = typeItems.length - 1
          var consoleItems = typeItems.map(function(item, index) {
            switch (item.type) {
              case 'root':
                return chalk.yellow(item.name)
              case 'action':
                return chalk.blue('    └── ' + item.name)
              case 'info':
                return chalk.grey('    └── ' + item.name)
              case 'file':
                var prefixCharacter = typeItemLastIndex === index ? '└── ' : '├── '
                return chalk.green(prefixCharacter + item.name)
              case 'folder':
                var prefixCharacter = typeItemLastIndex === index ? '└── ' : '├── '
                return  chalk.yellow(prefixCharacter + item.name)
              default:
                break
            }
          })

          var choices = consoleItems.map(function(consoleItem, index) {
            var name = typeItems[index].name
            var type = typeItems[index].type
            var disabled = type === 'root' || (selectedPath && type !== 'action' && selectedPath !== name)
            return { name, message: consoleItem, disabled }
          })
          var prompt = new Select({
            name: null,
            message: prefix,
            initial: selectedPath,
            choices
          })
          promptProcess(prompt)
          prompt
            .run()
            .then(answerStr => {
              var index = typeItems.map(function(typeItem) {
                return typeItem.name
              }).indexOf(answerStr)
              var answer = typeItems[index]
              switch (answer.type) {
                case 'folder':
                  if (answer.name === '../') {
                    var parentPrefix = prefix.split('/')
                    parentPrefix = parentPrefix.slice(0, parentPrefix.length - 2).join('/')
                    if (parentPrefix !== '') {
                      parentPrefix += '/'
                    }
                    listByPrefix(parentPrefix)
                  } else {
                    listByPrefix(answer.name)
                  }
                  break
                case 'file':
                  if (answer.name === selectedPath) {
                    listByPrefix(prefix)
                  } else {
                    listByPrefix(prefix, answer.name)
                  }
                  break
                case 'action':
                  switch (answerStr) {
                    case 'rename':
                      var prompt = new Input({
                        name: 'filename',
                        message: 'input the new filename'
                      })
                      
                      prompt.run().then(filename => {
                        console.log('filename:', filename)
                      })
                      break
                    case 'delete':
                      var prompt = new Confirm({
                        name: 'confirmDelete',
                        message: 'Make sure to remote the path: ' + chalk.red(selectedPath)
                      })
                      
                      prompt.run().then(confirm => {
                        if (confirm) {
                          ossDelete(selectedPath, () => {
                            listByPrefix(prefix)
                          })
                        } else {
                          listByPrefix(prefix)
                        }
                      })
                      break
                    default:
                      break
                  }
                  break
                default:
                  break
              }
              process.stdin.resume()
            })
            .catch(console.error)
        } else {
          console.error(chalk.red('Notfound by prefix: "' + prefix + '"'))
          listByPrefix('')
        }
      })
      .catch(err => {
        console.error(err)
      })
  })
}

function ossUpload(absolutePath = '', remotePath = '', options) {
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

function ossDelete(deletePath, callback) {
  function deleteAllPath(currDeletePath) {
    if (currDeletePath) {
      var isFile = currDeletePath.slice(-1) !== '/'
      if (isFile) {
        checkConfig(function() {
          ossClient.delete(currDeletePath).then(res => {
            if (callback) callback()
          })
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
  deleteAllPath(deletePath)
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
          ossUpload(newPath, remotePath, options)
        }
      })
    } else {
      ossUpload(absolutePath, remotePath, options)
    }
  }

  uploadAllPath(uploadPath, remotePath)
}

module.exports = {
  uploadFileOrDir
}
