# OSSR
## Inistall
`npm i -g  ossr`

## Config

**Simplify**

`ossr -i <accessKeyId> -s <accessKeySecret> -b <bucket>`

**Advance**

`ossr -i <accessKeyId> -s <accessKeySecret> -b <bucket> -e <endpoint> -r <region> -t <timeout>`

# Usage
## Module
``` js
import * as ossr from "../bin/ossr";

async function test() {
    // ossr.setConfig({
    //     accessKeyId: "",
    //     accessKeySecret: ""
    // })

    try {
        const uploadRes = await ossr.ossUpload("../bin", "ztest/")
        console.log(uploadRes);
        const deleteRes = await ossr.ossDelete("ztest/");
        console.log(deleteRes);
    } catch(e) {
        console.error(e)
    }
}

test()
```

## CLI
## Graph
`ossr`
`ossr -l`
`ossr -l folder/`

### Upload
**Upload file to root path**
`ossr ./localFile.jpg` ------> `https://xxxx/localFile.jpg`
**Upload folder to root path**
`ossr ./localFolder` ------> `https://xxxx/onlineFolder/<localFolder**>`
**Upload file with rename**
`ossr ./localFile.jpg customFolder/renamedFile.jpg` ------> `https://xxxx/customFolder/renamedFile.jpg`
**Upload folder with rename**
`ossr ./localFolder onlineFolder/` ------> `https://xxxx/onlineFolder/<localFolder**>`

### Delete
`ossr -d remoteFileOrFolder`

### Help
`ossr -h`
