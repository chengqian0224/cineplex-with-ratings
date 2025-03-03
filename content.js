var titleSelector = null;

// Save processed movie titles
const processedMovies = new Set();

// Clean movie title when needed
function cleanMovieTitle(title) {
    // Remove suffixes that look like "(*** e.s.t.)"
    return title.replace(/\s*\([^)]*e\.s\.t\.\)\s*$/i, '');
}

function extractMovieTitles() {
    const currentUrl = window.location.href;
    
    // Set appropriate selector based on page type
    if (currentUrl.includes("openTM=true")){ 
        // Theatre page
        titleSelector = ".MovieDetails_movieInfoWrapper__oGmlx > h3";
    } else if (currentUrl.includes("search?q=")){
        // Search Page
        titleSelector = ".Movie_movieDetails__c0c_c > h3";
    } else {
        // Other pages including homepage
        titleSelector = ".Poster_filmContainer__fN677 > pre > p";
    }

    const movieElements = document.querySelectorAll(titleSelector);

    if (movieElements.length === 0) {
        console.warn('No movie elements found with selector:', titleSelector);
        return [];
    }
    
    return Array.from(movieElements)
                        .map(el => el.textContent.trim())
                        .filter(title => !processedMovies.has(title) && title.length > 0); // Filter out processed movies
  }

async function fetchTMDBRating(movieTitle) {
    console.log('Fetching data for:', movieTitle);
    try {
        const apiKey = 'ce0ed6cdc86b2450dcbcc02987b32b07';
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movieTitle)}`;
        // https://developer.themoviedb.org/docs/search-and-query-for-details

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const movie = data.results[0];
            console.log('Found movie:', movie.title, 'with rating:', movie.vote_average);
            return {
                id: movie.id,
                rating: movie.vote_average || null,
                title: movie.title
            };
        }
        
        // If no results found, try with cleaned title
        console.log('No results found, trying with cleaned title');
        const cleanedTitle = cleanMovieTitle(movieTitle);
        
        // Only try with cleaned title if it's different from the original
        if (cleanedTitle !== movieTitle) {
            console.log('Using cleaned title for second attempt:', cleanedTitle);
            const cleanedUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanedTitle)}`;
            console.log('Second attempt API URL:', cleanedUrl);
            
            const cleanedResponse = await fetch(cleanedUrl);
            const cleanedData = await cleanedResponse.json();
            
            if (cleanedData.results && cleanedData.results.length > 0) {
                const movie = cleanedData.results[0];
                console.log('Found movie with cleaned title:', movie.title, 'with rating:', movie.vote_average);
                return {
                    id: movie.id,
                    rating: movie.vote_average || null,
                    title: movie.title
                };
            }
        } else {
            console.log('Cleaned title is same as original, skipping second attempt');
        }
        
        console.warn('No movie data found for:', movieTitle);
        return null;
    } catch (error) {
        console.error(`Error fetching movie ${movieTitle} rating:`, error);
        return null;
    }
}

async function processMovie(movieTitle) {
    if (processedMovies.has(movieTitle)) return;
    
    try {
        const rating = await fetchTMDBRating(movieTitle);
        if (rating) {
            displayRatingOnPage(movieTitle, rating);
        }
    } catch (error) {
        console.error(`Error processing movie ${movieTitle}:`, error);
    }
}

function displayRatingOnPage(movieTitle, movieData) {
    // Mark this movie as processed
    processedMovies.add(movieTitle);

    // Build TMDB movie page URL
    const tmdbUrl = `https://www.themoviedb.org/movie/${movieData.id}`;

    const movieElements = document.querySelectorAll(titleSelector);
    
    for (const element of movieElements) {
        if (element.textContent.trim() === movieTitle) {
            // Create rating container
            const ratingContainer = document.createElement('span');
            ratingContainer.className = 'tmdb-rating'; 
            ratingContainer.style.marginLeft = '10px';

            const ratingLink = document.createElement('a');
            ratingLink.href = tmdbUrl;
            ratingLink.textContent = `${movieData.rating.toFixed(1)}`;
            ratingLink.style.color = 'rgb(20, 182, 220)';
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
            return; // Exit once found
        }
    }

    console.warn('No matching movie title element found:', movieTitle);
}

// Process all movies on the page
async function processMovies() {
    const movieTitles = extractMovieTitles();
    
    if (movieTitles.length === 0) return;
    
    // Process movies sequentially to avoid hitting API rate limits
    for (const movieTitle of movieTitles) {
        await processMovie(movieTitle);
    }
}

// Set up MutationObserver with debouncing
function setupObserver() {
    let debounceTimer;
    
    // Film container selectors that indicate new movies have loaded
    const relevantSelectors = [
        '.MovieDetails_movieInfoWrapper__oGmlx',
        '.Movie_movieDetails__c0c_c',
        '.Poster_filmContainer__fN677'
    ];
    
    const observer = new MutationObserver((mutations) => {
        // Check if any relevant nodes were added
        const hasRelevantChanges = mutations.some(mutation => 
            mutation.type === 'childList' && 
            Array.from(mutation.addedNodes).some(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                
                // Check if this node or its children match our selectors
                return relevantSelectors.some(selector => 
                    node.matches?.(selector) || node.querySelector?.(selector)
                ) || node.tagName === 'PRE';
            })
        );
        
        if (hasRelevantChanges) {
            // Debounce to avoid multiple rapid calls
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(processMovies, 500);
        }
    });
    
    // Start observing
    observer.observe(document.body, { 
        childList: true,
        subtree: true,
        attributes: false
    });
}

// Initialization
function init() {
    processMovies();
    setupObserver();
}

// Initialize when ready
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init();
}