import * as ossr from "../bin/ossr";

async function test() {
    // ossr.setConfig({
    //     accessKeyId: "",
    //     accessKeySecret: ""
    // })

    let existRes = false
    const uploadRes = await ossr.ossUpload("../bin", "ossr/")
    // console.log(uploadRes);
    existRes = await ossr.ossIsExist("ossr/ossr.js");
    // console.log(existRes);
    const deleteRes = await ossr.ossDelete("ossr/");
    // console.log("deleteRes", deleteRes);
}

test()
