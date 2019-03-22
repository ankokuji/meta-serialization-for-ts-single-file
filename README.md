# ts-meta-extract

An util for extracting all decorator meta data in compilation stage.

# Usage

Use function `genMetaDataFromTsScript` to extract metadata.
```javascript
import { genMetaDataFromTsScript, genScriptContentFromVueLikeRawText } from "../libs"

const tsScript = `
@Component
class Test {
  @Prop
  private prop1: string = "hello world"
}

`

const meta = getMetaDataFromTsScript(tsScript)

```