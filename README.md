# OSSR
## Inistall
`npm i  ossr`

## Config

**Simplify**
`ossr -i <accessKeyId> -s <accessKeySecret>`

**Advance**
`ossr -i <accessKeyId> -s <accessKeySecret> -b <bucket> -t <timeout> -r <region>`

## Usage
### Upload to root path
`ossr ./localFile.jpg` ------> `https://xxxx/localFile.jpg`
### Upload folder
`ossr ./localFolder` ------> `https://xxxx/<localFolder**>`
### Upload with rename or custom folder
`ossr ./localFolder -p </remotePath>` ------> `https://xxxx/remotePath/<localFolder**>`
