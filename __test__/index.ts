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
