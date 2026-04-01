const fs = require('fs');

// Fungsi delay untuk menghindari Rate Limit Jikan API
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  try {
    const waktuUpdate = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    // Buat direktori API untuk memisahkan JSON
    if (!fs.existsSync('api')){
        fs.mkdirSync('api');
    }

    console.log("Mulai memanggil Jikan API dan Animetosho...");

    // 1. Fetch Ongoing Anime
    const jikanRes = await fetch("https://api.jikan.moe/v4/seasons/now?limit=6");
    const jikanData = await jikanRes.json();
    const animes = jikanData.data.map(a => ({
      title: a.title,
      image: a.images.jpg.image_url,
      score: a.score,
      episodes: a.episodes,
      url: a.url
    }));
    fs.writeFileSync('api/ongoing.json', JSON.stringify({ last_update: waktuUpdate, data: animes }, null, 2));

    await delay(1000); // Jeda 1 detik biar aman

    // 2. Fetch Top Anime Airing Harian
    const topRes = await fetch("https://api.jikan.moe/v4/top/anime?filter=airing&limit=5");
    const topData = await topRes.json();
    const topAnimes = topData.data.map(a => ({
      rank: a.rank,
      title: a.title,
      image: a.images.jpg.image_url,
      score: a.score,
      url: a.url
    }));
    fs.writeFileSync('api/top_anime.json', JSON.stringify({ last_update: waktuUpdate, data: topAnimes }, null, 2));

    await delay(1000);

    // 3. Fetch Jadwal Harian (WIB)
    const daysEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const indexHari = now.getDay();
    const queryHari = daysEng[indexHari];
    const namaHari = hariIndo[indexHari];

    const scheduleRes = await fetch(`https://api.jikan.moe/v4/schedules?filter=${queryHari}&limit=6`);
    const scheduleData = await scheduleRes.json();
    const schedules = scheduleData.data.map(a => ({
      title: a.title,
      time: a.broadcast.time ? a.broadcast.time + " JST" : "TBA",
      url: a.url
    }));
    fs.writeFileSync('api/jadwal_harian.json', JSON.stringify({ last_update: waktuUpdate, hari: namaHari, data: schedules }, null, 2));

    // 4. Fetch Rilisan Torrent (Bertindak sebagai API Nyaa)
    const toshoRes = await fetch("https://feed.animetosho.org/json?filter[0][t]=term&filter[0][v]=1080p");
    const toshoData = await toshoRes.json();
    const torrents = toshoData.slice(0, 10).map(t => {
      const hashMatch = t.magnet_uri.match(/btih:([a-zA-Z0-9]+)/i);
      const hash = hashMatch ? hashMatch[1] : '';
      return {
        title: t.title,
        link_tosho: t.link, 
        magnet: t.magnet_uri,
        hash: hash, 
        link_nyaa: hash ? `https://nyaa.si/?q=${hash}` : `https://nyaa.si/?q=${encodeURIComponent(t.title)}`,
        size: (t.size / 1024 / 1024).toFixed(2) + " MB",
        date: new Date(t.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
    });
    fs.writeFileSync('api/nyaa_torrents.json', JSON.stringify({ last_update: waktuUpdate, data: torrents }, null, 2));

    // 5. Build README.md Epic
    let readme = `# 🎬 Ultimate Anime & Torrent Tracker v2.0\n\n`;
    readme += `> ⚡ **Sync Terakhir:** ${waktuUpdate} WIB | Di-update otomatis setiap 15 Menit!\n\n`;
    readme += `File API Statis siap pakai: \n`;
    readme += `[Ongoing](api/ongoing.json) | [Top Anime](api/top_anime.json) | [Jadwal Harian](api/jadwal_harian.json) | [API Nyaa Torrents](api/nyaa_torrents.json)\n\n`;

    // Section Jadwal Harian
    readme += `### 📅 Jadwal Tayang Hari Ini (${namaHari})\n`;
    schedules.forEach(s => {
      readme += `- **${s.title}** (Rilis: ${s.time}) - [MyAnimeList](${s.url})\n`;
    });

    // Section Top Anime Airing
    readme += `\n### 🏆 Top Anime Sedang Tayang\n`;
    readme += `| Rank | Poster | Info Anime |\n| :---: | :---: | --- |\n`;
    topAnimes.forEach(a => {
      readme += `| **#${a.rank}** | <img src="${a.image}" width="80" style="border-radius: 8px;"> | **[${a.title}](${a.url})**<br>⭐ Score: ${a.score || 'N/A'} |\n`;
    });

    // Section Rilisan Terbaru (Torrent)
    readme += `\n### 📥 Rilisan Bajakan Terbaru (1080p)\n\n`;
    readme += `| Judul File | Size | Waktu Rilis | Download Links |\n| --- | :---: | :---: | :---: |\n`;
    torrents.forEach(t => {
      const shortTitle = t.title.length > 55 ? t.title.substring(0, 52) + "..." : t.title;
      readme += `| \`${shortTitle}\` | **${t.size}** | ${t.date.split(' ')[1]} | [🌐 Tosho](${t.link_tosho}) <br> [🐱 Nyaa](${t.link_nyaa}) |\n`;
    });

    readme += `\n---\n✨ *Automated by zerty_ System* | Data Sources: [Jikan API](https://jikan.moe/) & [Animetosho](https://animetosho.org/)\n`;

    fs.writeFileSync('README.md', readme);
    console.log("SUGOI! Semua data API & README berhasil diracik!");
  } catch (err) {
    console.error("Yabai! Gagal fetch data:", err);
    process.exit(1);
  }
}
main();
