var titleContainer = null;

// 保存已处理过的电影标题，避免重复处理
const processedMovies = new Set();

function extractMovieTitles() {
    console.log('开始提取电影标题');
    const currentUrl = window.location.href;
    console.log('当前页面URL:', currentUrl);
    

    // Theatre page
    if (currentUrl.includes("openTM=true")){ 
        titleContainer = "#\\31 -meta-nav > div > div > div > div > div > div.ShowtimesContent_theatreAccordionContainer__5Mfdr > div > div > h2";
        console.log('使用Theatre页面选择器:', titleContainer);
    } else {
        titleContainer = "#homepage_movie_grid > div.MovieGridBlock_posterContainer__lNJp6 > div > div.Poster_filmContainer__fN677 > pre > p";
        console.log('使用主页选择器:', titleContainer);
    }

    const movieElements = document.querySelectorAll(titleContainer);
    console.log('找到的电影元素数量:', movieElements.length);

    if (movieElements.length === 0) {
        console.warn('No movie elements found with selector:', titleContainer);
        return [];
    }
    
    const titles = Array.from(movieElements)
                        .map(el => el.textContent.trim())
                        .filter(title => !processedMovies.has(title) && title.length > 0); // 过滤掉已处理过的电影
    console.log('提取到的电影标题:', titles);
    return titles;

  }


async function fetchTMDBRating(movieTitle) {
    console.log('开始获取电影数据:', movieTitle);
    try {
        const apiKey = 'ce0ed6cdc86b2450dcbcc02987b32b07';
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movieTitle)}`;
        console.log('API请求URL:', url);

        const response = await fetch(url);
        const data = await response.json();
        console.log('API返回数据:', data);
        
        if (data.results && data.results.length > 0) {
            const movie = data.results[0];
            console.log('获取到电影:', movie.title, ': ', movie.vote_average);
            return {
                id: movie.id,
                rating: movie.vote_average || null,
                title: movie.title
            };
        }
        console.warn('未找到电影评分数据');
        return null;
    } catch (error) {
        console.error('Error fetching movie ${movieTitle} rating:', error);
        return null;
    }
} 

window.addEventListener('load', async () => {
    console.log('页面加载完成，开始处理电影评分');
    try {
        const movieTitles = extractMovieTitles();
        console.log('提取到的所有电影标题:', movieTitles);
        
        if (movieTitles.length === 0) {
            console.warn('没有找到任何电影标题，脚本停止执行');
            return;
        }
        
        // 限制并发数
        for (const movieTitle of movieTitles) {
            console.log('开始处理电影:', movieTitle);
            try {
                const rating = await fetchTMDBRating(movieTitle);
                console.log('电影评分获取结果:', movieTitle, rating);
                if (rating !== null) {
                    displayRatingOnPage(movieTitle, rating);
                    console.log('已在页面上显示评分');
                } else {
                    console.warn('未能获取到评分，跳过显示');
                }
            } catch (error) {
                console.error(`处理电影 ${movieTitle} 时出错:`, error);
            }
        }
    } catch (error) {
        console.error('电影评分处理过程中出错:', error);
    }
});

// 在页面上显示评分
function displayRatingOnPage(movieTitle, movieData) {
    console.log('准备在页面上显示评分:', movieTitle, movieData);

    // 标记此电影已处理
    processedMovies.add(movieTitle);

    // 构建TMDB电影页面URL
    const tmdbUrl = `https://www.themoviedb.org/movie/${movieData.id}`;

    const movieElements = document.querySelectorAll(titleContainer);
    console.log('找到的可能匹配元素数量:', movieElements.length);
    
    let found = false;
    movieElements.forEach(element => {
        console.log('检查元素:', element.textContent.trim());
        if (element.textContent.trim() === movieTitle) {
            console.log('找到匹配元素，添加评分');
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
            ratingLink.target = '_blank'; // 在新标签页打开
            ratingLink.title = `查看 ${movieData.title} 在TMDB的详情`;
            
            // 添加鼠标悬停效果
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
        console.warn('未找到匹配的电影标题元素:', movieTitle);
    }
}

// 处理新发现的电影
async function processNewMovies() {
    const movieTitles = extractMovieTitles();
    console.log('新发现的电影标题:', movieTitles);
    
    for (const movieTitle of movieTitles) {
        const rating = await fetchTMDBRating(movieTitle);
        if (rating !== null) {
            displayRatingOnPage(movieTitle, rating);
        }
    }
}

// 设置MutationObserver监听DOM变化
function setupObserver() {
    console.log('设置DOM变化观察器');
    
    // 节流函数，避免频繁处理
    let timeout;
    const throttledProcess = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            processNewMovies();
        }, 1000); // 1秒延迟，避免频繁处理
    };
    
    // 创建观察器实例
    const observer = new MutationObserver((mutations) => {
        console.log('检测到DOM变化');
        let shouldProcess = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 检查是否添加了可能包含电影标题的节点
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // 元素节点
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
            console.log('检测到新的电影元素，处理中...');
            throttledProcess();
        }
    });
    
    // 配置观察选项
    const config = { 
        childList: true, // 观察直接子节点的添加或删除
        subtree: true,   // 观察所有后代节点
        attributes: false // 不观察属性变化
    };
    
    // 开始观察整个文档
    observer.observe(document.body, config);
    
    console.log('DOM观察器已启动');
}

// 初始化函数
function init() {
    console.log('扩展初始化');
    // 首次处理当前页面上的电影
    processNewMovies();
    // 设置观察器以处理新加载的电影
    setupObserver();
}

// 当页面加载完成后初始化
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init(); // 如果页面已加载完成则直接初始化
}