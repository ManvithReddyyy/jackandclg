// ========================================
// MULTIPLAYER AUCTION GAME - TIMER-BASED BIDDING
// Game Logic, Player Management & Timer System
// ========================================

class MultiplayerAuctioneer {
    constructor() {
        this.usedPlayers = new Set();
        this.playersShown = 0;
        this.audioContext = null;
        this.selectedClubs = new Set();
        this.gamePlayers = []; // Array of {id, name, budget, items: []}
        this.currentItem = null; // Currently displayed football player
        this.playerIdCounter = 0;
        this.currentBids = []; // Array of {playerId, playerName, amount, timestamp}

        // Timer system
        this.currentPlayerIndex = 0;
        this.timeRemaining = 20;
        this.timerInterval = null;
        this.isPaused = false;

        this.initElements();
        this.initClubFilters();
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
        this.soldBtn = document.getElementById('sold-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.playersShownEl = document.getElementById('players-shown');
        this.playersRemainingEl = document.getElementById('players-remaining');

        // Multiplayer elements
        this.playerNameInput = document.getElementById('player-name-input');
        this.addPlayerBtn = document.getElementById('add-player-btn');
        this.playersList = document.getElementById('players-list');

        // Modal elements
        this.saleModal = document.getElementById('sale-modal');
        this.salePriceInput = document.getElementById('sale-price');
        this.buyerSelect = document.getElementById('buyer-select');
        this.saleError = document.getElementById('sale-error');
        this.confirmSaleBtn = document.getElementById('confirm-sale-btn');
        this.cancelSaleBtn = document.getElementById('cancel-sale-btn');
        this.closeModalBtn = document.querySelector('.close-modal');

        // Timer-based bidding elements
        this.biddingSection = document.getElementById('bidding-section');
        this.currentBidAmount = document.getElementById('current-bid-amount');
        this.currentBidLeader = document.getElementById('current-bid-leader');
        this.baseBidDisplay = document.getElementById('base-bid-display');
        this.bidHistoryList = document.getElementById('bid-history-list');
        this.currentBidderName = document.getElementById('current-bidder-name');
        this.timerValue = document.getElementById('timer-value');
        this.timerProgress = document.getElementById('timer-progress');
        this.bidSlider = document.getElementById('bid-slider');
        this.sliderBidAmount = document.getElementById('slider-bid-amount');
        this.sliderPlayerBudget = document.getElementById('slider-player-budget');
        this.placeBidBtn = document.getElementById('place-bid-btn');
        this.passTurnBtn = document.getElementById('pass-turn-btn');
        this.pauseAuctionBtn = document.getElementById('pause-auction-btn');
    }

    initClubFilters() {
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
        this.soldBtn.addEventListener('click', () => this.sellToHighestBidder());
        this.resetBtn.addEventListener('click', () => this.resetSession());
        this.addPlayerBtn.addEventListener('click', () => this.addPlayer());

        // Timer-based bidding controls
        this.placeBidBtn.addEventListener('click', () => this.placeBid());
        this.passTurnBtn.addEventListener('click', () => this.passTurn());
        this.pauseAuctionBtn.addEventListener('click', () => this.togglePause());

        // Slider input
        this.bidSlider.addEventListener('input', () => this.updateSliderDisplay());

        // Enter key to add player
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addPlayer();
            }
        });

        [this.eraFilter, this.leagueFilter, this.positionFilter, this.tierFilter].forEach(el => {
            el.addEventListener('change', () => this.updateStats());
        });

        // Modal events
        this.confirmSaleBtn.addEventListener('click', () => this.confirmSale());
        this.cancelSaleBtn.addEventListener('click', () => this.closeSaleModal());
        this.closeModalBtn.addEventListener('click', () => this.closeSaleModal());

        window.addEventListener('click', (e) => {
            if (e.target === this.saleModal) {
                this.closeSaleModal();
            }
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'Enter') &&
                e.target.tagName !== 'INPUT' &&
                e.target.tagName !== 'SELECT' &&
                !this.saleModal.style.display) {
                e.preventDefault();
                this.showNextPlayer();
            }
        });
    }

    addPlayer() {
        const name = this.playerNameInput.value.trim();

        if (!name) {
            alert('Please enter a player name');
            return;
        }

        if (this.gamePlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('A player with this name already exists');
            return;
        }

        const startingBudget = parseFloat(this.budgetInput.value) || 100;

        const player = {
            id: this.playerIdCounter++,
            name: name,
            budget: startingBudget,
            items: []
        };

        this.gamePlayers.push(player);
        this.playerNameInput.value = '';
        this.renderPlayers();
        this.playBeep();
    }

    removePlayer(playerId) {
        const playerIndex = this.gamePlayers.findIndex(p => p.id === playerId);
        if (playerIndex > -1) {
            const playerName = this.gamePlayers[playerIndex].name;
            if (confirm(`Remove ${playerName} from the game?`)) {
                this.gamePlayers.splice(playerIndex, 1);
                this.renderPlayers();
                this.playBeep();
            }
        }
    }

    renderPlayers() {
        if (this.gamePlayers.length === 0) {
            this.playersList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No players added yet</div>';
            return;
        }

        this.playersList.innerHTML = this.gamePlayers.map(player => `
            <div class="player-card">
                <div class="player-card-header">
                    <div class="player-card-name">${this.escapeHtml(player.name)}</div>
                    <button class="remove-player-btn" onclick="window.auctioneer.removePlayer(${player.id})">×</button>
                </div>
                <div class="player-card-budget">💰 $${player.budget.toFixed(1)}M</div>
                <div class="player-card-items">📦 Items: ${player.items.length}</div>
                ${player.items.length > 0 ? `
                    <div class="player-inventory">
                        ${player.items.map(item => `
                            <div class="inventory-item">${this.escapeHtml(item.name)} - $${item.price}M</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // TIMER SYSTEM
    startTimer() {
        this.stopTimer();
        this.timeRemaining = 20;
        this.isPaused = false;
        this.pauseAuctionBtn.textContent = 'PAUSE';
        this.pauseAuctionBtn.classList.remove('paused');

        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timeRemaining--;
                this.updateTimerDisplay();

                if (this.timeRemaining <= 0) {
                    this.passTurn();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.pauseAuctionBtn.textContent = 'RESUME';
            this.pauseAuctionBtn.classList.add('paused');
        } else {
            this.pauseAuctionBtn.textContent = 'PAUSE';
            this.pauseAuctionBtn.classList.remove('paused');
        }
        this.playBeep();
    }

    updateTimerDisplay() {
        this.timerValue.textContent = this.timeRemaining;
        const percentage = (this.timeRemaining / 20) * 100;
        this.timerProgress.style.width = `${percentage}%`;

        if (this.timeRemaining <= 5) {
            this.timerValue.classList.add('warning');
            this.timerProgress.classList.add('warning');
        } else {
            this.timerValue.classList.remove('warning');
            this.timerProgress.classList.remove('warning');
        }
    }

    setCurrentPlayer() {
        if (this.gamePlayers.length === 0) return;

        const currentPlayer = this.gamePlayers[this.currentPlayerIndex];
        this.currentBidderName.textContent = currentPlayer.name;

        // Update slider range
        const baseBid = parseFloat(this.baseBidDisplay.textContent);
        const highestBid = this.getHighestBid();
        const minBid = highestBid ? highestBid.amount : baseBid;

        this.bidSlider.min = minBid;
        this.bidSlider.max = currentPlayer.budget;
        this.bidSlider.value = minBid;
        this.sliderPlayerBudget.textContent = currentPlayer.budget.toFixed(1);
        this.updateSliderDisplay();
    }

    updateSliderDisplay() {
        const bidAmount = parseFloat(this.bidSlider.value);
        this.sliderBidAmount.textContent = bidAmount.toFixed(1);
    }

    placeBid() {
        if (this.gamePlayers.length === 0) return;

        const currentPlayer = this.gamePlayers[this.currentPlayerIndex];
        const bidAmount = parseFloat(this.bidSlider.value);

        // Validation
        const highestBid = this.getHighestBid();
        const minBid = highestBid ? highestBid.amount : parseFloat(this.baseBidDisplay.textContent);

        if (bidAmount < minBid) {
            alert(`Bid must be at least $${minBid.toFixed(1)}M`);
            return;
        }

        if (bidAmount > currentPlayer.budget) {
            alert(`${currentPlayer.name} doesn't have enough budget!`);
            return;
        }

        // Add bid
        this.currentBids.push({
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            amount: bidAmount,
            timestamp: Date.now()
        });

        this.updateBiddingDisplay();
        this.playBeep();
        this.soldBtn.disabled = false;

        // Move to next player
        this.nextPlayer();
    }

    passTurn() {
        this.nextPlayer();
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.gamePlayers.length;
        this.setCurrentPlayer();
        this.startTimer();
    }

    openSaleModal() {
        // Legacy function - not used in timer system
    }

    closeSaleModal() {
        this.saleModal.style.display = 'none';
        this.saleError.textContent = '';
    }

    showSoldStamp() {
        const overlay = document.createElement('div');
        overlay.className = 'sold-stamp-overlay';

        const stamp = document.createElement('div');
        stamp.className = 'sold-stamp';
        stamp.textContent = 'SOLD!';

        overlay.appendChild(stamp);
        document.body.appendChild(overlay);

        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 2000);
    }

    confirmSale() {
        // Legacy function - keeping for modal compatibility
        const price = parseFloat(this.salePriceInput.value);
        const buyerId = parseInt(this.buyerSelect.value);

        if (!price || price <= 0) {
            this.saleError.textContent = 'Please enter a valid price';
            return;
        }

        if (!buyerId && buyerId !== 0) {
            this.saleError.textContent = 'Please select a buyer';
            return;
        }

        const buyer = this.gamePlayers.find(p => p.id === buyerId);
        if (!buyer) {
            this.saleError.textContent = 'Buyer not found';
            return;
        }

        if (buyer.budget < price) {
            this.saleError.textContent = `${buyer.name} doesn't have enough budget! (Has: $${buyer.budget.toFixed(1)}M)`;
            return;
        }

        const itemName = this.currentItem.playerData.name;

        buyer.budget -= price;
        buyer.items.push({
            name: itemName,
            price: price,
            position: this.currentItem.playerData.position,
            tier: this.currentItem.playerData.tier
        });

        this.renderPlayers();
        this.closeSaleModal();
        this.showSoldStamp();
        this.soldBtn.disabled = true;
        this.currentItem = null;

        setTimeout(() => {
            alert(`✅ SOLD! ${itemName} sold to ${buyer.name} for $${price.toFixed(1)}M`);
        }, 500);

        this.playBeep();
    }

    getHighestBid() {
        if (this.currentBids.length === 0) return null;
        return this.currentBids.reduce((highest, bid) =>
            bid.amount > highest.amount ? bid : highest
        );
    }

    updateBiddingDisplay() {
        const highestBid = this.getHighestBid();
        const baseBid = parseFloat(this.baseBidDisplay.textContent);

        if (highestBid) {
            this.currentBidAmount.textContent = highestBid.amount.toFixed(1);
            this.currentBidLeader.textContent = highestBid.playerName;
        } else {
            this.currentBidAmount.textContent = baseBid.toFixed(1);
            this.currentBidLeader.textContent = 'Starting Bid';
        }

        if (this.currentBids.length === 0) {
            this.bidHistoryList.innerHTML = '<div class="no-bids">No bids yet - Starting at base price</div>';
        } else {
            const sortedBids = [...this.currentBids].sort((a, b) => b.amount - a.amount);
            this.bidHistoryList.innerHTML = sortedBids.map((bid, index) => `
                <div class="bid-entry ${index === 0 ? 'highest-bid' : ''}">
                    <span class="bid-entry-player">${this.escapeHtml(bid.playerName)}</span>
                    <span class="bid-entry-amount">$${bid.amount.toFixed(1)}M</span>
                </div>
            `).join('');
        }
    }

    sellToHighestBidder() {
        this.stopTimer();
        const highestBid = this.getHighestBid();

        if (!highestBid) {
            alert('No bids placed yet! Players must place bids first.');
            return;
        }

        const buyer = this.gamePlayers.find(p => p.id === highestBid.playerId);
        if (!buyer) {
            alert('Buyer not found');
            return;
        }

        if (buyer.budget < highestBid.amount) {
            alert(`${buyer.name} no longer has enough budget!`);
            return;
        }

        const itemName = this.currentItem.playerData.name;
        const salePrice = highestBid.amount;

        buyer.budget -= salePrice;
        buyer.items.push({
            name: itemName,
            price: salePrice,
            position: this.currentItem.playerData.position,
            tier: this.currentItem.playerData.tier
        });

        this.renderPlayers();
        this.showSoldStamp();

        this.currentItem = null;
        this.currentBids = [];
        this.soldBtn.disabled = true;
        this.biddingSection.style.display = 'none';

        setTimeout(() => {
            alert(`✅ SOLD! ${itemName} sold to ${buyer.name} for $${salePrice.toFixed(1)}M`);
        }, 500);

        this.playBeep();
    }

    getFilteredPlayers() {
        const era = this.eraFilter.value;
        const league = this.leagueFilter.value;
        const position = this.positionFilter.value;
        const tier = this.tierFilter.value;

        const posMap = {
            'GK': ['GK'],
            'DEF': ['CB', 'LB', 'RB', 'LWB', 'RWB'],
            'MID': ['CDM', 'CM', 'CAM', 'RM', 'LM'],
            'FWD': ['ST', 'CF', 'RW', 'LW', 'SS']
        };

        return PLAYERS_DATABASE.filter(player => {
            if (era !== 'all' && player.era !== era) return false;
            if (league !== 'all' && player.league !== league) return false;

            if (position !== 'all') {
                const allowedPositions = posMap[position] || [];
                if (!allowedPositions.includes(player.position)) return false;
            }

            if (tier !== 'all' && player.tier !== tier) return false;

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

    generateStats(position, tier) {
        const base = {
            'S': { min: 85, max: 95 },
            'A': { min: 80, max: 88 },
            'B': { min: 75, max: 82 },
            'C': { min: 70, max: 78 }
        }[tier];

        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const val = () => rand(base.min, base.max);

        let stats = { PAC: val(), SHO: val(), PAS: val(), DRI: val(), DEF: val(), PHY: val() };

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

    renderPlayerCard(player, baseBid, stats, dynamicValue, formArrow, formClass) {
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
                    <span class="label">MARKET VALUE (FORM)</span>
                    <div class="market-value">
                        $${dynamicValue}M 
                        <span class="form-arrow form-${formClass}" style="margin-left: 10px;">${formArrow}</span>
                    </div>
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
        void this.playerDisplay.offsetWidth;
        this.playerDisplay.classList.add('typing');
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
            this.soldBtn.disabled = true;
            return;
        }

        if (this.gamePlayers.length === 0) {
            alert('Please add players first!');
            return;
        }

        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const player = availablePlayers[randomIndex];

        this.usedPlayers.add(player.name);
        this.playersShown++;

        const volatility = 0.8 + Math.random() * 0.4;
        const dynamicValue = Math.round(player.marketValue * volatility);

        let formArrow = '➖';
        let formClass = 'stable';
        if (volatility > 1.05) { formArrow = '▲'; formClass = 'up'; }
        if (volatility < 0.95) { formArrow = '▼'; formClass = 'down'; }

        const budget = parseFloat(this.budgetInput.value) || 100;

        let bidRatio = (dynamicValue / 300);
        if (bidRatio < 0.05) bidRatio = 0.05;
        if (bidRatio > 0.60) bidRatio = 0.60;

        const auctionRandomness = 0.9 + Math.random() * 0.2;
        const baseBid = (budget * bidRatio * auctionRandomness).toFixed(1);

        const stats = this.generateStats(player.position, player.tier);

        this.currentItem = {
            playerData: player,
            baseBid: parseFloat(baseBid),
            stats: stats,
            dynamicValue: dynamicValue
        };

        this.renderPlayerCard(player, baseBid, stats, dynamicValue, formArrow, formClass);
        this.updateStats();

        // Initialize timer-based bidding
        this.biddingSection.style.display = 'block';
        this.baseBidDisplay.textContent = baseBid;
        this.currentBids = [];
        this.currentPlayerIndex = 0;
        this.updateBiddingDisplay();
        this.setCurrentPlayer();
        this.startTimer();

        this.soldBtn.disabled = true;
    }

    resetSession() {
        if (confirm('Reset the entire session? This will clear all players and their inventories.')) {
            this.stopTimer();
            this.usedPlayers.clear();
            this.playersShown = 0;
            this.gamePlayers = [];
            this.currentItem = null;
            this.currentBids = [];
            this.playerDisplay.innerHTML = `
                <div class="startup-screen">
                    <div class="system-msg">SYSTEM READY...</div>
                    <div class="system-msg">ADD PLAYERS TO START</div>
                    <div class="blink-cursor">_</div>
                </div>
            `;
            this.selectedClubs.clear();
            this.initClubFilters();
            this.renderPlayers();
            this.updateStats();
            this.soldBtn.disabled = true;
            this.biddingSection.style.display = 'none';
            this.playBeep();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auctioneer = new MultiplayerAuctioneer();
});
