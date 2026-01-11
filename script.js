// ========================================
// RETRO FOOTBALL AUCTIONEER - MAIN SCRIPT
// Game Logic, Stat Generation & Bid Calculator
// ========================================

class RetroAuctioneer {
    constructor() {
        this.usedPlayers = new Set();
        this.playersShown = 0;
        this.audioContext = null;
        this.selectedClubs = new Set(); // Track selected clubs
        this.initElements();
        this.initClubFilters(); // Generate club checkboxes
        this.initEventListeners();
        this.updateStats();
    }

    initElements() {
        this.eraFilter = document.getElementById('era-filter');
        this.leagueFilter = document.getElementById('league-filter');
        this.positionFilter = document.getElementById('position-filter');
        this.tierFilter = document.getElementById('tier-filter');
        this.clubFiltersContainer = document.getElementById('club-filters-container');
        this.budgetInput = document.getElementById('budget-input');
        this.playerDisplay = document.getElementById('player-display');
        this.nextPlayerBtn = document.getElementById('next-player-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.playersShownEl = document.getElementById('players-shown');
        this.playersRemainingEl = document.getElementById('players-remaining');
    }

    initClubFilters() {
        // Extract all unique clubs and sort alphabetically
        const clubs = [...new Set(PLAYERS_DATABASE.map(p => p.club))].sort();

        this.clubFiltersContainer.innerHTML = '';

        clubs.forEach(club => {
            const label = document.createElement('label');
            label.className = 'club-checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = club;

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedClubs.add(e.target.value);
                } else {
                    this.selectedClubs.delete(e.target.value);
                }
                this.updateStats();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(club));
            this.clubFiltersContainer.appendChild(label);
        });
    }

    initEventListeners() {
        this.nextPlayerBtn.addEventListener('click', () => this.showNextPlayer());
        this.resetBtn.addEventListener('click', () => this.resetSession());

        [this.eraFilter, this.leagueFilter, this.positionFilter, this.tierFilter].forEach(el => {
            el.addEventListener('change', () => this.updateStats());
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.showNextPlayer();
            }
        });
    }

    getFilteredPlayers() {
        const era = this.eraFilter.value;
        const league = this.leagueFilter.value;
        const position = this.positionFilter.value;
        const tier = this.tierFilter.value;

        // Position Mapping
        const posMap = {
            'GK': ['GK'],
            'DEF': ['CB', 'LB', 'RB', 'LWB', 'RWB'],
            'MID': ['CDM', 'CM', 'CAM', 'RM', 'LM'],
            'FWD': ['ST', 'CF', 'RW', 'LW', 'SS']
        };

        return PLAYERS_DATABASE.filter(player => {
            if (era !== 'all' && player.era !== era) return false;
            if (league !== 'all' && player.league !== league) return false;

            // Check position against mapping
            if (position !== 'all') {
                const allowedPositions = posMap[position] || [];
                if (!allowedPositions.includes(player.position)) return false;
            }

            if (tier !== 'all' && player.tier !== tier) return false;

            // CLUB FILTER (Multi-select)
            if (this.selectedClubs.size > 0 && !this.selectedClubs.has(player.club)) {
                return false;
            }

            if (this.usedPlayers.has(player.name)) return false;
            return true;
        });
    }

    updateStats() {
        const available = this.getFilteredPlayers();
        this.playersShownEl.textContent = this.playersShown;
        this.playersRemainingEl.textContent = available.length;
    }

    calculateBaseBid(tier, budget) {
        const ranges = {
            'S': { min: 0.20, max: 0.35 },
            'A': { min: 0.12, max: 0.20 },
            'B': { min: 0.06, max: 0.12 },
            'C': { min: 0.02, max: 0.06 }
        };

        const range = ranges[tier] || ranges['C'];
        const multiplier = range.min + Math.random() * (range.max - range.min);
        const bid = budget * multiplier;

        return bid.toFixed(2);
    }

    // Procedural Stat Generator based on Position and Tier
    generateStats(position, tier) {
        const base = {
            'S': { min: 85, max: 95 },
            'A': { min: 80, max: 88 },
            'B': { min: 75, max: 82 },
            'C': { min: 70, max: 78 }
        }[tier];

        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const val = () => rand(base.min, base.max);

        // Stats template: PAC, SHO, PAS, DRI, DEF, PHY
        let stats = { PAC: val(), SHO: val(), PAS: val(), DRI: val(), DEF: val(), PHY: val() };

        // Adjust based on detailed position
        if (['ST', 'CF', 'SS'].includes(position)) {
            stats.SHO += rand(3, 5);
            stats.DEF -= rand(30, 40);
            stats.PAC += rand(1, 4);
        } else if (['RW', 'LW', 'RM', 'LM'].includes(position)) {
            stats.PAC += rand(4, 7);
            stats.DRI += rand(3, 6);
            stats.DEF -= rand(20, 30);
        } else if (['CAM', 'CM'].includes(position)) {
            stats.PAS += rand(4, 7);
            stats.DRI += rand(2, 5);
            stats.DEF -= rand(10, 20);
        } else if (['CDM'].includes(position)) {
            stats.DEF += rand(3, 6);
            stats.PHY += rand(3, 6);
            stats.SHO -= rand(10, 20);
        } else if (['CB'].includes(position)) {
            stats.DEF += rand(5, 8);
            stats.PHY += rand(5, 8);
            stats.SHO -= rand(30, 40);
            stats.DRI -= rand(20, 30);
            stats.PAC -= rand(5, 10);
        } else if (['LB', 'RB', 'LWB', 'RWB'].includes(position)) {
            stats.PAC += rand(3, 6);
            stats.DEF += rand(2, 5);
            stats.SHO -= rand(20, 30);
        } else if (position === 'GK') {
            stats = { DIV: val(), HAN: val(), KIC: val(), REF: val(), SPE: rand(30, 50), POS: val() };
            return stats;
        }

        // Clamp values between 40 and 99
        Object.keys(stats).forEach(k => {
            if (stats[k] > 99) stats[k] = 99;
            if (stats[k] < 40) stats[k] = 40;
        });

        return stats;
    }

    playBeep() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Lower frequency for more "tech" sound
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
        } catch (e) {
            console.log('Audio not available');
        }
    }

    renderPlayerCard(player, baseBid, stats) {
        // Construct the detailed view
        // Generate stats HTML
        let statsHtml = '';
        if (player.position === 'GK') {
            statsHtml = `
             <div class="stats-grid">
                <div class="stat-box"><span class="stat-label">DIV</span><span class="stat-val">${stats.DIV}</span></div>
                <div class="stat-box"><span class="stat-label">HAN</span><span class="stat-val">${stats.HAN}</span></div>
                <div class="stat-box"><span class="stat-label">KIC</span><span class="stat-val">${stats.KIC}</span></div>
                <div class="stat-box"><span class="stat-label">REF</span><span class="stat-val">${stats.REF}</span></div>
                <div class="stat-box"><span class="stat-label">SPE</span><span class="stat-val">${stats.SPE}</span></div>
                <div class="stat-box"><span class="stat-label">POS</span><span class="stat-val">${stats.POS}</span></div>
             </div>`;
        } else {
            statsHtml = `
            <div class="stats-grid">
               <div class="stat-box"><span class="stat-label">PAC</span><span class="stat-val">${stats.PAC}</span></div>
               <div class="stat-box"><span class="stat-label">SHO</span><span class="stat-val">${stats.SHO}</span></div>
               <div class="stat-box"><span class="stat-label">PAS</span><span class="stat-val">${stats.PAS}</span></div>
               <div class="stat-box"><span class="stat-label">DRI</span><span class="stat-val">${stats.DRI}</span></div>
               <div class="stat-box"><span class="stat-label">DEF</span><span class="stat-val">${stats.DEF}</span></div>
               <div class="stat-box"><span class="stat-label">PHY</span><span class="stat-val">${stats.PHY}</span></div>
            </div>`;
        }

        const html = `
            <div class="card-header">
                <div class="header-top">
                    <div class="classification">CONFIDENTIAL // TOP SECRET</div>
                    <div class="barcode">||| || ||| | ||||</div>
                </div>
                <div class="player-name">${player.name}</div>
                <div class="player-meta">${player.position} | ${player.age} YRS | ${player.nationality || 'INTL'}</div> 
            </div>
            
            <div class="card-body">
                <div class="tier-stamp tier-${player.tier.toLowerCase()}">${player.tier}</div>
                
                <div class="info-grid">
                    <div class="info-row"><span class="label">CLUB</span> <span class="value">${player.club}</span></div>
                    <div class="info-row"><span class="label">LEAGUE</span> <span class="value">${player.league}</span></div>
                    <div class="info-row"><span class="label">ERA</span> <span class="value">${player.era.toUpperCase()}</span></div>
                </div>
                
                <div class="stats-container">
                    <div class="stats-header">PERFORMANCE METRICS</div>
                    ${statsHtml}
                </div>

                <div class="market-section">
                    <span class="label">MARKET VALUE</span>
                    <div class="market-value">$${player.marketValue}M</div>
                </div>
            </div>

            <div class="card-footer">
                <div class="bid-label">BASE BID</div>
                <div class="bid-value">$${baseBid}M</div>
                <div class="footer-note">* SUBJECT TO AUCTION HOUSE APPROVAL *</div>
            </div>
        `;

        this.playerDisplay.innerHTML = html;
        this.playerDisplay.classList.remove('typing');
        void this.playerDisplay.offsetWidth; // trigger reflow
        this.playerDisplay.classList.add('typing');
    }

    getTierLabel(tier) {
        const labels = { 'S': 'ICON', 'A': 'STAR', 'B': 'PRO', 'C': 'ROOKIE' };
        return labels[tier] || '';
    }

    showNextPlayer() {
        this.playBeep();
        const availablePlayers = this.getFilteredPlayers();

        if (availablePlayers.length === 0) {
            this.playerDisplay.innerHTML = `
                <div class="empty-state">
                    NO PLAYERS FOUND matching criteria.<br>
                    Adjust filters via terminal above.
                </div>
            `;
            return;
        }

        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const player = availablePlayers[randomIndex];

        this.usedPlayers.add(player.name);
        this.playersShown++;

        const budget = parseFloat(this.budgetInput.value) || 100;
        const baseBid = this.calculateBaseBid(player.tier, budget);
        const stats = this.generateStats(player.position, player.tier);

        this.renderPlayerCard(player, baseBid, stats);
        this.updateStats();
    }

    resetSession() {
        this.usedPlayers.clear();
        this.playersShown = 0;
        this.playerDisplay.innerHTML = `
            <div class="startup-screen">
                <div class="system-msg">SYSTEM READY...</div>
                <div class="system-msg">AWAITING INPUT</div>
                <div class="blink-cursor">_</div>
            </div>
        `;
        this.selectedClubs.clear();
        this.initClubFilters(); // Re-render to clear checkboxes
        this.updateStats();
        this.playBeep();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auctioneer = new RetroAuctioneer();
});
