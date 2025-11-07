// PWA - Hosted Buyer Event Finder v2.0
// Designed by Santosh Phuyal

class HostedBuyerApp {
    constructor() {
        this.events = [];
        this.myEvents = [];
        this.currentEventId = null;
        this.currentRegion = 'all';
        this.searchEngine = new EventSearchEngine();
        this.filters = {
            search: '',
            benefit: '',
            date: 'all',
            industry: '',
            sort: 'date-asc',
            status: ''
        };
        
        this.init();
    }

    init() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.renderEvents();
    this.updateStats();
    this.updateRegionCounts();
    
    // Auto-load events on first visit
    if (this.events.length === 0) {
        setTimeout(() => {
            this.refreshOnlineEvents(); // ✅ This loads events automatically
        }, 1000);
    }
}

    // Connection Management
    async checkConnectionStatus() {
        const isOnline = await this.searchEngine.checkConnection();
        const statusBar = document.getElementById('connectionStatus');
        
        if (!isOnline) {
            statusBar.classList.remove('d-none', 'online');
            document.getElementById('connectionText').textContent = 'Offline - Showing cached events only';
        } else {
            statusBar.classList.add('online');
            document.getElementById('connectionText').textContent = 'Online';
            setTimeout(() => statusBar.classList.add('d-none'), 3000);
        }
        
        return isOnline;
    }

    // Local Storage Management
    loadFromStorage() {
        const storedEvents = localStorage.getItem('hostedBuyerEvents');
        const storedMyEvents = localStorage.getItem('myEvents');
        const lastUpdated = localStorage.getItem('lastUpdated');
        
        if (storedEvents) {
            this.events = JSON.parse(storedEvents);
        }
        
        if (storedMyEvents) {
            this.myEvents = JSON.parse(storedMyEvents);
        }

        if (lastUpdated) {
            document.getElementById('lastUpdated').textContent = this.formatDateTime(lastUpdated);
        }
    }

    saveToStorage() {
        localStorage.setItem('hostedBuyerEvents', JSON.stringify(this.events));
        localStorage.setItem('myEvents', JSON.stringify(this.myEvents));
        localStorage.setItem('lastUpdated', new Date().toISOString());
        document.getElementById('lastUpdated').textContent = this.formatDateTime(new Date().toISOString());
    }

    // Online Search
    async refreshOnlineEvents() {
        const btn = document.getElementById('refreshOnlineBtn');
        const icon = document.getElementById('refreshIcon');
        const text = document.getElementById('refreshText');
        const loading = document.getElementById('loadingIndicator');

        // Check connection
        const isOnline = await this.checkConnectionStatus();
        if (!isOnline) {
            this.showToast('No internet connection. Please check your network.', 'danger');
            return;
        }

        // Start loading
        btn.disabled = true;
        icon.classList.add('rotating');
        text.textContent = 'Searching...';
        loading.classList.remove('d-none');

        try {
            const newEvents = await this.searchEngine.searchEvents({
                region: this.currentRegion,
                timeout: parseInt(localStorage.getItem('searchTimeout') || 30) * 1000
            });

            // Enrich and add new events
            for (const event of newEvents) {
                const enriched = await this.searchEngine.enrichEventData(event);
                
                // Check if event already exists
                const exists = this.events.some(e => 
                    e.name.toLowerCase() === enriched.name.toLowerCase() && 
                    e.date === enriched.date
                );

                if (!exists) {
                    this.events.push(enriched);
                }
            }

            // Remove past events
            this.removePastEvents();

            this.saveToStorage();
            this.renderEvents();
            this.updateRegionCounts();
            
            document.getElementById('onlineEventCount').textContent = `${newEvents.length} new events found`;
            this.showToast(`Found ${newEvents.length} new events online!`, 'success');

        } catch (error) {
            console.error('Search error:', error);
            this.showToast(error.message || 'Failed to search online. Showing cached events.', 'warning');
        } finally {
            btn.disabled = false;
            icon.classList.remove('rotating');
            text.textContent = 'Search Online';
            loading.classList.add('d-none');
        }
    }

    // Remove past events
    removePastEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const beforeCount = this.events.length;
        this.events = this.events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });
        
        const removed = beforeCount - this.events.length;
        if (removed > 0) {
            this.saveToStorage();
            return removed;
        }
        return 0;
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(link.dataset.tab);
                
                document.querySelectorAll('.nav-link[data-tab]').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Regional tabs
        document.querySelectorAll('.regional-tabs .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentRegion = link.dataset.region;
                
                document.querySelectorAll('.regional-tabs .nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                this.renderEvents();
            });
        });

        // Refresh online
        document.getElementById('refreshOnlineBtn').addEventListener('click', () => this.refreshOnlineEvents());

        // Search and Filters
        document.getElementById('searchBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        
        document.getElementById('benefitFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('industryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('sortFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.renderMyEvents());

        // Quick Filters
        document.querySelectorAll('.quick-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.applyQuickFilter(filter);
            });
        });

        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Add/Edit Event
        document.getElementById('saveEventBtn').addEventListener('click', () => this.saveEvent());

        // Import/Export
        document.getElementById('exportJSON').addEventListener('click', () => this.exportJSON());
        document.getElementById('exportExcel').addEventListener('click', () => this.exportExcel());
        document.getElementById('importJSON').addEventListener('change', (e) => this.importJSON(e));
        document.getElementById('importExcel').addEventListener('change', (e) => this.importExcel(e));

        // Database Management
        document.getElementById('clearPastEvents').addEventListener('click', () => this.clearPastEventsUI());
        document.getElementById('clearDatabase').addEventListener('click', () => this.clearDatabase());
        document.getElementById('loadSampleData').addEventListener('click', () => this.loadSampleData());

        // Test connection
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());

        // Settings
        document.getElementById('autoRefresh').addEventListener('change', (e) => {
            localStorage.setItem('autoRefresh', e.target.checked);
        });

        document.getElementById('searchTimeout').addEventListener('change', (e) => {
            localStorage.setItem('searchTimeout', e.target.value);
        });

        // Modal reset
        document.getElementById('addEventModal').addEventListener('hidden.bs.modal', () => {
            this.resetEventForm();
        });
    }

    async testConnection() {
        const btn = document.getElementById('testConnectionBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Testing...';
        btn.disabled = true;

        const isOnline = await this.checkConnectionStatus();
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            if (isOnline) {
                this.showToast('Connection successful! You are online.', 'success');
            } else {
                this.showToast('No internet connection detected.', 'danger');
            }
        }, 1000);
    }

    // Tab Switching
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            
            if (tabName === 'my-events') {
                this.renderMyEvents();
                this.updateStats();
            } else if (tabName === 'ai-insights') {
                this.generateInsights();
            } else if (tabName === 'settings') {
                this.updateSettingsUI();
            }
        }
    }

    updateSettingsUI() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalEvents = this.events.length;
        const upcomingEvents = this.events.filter(e => new Date(e.date) >= today).length;
        const pastEvents = totalEvents - upcomingEvents;

        document.getElementById('totalEvents').textContent = totalEvents;
        document.getElementById('upcomingEvents').textContent = upcomingEvents;
        document.getElementById('pastEvents').textContent = pastEvents;

        // Load settings
        document.getElementById('autoRefresh').checked = localStorage.getItem('autoRefresh') !== 'false';
        document.getElementById('searchTimeout').value = localStorage.getItem('searchTimeout') || 30;
    }

    // Update region counts
    updateRegionCounts() {
        const counts = {
            all: 0,
            india: 0,
            china: 0,
            'south-asia': 0,
            'rest-world': 0
        };

        const southAsiaCountries = ['Nepal', 'Bangladesh', 'Sri Lanka', 'Pakistan', 'Bhutan', 'Maldives', 'Afghanistan'];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.events.forEach(event => {
            // Only count future events
            if (new Date(event.date) < today) return;

            counts.all++;

            if (event.country === 'India') {
                counts.india++;
            } else if (event.country === 'China') {
                counts.china++;
            } else if (southAsiaCountries.includes(event.country)) {
                counts['south-asia']++;
            } else {
                counts['rest-world']++;
            }
        });

        Object.keys(counts).forEach(region => {
            const badge = document.getElementById(`count-${region}`);
            if (badge) {
                badge.textContent = counts[region];
            }
        });
    }

switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
        
        if (tabName === 'my-events') {
            this.renderMyEvents();
            this.updateStats();
        } else if (tabName === 'ai-insights') {
            this.generateInsights();
            // NEW: Render AI recommendations
            if (window.featuresManager) {
                window.featuresManager.renderAIRecommendations();
            }
        } else if (tabName === 'settings') {
            this.updateSettingsUI();
        } else if (tabName === 'saved-records') {
            // Render saved records
            if (window.savedManager) {
                window.savedManager.renderSavedRecords();
            }
        }
    }
}
    // Filter Functions
    applyFilters() {
        this.filters.search = document.getElementById('searchInput').value.toLowerCase();
        this.filters.benefit = document.getElementById('benefitFilter').value;
        this.filters.date = document.getElementById('dateFilter').value;
        this.filters.industry = document.getElementById('industryFilter').value;
        this.filters.sort = document.getElementById('sortFilter').value;
        
        this.renderEvents();
    }

    applyQuickFilter(filterType) {
        switch(filterType) {
            case 'premium':
                document.getElementById('benefitFilter').value = 'both';
                break;
            case 'urgent':
                document.getElementById('sortFilter').value = 'deadline';
                break;
            case 'upcoming':
                document.getElementById('dateFilter').value = '3months';
                break;
        }
        this.applyFilters();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('benefitFilter').value = '';
        document.getElementById('dateFilter').value = 'all';
        document.getElementById('industryFilter').value = '';
        document.getElementById('sortFilter').value = 'date-asc';
        
        this.filters = {
            search: '',
            benefit: '',
            date: 'all',
            industry: '',
            sort: 'date-asc'
        };
        
        this.renderEvents();
    }

    // Filter and Sort Events
    getFilteredEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filtered = this.events.filter(event => {
            // Always filter out past events
            const eventDate = new Date(event.date);
            if (eventDate < today) return false;
            
            return true;
        });

        // Region filter
        if (this.currentRegion !== 'all') {
            const southAsiaCountries = ['Nepal', 'Bangladesh', 'Sri Lanka', 'Pakistan', 'Bhutan', 'Maldives', 'Afghanistan'];
            
            filtered = filtered.filter(event => {
                if (this.currentRegion === 'india') {
                    return event.country === 'India';
                } else if (this.currentRegion === 'china') {
                    return event.country === 'China';
                } else if (this.currentRegion === 'south-asia') {
                    return southAsiaCountries.includes(event.country);
                } else if (this.currentRegion === 'rest-world') {
                    return event.country !== 'India' && 
                           event.country !== 'China' && 
                           !southAsiaCountries.includes(event.country);
                }
                return true;
            });
        }

        // Search filter
        if (this.filters.search) {
            filtered = filtered.filter(event => 
                event.name.toLowerCase().includes(this.filters.search) ||
                event.country.toLowerCase().includes(this.filters.search) ||
                event.city.toLowerCase().includes(this.filters.search) ||
                (event.industry && event.industry.toLowerCase().includes(this.filters.search)) ||
                (event.organizer && event.organizer.toLowerCase().includes(this.filters.search))
            );
        }

        // Benefit filter
        if (this.filters.benefit) {
            if (this.filters.benefit === 'both') {
                filtered = filtered.filter(event => event.benefits.hotel && event.benefits.airfare);
            } else if (this.filters.benefit === 'hotel') {
                filtered = filtered.filter(event => event.benefits.hotel);
            } else if (this.filters.benefit === 'airfare') {
                filtered = filtered.filter(event => event.benefits.airfare);
            }
        }

        // Industry filter
        if (this.filters.industry) {
            filtered = filtered.filter(event => event.industry === this.filters.industry);
        }

        // Date filter
        if (this.filters.date !== 'all') {
            const ranges = {
                '1month': 1,
                '3months': 3,
                '6months': 6,
                '1year': 12,
                '2years': 24
            };
            
            const months = ranges[this.filters.date];
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + months);
            
            filtered = filtered.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate <= futureDate;
            });
        }

        // Sort
        filtered.sort((a, b) => {
            switch(this.filters.sort) {
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'priority':
                    const aPriority = (a.benefits.hotel && a.benefits.airfare) ? 1 : 0;
                    const bPriority = (b.benefits.hotel && b.benefits.airfare) ? 1 : 0;
                    return bPriority - aPriority;
                case 'deadline':
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // Render Events
    renderEvents() {
        const filtered = this.getFilteredEvents();
        const container = document.getElementById('eventsGrid');
        document.getElementById('eventCount').textContent = filtered.length;
        
        const regionLabels = {
            'all': '',
            'india': '(India)',
            'china': '(China)',
            'south-asia': '(South Asia)',
            'rest-world': '(Rest of World)'
        };
        document.getElementById('regionLabel').textContent = regionLabels[this.currentRegion];

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h4>No Upcoming Events Found</h4>
                        <p>Try adjusting your filters or search for events online</p>
                        <button class="btn btn-primary mt-3" onclick="app.refreshOnlineEvents()">
                            <i class="bi bi-arrow-clockwise"></i> Search Online
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(event => this.createEventCard(event)).join('');

        // Add event listeners
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const eventId = btn.dataset.eventId;
                this.showEventDetails(eventId);
            });
        });

        document.querySelectorAll('.mark-interested-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                this.markInterested(eventId);
            });
        });
    }

    createEventCard(event) {
        const isPremium = event.benefits.hotel && event.benefits.airfare;
        const isInterested = this.myEvents.some(e => e.id === event.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(event.date);
        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        
        // Check deadline urgency
        let deadlineClass = '';
        let deadlineText = '';
        if (event.deadline) {
            const deadlineDate = new Date(event.deadline);
            const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            if (daysToDeadline <= 7 && daysToDeadline > 0) {
                deadlineClass = 'urgent';
                deadlineText = `⚠️ Only ${daysToDeadline} days to apply!`;
            }
        }
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="event-card">
                    <div class="event-card-header">
                        ${isPremium ? '<div class="priority-badge"><i class="bi bi-star-fill"></i> Premium</div>' : ''}
                        <h5 class="mb-1">${event.name}</h5>
                        <p class="mb-0"><i class="bi bi-geo-alt-fill"></i> ${event.city}, ${event.country}</p>
                    </div>
                    <div class="event-card-body">
                        <div class="mb-2">
                            ${event.benefits.hotel ? '<span class="benefit-badge benefit-hotel"><i class="bi bi-building"></i> Hotel</span>' : ''}
                            ${event.benefits.airfare ? '<span class="benefit-badge benefit-airfare"><i class="bi bi-airplane"></i> Airfare</span>' : ''}
                        </div>
                        
                        ${event.industry ? `<p class="mb-1"><strong>Industry:</strong> ${event.industry}</p>` : ''}
                        ${event.organizer ? `<p class="mb-1"><small><i class="bi bi-building"></i> ${event.organizer}</small></p>` : ''}
                        
                        <div class="event-date ${deadlineClass}">
                            <i class="bi bi-calendar-event"></i> ${this.formatDate(event.date)}
                            <br>
                            <small>${daysUntil > 0 ? `${daysUntil} days away` : 'Today'}</small>
                        </div>
                        
                        ${event.deadline ? `
                            <p class="mb-1 mt-2 ${deadlineClass ? 'text-danger fw-bold' : 'text-warning'}">
                                <i class="bi bi-clock"></i> <strong>Deadline:</strong> ${this.formatDate(event.deadline)}
                                ${deadlineText ? `<br><small>${deadlineText}</small>` : ''}
                            </p>
                        ` : ''}

                        ${event.registrationUrl || event.website || event.organizerUrl ? `
                            <div class="event-links">
                                ${event.registrationUrl ? `<a href="${event.registrationUrl}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil-square"></i> Register</a>` : ''}
                                ${event.website ? `<a href="${event.website}" target="_blank" class="btn btn-sm btn-outline-info"><i class="bi bi-link-45deg"></i> Website</a>` : ''}
                                ${event.organizerUrl ? `<a href="${event.organizerUrl}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="bi bi-building"></i> Organizer</a>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="event-actions">
                            <button class="btn btn-sm btn-primary view-details-btn" data-event-id="${event.id}">
                                <i class="bi bi-eye"></i> Details
                            </button>
                            <button class="btn btn-sm ${isInterested ? 'btn-success' : 'btn-outline-warning'} mark-interested-btn" 
                                    data-event-id="${event.id}">
                                <i class="bi ${isInterested ? 'bi-check-circle-fill' : 'bi-star'}"></i> 
                                ${isInterested ? 'Interested' : 'Mark'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
		<div class="event-actions">
    <button class="btn btn-sm btn-primary view-details-btn" data-event-id="${event.id}">
        <i class="bi bi-eye"></i> Details
    </button>
    <button class="btn btn-sm ${isInterested ? 'btn-success' : 'btn-outline-warning'} mark-interested-btn" 
            data-event-id="${event.id}">
        <i class="bi ${isInterested ? 'bi-check-circle-fill' : 'bi-star'}"></i> 
        ${isInterested ? 'Interested' : 'Mark'}
    </button>
</div>

<!-- NEW: Quick Actions Dropdown -->
<div class="dropdown mt-2">
    <button class="btn btn-sm btn-secondary dropdown-toggle w-100" type="button" 
            data-bs-toggle="dropdown">
        Quick Actions
    </button>
    <ul class="dropdown-menu">
        <li><a class="dropdown-item export-calendar-btn" href="#" data-event-id="${event.id}">
            <i class="bi bi-calendar-plus"></i> Add to Calendar
        </a></li>
        <li><a class="dropdown-item" href="#" onclick="featuresManager.openDocumentChecklist('${event.id}')">
            <i class="bi bi-clipboard-check"></i> Document Checklist
        </a></li>
        <li><a class="dropdown-item" href="#" onclick="featuresManager.checkVisaRequirements('${event.id}')">
            <i class="bi bi-passport"></i> Check Visa
        </a></li>
        <li><a class="dropdown-item" href="#" onclick="featuresManager.openBudgetCalculator('${event.id}')">
            <i class="bi bi-calculator"></i> Budget Calculator
        </a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#" onclick="featuresManager.openROITracker('${event.id}')">
            <i class="bi bi-graph-up"></i> ROI Tracker
        </a></li>
        <li><a class="dropdown-item" href="#" onclick="featuresManager.openEventPortfolio('${event.id}')">
            <i class="bi bi-images"></i> Event Portfolio
        </a></li>
    </ul>
</div>
        `;
    }

    // Event Details
    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.currentEventId = eventId;
        document.getElementById('detailEventName').textContent = event.name;
        
        const myEvent = this.myEvents.find(e => e.id === eventId);
        const status = myEvent ? myEvent.status : 'Not interested';
        
        document.getElementById('eventDetailsContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="bi bi-geo-alt-fill"></i> Location</h6>
                    <p>${event.city}, ${event.country}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="bi bi-calendar-event"></i> Event Date</h6>
                    <p>${this.formatDate(event.date)}</p>
                </div>
                ${event.deadline ? `
                    <div class="col-md-6">
                        <h6><i class="bi bi-clock"></i> Application Deadline</h6>
                        <p>${this.formatDate(event.deadline)}</p>
                    </div>
                ` : ''}
                ${event.industry ? `
                    <div class="col-md-6">
                        <h6><i class="bi bi-briefcase"></i> Industry</h6>
                        <p>${event.industry}</p>
                    </div>
                ` : ''}
                ${event.organizer ? `
                    <div class="col-md-6">
                        <h6><i class="bi bi-building"></i> Organizer</h6>
                        <p>${event.organizer}</p>
                    </div>
                ` : ''}
                <div class="col-12">
                    <h6><i class="bi bi-gift"></i> Benefits</h6>
                    <p>
                        ${event.benefits.hotel ? '<span class="badge bg-info me-1"><i class="bi bi-building"></i> Complimentary Hotel</span>' : ''}
                        ${event.benefits.airfare ? '<span class="badge bg-success"><i class="bi bi-airplane"></i> Complimentary Airfare</span>' : ''}
                    </p>
                </div>
                ${event.description ? `
                    <div class="col-12">
                        <h6><i class="bi bi-info-circle"></i> Description</h6>
                        <p>${event.description}</p>
                    </div>
                ` : ''}
                ${event.documents ? `
                    <div class="col-12">
                        <h6><i class="bi bi-file-text"></i> Required Documents</h6>
                        <div class="document-list">
                            <ul>
                                ${event.documents.split(',').map(doc => `<li>${doc.trim()}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                ` : ''}
                <div class="col-12">
                    <h6><i class="bi bi-link-45deg"></i> Links</h6>
                    <div class="d-flex gap-2 flex-wrap">
                        ${event.registrationUrl ? `<a href="${event.registrationUrl}" target="_blank" class="btn btn-sm btn-primary"><i class="bi bi-pencil-square"></i> Registration</a>` : ''}
                        ${event.website ? `<a href="${event.website}" target="_blank" class="btn btn-sm btn-info"><i class="bi bi-globe"></i> Event Website</a>` : ''}
                        ${event.organizerUrl ? `<a href="${event.organizerUrl}" target="_blank" class="btn btn-sm btn-secondary"><i class="bi bi-building"></i> Organizer Website</a>` : ''}
                    </div>
                </div>
                ${event.email ? `
                    <div class="col-md-6 mt-3">
                        <h6><i class="bi bi-envelope"></i> Contact Email</h6>
                        <p><a href="mailto:${event.email}">${event.email}</a></p>
                    </div>
                ` : ''}
                ${event.phone ? `
                    <div class="col-md-6 mt-3">
                        <h6><i class="bi bi-telephone"></i> Contact Phone</h6>
                        <p><a href="tel:${event.phone}">${event.phone}</a></p>
                    </div>
                ` : ''}
                <div class="col-12 mt-3">
                    <h6><i class="bi bi-flag"></i> Status</h6>
                    <p><span class="badge bg-${this.getStatusColor(status)}">${status}</span></p>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
        modal.show();

        document.getElementById('editEventBtn').onclick = () => {
            modal.hide();
            this.editEvent(eventId);
        };

        document.getElementById('deleteEventBtn').onclick = () => {
            if (confirm('Are you sure you want to delete this event?')) {
                this.deleteEvent(eventId);
                modal.hide();
            }
        };
    }

    // Mark as Interested
    markInterested(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const existingIndex = this.myEvents.findIndex(e => e.id === eventId);
        
        if (existingIndex > -1) {
            this.myEvents.splice(existingIndex, 1);
            this.showToast('Removed from interested events', 'info');
        } else {
            this.myEvents.push({
                ...event,
                status: 'interested',
                addedDate: new Date().toISOString()
            });
            this.showToast('Added to interested events!', 'success');
        }

        this.saveToStorage();
        this.renderEvents();
        this.updateStats();
    }

    // My Events
    renderMyEvents() {
        const container = document.getElementById('myEventsList');
        const statusFilter = document.getElementById('statusFilter').value;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filtered = this.myEvents.filter(e => new Date(e.date) >= today);
        
        if (statusFilter) {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-bookmark-x"></i>
                    <h4>No Interested Events</h4>
                    <p>Mark events as interested from the Discover tab</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(event => `
            <div class="my-event-item status-${event.status}">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5>${event.name}</h5>
                        <p class="mb-1"><i class="bi bi-geo-alt"></i> ${event.city}, ${event.country}</p>
                        <p class="mb-1"><i class="bi bi-calendar"></i> ${this.formatDate(event.date)}</p>
                        ${event.deadline ? `<p class="mb-1"><i class="bi bi-clock text-danger"></i> Deadline: ${this.formatDate(event.deadline)}</p>` : ''}
                        <div class="mt-2">
                            ${event.benefits.hotel ? '<span class="badge bg-info me-1">Hotel</span>' : ''}
                            ${event.benefits.airfare ? '<span class="badge bg-success">Airfare</span>' : ''}
                        </div>
                    </div>
                    <div class="col-md-4">
                        <select class="form-select status-select mb-2" data-event-id="${event.id}">
                            <option value="interested" ${event.status === 'interested' ? 'selected' : ''}>Interested</option>
                            <option value="applied" ${event.status === 'applied' ? 'selected' : ''}>Applied</option>
                            <option value="confirmed" ${event.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="completed" ${event.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="rejected" ${event.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                        <button class="btn btn-sm btn-primary w-100 mb-2" onclick="app.showEventDetails('${event.id}')">
                            <i class="bi bi-eye"></i> View Details
                        </button>
                        <button class="btn btn-sm btn-danger w-100" onclick="app.removeFromInterested('${event.id}')">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const eventId = e.target.dataset.eventId;
                const newStatus = e.target.value;
                this.updateEventStatus(eventId, newStatus);
            });
        });
    }

    updateEventStatus(eventId, newStatus) {
        const event = this.myEvents.find(e => e.id === eventId);
        if (event) {
            event.status = newStatus;
            this.saveToStorage();
            this.updateStats();
            this.showToast(`Status updated to ${newStatus}`, 'success');
        }
    }

    removeFromInterested(eventId) {
        if (confirm('Remove this event from your list?')) {
            const index = this.myEvents.findIndex(e => e.id === eventId);
            if (index > -1) {
                this.myEvents.splice(index, 1);
                this.saveToStorage();
                this.renderMyEvents();
                this.updateStats();
                this.showToast('Event removed', 'info');
            }
        }
    }

    updateStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureEvents = this.myEvents.filter(e => new Date(e.date) >= today);
        
        document.getElementById('interestedCount').textContent = 
            futureEvents.filter(e => e.status === 'interested').length;
        document.getElementById('appliedCount').textContent = 
            futureEvents.filter(e => e.status === 'applied').length;
        document.getElementById('confirmedCount').textContent = 
            futureEvents.filter(e => e.status === 'confirmed').length;
        document.getElementById('completedCount').textContent = 
            futureEvents.filter(e => e.status === 'completed').length;
    }

    // CRUD Operations
    saveEvent() {
        const id = document.getElementById('eventId').value;
        const eventData = {
            id: id || this.generateId(),
            name: document.getElementById('eventName').value,
            country: document.getElementById('eventCountry').value,
            city: document.getElementById('eventCity').value,
            date: document.getElementById('eventDate').value,
            deadline: document.getElementById('eventDeadline').value,
            industry: document.getElementById('eventIndustry').value,
            benefits: {
                hotel: document.getElementById('benefitHotel').checked,
                airfare: document.getElementById('benefitAirfare').checked
            },
            organizer: document.getElementById('eventOrganizer').value,
            organizerUrl: document.getElementById('eventOrganizerUrl').value,
            website: document.getElementById('eventWebsite').value,
            registrationUrl: document.getElementById('eventRegistrationUrl').value,
            email: document.getElementById('eventEmail').value,
            phone: document.getElementById('eventPhone').value,
            documents: document.getElementById('eventDocuments').value,
            description: document.getElementById('eventDescription').value,
            createdAt: id ? this.events.find(e => e.id === id).createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'manual'
        };

        if (id) {
            const index = this.events.findIndex(e => e.id === id);
            this.events[index] = eventData;
            this.showToast('Event updated successfully!', 'success');
        } else {
            this.events.push(eventData);
            this.showToast('Event added successfully!', 'success');
        }

        this.saveToStorage();
        this.renderEvents();
        this.updateRegionCounts();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addEventModal'));
        modal.hide();
        this.resetEventForm();
    }

    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        document.getElementById('modalTitle').textContent = 'Edit Event';
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventName').value = event.name;
        document.getElementById('eventCountry').value = event.country;
        document.getElementById('eventCity').value = event.city;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventDeadline').value = event.deadline || '';
        document.getElementById('eventIndustry').value = event.industry || '';
        document.getElementById('benefitHotel').checked = event.benefits.hotel;
        document.getElementById('benefitAirfare').checked = event.benefits.airfare;
        document.getElementById('eventOrganizer').value = event.organizer || '';
        document.getElementById('eventOrganizerUrl').value = event.organizerUrl || '';
        document.getElementById('eventWebsite').value = event.website || '';
        document.getElementById('eventRegistrationUrl').value = event.registrationUrl || '';
        document.getElementById('eventEmail').value = event.email || '';
        document.getElementById('eventPhone').value = event.phone || '';
        document.getElementById('eventDocuments').value = event.documents || '';
        document.getElementById('eventDescription').value = event.description || '';

        const modal = new bootstrap.Modal(document.getElementById('addEventModal'));
        modal.show();
    }

    deleteEvent(eventId) {
        this.events = this.events.filter(e => e.id !== eventId);
        this.myEvents = this.myEvents.filter(e => e.id !== eventId);
        this.saveToStorage();
        this.renderEvents();
        this.updateRegionCounts();
        this.showToast('Event deleted', 'info');
    }

    resetEventForm() {
        document.getElementById('modalTitle').textContent = 'Add New Event';
        document.getElementById('eventForm').reset();
        document.getElementById('eventId').value = '';
    }

    // AI Insights (keeping existing code)
    generateInsights() {
        const container = document.getElementById('insightsContainer');
        const recsContainer = document.getElementById('recommendationsContainer');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = this.events.filter(e => new Date(e.date) >= today);
        const totalEvents = upcomingEvents.length;
        const premiumEvents = upcomingEvents.filter(e => e.benefits.hotel && e.benefits.airfare).length;
        const indiaEvents = upcomingEvents.filter(e => e.country === 'India').length;
        
        const countries = [...new Set(upcomingEvents.map(e => e.country))];
        const topCountry = this.getTopCountry();
        
        const avgEventsPerMonth = this.getAvgEventsPerMonth();

        container.innerHTML = `
            <div class="col-md-4">
                <div class="insight-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <h5><i class="bi bi-calendar-check"></i> Upcoming Events</h5>
                    <div class="insight-value">${totalEvents}</div>
                    <p class="mb-0">Across ${countries.length} countries</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="insight-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <h5><i class="bi bi-star-fill"></i> Premium Events</h5>
                    <div class="insight-value">${premiumEvents}</div>
                    <p class="mb-0">${totalEvents > 0 ? Math.round(premiumEvents/totalEvents*100) : 0}% offer both benefits</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="insight-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <h5><i class="bi bi-flag"></i> India Events</h5>
                    <div class="insight-value">${indiaEvents}</div>
                    <p class="mb-0">Upcoming in India</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="insight-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <h5><i class="bi bi-graph-up"></i> Top Country</h5>
                    <div class="insight-value" style="font-size: 1.5rem;">${topCountry.name}</div>
                    <p class="mb-0">${topCountry.count} events</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="insight-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <h5><i class="bi bi-calendar3"></i> Monthly Average</h5>
                    <div class="insight-value">${avgEventsPerMonth.toFixed(1)}</div>
                    <p class="mb-0">Events per month</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="insight-card" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);">
                    <h5><i class="bi bi-bookmark-star"></i> Your Interest</h5>
                    <div class="insight-value">${this.myEvents.length}</div>
                    <p class="mb-0">Events tracked</p>
                </div>
            </div>
        `;

        const recommendations = this.getRecommendations();
        recsContainer.innerHTML = recommendations.map(rec => `
            <div class="col-md-6">
                <div class="recommendation-card">
                    <h6><i class="bi bi-lightbulb-fill text-warning"></i> ${rec.title}</h6>
                    <p class="mb-2">${rec.description}</p>
                    <span class="badge bg-primary">${rec.category}</span>
                </div>
            </div>
        `).join('');

        this.generateTrendsChart();
    }

    getTopCountry() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = this.events.filter(e => new Date(e.date) >= today);
        const countryCount = {};
        
        upcomingEvents.forEach(e => {
            countryCount[e.country] = (countryCount[e.country] || 0) + 1;
        });
        
        let topCountry = { name: 'N/A', count: 0 };
        for (const [country, count] of Object.entries(countryCount)) {
            if (count > topCountry.count) {
                topCountry = { name: country, count };
            }
        }
        return topCountry;
    }

    getAvgEventsPerMonth() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = this.events.filter(e => new Date(e.date) >= today);
        
        if (upcomingEvents.length === 0) return 0;
        
        const dates = upcomingEvents.map(e => new Date(e.date));
        const minDate = today;
        const maxDate = new Date(Math.max(...dates));
        
        const months = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + 
                       (maxDate.getMonth() - minDate.getMonth()) + 1;
        
        return upcomingEvents.length / (months || 1);
    }

    getRecommendations() {
        const recs = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = this.events.filter(e => new Date(e.date) >= today);
        
        const premiumEvents = upcomingEvents.filter(e => 
            e.benefits.hotel && e.benefits.airfare
        );
        
        if (premiumEvents.length > 0) {
            recs.push({
                title: 'Premium Opportunities Available',
                description: `${premiumEvents.length} events offer both hotel and airfare. These provide maximum value!`,
                category: 'High Priority'
            });
        }

        const urgentEvents = upcomingEvents.filter(e => {
            if (!e.deadline) return false;
            const daysUntil = (new Date(e.deadline) - today) / (1000 * 60 * 60 * 24);
            return daysUntil > 0 && daysUntil <= 30;
        });

        if (urgentEvents.length > 0) {
            recs.push({
                title: 'Urgent Application Deadlines',
                description: `${urgentEvents.length} events have deadlines within 30 days. Apply soon!`,
                category: 'Time Sensitive'
            });
        }

        const indiaUpcoming = upcomingEvents.filter(e => e.country === 'India');

        if (indiaUpcoming.length > 0) {
            recs.push({
                title: 'India Events',
                description: `${indiaUpcoming.length} upcoming events in India. No international travel needed!`,
                category: 'Local Opportunity'
            });
        }

        const countries = [...new Set(upcomingEvents.map(e => e.country))];
        if (countries.length > 5) {
            recs.push({
                title: 'Global Reach',
                description: `Events available in ${countries.length} countries. Consider expanding your network internationally!`,
                category: 'Strategy'
            });
        }

        if (recs.length === 0) {
            recs.push({
                title: 'Search for Events',
                description: 'Click "Search Online" to find the latest hosted buyer events.',
                category: 'Action Needed'
            });
        }

        return recs;
    }

    generateTrendsChart() {
        const ctx = document.getElementById('trendsChart');
        if (!ctx) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = this.events.filter(e => new Date(e.date) >= today);

        const monthCounts = {};
        upcomingEvents.forEach(event => {
            const date = new Date(event.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[key] = (monthCounts[key] || 0) + 1;
        });

        const sortedMonths = Object.keys(monthCounts).sort();
        const labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        const data = sortedMonths.map(m => monthCounts[m]);

        // Destroy existing chart if it exists
        if (window.trendsChartInstance) {
            window.trendsChartInstance.destroy();
        }

        window.trendsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Upcoming Events',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Event Distribution Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Import/Export
    exportJSON() {
        const data = {
            events: this.events,
            myEvents: this.myEvents,
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            exportedBy: 'Santosh Phuyal - Hosted Buyer Event Finder'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hosted-buyer-events-${this.getTimestamp()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Data exported as JSON', 'success');
    }

    exportExcel() {
        const ws_data = [
            ['Event Name', 'Country', 'City', 'Date', 'Deadline', 'Industry', 'Organizer', 'Hotel', 'Airfare', 
             'Website', 'Registration Link', 'Email', 'Phone', 'Documents', 'Status']
        ];

        this.events.forEach(event => {
            const myEvent = this.myEvents.find(e => e.id === event.id);
            ws_data.push([
                event.name,
                event.country,
                event.city,
                event.date,
                event.deadline || '',
                event.industry || '',
                event.organizer || '',
                event.benefits.hotel ? 'Yes' : 'No',
                event.benefits.airfare ? 'Yes' : 'No',
                event.website || '',
                event.registrationUrl || '',
                event.email || '',
                event.phone || '',
                event.documents || '',
                myEvent ? myEvent.status : 'Not interested'
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Auto-size columns
        const max_width = ws_data.reduce((w, r) => Math.max(w, r.length), 10);
        ws['!cols'] = Array(max_width).fill({ wch: 15 });
        
        XLSX.utils.book_append_sheet(wb, ws, 'Events');

        XLSX.writeFile(wb, `hosted-buyer-events-${this.getTimestamp()}.xlsx`);
        this.showToast('Data exported as Excel', 'success');
    }

    importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.events) {
                    this.events = data.events;
                    this.removePastEvents();
                }
                if (data.myEvents) {
                    this.myEvents = data.myEvents;
                }
                
                this.saveToStorage();
                this.renderEvents();
                this.updateStats();
                this.updateRegionCounts();
                this.showToast('Data imported successfully!', 'success');
            } catch (error) {
                this.showToast('Error importing JSON file', 'danger');
            }
        };
        reader.readAsText(file);
    }

    importExcel(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                jsonData.forEach(row => {
                    const event = {
                        id: this.generateId(),
                        name: row['Event Name'],
                        country: row['Country'],
                        city: row['City'],
                        date: row['Date'],
                        deadline: row['Deadline'] || '',
                        industry: row['Industry'] || '',
                        organizer: row['Organizer'] || '',
                        benefits: {
                            hotel: row['Hotel'] === 'Yes',
                            airfare: row['Airfare'] === 'Yes'
                        },
                        website: row['Website'] || '',
                        registrationUrl: row['Registration Link'] || '',
                        email: row['Email'] || '',
                        phone: row['Phone'] || '',
                        documents: row['Documents'] || '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: 'import'
                    };

                    this.events.push(event);
                });

                this.removePastEvents();
                this.saveToStorage();
                this.renderEvents();
                this.updateRegionCounts();
                this.showToast('Excel data imported successfully!', 'success');
            } catch (error) {
                this.showToast('Error importing Excel file', 'danger');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Database Management
    clearPastEventsUI() {
        if (confirm('Are you sure you want to clear all past events?')) {
            const removed = this.removePastEvents();
            this.renderEvents();
            this.updateRegionCounts();
            this.showToast(`Removed ${removed} past events`, 'info');
        }
    }

    clearDatabase() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
            this.events = [];
            this.myEvents = [];
            this.saveToStorage();
            this.renderEvents();
            this.renderMyEvents();
            this.updateStats();
            this.updateRegionCounts();
            this.showToast('Database cleared', 'info');
        }
    }

    loadSampleData() {
        if (confirm('This will add sample events to your database. Continue?')) {
            this.refreshOnlineEvents(); // This will load the sample data
        }
    }

    // Utility Functions
    generateId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusColor(status) {
        const colors = {
            'interested': 'info',
            'applied': 'warning',
            'confirmed': 'success',
            'completed': 'secondary',
            'rejected': 'danger'
        };
        return colors[status] || 'secondary';
    }

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `custom-toast alert alert-${type}`;
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'x-circle' : 'info-circle'} me-2"></i>
                <div>${message}</div>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HostedBuyerApp();
    window.app = app; // ✅ Make it globally accessible
});

// Handle offline/online status
window.addEventListener('online', () => {
    app.checkConnectionStatus();
});

window.addEventListener('offline', () => {
    app.checkConnectionStatus();
});