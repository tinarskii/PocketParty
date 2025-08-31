const socket = createSocketConnection();
const roomName = getRoomName();

let videoQueue;
let isPaused = false;
fetchQueue(roomName).then((queue) => {
  videoQueue = queue;
});

socket.emit("joinRoom", roomName);

let ytPlayer;

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player("player", {
    height: '390',
    width: '640',
    playerVars: {
      'playsinline': 1
    },
    events: {
      onReady: onPlayerReady,
    },
  });
};

function onPlayerReady(event) {
  socket.on(`videoSecondsUpdated`, (seconds) => {
    ytPlayer.playVideo();
    ytPlayer.seekTo(seconds, true);
  })
  socket.on("pauseVideo", () => {
    ytPlayer.pauseVideo();
    isPaused = true;
  });
  socket.on("playVideo", () => {
    ytPlayer.playVideo();
    isPaused = false;
  });
  socket.on(`queueUpdated`, async (queue) => {
    let isCurrentVideoSkip = videoQueue[0]?.videoId !== queue[0]?.videoId;
    videoQueue = queue;
    await updateQueueDisplay(roomName, videoQueue);
    if (!isCurrentVideoSkip) ytPlayer.loadVideoById(videoQueue?.length > 0 ? videoQueue[0]?.videoId : "M7lc1UVf-VE");
  });
  ytPlayer.loadVideoById(videoQueue?.length > 0 ? videoQueue[0]?.videoId : "M7lc1UVf-VE");
}

updateQueueDisplay(getRoomName(), videoQueue);

socket.on(`hostLeft`, () => {
  alert('The host has left the room. You will be redirected to the homepage.');
  window.location.href = '/';
});

document.getElementById("addVideo").addEventListener('submit', async (event) => {
  event.preventDefault();
  const videoURL = document.getElementById('videoURL').value;
  const videoID = videoURL.split('v=')[1]?.split('&')[0];
  if (!videoID) {
    alert('Invalid YouTube URL');
    return;
  }
  const roomName = window.location.pathname.split('/').pop();

  try {
    const response = await fetch(`/api/addVideoToQueue/${encodeURIComponent(roomName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({videoID}),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    if (result.success) {
      alert('Video added to the queue!');
      document.getElementById('videoURL').value = '';
      await updateQueueDisplay(roomName);
    } else {
      alert('Failed to add video: ' + result.message);
    }
  } catch (error) {
    console.error('Error adding video:', error);
    alert('An error occurred while adding the video.');
  }
});
