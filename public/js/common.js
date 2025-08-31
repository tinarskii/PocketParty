function getRoomName() {
  return window.location.pathname.split('/').pop();
}

async function fetchQueue(roomName) {
  try {
    const response = await fetch(`/api/getQueue/${encodeURIComponent(roomName)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.queue; // Assuming the API returns { queue: [...] }
  } catch (error) {
    console.error('Error fetching queue:', error);
    return [];
  }
}

async function updateQueueDisplay(roomName, videoQueue) {
  const queue = videoQueue ? videoQueue : await fetchQueue(roomName);
  const queueList = document.getElementById('queue-list');
  queueList.innerHTML = ''; // Clear existing list

  if (queue.length === 0) {
    queueList.innerHTML = '<li>No videos in the queue</li>';
    return;
  }

  queue.forEach((video, index) => {
    const listItem = document.createElement('li');
    listItem.textContent = `${index + 1}. ${video.title} by ${video.author} (${Math.floor(video.lengthSeconds / 60)}:${(video.lengthSeconds % 60).toString().padStart(2, '0')})`;
    queueList.appendChild(listItem);
  });
}

function createSocketConnection() {
  const {origin} = window.location;
  const socketUrl = `${origin.hostname ?? "localhost"}:3001`;

  return io(socketUrl);
}
