let allUsers = [];
let allPosts = [];
let currentTab = 'general';
let searchQuery = '';
let currentPage = 1;
const itemsPerPage = 20;

async function loadData() {
    const listElement = document.getElementById('leaderboard-list');
    const headerElement = document.getElementById('table-header');
    const containerElement = document.querySelector('.leaderboard-container');
    const paginationElement = document.getElementById('pagination');
    const modal = document.getElementById('user-modal');
    const closeBtn = document.querySelector('.close-modal');
    const searchInput = document.getElementById('search-input');

    // Info Modal elements
    const infoModal = document.getElementById('info-modal');
    const infoBtn = document.getElementById('points-info-btn');
    const closeInfoBtn = document.querySelector('.close-info-modal');

    try {
        const [statsRes, postsRes] = await Promise.all([
            fetch('user_stats.json'),
            fetch('posts.json')
        ]);

        const users = await statsRes.json();
        allPosts = await postsRes.json();

        allUsers = users.map(user => {
            // Discord data
            let discordPoints = 0;
            let favoriteChannel = 'N/A';
            let totalMessages = 0;

            if (user.message_count) {
                const channels = Object.entries(user.message_count);
                totalMessages = channels.reduce((sum, [_, count]) => sum + count, 0);
                discordPoints = totalMessages;

                if (channels.length > 0) {
                    favoriteChannel = channels.reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0];
                    // Keep the emoji/prefix
                }
            }

            // Twitter data
            const userPosts = allPosts.filter(p => {
                const matchByDiscord = p.discord_name === user.user_name;
                const matchByTwitter = user.twitter_name && user.twitter_name !== 'null' && user.twitter_name !== 'i' && p.twitter_name === user.twitter_name;
                return matchByDiscord || matchByTwitter;
            });

            const twitterStats = {
                post: userPosts.filter(p => p.type === 'post').length,
                quote: userPosts.filter(p => p.type === 'quote').length,
                like: userPosts.reduce((s, p) => s + (p.metrics?.like || 0), 0),
                reply: userPosts.reduce((s, p) => s + (p.metrics?.reply || 0), 0),
                retweet: userPosts.reduce((s, p) => s + (p.metrics?.ретвит || 0), 0),
                quote_metrics: userPosts.reduce((s, p) => s + (p.metrics?.цитата || 0), 0),
                views: userPosts.reduce((s, p) => s + (p.metrics?.посмотры || 0), 0)
            };

            const rtPlusQuotes = twitterStats.retweet + twitterStats.quote_metrics;
            const twitterPoints =
                twitterStats.post * 100 +
                twitterStats.quote * 50 +
                twitterStats.like * 10 +
                twitterStats.reply * 20 +
                (rtPlusQuotes) * 50 +
                twitterStats.views * 2;

            return {
                ...user,
                discordPoints,
                twitterPoints,
                totalPoints: discordPoints + twitterPoints,
                totalMessages,
                favoriteChannel,
                rtPlusQuotes,
                twitterStats,
                userPosts
            };
        });

        function formatTwitterDate(dateStr) {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            } catch (e) {
                return dateStr;
            }
        }

        function formatChannelName(name) {
            if (!name || name === 'N/A') return name;
            return name.replace('╏', ' ');
        }

        function updateHeader(tab) {
            headerElement.className = 'table-header';
            const gridClass = tab === 'general' ? 'grid-general' : (tab === 'discord' ? 'grid-discord' : 'grid-twitter');
            headerElement.classList.add(gridClass);

            if (tab === 'general') {
                headerElement.innerHTML = `
                    <div>Rank</div>
                    <div style="text-align: left">User</div>
                    <div>Posts</div>
                    <div>Likes</div>
                    <div>Replies</div>
                    <div>RT + Q</div>
                    <div>Views</div>
                    <div>Msg</div>
                    <div>Fav</div>
                    <div>Total</div>
                `;
            } else if (tab === 'discord') {
                headerElement.innerHTML = `
                    <div>Rank</div>
                    <div style="text-align: left">User</div>
                    <div>Msg Count</div>
                    <div>Favorite Channel</div>
                    <div>DS PTS</div>
                    <div>Total Pts</div>
                `;
            } else if (tab === 'twitter') {
                headerElement.innerHTML = `
                    <div>Rank</div>
                    <div style="text-align: left">User</div>
                    <div>Posts</div>
                    <div>Likes</div>
                    <div>Replies</div>
                    <div>RT + Q</div>
                    <div>Views</div>
                    <div>X PTS</div>
                `;
            }
        }

        function renderRow(user, absoluteIndex, tab) {
            const rank = user.tempRank || absoluteIndex + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            // Animation delay based on position in current page for snappy feel
            const animIndex = absoluteIndex % itemsPerPage;
            const animDelay = Math.min(animIndex * 0.04, 0.8);
            const gridClass = tab === 'general' ? 'grid-general' : (tab === 'discord' ? 'grid-discord' : 'grid-twitter');

            const ts = user.twitterStats;
            let statsHtml = '';

            if (tab === 'general') {
                statsHtml = `
                    <div class="stat-value">${ts.post + ts.quote}</div>
                    <div class="stat-value">${ts.like}</div>
                    <div class="stat-value">${ts.reply}</div>
                    <div class="stat-value">${user.rtPlusQuotes}</div>
                    <div class="stat-value">${ts.views.toLocaleString()}</div>
                    <div class="stat-value">${user.totalMessages.toLocaleString()}</div>
                    <div class="stat-value" title="${user.favoriteChannel}">${formatChannelName(user.favoriteChannel).substring(0, 10)}..</div>
                    <div class="stat-value points-value">${user.totalPoints.toLocaleString()}</div>
                `;
            } else if (tab === 'discord') {
                statsHtml = `
                    <div class="stat-value">${user.totalMessages.toLocaleString()}</div>
                    <div class="stat-value">${formatChannelName(user.favoriteChannel)}</div>
                    <div class="stat-value stat-dim">${user.discordPoints.toLocaleString()}</div>
                    <div class="stat-value points-value">${user.totalPoints.toLocaleString()}</div>
                `;
            } else {
                statsHtml = `
                    <div class="stat-value">${ts.post + ts.quote}</div>
                    <div class="stat-value">${ts.like}</div>
                    <div class="stat-value">${ts.reply}</div>
                    <div class="stat-value">${user.rtPlusQuotes}</div>
                    <div class="stat-value">${ts.views.toLocaleString()}</div>
                    <div class="stat-value points-value">${user.twitterPoints.toLocaleString()}</div>
                `;
            }

            return `
                <div class="user-row ${gridClass}" style="animation: fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${animDelay}s both" onclick="showProfile('${user.id}')">
                    <div class="rank ${rankClass}">#${rank}</div>
                    <div class="user-info">
                        <img src="${user.pfp || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}" alt="" class="pfp">
                        <div class="usernames">
                            <span class="discord-name">${user.user_name}</span>
                            ${user.twitter_name && user.twitter_name !== 'null' ?
                    `<a href="https://x.com/${user.twitter_name}" target="_blank" class="twitter-name" onclick="event.stopPropagation()">@${user.twitter_name}</a>` :
                    ''}
                        </div>
                    </div>
                    ${statsHtml}
                </div>
            `;
        }

        function render() {
            updateHeader(currentTab);

            // 1. Sort ALL users by current tab criteria first
            let sortedAll = [...allUsers];
            if (currentTab === 'general') {
                sortedAll.sort((a, b) => b.totalPoints - a.totalPoints);
            } else if (currentTab === 'discord') {
                sortedAll.sort((a, b) => b.discordPoints - a.discordPoints);
            } else {
                sortedAll.sort((a, b) => b.twitterPoints - a.twitterPoints);
            }

            // 2. Assign temporary absolute rank based on this tab's sorting
            sortedAll.forEach((u, idx) => {
                u.tempRank = idx + 1;
            });

            // 3. Filter the ranked list
            let filtered = sortedAll.filter(u => u.user_name.toLowerCase().includes(searchQuery.toLowerCase()));

            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            // Adjust current page if out of bounds
            if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const startIndex = (currentPage - 1) * itemsPerPage;
            const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);

            if (totalItems === 0) {
                listElement.innerHTML = `<div style="padding: 4rem; text-align: center; color: var(--text-dim);">No users found</div>`;
                paginationElement.innerHTML = '';
            } else {
                listElement.innerHTML = pageItems.map((u, i) => renderRow(u, startIndex + i, currentTab)).join('');

                // Render Pagination
                paginationElement.innerHTML = `
                    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} id="prev-btn">Previous</button>
                    <span class="page-info">Page ${currentPage} of ${totalPages}</span>
                    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} id="next-btn">Next</button>
                `;

                document.getElementById('prev-btn')?.addEventListener('click', () => {
                    currentPage--;
                    render();
                    listElement.scrollTop = 0;
                });
                document.getElementById('next-btn')?.addEventListener('click', () => {
                    currentPage++;
                    render();
                    listElement.scrollTop = 0;
                });
            }
        }

        window.showProfile = (userId) => {
            const user = allUsers.find(u => u.id === userId);
            const modalBody = document.getElementById('modal-body');
            const ts = user.twitterStats;

            modalBody.innerHTML = `
                <div class="profile-layout">
                    <aside class="profile-sidebar">
                        <img src="${user.pfp}" class="profile-pfp">
                        <div class="profile-meta">
                            <h2 class="profile-username">${user.user_name}</h2>
                            ${user.twitter_name && user.twitter_name !== 'null' ? `<a href="https://x.com/${user.twitter_name}" target="_blank" class="profile-twitter-link">@${user.twitter_name}</a>` : ''}
                        </div>
                        
                        <div class="side-stats-grid">
                            <div class="mini-stat">
                                <span class="mini-label">Total Pts</span>
                                <span class="mini-num" style="color: var(--primary-bright)">${user.totalPoints.toLocaleString()}</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-label">Rank</span>
                                <span class="mini-num">#${user.tempRank || 'N/A'}</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-label">Discord</span>
                                <span class="mini-num">${user.totalMessages.toLocaleString()}</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-label">X Posts</span>
                                <span class="mini-num">${ts.post + ts.quote}</span>
                            </div>
                        </div>

                        <div class="discord-activity-panel">
                            <h3 class="panel-title">Channels</h3>
                            <div class="channel-list">
                                ${Object.entries(user.message_count || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => `
                                    <div class="channel-item">
                                        <span class="channel-name">${formatChannelName(name)}</span>
                                        <span class="channel-count">${count}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </aside>

                    <main class="profile-main">
                        <h3 class="feed-title">Latest X Activity</h3>
                        <div class="posts-grid">
                            ${user.userPosts.length > 0 ? user.userPosts.slice(0, 50).map(post => `
                                <a href="${post.tweet_url}" target="_blank" class="post-card">
                                    <div class="post-header">
                                        <span class="post-type">${post.type.toUpperCase()}</span>
                                        <span class="post-date">${formatTwitterDate(post.created_at)}</span>
                                    </div>
                                    <p class="post-text">${post.text}</p>
                                    ${post.image ? `<img src="${post.image}" class="post-img" loading="lazy">` : ''}
                                    <div class="post-metrics">
                                        <span class="metric-item">❤️ ${post.metrics?.like || 0}</span>
                                        <span class="metric-item">💬 ${post.metrics?.reply || 0}</span>
                                        <span class="metric-item">🔄 ${(post.metrics?.ретвит || 0) + (post.metrics?.цитата || 0)}</span>
                                        <span class="metric-item">👁️ ${post.metrics?.посмотры || 0}</span>
                                    </div>
                                </a>
                            `).join('') : '<p style="color: var(--text-dim); text-align: center; padding: 4rem; grid-column: 1/-1;">No X data found.</p>'}
                        </div>
                    </main>
                </div>
            `;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        closeBtn.onclick = () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
            if (event.target == infoModal) {
                infoModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        };

        infoBtn.onclick = () => {
            infoModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        closeInfoBtn.onclick = () => {
            infoModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1; // Reset to page 1 on search
            render();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                currentPage = 1; // Reset to page 1 on tab change
                render();
            });
        });

        render();

    } catch (error) {
        console.error('Error loading data:', error);
        listElement.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ff4c4c;">Error loading data.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadData);
