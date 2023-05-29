require('dotenv').config()
const express = require('express')
const fetch = require('node-fetch')
const yt = require('youtube-search-without-api-key')
const ytdl = require('ytdl-core');
const fs = require('fs')
const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

app.use(express.json())

app.get('/api/v1/spotify_song', async (req, res) => {
  try {
    const { track_id } = req.query
    const data = await (await fetch(`https://music-download.merryblue.llc/api/v1/music/track?track_id=${track_id}`)).json()

    const name = data?.results?.name
    const artist = data?.results?.artists[0]?.name
    const album = data?.results?.album?.name

    //search youtube url
    const videos = await yt.search(`${name} ${artist} ${album}`)
    const videoUrl = videos[0].url
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    //download mp3
    res.header('Content-Disposition', `attachment; filename="${encodeURI(name)}.mp3"`);
    ytdl(videoUrl, { format: format })
      .pipe(res);

  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: error })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})
