// Function to handle search results
async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);  // Ensuring the keyword is properly encoded
        const url = `https://iwaatch.com/?q=${encodedKeyword}`;  // Constructing the search URL
        const response = await fetchV2(url);  // Fetching the search page HTML
        const html = await response.text();  // Converting the response to text

        // Array to store the results
        const results = [];

        // Regex pattern to match individual search result blocks
        const containerRegex = /<div class="col-xs-12 col-sm-6 col-md-3 [^"]*">([\s\S]*?)<\/a>\s*<\/div>/g;
        let match;

        // Looping through each search result and extracting the necessary details
        while ((match = containerRegex.exec(html)) !== null) {
            const block = match[1];  // Extracting the block containing the movie details

            // Extracting the href, image, and title from the block
            const hrefMatch = block.match(/<a href="([^"]+)"/);
            const imgMatch = block.match(/background-image:\s*url\('([^']+)'\)/);
            const titleMatch = block.match(/<div class="post-title">([^<]+)<\/div>/);

            if (hrefMatch && imgMatch && titleMatch) {
                // Pushing the result object into the results array
                results.push({
                    title: titleMatch[1].trim(),  // Movie title
                    image: imgMatch[1].trim(),  // Image URL
                    href: hrefMatch[1].trim()  // Movie URL
                });
            }
        }

        // Returning the results as a JSON string
        return JSON.stringify(results);
    } catch (e) {
        console.log("Search error:", e);  // Log any errors that occur during the search process
        return JSON.stringify([]);  // Return an empty array in case of an error
    }
}

// Function to handle extracting movie details
async function extractDetails(url) {
    try {
        const res = await fetchV2(url);  // Fetching the movie details page
        const html = await res.text();  // Converting the response to text

        // Using regex to extract description and other info from the page
        const descMatch = html.match(/<div id="movie-desc"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/);
        const infoMatch = html.match(/<ul id="info">([\s\S]*?)<\/ul>/);

        let duration = '', rating = '';

        if (infoMatch) {
            // Extracting duration and rating from the info section
            const timeMatch = infoMatch[1].match(/glyphicon-time"><\/span>\s*([^<\n]+)/);
            const rateMatch = infoMatch[1].match(/glyphicon-star-empty"[^>]*><\/span>\s*([^<\n]+)/);
            if (timeMatch) duration = timeMatch[1].trim();
            if (rateMatch) rating = rateMatch[1].trim();
        }

        // Extracting description, aliases (duration), and airdate (rating)
        const overview = descMatch ? `${descMatch[2].trim()}` : 'No description';
        const aliases = duration ? `Duration: ${duration}` : 'Duration: Unknown';
        const airdate = rating ? `Rating: ${rating}` : 'Rating: Unknown';

        // Returning movie details as JSON
        return JSON.stringify([
            {
                description: overview,  // Description of the movie
                aliases: aliases,  // Movie duration
                airdate: airdate  // Movie rating
            }
        ]);
    } catch (err) {
        console.log("Details error:", err);  // Log any errors that occur while extracting details
        return JSON.stringify([
            {
                description: "Could not load description",  // Default description in case of error
                aliases: "Duration: Unknown",  // Default duration
                airdate: "Rating: Unknown"  // Default rating
            }
        ]);
    }
}

// Function to handle extracting episodes for movies (always a single episode)
async function extractEpisodes(url) {
    try {
        // Returning a single episode object for movies
        return JSON.stringify([
            {
                title: "Full Movie",  // Title of the movie
                number: 1,  // Always 1 for a movie
                href: url  // Movie URL
            }
        ]);
    } catch (e) {
        console.log("Episode error:", e);  // Log any errors during episode extraction
        return JSON.stringify([]);  // Return an empty array in case of error
    }
}

// Function to handle extracting stream URL (video quality) and subtitles
async function extractStreamUrl(url) {
    try {
        const res = await fetchV2(url);  // Fetching the movie's streaming page
        const html = await res.text();  // Converting the response to text

        // Extracting video sources (1080p, 720p, etc.)
        const sources = [...html.matchAll(/<source\s+src="([^"]+)"[^>]*type="video\/mp4"[^>]*size="(\d+)"/g)];

        // Extracting the Arabic subtitle file if available
        const trackMatch = html.match(/<track\s+src="([^"]+)"[^>]*label="Arabic"[^>]*>/);

        const streams = sources.map(source => {
            // Mapping each source to an object with quality and URL
            return {
                title: `${source[2]}p`,  // The quality (e.g., 1080p)
                url: source[1]  // The video URL
            };
        });

        let subtitles = '';
        if (trackMatch) {
            // If Arabic subtitles are available, set the subtitle URL
            subtitles = trackMatch[1];
        }

        // Returning the streams and subtitles as a JSON object
        return JSON.stringify({
            streams,  // Array of available streams
            subtitles  // Arabic subtitle URL
        });
    } catch (e) {
        console.log("Stream extract error:", e);  // Log any errors during stream extraction
        return JSON.stringify({
            streams: [],  // Return an empty streams array in case of error
            subtitles: ''  // No subtitles in case of error
        });
    }
}
