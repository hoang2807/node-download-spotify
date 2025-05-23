require('dotenv').config()
const express = require('express')
const yt = require('youtube-search-without-api-key')
const ytdl = require('@distube/ytdl-core');
const async = require('async');
const rateLimit = require('express-rate-limit');

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

const maxQueueSize = 50 // Max queue size 50
const concurrentWorkers = 5; // Số workers chạy đồng thời

// Rate limiting - giới hạn request per IP
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Tối đa 10 downloads per IP trong 15 phút
  message: {
    error: 'Too many download requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global rate limit cho toàn server
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100, // Tối đa 100 requests mọi loại trong 1 phút
  message: { error: 'Server is busy, please try again later.' }
});

app.use(express.json())
app.use(globalLimiter)

const queue = async.queue(async (task, callback) => {
  try {
    const { track_id, res } = task

    // Hardcoded data for testing - replace with actual API call
    const name = 'Dung lam trai tim anh dau';
    const artist = '';
    const album = '';

    console.log(`Processing download for: ${name} ${artist} ${album}`);

    // Search YouTube URL
    const videos = await yt.search(`${name} ${artist} ${album}`)
    if (!videos || videos.length === 0) {
      throw new Error('No videos found');
    }

    const videoUrl = videos[0].url
    console.log(`Found video: ${videoUrl}`);

    // Set headers for file download
    res.header('Content-Type', 'audio/mpeg');
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}.mp3"`);

    // Stream the audio directly to response
    const stream = ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    stream.pipe(res);

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
      callback(error);
    });

    stream.on('end', () => {
      console.log('Download completed');
    });

  } catch (error) {
    console.error('Queue task error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
    callback(error);
  }
}, concurrentWorkers)


app.get('/api/v1/spotify_song/download', downloadLimiter, async (req, res) => {
  try {
    const { track_id } = req.query

    if (!track_id) {
      return res.status(400).json({ error: 'track_id is required' });
    }

    if (queue.length() >= maxQueueSize) {
      return res.status(503).json({
        error: 'Server is busy, please try again later',
        queue_length: queue.length(),
        estimated_wait: Math.round(queue.length() / concurrentWorkers * 30) + ' seconds'
      });
    }

    console.log(`Received request for track_id: ${track_id}`);

    const task = { track_id, res }

    queue.push(task, (error) => {
      if (error) {
        console.error('Error processing queue task:', error);
        // Don't send response here as it might already be sent by the queue task
      }
    })

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', queue_length: queue.length() });
});

// Event listeners cho queue
queue.drain(() => {
  console.log('All downloads completed');
});

queue.saturated(() => {
  console.log('Queue is saturated');
});

queue.error((error, task) => {
  console.error('Queue error:', error);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`)
})