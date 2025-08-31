interface YouTubeVideoInfo {
  title: string
  author: string
  thumbnail: string
  videoId: string
  lengthSeconds: number
  isLiveContent: boolean
}

export async function getVideoInfoScraper(
  videoId: string,
): Promise<YouTubeVideoInfo | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    const html = await res.text();

    const match = html.match(
      /var ytInitialPlayerResponse = ({.*?});<\/script>/,
    );
    if (!match) return null;

    const data = JSON.parse(match[1]!);
    const details = data.videoDetails;

    return {
      title: details.title,
      author: details.author,
      thumbnail: details.thumbnail.thumbnails.slice(-1)[0].url,
      videoId: details.videoId,
      lengthSeconds: parseInt(details.lengthSeconds) || 0,
      isLiveContent: details.isLiveContent || false,
    };
  } catch (err) {
    console.error("[Scraper] YouTube video info error:", err);
    return null;
  }
}
