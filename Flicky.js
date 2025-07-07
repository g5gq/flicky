async function searchResults(keyword) {
    try {
        const url = `https://iwaatch.com/?q=${encodeURIComponent(keyword)}`;
        const response = await fetchV2(url);
        const html = await response.text();

        const results = [];
        const containerRegex = /<div class="col-xs-12 col-sm-6 col-md-3 [^"]*">([\s\S]*?)<\/a>\s*<\/div>/g;
        let match;

        while ((match = containerRegex.exec(html)) !== null) {
            const block = match[1];

            const hrefMatch = block.match(/<a href="([^"]+)"/);
            const imgMatch = block.match(/background-image:\s*url\('([^']+)'\)/);
            const titleMatch = block.match(/<div class="post-title">([^<]+)<\/div>/);

            if (hrefMatch && imgMatch && titleMatch) {
                results.push({
                    title: titleMatch[1].trim(),
                    image: imgMatch[1].trim(),
                    href: hrefMatch[1].trim()
                });
            }
        }

        return JSON.stringify(results);
    } catch (e) {
        console.log("Search error:", e);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const res = await fetchV2(url);
        const html = await res.text();

        const descMatch = html.match(/<div id="movie-desc"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/);
        const infoMatch = html.match(/<ul id="info">([\s\S]*?)<\/ul>/);
        let duration = '', rating = '';

        if (infoMatch) {
            const timeMatch = infoMatch[1].match(/glyphicon-time"><\/span>\s*([^<\n]+)/);
            const rateMatch = infoMatch[1].match(/glyphicon-star-empty"[^>]*><\/span>\s*([^<\n]+)/);
            if (timeMatch) duration = timeMatch[1].trim();
            if (rateMatch) rating = rateMatch[1].trim();
        }

        const overview = descMatch ? `${descMatch[2].trim()}` : 'No description';
        const aliases = duration ? `Duration: ${duration}` : 'Duration: Unknown';
        const airdate = rating ? `Rating: ${rating}` : 'Rating: Unknown';

        return JSON.stringify([
            {
                description: overview,
                aliases: aliases,
                airdate: airdate
            }
        ]);
    } catch (err) {
        console.log("Details error:", err);
        return JSON.stringify([
            {
                description: "Could not load description",
                aliases: "Duration: Unknown",
                airdate: "Rating: Unknown"
            }
        ]);
    }
}

async function extractEpisodes(url) {
    try {
        return JSON.stringify([
            {
                title: "Full Movie",
                number: 1,
                href: url
            }
        ]);
    } catch (e) {
        console.log("Episode error:", e);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const res = await fetchV2(url);
        const html = await res.text();

        const sources = [...html.matchAll(/<source\s+src="([^"]+)"[^>]*type="video\/mp4"[^>]*size="(\d+)"/g)];
        const trackMatch = html.match(/<track\s+src="([^"]+)"[^>]*label="Arabic"[^>]*>/);

        const streams = sources.map(source => {
            return {
                title: `${source[2]}p`,
                url: source[1]
            };
        });

        let subtitles = '';
        if (trackMatch) {
            subtitles = trackMatch[1];
        }

        return JSON.stringify({
            streams,
            subtitles
        });
    } catch (e) {
        console.log("Stream extract error:", e);
        return JSON.stringify({
            streams: [],
            subtitles: ''
        });
    }
}
