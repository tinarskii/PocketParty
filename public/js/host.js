const socket = createSocketConnection();
const roomName = getRoomName();

socket.emit("joinRoom", roomName);

let videoQueue;
fetchQueue(roomName).then((queue) => {
  videoQueue = queue;
});

let ytPlayer;
let isPaused = false;

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player("player", {
    height: '390',
    width: '640',
    playerVars: {
      'playsinline': 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    },
  });
};

function onPlayerReady(event) {
  let ls = 0
  setInterval(() => {
    if (ytPlayer !== undefined && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      let playSeconds = ytPlayer.getCurrentTime();
      socket.emit(`syncVideoSeconds`, {roomName, seconds: playSeconds});
    }
  }, 1000);
  ytPlayer.loadVideoById(videoQueue?.length > 0 ? videoQueue[0]?.videoId : "M7lc1UVf-VE");
}

function onPlayerStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.ENDED:
      socket.emit("videoEnded", roomName);
      break;
    case YT.PlayerState.PAUSED:
      socket.emit("videoPaused", roomName);
      isPaused = true;
      break;
    case YT.PlayerState.PLAYING:
      if (isPaused) {
        socket.emit("videoPlayed", roomName);
      }
      isPaused = false;
      break;
  }
}

socket.on(`queueUpdated`, async (queue) => {
  let isCurrentVideoSkip = videoQueue[0]?.videoId !== queue[0]?.videoId;
  videoQueue = queue;
  await updateQueueDisplay(roomName, videoQueue);
  if (!isCurrentVideoSkip) ytPlayer.loadVideoById(videoQueue?.length > 0 ? videoQueue[0]?.videoId : "M7lc1UVf-VE");
});

updateQueueDisplay(roomName, videoQueue).then(null);

window.onbeforeunload = (ev) => {
  socket.emit("hostDisconnect", roomName);
}

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
