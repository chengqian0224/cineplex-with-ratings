var titleContainer = null;

// Save processed movie titles
const processedMovies = new Set();

// Clean movie titles when needed
function cleanMovieTitle(title) {
    console.log('Original title:', title);
    
    // Remove suffixes that look like *** w/e.s.t. (for movies in foreign languages)
    const cleanedTitle = title.replace(/\s*\([^)]*w\/e\.s\.t\.\)\s*$/i, '');
    
    console.log('Cleaned title:', cleanedTitle);
    return cleanedTitle.trim();
}

function extractMovieTitles() {
    console.log('Starting to extract movie titles...');
    const currentUrl = window.location.href;
    console.log('Current URL:', currentUrl);
    
    // Theatre page
    if (currentUrl.includes("openTM=true")){ 
        titleContainer = "#\\31 -meta-nav > div > div > div > div > div > div.ShowtimesContent_theatreAccordionContainer__5Mfdr > div > div > h2";
        console.log('Using Theatre page selector:', titleContainer);
    } else {
        titleContainer = "#homepage_movie_grid > div.MovieGridBlock_posterContainer__lNJp6 > div > div.Poster_filmContainer__fN677 > pre > p";
        console.log('Using homepage selector:', titleContainer);
    }

    const movieElements = document.querySelectorAll(titleContainer);
    console.log('Movie elements found:', movieElements.length);

    if (movieElements.length === 0) {
        console.warn('No movie elements found with selector:', titleContainer);
        return [];
    }
    
    const titles = Array.from(movieElements)
                        .map(el => el.textContent.trim())
                        .filter(title => !processedMovies.has(title) && title.length > 0); // Filter out processed movies
    console.log('Extracted movie title:', titles);
    return titles;

  }


async function fetchTMDBRating(movieTitle) {
    console.log('Starting to fetch movie data:', movieTitle);
    try {
        const apiKey = 'ce0ed6cdc86b2450dcbcc02987b32b07';
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movieTitle)}`;
        // https://developer.themoviedb.org/docs/search-and-query-for-details
        console.log('API request URL:', url);

        const response = await fetch(url);
        const data = await response.json();
        console.log('API returned data:', data);
        
        if (data.results && data.results.length > 0) {
            const movie = data.results[0];
            console.log('Found movie:', movie.title, ': ', movie.vote_average);
            return {
                id: movie.id,
                rating: movie.vote_average || null,
                title: movie.title
            };
        }

        // If no results found, try with cleaned title
        console.warn('No movie rating data found, trying with cleaned title');
        const cleanedTitle = cleanMovieTitle(movieTitle);

        // Only try with cleaned title if it's different from the original
        if (cleanedTitle !== movieTitle) {
            console.log('Trying with cleaned title:', cleanedTitle);
            const cleanedUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanedTitle)}`;
            const cleanedResponse = await fetch(cleanedUrl);
            const cleanedData = await cleanedResponse.json();
            
            if (cleanedData.results && cleanedData.results.length > 0) {
                const movie = cleanedData.results[0];
                console.log('Found movie with cleaned title:', movie.title, ': ', movie.vote_average);
                return {
                    id: movie.id,
                    rating: movie.vote_average || null,
                    title: movie.title
                };
            }
        }

        console.warn('Could not find movie rating data');
        return null;
    } catch (error) {
        console.error('Error fetching movie ${movieTitle} rating:', error);
        return null;
    }
} 

window.addEventListener('load', async () => {
    console.log('Page loaded, starting to process movie ratings');
    try {
        const movieTitles = extractMovieTitles();
        console.log('All extracted movie titles:', movieTitles);
        
        if (movieTitles.length === 0) {
            console.warn('No movie titles found, script execution stopped');
            return;
        }
        
        // Limit concurrency
        for (const movieTitle of movieTitles) {
            console.log('Starting to process movie:', movieTitle);
            try {
                const rating = await fetchTMDBRating(movieTitle);
                console.log('Movie rating result:', movieTitle, rating);
                if (rating !== null) {
                    displayRatingOnPage(movieTitle, rating);
                    console.log('Rating displayed on page');
                } else {
                    console.warn('Could not get rating, skipping');
                }
            } catch (error) {
                console.error(`Error processing movie ${movieTitle}:`, error);
            }
        }
    } catch (error) {
        console.error('Error during movie rating process:', error);
    }
});

// Display rating on the page
function displayRatingOnPage(movieTitle, movieData) {
    console.log('Preparing to display rating on page:', movieTitle, movieData);

    // Mark this movie as processed
    processedMovies.add(movieTitle);

    // Build TMDB movie page URL
    const tmdbUrl = `https://www.themoviedb.org/movie/${movieData.id}`;

    const movieElements = document.querySelectorAll(titleContainer);
    console.log('Number of potential matching elements found:', movieElements.length);
    
    let found = false;
    movieElements.forEach(element => {
        console.log('Checking element:', element.textContent.trim());
        if (element.textContent.trim() === movieTitle) {
            console.log('atching element found, adding rating');
            found = true;

            // Create rating container
            const ratingContainer = document.createElement('span');
            ratingContainer.className = 'tmdb-rating'; 
            ratingContainer.style.marginLeft = '10px';
            const ratingLink = document.createElement('a');
            ratingLink.href = tmdbUrl;
            ratingLink.textContent = `TMDB: ${movieData.rating.toFixed(1)}/10`;
            ratingLink.style.color = 'red';
            ratingLink.style.textDecoration = 'none';
            ratingLink.style.fontWeight = 'bold';
            ratingLink.target = '_blank'; // open in new tab
            ratingLink.title = `Check out ${movieData.title} on TMDB`;
            
            // Add hover effect
            ratingLink.addEventListener('mouseover', () => {
                ratingLink.style.textDecoration = 'underline';
            });
            ratingLink.addEventListener('mouseout', () => {
                ratingLink.style.textDecoration = 'none';
            });
            
            ratingContainer.appendChild(ratingLink);
            element.appendChild(ratingContainer);
            found = true;
        }
    });
    
    if (!found) {
        console.warn('No matching movie title element found:', movieTitle);
    }
}

// Process newly discovered movies
async function processNewMovies() {
    const movieTitles = extractMovieTitles();
    console.log('Newly discovered movie titles:', movieTitles);
    
    for (const movieTitle of movieTitles) {
        const rating = await fetchTMDBRating(movieTitle);
        if (rating !== null) {
            displayRatingOnPage(movieTitle, rating);
        }
    }
}

// Set up MutationObserver to listen for DOM changes
function setupObserver() {
    console.log('Setting up DOM change observer');
    
    // Throttle function to avoid frequent processing
    let timeout;
    const throttledProcess = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            processNewMovies();
        }, 1000); // 1 second delay to avoid frequent processing
    };
    
    // Create observer instance
    const observer = new MutationObserver((mutations) => {
        console.log('DOM changes detected');
        let shouldProcess = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if nodes potentially containing movie titles were added
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        if (node.querySelector('pre > p') || 
                            node.querySelector('.Poster_filmContainer__fN677') ||
                            node.tagName === 'PRE' ||
                            node.classList.contains('movie-title')) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
            }
            
            if (shouldProcess) break;
        }
        
        if (shouldProcess) {
            console.log('New movie elements detected, processing...');
            throttledProcess();
        }
    });
    
    //  Configure observer options
    const config = { 
        childList: true, // Observe direct children additions or removals
        subtree: true,   // Observe all descendant nodes
        attributes: false // Don't observe attribute changes
    };
    
    // Start observing the entire document
    observer.observe(document.body, config);
    
    console.log('DOM observer started');
}

// Initialization
function init() {
    console.log('Extension initialized');
    // First process movies currently on the page
    processNewMovies();
    // Set up observer to handle newly loaded movies
    setupObserver();
}

// Initialize when the page is fully loaded
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init(); // If page is already loaded, initialize directly
}