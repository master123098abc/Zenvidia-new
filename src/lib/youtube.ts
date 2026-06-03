import { supabase } from './supabase';

export const fetchAndSaveYouTubeShorts = async (
  creatorId: string,
  channelUrl: string
): Promise<void> => {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YouTube API key missing');

  // Resolve channel ID from URL
  const getChannelId = async (url: string): Promise<string> => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      
      if (parts[0]?.startsWith('@')) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${parts[0]}&key=${apiKey}`
        );
        const data = await res.json();
        console.log('Channel detected:', parts[0]);
        return data.items?.[0]?.id || '';
      }
      if (parts[0] === 'channel') return parts[1];
      if (parts[0] === 'c') {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${parts[1]}&key=${apiKey}`
        );
        const data = await res.json();
        return data.items?.[0]?.id || '';
      }
      return '';
    } catch { return ''; }
  };

  const channelId = await getChannelId(channelUrl);
  if (!channelId) throw new Error('Could not resolve channel ID');
  console.log('Channel ID:', channelId);

  // Get uploads playlist
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  );
  const channelData = await channelRes.json();
  const uploadsPlaylistId = channelData.items?.[0]
    ?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error('No uploads playlist');

  // Get latest 50 videos
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
  );
  const playlistData = await playlistRes.json();
  const videoIds = playlistData.items
    ?.map((i: any) => i.contentDetails?.videoId)
    .filter(Boolean) || [];

  if (!videoIds.length) throw new Error('No videos found');

  // Get video details
  const videoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(',')}&key=${apiKey}`
  );
  const videoData = await videoRes.json();

  // Parse ISO duration to seconds
  const parseDuration = (iso: string): number => {
    const match = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 999;
    return (parseInt(match[1] || '0') * 60) + 
           parseInt(match[2] || '0');
  };

  // Filter shorts <= 60s, sort by views, top 7
  const withViews = videoData.items
    ?.filter((v: any) => {
      const dur = parseDuration(v.contentDetails?.duration || '');
      console.log(v.id, 'duration:', dur, 'views:', v.statistics?.viewCount);
      return dur <= 60;
    })
    .map((v: any) => ({
      ...v,
      _views: Number(v.statistics?.viewCount ?? 0)
    }))
    .sort((a: any, b: any) => b._views - a._views);

  console.log('After sort:', withViews?.map((v: any) => 
    `${v.snippet?.title?.slice(0,20)} = ${v._views} views`
  ));

  const top7 = withViews?.slice(0, 7) || [];
  console.log('Top 7 selected:', top7.length);

  if (!top7.length) {
    console.warn('No shorts found');
    return;
  }

  // Delete old shorts for this creator
  await supabase
    .from('youtube_shorts')
    .delete()
    .eq('creator_id', creatorId);

  // Insert new shorts using exact table columns
  const rows = top7.map((v: any) => ({
    creator_id: creatorId,
    channel_url: channelUrl,
    channel_id: channelId,
    video_id: v.id,
    title: v.snippet?.title || '',
    thumbnail: v.snippet?.thumbnails?.high?.url || '',
    views: v._views,
    embed_url: `https://www.youtube.com/embed/${v.id}`,
    duration_seconds: parseDuration(v.contentDetails?.duration || ''),
  }));

  const { error } = await supabase
    .from('youtube_shorts')
    .insert(rows);

  if (error) throw error;
  console.log('Saved', rows.length, 'shorts');
};
