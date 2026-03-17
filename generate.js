const fs = require('fs');

async function main() {
  try {
    // 1. Ambil Data Anime Ongoing dari Jikan API
    const jikanRes = await fetch("https://api.jikan.moe/v4/seasons/now?limit=6");
    const jikanData = await jikanRes.json();
    const animes = jikanData.data.map(a => ({
      title: a.title,
      image: a.images.jpg.image_url,
      score: a.score,
      episodes: a.episodes,
      url: a.url
    }));

    // 2. Ambil Data Rilisan Terbaru dari Animetosho (JSON Feed 1080p)
    const toshoRes = await fetch("https://feed.animetosho.org/json?filter[0][t]=term&filter[0][v]=1080p");
    const toshoData = await toshoRes.json();
    const torrents = toshoData.slice(0, 10).map(t => {
      // Ekstrak Info Hash dari Magnet URI untuk bikin link Nyaa
      const hashMatch = t.magnet_uri.match(/btih:([a-zA-Z0-9]+)/i);
      const hash = hashMatch ? hashMatch[1] : '';
      
      return {
        title: t.title,
        link: t.link, // Link HTTP Animetosho
        magnet: t.magnet_uri,
        hash: hash, // Hash torrent mentah
        nyaaUrl: hash ? `https://nyaa.si/?q=${hash}` : `https://nyaa.si/?q=${encodeURIComponent(t.title)}`,
        size: (t.size / 1024 / 1024).toFixed(2) + " MB",
        date: new Date(t.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      };
    });

    // 3. Simpan raw data ke JSON
    const resultJson = {
      last_update: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + " WIB",
      ongoing_anime: animes,
      latest_releases: torrents
    };
    fs.writeFileSync('anime_update.json', JSON.stringify(resultJson, null, 2));

    // 4. Bangun README.md
    let readme = `# 🎬 Ultimate Anime & Torrent Tracker\n\n`;
    readme += `**Sync Terakhir:** ${resultJson.last_update}\n\n`;

    readme += `### 🌟 Sedang Tayang (Top Ongoing)\n\n`;
    readme += `| Poster | Info Anime |\n| :---: | --- |\n`;
    animes.forEach(a => {
      readme += `| <img src="${a.image}" width="110" style="border-radius: 8px;"> | **[${a.title}](${a.url})**<br>⭐ Score: ${a.score || 'N/A'}<br>📺 Eps: ${a.episodes || 'Ongoing'} |\n`;
    });

    readme += `\n### 📥 Rilisan Terbaru (1080p)\n\n`;
    readme += `| Judul File | Size | Tanggal | Download Links |\n| --- | :---: | :---: | :---: |\n`;
    torrents.forEach(t => {
      const shortTitle = t.title.length > 55 ? t.title.substring(0, 52) + "..." : t.title;
      // Buat 2 link HTTP yang aman di klik dari GitHub: Tosho & Nyaa
      readme += `| ${shortTitle} | ${t.size} | ${t.date.split(' ')[0]} | [🌐 Tosho](${t.link}) <br><br> [🐱 Nyaa](${t.nyaaUrl}) |\n`;
    });

    readme += `\n---\n✨ *Automated by zerty_ System (Diperbarui Setiap Jam)*\n`;
    readme += `Data Sources: [Jikan API](https://jikan.moe/) & [Animetosho](https://animetosho.org/)\n`;

    fs.writeFileSync('README.md', readme);
    console.log("Berhasil meracik JSON dan README dengan link klik-able!");
  } catch (err) {
    console.error("Waduh, gagal fetch data:", err);
    process.exit(1);
  }
}
main();
