require('dotenv').config()
const fs = require('fs')
const express = require('express')
const fetch = require('node-fetch')
const crypto = require('crypto')
const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST
// const searchMusics = require('node-youtube-music')

const { exec } = require('child_process')

app.use(express.json())

app.get('/', async (req, res) => {
  const musics = await searchMusics('Never gonna give you up')
  console.log(musics)

  res.status(200).json({ message: 'Hello' })
})

function checkFileName(fileName, string) {
  if (fileName.includes(string) && fileName.includes('.mp3'))
    return true
  else return false
}

async function getFileName(fileName, name) {
  try {
    const result = fs.readdirSync(fileName)
    console.log(result)
    for (let i = 0; i < result.length; ++i)
      if (checkFileName(result[i], name)) {
        const name = `${crypto.randomUUID()}.mp3`
        console.log(name)
        fs.renameSync(`${__dirname}/${result[i]}`, `${__dirname}/${name}`)
        return name
      }

  } catch (error) {
    console.log(error)
  }
}

app.get('/api/v1/spotify_song/download', async (req, res) => {
  try {
    const { track_id } = req.query

    const data = await (await fetch(`https://music-download.merryblue.llc/api/v1/music/track?track_id=${track_id}`)).json()

    const url = data?.result?.album?.href
    const fileName = data?.result?.album?.name
    // const artistsName = data?.artists[0]?.name
    // const fileName = `${artistsName} - ${albumName}.mp3`
    // const filePath = `${__dirname}/${fileName}`

    exec(`spotdl ${url}`, async (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return res.status(500).json({ message: error.message })
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return res.status(500).json({ message: stderr.message })
      }
      console.log(`stdout: ${stdout}`)

      const searchFileName = await getFileName(__dirname, fileName)

      return res.status(200).download(`${__dirname}/${searchFileName}`, searchFileName, (err) => {
        if (err) {
          console.log(err)
          return res.status(500).json({ message: err.message })
        }
        fs.unlinkSync(`${__dirname}/${searchFileName}`)
      })
      // const newFileName = fileName.split(' ').join('_')
      // const newPath = `${__dirname}/${newFileName}`
      // fs.renameSync(filePath, newPath)

      // return res.status(200).download(path.normalize(filePath))

    })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: error })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})
