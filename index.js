require('dotenv').config()
const fs = require('fs')
const express = require('express')
const fetch = require('node-fetch')
const crypto = require('crypto')
const app = express()
const PORT = process.env.PORT
const HOST = process.env.HOST

const { exec } = require('child_process')

app.use(express.json())

app.get('/', (req, res) => {
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
        await fs.renameSync(`${__dirname}/${result[i]}`, `${__dirname}/${name}`)
        return name
      }

  } catch (error) {
    console.log(error)
  }
}

app.get('/api/v1/spotify_song/download', async (req, res) => {
  try {
    const { track_id } = req.query

    const api_token = await (await fetch('https://music-download.merryblue.llc/api/v1/spotify/token')).text()

    const data = await (await fetch(`https://api.spotify.com/v1/tracks/${track_id}`, {
      headers: {
        'Authorization': `Bearer ${api_token}`
      }
    })).json()

    console.log(data)
    const url = data?.external_urls?.spotify
    const fileName = data?.name
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
      console.log('searchFileName: ', searchFileName)

      console.log(`${__dirname}/${searchFileName}`)

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
