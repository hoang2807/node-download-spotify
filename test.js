// import yt from 'youtube-search-without-api-key';
const yt = require('youtube-search-without-api-key');

(async () => {
  const videos = await yt.search('Dung lam trai tim anh dau');
  console.log(videos);
})();
