# OSSR
[![npm package](https://img.shields.io/npm/v/ossr.svg?style=flat-square)](https://www.npmjs.org/package/ossr)
[![PeerDependencies](https://img.shields.io/david/peer/myxvisual/ossr.svg?style=flat-square)](https://david-dm.org/myxvisual/ossr#info=peerDependencies&view=list)
[![Dependencies](https://img.shields.io/david/myxvisual/ossr.svg?style=flat-square)](https://david-dm.org/myxvisual/ossr)
[![DevDependencies](https://img.shields.io/david/dev/myxvisual/ossr.svg?style=flat-square)](https://david-dm.org/myxvisual/react-uwp#info=devDependencies&view=list)
## Inistall
`npm i -g  ossr`

## Config

**Simplify**

`ossr -i <accessKeyId> -s <accessKeySecret> -b <bucket>`

**Advance**

`ossr -i <accessKeyId> -s <accessKeySecret> -b <bucket> -e <endpoint> -r <region> -t <timeout>`

## CLI Usage
### Graph
`ossr`
`ossr -l`
`ossr -l folder/`
![list](https://raw.githubusercontent.com/myxvisual/ossr/master/images//list.gif)

### Upload

#### Upload file to root pat
`ossr ./localFile.jpg` ------> `https://xxxx/localFile.jpg`

#### Upload folder to root path
`ossr ./localFolder` ------> `https://xxxx/onlineFolder/<localFolder**>`

#### Upload file with rename
`ossr ./localFile.jpg customFolder/renamedFile.jpg` ------> `https://xxxx/customFolder/renamedFile.jpg`

#### Upload folder with rename
`ossr ./localFolder onlineFolder/` ------> `https://xxxx/onlineFolder/<localFolder**>`
![upload](https://raw.githubusercontent.com/myxvisual/ossr/master/images//upload.gif)

#### Delete
`ossr -d remoteFileOrFolder`
![delete](https://raw.githubusercontent.com/myxvisual/ossr/master/images//delete.gif)

### Help
`ossr -h`

## Module Usage
``` js
import * as ossr from "../bin/ossr";

async function test() {
    // ossr.setConfig({
    //     accessKeyId: "",
    //     accessKeySecret: ""
    // });

    let existRes = false;
    const uploadRes = await ossr.ossUpload("../bin", "ossr/");
    // console.log(uploadRes);
    existRes = await ossr.ossIsExist("ossr/ossr.js");
    // console.log(existRes);
    const deleteRes = await ossr.ossDelete("ossr/");
    // console.log("deleteRes", deleteRes);
}

test()
```