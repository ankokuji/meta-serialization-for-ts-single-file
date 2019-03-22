import { genMetaDataFromTsScript, genScriptContentFromVueLikeRawText } from "../libs"
import fs from "fs"
import path from "path"

const script = fs.readFileSync(path.join(__dirname, "../template/example.ts")).toString()
const tsMeta = genMetaDataFromTsScript(script)

const vueTemplate = fs.readFileSync(path.join(__dirname, "../template/example.vue")).toString()
const scriptInVue = genScriptContentFromVueLikeRawText(vueTemplate)
const vueMeta = genMetaDataFromTsScript(scriptInVue)

fs.writeFileSync(path.join(__dirname, "../out/tsResult.json"), JSON.stringify(tsMeta))
fs.writeFileSync(path.join(__dirname, "../out/vueResult.json"), JSON.stringify(vueMeta))
