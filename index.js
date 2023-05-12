require('dotenv').config()
const fs = require('fs')
const express = require('express')
const fetch = require('node-fetch')
const jwt = require('jsonwebtoken')
const app = express()
const PORT = process.env.PORT
const HOST = process.env.HOST
const SECRET_KEY = process.env.SECRET_KEY

const { exec } = require('child_process')

app.use(express.json())

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello' })
})

async function checkToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return res.sendStatus(401)

    const decode = await jwt.verify(token, SECRET_KEY)

    if (decode.secret_key != SECRET_KEY)
      return res.sendStatus(401)
    if (decode.exp * 1000 <= Date.now()) {
      return res.sendStatus(403)
    } else {
      req.id = decode.track_id
      return next()
    }
  } catch (error) {
    return res.status(400).json(error)
  }
}

app.get('/api/v1/spotify_song', async (req, res) => {
  const { track_id } = req.query
  const payload = {
    track_id, secret_key: SECRET_KEY
  }
  const token = await jwt.sign(payload, SECRET_KEY, { expiresIn: '30m' });

  return res.status(200).json({ token, url: `${process.env.DOMAIN}/api/v1/spotify_song/download?track_id=${track_id}` })
})

app.get('/api/v1/spotify_song/download', checkToken, async (req, res) => {
  try {
    const { track_id } = req.query

    const api_token = await (await fetch('https://music-download.merryblue.llc/api/v1/spotify/token')).text()

    const data = await (await fetch(`https://api.spotify.com/v1/tracks/${track_id}`, {
      headers: {
        'Authorization': `Bearer ${api_token}`
      }
    })).json()

    const url = data?.album?.external_urls?.spotify
    const albumName = data?.album?.name
    const artistsName = data?.artists[0]?.name
    const fileName = `${artistsName} - ${albumName}.mp3`
    const filePath = `${__dirname}/${fileName}`

    // const result = await exec(`spotdl ${url}`)
    // if (result.stderr) {
    //   console.log(`stderr: ${stderr}`)
    //   return res.status(500).json({ message: stderr.message })
    // }

    exec(`spotdl ${url}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return res.status(500).json({ message: error.message })
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return res.status(500).json({ message: stderr.message })
      }
      console.log(`stdout: ${stdout}`)

      return res.status(200).download(filePath, fileName, (err) => {
        if (err) {
          console.log(error)
          return res.status(500).json({ message: err.message })
        }
        fs.unlinkSync(filePath)
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