require('dotenv').config()
const fs = require('fs')
const express = require('express')
const fetch = require('node-fetch')
const crypto = require('crypto')
const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

const { exec } = require('child_process')

app.use(express.json())

function checkFileName(fileName, string) {
  if (fileName.includes(string) && fileName.includes('.mp3'))
    return true
  else return false
}

async function getFileName(filePath, name) {
  try {
    const result = fs.readdirSync(filePath)
    console.log("🚀 ~ file: index.js:26 ~ getFileName ~ result:", result)

    for (let i = 0; i < result.length; ++i)
      if (checkFileName(result[i], name)) {
        const name = `${crypto.randomUUID()}.mp3`
        console.log("🚀 ~ file: index.js:28 ~ getFileName ~ name:", name)
        // fs.renameSync(`${filePath}/${result[i]}`, `${filePath}/${name}`)
        return name
      }
  } catch (error) {
    console.log(error)
  }
}

app.get('/api/v1/spotify_song', async (req, res) => {
  try {
    const { track_id } = req.query
    const data = await (await fetch(`https://music-download.merryblue.llc/api/v1/music/track?track_id=${track_id}`)).json()

    console.log("🚀 ~ file: index.js:42 ~ app.get ~ data:", data)
    const url = data?.results?.external_urls?.spotify
    console.log("🚀 ~ file: index.js:44 ~ app.get ~ url:", url)
    const fileName = data?.results?.name

    exec(`./download.sh ${url}`, async (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return res.status(500).json({ message: error.message })
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return res.status(500).json({ message: stderr.message })
      }
      console.log(`stdout: ${stdout}`)

      const uuidName = await getFileName(__dirname, fileName)

      return res.status(200).json({ url: `${process.env.DOMAIN}/api/v1/spotify_song/download?id=${uuidName}` })
    })
  } catch (error) {
    return res.status(500).json({ message: error })
  }
})

app.get('/api/v1/spotify_song/download', (req, res) => {
  try {
    const { id } = req.query

    res.status(200).download(`${__dirname}/${id}`, id, (err) => {
      if (err) {
        console.log(err)
        res.status(500).json({ message: err.message })
      }
      fs.unlink(`${__dirname}/${id}`, (error) => {
        if (error) {
          console.log(err)
          res.status(500).json({ message: err.message })
        }
      })
      // fs.unlinkSync(`${__dirname}/${id}`)
    })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: error })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})
