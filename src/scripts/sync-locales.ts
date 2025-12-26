import fs from 'fs'
import path from 'path'

const localesDir = 'src/i18n/locales'
const sourceFile = path.join(localesDir, 'en.json')
const targetLocales = ['fr.json', 'id.json']

const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'))
const sourceKeys = Object.keys(sourceData)

targetLocales.forEach((locFile) => {
  const filePath = path.join(localesDir, locFile)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  let updated = 0
  sourceKeys.forEach((key) => {
    const d = data as Record<string, string>
    const placeholder = `__NOT_GENERATED: ${key}__`

    // Update if missing OR if it's currently exactly the same as English (placeholder from previous run)
    if (d[key] === undefined || d[key] === key) {
      if (d[key] !== placeholder) {
        d[key] = placeholder
        updated++
      }
    }
  })

  if (updated > 0) {
    // Sort keys to maintain order
    const d = data as Record<string, string>
    const sortedData: Record<string, string> = {}
    Object.keys(d)
      .sort()
      .forEach((k) => {
        sortedData[k] = d[k]
      })
    fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n')
    console.warn(`Updated ${locFile}: synchronized ${updated} keys.`)
  } else {
    console.warn(`${locFile} is already in sync.`)
  }
})
