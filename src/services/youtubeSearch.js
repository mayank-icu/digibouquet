export const searchYouTube = async (query) => {
  const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (API_KEY) {
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}&maxResults=15`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            duration: "",
            channel: item.snippet.channelTitle,
          }));
        }
      } else {
        console.warn(`YouTube API returned ${response.status}, falling back to scraping`);
      }
    } catch (error) {
      console.warn("YouTube API search failed, falling back to scraping:", error);
    }
  }

  try {
    const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const html = await response.text();
    
    // Extract ytInitialData
    const regex = /var ytInitialData = (.*?);<\/script>/;
    const match = regex.exec(html);
    if (!match || !match[1]) throw new Error("Could not find ytInitialData");
    
    const data = JSON.parse(match[1]);
    
    // Traverse the JSON to find video results
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents) return [];
    
    let videoResults = [];
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents;
      if (items) {
        for (const item of items) {
          const video = item?.videoRenderer;
          if (video && video.videoId) {
            videoResults.push({
              id: video.videoId,
              title: video.title?.runs?.[0]?.text,
              thumbnail: video.thumbnail?.thumbnails?.[0]?.url,
              duration: video.lengthText?.simpleText,
              channel: video.ownerText?.runs?.[0]?.text,
            });
          }
        }
      }
    }
    
    return videoResults.filter(v => v.id && v.title);
  } catch (error) {
    console.error("YouTube search error:", error);
    return [];
  }
};
