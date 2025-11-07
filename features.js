/**
 * Advanced Features Manager
 * Calendar Export, Document Checklist, Weather, Visa, Budget, QR Scanner, ROI, Portfolio, AI Matcher
 * Designed by Santosh Phuyal
 */

class FeaturesManager {
    constructor() {
        this.documentChecklists = {};
        this.budgets = {};
        this.roiData = {};
        this.portfolios = {};
        this.userPreferences = {
            passportCountry: 'India',
            industries: [],
            preferredRegions: []
        };
        this.weatherCache = {};
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.loadUserPreferences();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('featuresData');
        if (stored) {
            const data = JSON.parse(stored);
            this.documentChecklists = data.documentChecklists || {};
            this.budgets = data.budgets || {};
            this.roiData = data.roiData || {};
            this.portfolios = data.portfolios || {};
        }

        const prefs = localStorage.getItem('userPreferences');
        if (prefs) {
            this.userPreferences = JSON.parse(prefs);
        }
    }

    saveToStorage() {
        const data = {
            documentChecklists: this.documentChecklists,
            budgets: this.budgets,
            roiData: this.roiData,
            portfolios: this.portfolios
        };
        localStorage.setItem('featuresData', JSON.stringify(data));
        localStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
    }

    setupEventListeners() {
        // Calendar export buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.export-calendar-btn')) {
                const eventId = e.target.closest('.export-calendar-btn').dataset.eventId;
                this.exportToCalendar(eventId);
            }
        });

        // Save user preferences
        const savePrefsBtn = document.getElementById('savePreferencesBtn');
        if (savePrefsBtn) {
            savePrefsBtn.addEventListener('click', () => this.saveUserPreferences());
        }
    }

    // ===== FEATURE 1: CALENDAR EXPORT =====
    exportToCalendar(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        const startDate = this.formatDateForICS(event.date);
        const endDate = this.formatDateForICS(event.date);
        const deadlineDate = event.deadline ? this.formatDateForICS(event.deadline) : '';

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hosted Buyer Event Finder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${event.name}
X-WR-TIMEZONE:UTC
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
DTSTAMP:${this.formatDateForICS(new Date().toISOString().split('T')[0])}
SUMMARY:${event.name}
DESCRIPTION:${this.escapeICS(event.description || 'Hosted Buyer Event')}\\n\\nOrganizer: ${event.organizer || 'N/A'}\\n\\nBenefits: ${event.benefits.hotel ? 'Hotel ' : ''}${event.benefits.airfare ? 'Airfare' : ''}\\n\\nWebsite: ${event.website || 'N/A'}\\n\\nRegistration: ${event.registrationUrl || 'N/A'}
LOCATION:${event.city}, ${event.country}
URL:${event.website || event.registrationUrl || ''}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-P7D
DESCRIPTION:Event in 7 days
ACTION:DISPLAY
END:VALARM
END:VEVENT`;

        // Add deadline reminder if exists
        if (deadlineDate) {
            const deadlineICS = `
BEGIN:VEVENT
DTSTART:${deadlineDate}
DTEND:${deadlineDate}
DTSTAMP:${this.formatDateForICS(new Date().toISOString().split('T')[0])}
SUMMARY:⚠️ Registration Deadline: ${event.name}
DESCRIPTION:Last day to register for ${event.name}
LOCATION:${event.city}, ${event.country}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P3D
DESCRIPTION:Deadline in 3 days!
ACTION:DISPLAY
END:VALARM
END:VEVENT`;
            
            const finalICS = icsContent + deadlineICS + '\nEND:VCALENDAR';
            this.downloadICS(finalICS, event.name);
        } else {
            const finalICS = icsContent + '\nEND:VCALENDAR';
            this.downloadICS(finalICS, event.name);
        }

        this.showToast('📅 Calendar event created! Open with your calendar app.', 'success');
    }

    formatDateForICS(dateStr) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    escapeICS(text) {
        return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    }

    downloadICS(content, filename) {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ===== FEATURE 2: DOCUMENT CHECKLIST =====
    openDocumentChecklist(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        // Initialize checklist if not exists
        if (!this.documentChecklists[eventId]) {
            const docs = event.documents ? event.documents.split(',').map(d => d.trim()) : [
                'Passport Copy',
                'Business Card',
                'Company Profile',
                'Registration Form',
                'Visa (if required)'
            ];

            this.documentChecklists[eventId] = docs.map(doc => ({
                name: doc,
                status: 'pending', // pending, ready, uploaded
                uploadedFile: null,
                notes: ''
            }));
        }

        this.renderDocumentChecklist(eventId, event);
    }

    renderDocumentChecklist(eventId, event) {
        const checklist = this.documentChecklists[eventId];
        const total = checklist.length;
        const ready = checklist.filter(d => d.status === 'ready' || d.status === 'uploaded').length;
        const percentage = Math.round((ready / total) * 100);

        const modal = document.getElementById('documentChecklistModal');
        document.getElementById('checklistEventName').textContent = event.name;
        
        const progressBar = `
            <div class="mb-3">
                <div class="d-flex justify-content-between mb-1">
                    <span>Documents Ready: ${ready}/${total}</span>
                    <span>${percentage}%</span>
                </div>
                <div class="progress" style="height: 25px;">
                    <div class="progress-bar ${percentage === 100 ? 'bg-success' : 'bg-primary'}" 
                         style="width: ${percentage}%">${percentage}%</div>
                </div>
            </div>
        `;

        const checklistHTML = checklist.map((doc, index) => `
            <div class="document-item mb-3 p-3 border rounded ${doc.status === 'ready' ? 'bg-light' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" 
                                   id="doc-${eventId}-${index}" 
                                   ${doc.status === 'ready' || doc.status === 'uploaded' ? 'checked' : ''}
                                   onchange="featuresManager.toggleDocumentStatus('${eventId}', ${index})">
                            <label class="form-check-label" for="doc-${eventId}-${index}">
                                <strong>${doc.name}</strong>
                                ${doc.status === 'uploaded' ? '<span class="badge bg-success ms-2">Uploaded</span>' : ''}
                            </label>
                        </div>
                        ${doc.notes ? `<small class="text-muted d-block mt-1">Note: ${doc.notes}</small>` : ''}
                    </div>
                    <div class="btn-group-vertical btn-group-sm ms-2">
                        <button class="btn btn-outline-primary" onclick="featuresManager.addDocumentNote('${eventId}', ${index})">
                            <i class="bi bi-pencil"></i> Note
                        </button>
                        <button class="btn btn-outline-success" onclick="featuresManager.uploadDocument('${eventId}', ${index})">
                            <i class="bi bi-upload"></i> Upload
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('documentChecklistContent').innerHTML = progressBar + checklistHTML;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    toggleDocumentStatus(eventId, index) {
        const doc = this.documentChecklists[eventId][index];
        doc.status = doc.status === 'ready' ? 'pending' : 'ready';
        this.saveToStorage();
        
        const event = this.getEvent(eventId);
        this.renderDocumentChecklist(eventId, event);
    }

    addDocumentNote(eventId, index) {
        const doc = this.documentChecklists[eventId][index];
        const note = prompt(`Add note for "${doc.name}":`, doc.notes || '');
        if (note !== null) {
            doc.notes = note;
            this.saveToStorage();
            
            const event = this.getEvent(eventId);
            this.renderDocumentChecklist(eventId, event);
        }
    }

    uploadDocument(eventId, index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.documentChecklists[eventId][index].status = 'uploaded';
                this.documentChecklists[eventId][index].uploadedFile = file.name;
                this.saveToStorage();
                
                const event = this.getEvent(eventId);
                this.renderDocumentChecklist(eventId, event);
                this.showToast(`📄 ${file.name} uploaded!`, 'success');
            }
        };
        input.click();
    }

    // ===== FEATURE 6: WEATHER FORECAST =====
    async fetchWeather(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        const cacheKey = `${event.city}-${event.date}`;
        
        // Check cache first
        if (this.weatherCache[cacheKey]) {
            this.displayWeather(eventId, this.weatherCache[cacheKey]);
            return;
        }

        // Show loading
        const weatherDiv = document.getElementById(`weather-${eventId}`);
        if (weatherDiv) {
            weatherDiv.innerHTML = '<small class="text-muted">Loading weather... <span class="spinner-border spinner-border-sm"></span></small>';
        }

        // Simulate weather data (in production, use OpenWeatherMap API)
        setTimeout(() => {
            const weatherData = this.generateMockWeather(event.city, event.date);
            this.weatherCache[cacheKey] = weatherData;
            this.displayWeather(eventId, weatherData);
        }, 1000);
    }

    generateMockWeather(city, date) {
        const month = new Date(date).getMonth();
        const seasons = {
            'New Delhi': { temp: [15, 20, 28, 35, 38, 35, 30, 28, 28, 25, 18, 15], desc: ['Clear', 'Sunny', 'Hot', 'Very Hot', 'Extreme Heat', 'Monsoon', 'Rainy', 'Humid', 'Pleasant', 'Cool', 'Cold', 'Cold'] },
            'Dubai': { temp: [20, 22, 26, 30, 35, 38, 40, 40, 36, 32, 26, 22], desc: ['Sunny', 'Sunny', 'Hot', 'Very Hot', 'Extreme', 'Extreme', 'Extreme', 'Extreme', 'Hot', 'Warm', 'Pleasant', 'Sunny'] },
            'Berlin': { temp: [2, 3, 8, 13, 18, 21, 23, 22, 18, 12, 7, 3], desc: ['Cold', 'Cold', 'Cool', 'Mild', 'Pleasant', 'Warm', 'Warm', 'Warm', 'Mild', 'Cool', 'Cold', 'Cold'] },
            'London': { temp: [5, 6, 9, 11, 15, 18, 20, 20, 17, 13, 9, 6], desc: ['Rainy', 'Rainy', 'Cloudy', 'Showers', 'Mild', 'Pleasant', 'Warm', 'Warm', 'Mild', 'Rainy', 'Rainy', 'Cold'] },
            'Singapore': { temp: [27, 28, 28, 29, 29, 29, 28, 28, 28, 28, 27, 27], desc: ['Humid', 'Humid', 'Humid', 'Hot', 'Hot', 'Hot', 'Hot', 'Hot', 'Humid', 'Humid', 'Humid', 'Humid'] }
        };

        const cityData = seasons[city] || { temp: [20, 20, 22, 24, 26, 28, 28, 28, 26, 24, 22, 20], desc: ['Pleasant', 'Pleasant', 'Mild', 'Warm', 'Warm', 'Hot', 'Hot', 'Hot', 'Warm', 'Mild', 'Pleasant', 'Pleasant'] };
        
        return {
            temp: cityData.temp[month] + (Math.random() * 4 - 2),
            description: cityData.desc[month],
            humidity: 50 + Math.random() * 30,
            icon: this.getWeatherIcon(cityData.desc[month])
        };
    }

    getWeatherIcon(desc) {
        const icons = {
            'Sunny': '☀️', 'Clear': '🌤️', 'Cloudy': '☁️', 'Rainy': '🌧️',
            'Hot': '🌡️', 'Cold': '❄️', 'Pleasant': '🌤️', 'Humid': '💧',
            'Monsoon': '⛈️', 'Showers': '🌦️'
        };
        return icons[desc] || '🌤️';
    }

    displayWeather(eventId, weather) {
        const weatherDiv = document.getElementById(`weather-${eventId}`);
        if (weatherDiv) {
            weatherDiv.innerHTML = `
                <div class="weather-info">
                    <span class="weather-icon">${weather.icon}</span>
                    <strong>${Math.round(weather.temp)}°C</strong>
                    <small class="text-muted">${weather.description}</small>
                    <small class="d-block text-muted">💧 ${Math.round(weather.humidity)}% humidity</small>
                </div>
            `;
        }
    }

    // ===== FEATURE 7: VISA REQUIREMENTS =====
    checkVisaRequirements(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        const visaInfo = this.getVisaInfo(this.userPreferences.passportCountry, event.country);
        
        const modal = document.getElementById('visaRequirementsModal');
        document.getElementById('visaEventName').textContent = event.name;
        document.getElementById('visaRequirementsContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Your Passport</h6>
                    <p class="lead">${this.getCountryFlag(this.userPreferences.passportCountry)} ${this.userPreferences.passportCountry}</p>
                </div>
                <div class="col-md-6">
                    <h6>Event Country</h6>
                    <p class="lead">${this.getCountryFlag(event.country)} ${event.country}</p>
                </div>
            </div>
            
            <div class="alert ${visaInfo.required ? 'alert-warning' : 'alert-success'} mt-3">
                <h5>
                    ${visaInfo.required ? '⚠️ Visa Required' : '✅ No Visa Required'}
                </h5>
                <p class="mb-0">${visaInfo.message}</p>
            </div>

            ${visaInfo.required ? `
                <div class="visa-details mt-3">
                    <h6>Visa Details</h6>
                    <table class="table table-sm">
                        <tr>
                            <th>Visa Type:</th>
                            <td>${visaInfo.type}</td>
                        </tr>
                        <tr>
                            <th>Processing Time:</th>
                            <td>${visaInfo.processingTime}</td>
                        </tr>
                        <tr>
                            <th>Validity:</th>
                            <td>${visaInfo.validity}</td>
                        </tr>
                        <tr>
                            <th>Estimated Fee:</th>
                            <td>💰 ${visaInfo.fee}</td>
                        </tr>
                    </table>

                    <h6 class="mt-3">Required Documents</h6>
                    <ul>
                        ${visaInfo.documents.map(doc => `<li>${doc}</li>`).join('')}
                    </ul>

                    ${visaInfo.applyUrl ? `
                        <a href="${visaInfo.applyUrl}" target="_blank" class="btn btn-primary">
                            <i class="bi bi-link-45deg"></i> Apply for Visa
                        </a>
                    ` : ''}
                </div>
            ` : ''}
        `;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    getVisaInfo(fromCountry, toCountry) {
        // Simplified visa rules (expand with real data)
        const visaRules = {
            'India': {
                'Germany': { required: true, type: 'Schengen Business Visa', processingTime: '15-20 days', validity: '90 days', fee: '€80', documents: ['Passport (valid 6 months)', 'Invitation letter', 'Bank statements (3 months)', 'Travel insurance', 'Flight booking', 'Hotel booking'], applyUrl: 'https://visa.germany.info' },
                'UAE': { required: true, type: 'Business Visa', processingTime: '3-5 days', validity: '30 days', fee: 'AED 300', documents: ['Passport copy', 'Invitation letter', 'Company NOC', 'Photos'], applyUrl: 'https://smartservices.ica.gov.ae' },
                'UK': { required: true, type: 'Standard Visitor Visa', processingTime: '15 days', validity: '6 months', fee: '£100', documents: ['Passport', 'Invitation letter', 'Bank statements', 'Employment letter'], applyUrl: 'https://www.gov.uk/standard-visitor-visa' },
                'USA': { required: true, type: 'B-1 Business Visa', processingTime: '3-5 weeks', validity: '10 years', fee: '$160', documents: ['DS-160 form', 'Passport', 'Invitation letter', 'Interview appointment'], applyUrl: 'https://travel.state.gov' },
                'Singapore': { required: false, type: 'Visa-free', processingTime: 'N/A', validity: '30 days', fee: 'Free', documents: ['Valid passport'], applyUrl: '', message: 'Indian passport holders can enter Singapore visa-free for up to 30 days for tourism/business.' },
                'Thailand': { required: true, type: 'Visa on Arrival', processingTime: 'On arrival', validity: '15 days', fee: '2,000 THB', documents: ['Passport', 'Return ticket', 'Hotel booking'], applyUrl: '' },
                'Nepal': { required: false, type: 'Visa-free', processingTime: 'N/A', validity: 'Unlimited', fee: 'Free', documents: ['Valid ID'], applyUrl: '', message: 'Indian citizens do not require a visa for Nepal.' },
                'India': { required: false, type: 'N/A', processingTime: 'N/A', validity: 'N/A', fee: 'N/A', documents: [], applyUrl: '', message: 'No visa required for domestic events.' }
            }
        };

        const countryRules = visaRules[fromCountry] || {};
        const rule = countryRules[toCountry] || {
            required: true,
            type: 'Business Visa',
            processingTime: '10-15 days',
            validity: '30-90 days',
            fee: 'Varies',
            documents: ['Valid passport', 'Invitation letter', 'Hotel booking', 'Return ticket'],
            applyUrl: '',
            message: 'Please check with the embassy for specific visa requirements.'
        };

        if (!rule.message) {
            rule.message = rule.required 
                ? `You will need a ${rule.type} to attend this event.` 
                : 'You can enter without a visa.';
        }

        return rule;
    }

    // ===== FEATURE 8: BUDGET CALCULATOR =====
    openBudgetCalculator(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        // Initialize budget if not exists
        if (!this.budgets[eventId]) {
            const visaInfo = this.getVisaInfo(this.userPreferences.passportCountry, event.country);
            const visaFee = visaInfo.required ? this.parseFee(visaInfo.fee) : 0;

            this.budgets[eventId] = {
                visa: visaFee,
                insurance: 30,
                localTransport: 50,
                meals: 100,
                miscellaneous: 50,
                customItems: []
            };
        }

        this.renderBudgetCalculator(eventId, event);
    }

    parseFee(feeStr) {
        const match = feeStr.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(',', '')) : 0;
    }

    renderBudgetCalculator(eventId, event) {
        const budget = this.budgets[eventId];
        const total = budget.visa + budget.insurance + budget.localTransport + budget.meals + budget.miscellaneous + 
                     budget.customItems.reduce((sum, item) => sum + item.amount, 0);

        const modal = document.getElementById('budgetCalculatorModal');
        document.getElementById('budgetEventName').textContent = event.name;
        
        const budgetHTML = `
            <div class="mb-3">
                <h6>Complimentary (Covered by Organizer)</h6>
                <div class="bg-success bg-opacity-10 p-3 rounded">
                    ${event.benefits.hotel ? '<div>✅ Hotel Accommodation: <strong>FREE</strong></div>' : ''}
                    ${event.benefits.airfare ? '<div>✅ Return Airfare: <strong>FREE</strong></div>' : ''}
                </div>
            </div>

            <div class="mb-3">
                <h6>Your Estimated Costs</h6>
                <table class="table table-sm">
                    <tr>
                        <td>Visa Fees</td>
                        <td>
                            <input type="number" class="form-control form-control-sm" value="${budget.visa}" 
                                   onchange="featuresManager.updateBudgetItem('${eventId}', 'visa', this.value)">
                        </td>
                    </tr>
                    <tr>
                        <td>Travel Insurance</td>
                        <td>
                            <input type="number" class="form-control form-control-sm" value="${budget.insurance}" 
                                   onchange="featuresManager.updateBudgetItem('${eventId}', 'insurance', this.value)">
                        </td>
                    </tr>
                    <tr>
                        <td>Local Transport</td>
                        <td>
                            <input type="number" class="form-control form-control-sm" value="${budget.localTransport}" 
                                   onchange="featuresManager.updateBudgetItem('${eventId}', 'localTransport', this.value)">
                        </td>
                    </tr>
                    <tr>
                        <td>Meals (not covered)</td>
                        <td>
                            <input type="number" class="form-control form-control-sm" value="${budget.meals}" 
                                   onchange="featuresManager.updateBudgetItem('${eventId}', 'meals', this.value)">
                        </td>
                    </tr>
                    <tr>
                        <td>Miscellaneous</td>
                        <td>
                            <input type="number" class="form-control form-control-sm" value="${budget.miscellaneous}" 
                                   onchange="featuresManager.updateBudgetItem('${eventId}', 'miscellaneous', this.value)">
                        </td>
                    </tr>
                    ${budget.customItems.map((item, idx) => `
                        <tr>
                            <td>${item.name}</td>
                            <td class="d-flex gap-1">
                                <input type="number" class="form-control form-control-sm" value="${item.amount}" 
                                       onchange="featuresManager.updateCustomBudgetItem('${eventId}', ${idx}, this.value)">
                                <button class="btn btn-sm btn-danger" onclick="featuresManager.removeCustomBudgetItem('${eventId}', ${idx})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
                
                <button class="btn btn-sm btn-outline-primary" onclick="featuresManager.addCustomBudgetItem('${eventId}')">
                    <i class="bi bi-plus-circle"></i> Add Custom Item
                </button>
            </div>

            <div class="alert alert-primary">
                <h5 class="mb-0">💰 Total Estimated Budget: <strong>$${total}</strong></h5>
            </div>

            <div class="mt-3">
                <button class="btn btn-success" onclick="featuresManager.exportBudgetPDF('${eventId}')">
                    <i class="bi bi-file-pdf"></i> Export Budget PDF
                </button>
            </div>
        `;

        document.getElementById('budgetCalculatorContent').innerHTML = budgetHTML;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    updateBudgetItem(eventId, field, value) {
        this.budgets[eventId][field] = parseFloat(value) || 0;
        this.saveToStorage();
        
        const event = this.getEvent(eventId);
        this.renderBudgetCalculator(eventId, event);
    }

    addCustomBudgetItem(eventId) {
        const name = prompt('Item name:');
        if (name) {
            const amount = parseFloat(prompt('Amount ($):')) || 0;
            this.budgets[eventId].customItems.push({ name, amount });
            this.saveToStorage();
            
            const event = this.getEvent(eventId);
            this.renderBudgetCalculator(eventId, event);
        }
    }

    updateCustomBudgetItem(eventId, index, value) {
        this.budgets[eventId].customItems[index].amount = parseFloat(value) || 0;
        this.saveToStorage();
        
        const event = this.getEvent(eventId);
        this.renderBudgetCalculator(eventId, event);
    }

    removeCustomBudgetItem(eventId, index) {
        this.budgets[eventId].customItems.splice(index, 1);
        this.saveToStorage();
        
        const event = this.getEvent(eventId);
        this.renderBudgetCalculator(eventId, event);
    }

    exportBudgetPDF(eventId) {
        this.showToast('📄 Budget PDF export feature coming soon!', 'info');
        // In production, use jsPDF library
    }

    // ===== FEATURE 11: ROI TRACKER =====
    openROITracker(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        if (!this.roiData[eventId]) {
            this.roiData[eventId] = {
                contactsMade: 0,
                leadsGenerated: 0,
                meetingsScheduled: 0,
                dealsClosed: 0,
                revenueGenerated: 0,
                notes: ''
            };
        }

        this.renderROITracker(eventId, event);
    }

    renderROITracker(eventId, event) {
        const roi = this.roiData[eventId];
        const budget = this.budgets[eventId];
        const totalCost = budget ? Object.values(budget).reduce((sum, val) => 
            typeof val === 'number' ? sum + val : sum, 0) : 0;
        const roiPercentage = totalCost > 0 ? Math.round(((roi.revenueGenerated - totalCost) / totalCost) * 100) : 0;

        const modal = document.getElementById('roiTrackerModal');
        document.getElementById('roiEventName').textContent = event.name;
        
        const roiHTML = `
            <div class="row mb-3">
                <div class="col-md-3">
                    <label class="form-label">Contacts Made</label>
                    <input type="number" class="form-control" value="${roi.contactsMade}" 
                           onchange="featuresManager.updateROI('${eventId}', 'contactsMade', this.value)">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Leads Generated</label>
                    <input type="number" class="form-control" value="${roi.leadsGenerated}" 
                           onchange="featuresManager.updateROI('${eventId}', 'leadsGenerated', this.value)">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Meetings Scheduled</label>
                    <input type="number" class="form-control" value="${roi.meetingsScheduled}" 
                           onchange="featuresManager.updateROI('${eventId}', 'meetingsScheduled', this.value)">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Deals Closed</label>
                    <input type="number" class="form-control" value="${roi.dealsClosed}" 
                           onchange="featuresManager.updateROI('${eventId}', 'dealsClosed', this.value)">
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">Revenue Generated ($)</label>
                <input type="number" class="form-control" value="${roi.revenueGenerated}" 
                       onchange="featuresManager.updateROI('${eventId}', 'revenueGenerated', this.value)">
            </div>

            <div class="mb-3">
                <label class="form-label">Notes</label>
                <textarea class="form-control" rows="3" 
                          onchange="featuresManager.updateROI('${eventId}', 'notes', this.value)">${roi.notes}</textarea>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="alert alert-info">
                        <strong>Total Investment:</strong> $${totalCost}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="alert ${roiPercentage > 0 ? 'alert-success' : 'alert-danger'}">
                        <strong>ROI:</strong> ${roiPercentage > 0 ? '+' : ''}${roiPercentage}%
                    </div>
                </div>
            </div>

            ${roi.revenueGenerated > 0 ? `
                <div class="alert alert-success">
                    <h5>🎉 Success!</h5>
                    <p class="mb-0">You generated <strong>$${roi.revenueGenerated}</strong> from an investment of <strong>$${totalCost}</strong></p>
                    <p class="mb-0">Net Profit: <strong>$${roi.revenueGenerated - totalCost}</strong></p>
                </div>
            ` : ''}
        `;

        document.getElementById('roiTrackerContent').innerHTML = roiHTML;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    updateROI(eventId, field, value) {
        if (field === 'notes') {
            this.roiData[eventId][field] = value;
        } else {
            this.roiData[eventId][field] = parseFloat(value) || 0;
        }
        this.saveToStorage();
        
        const event = this.getEvent(eventId);
        this.renderROITracker(eventId, event);
    }

    // ===== FEATURE 12: EVENT PORTFOLIO =====
    openEventPortfolio(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return;

        if (!this.portfolios[eventId]) {
            this.portfolios[eventId] = {
                photos: [],
                notes: '',
                highlights: []
            };
        }

        this.renderEventPortfolio(eventId, event);
    }

    renderEventPortfolio(eventId, event) {
        const portfolio = this.portfolios[eventId];

        const modal = document.getElementById('eventPortfolioModal');
        document.getElementById('portfolioEventName').textContent = event.name;
        
        const portfolioHTML = `
            <div class="mb-3">
                <label class="btn btn-primary">
                    <i class="bi bi-camera"></i> Upload Photos
                    <input type="file" accept="image/*" multiple style="display: none;" 
                           onchange="featuresManager.uploadPortfolioPhotos('${eventId}', this.files)">
                </label>
            </div>

            <div class="row g-2 mb-3">
                ${portfolio.photos.length > 0 ? portfolio.photos.map((photo, idx) => `
                    <div class="col-md-3 col-6">
                        <div class="portfolio-photo-item">
                            <img src="${photo.url}" class="img-fluid rounded" alt="Event photo">
                            <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" 
                                    onclick="featuresManager.deletePortfolioPhoto('${eventId}', ${idx})">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                `).join('') : '<p class="text-muted">No photos uploaded yet</p>'}
            </div>

            <div class="mb-3">
                <label class="form-label">Event Notes</label>
                <textarea class="form-control" rows="4" 
                          onchange="featuresManager.updatePortfolioNotes('${eventId}', this.value)">${portfolio.notes}</textarea>
            </div>

            <div class="mb-3">
                <label class="form-label">Key Highlights</label>
                ${portfolio.highlights.map((h, idx) => `
                    <div class="input-group mb-2">
                        <input type="text" class="form-control" value="${h}" readonly>
                        <button class="btn btn-outline-danger" onclick="featuresManager.deleteHighlight('${eventId}', ${idx})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `).join('')}
                <button class="btn btn-sm btn-outline-primary" onclick="featuresManager.addHighlight('${eventId}')">
                    <i class="bi bi-plus-circle"></i> Add Highlight
                </button>
            </div>

            <div class="mt-3">
                <button class="btn btn-success" onclick="featuresManager.exportPortfolio('${eventId}')">
                    <i class="bi bi-file-pdf"></i> Export Portfolio PDF
                </button>
            </div>
        `;

        document.getElementById('eventPortfolioContent').innerHTML = portfolioHTML;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    uploadPortfolioPhotos(eventId, files) {
        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.portfolios[eventId].photos.push({
                    url: e.target.result,
                    name: file.name,
                    uploadedAt: new Date().toISOString()
                });
                this.saveToStorage();
                
                const event = this.getEvent(eventId);
                this.renderEventPortfolio(eventId, event);
            };
            reader.readAsDataURL(file);
        }
    }

    deletePortfolioPhoto(eventId, index) {
        if (confirm('Delete this photo?')) {
            this.portfolios[eventId].photos.splice(index, 1);
            this.saveToStorage();
            
            const event = this.getEvent(eventId);
            this.renderEventPortfolio(eventId, event);
        }
    }

    updatePortfolioNotes(eventId, notes) {
        this.portfolios[eventId].notes = notes;
        this.saveToStorage();
    }

    addHighlight(eventId) {
        const highlight = prompt('Add a highlight:');
        if (highlight) {
            this.portfolios[eventId].highlights.push(highlight);
            this.saveToStorage();
            
            const event = this.getEvent(eventId);
            this.renderEventPortfolio(eventId, event);
        }
    }

    deleteHighlight(eventId, index) {
        this.portfolios[eventId].highlights.splice(index, 1);
        this.saveToStorage();
        
        const event = this.getEvent(eventId);
        this.renderEventPortfolio(eventId, event);
    }

    exportPortfolio(eventId) {
        this.showToast('📄 Portfolio export feature coming soon!', 'info');
    }

    // ===== FEATURE 13: AI EVENT MATCHER =====
    getAIRecommendations() {
        const allEvents = window.app ? window.app.events : [];
        const myEvents = window.app ? window.app.myEvents : [];
        
        // Simple scoring algorithm
        const scored = allEvents.map(event => {
            let score = 0;
            
            // Premium events get higher score
            if (event.benefits.hotel && event.benefits.airfare) score += 30;
            
            // Match user industries
            if (this.userPreferences.industries.includes(event.industry)) score += 25;
            
            // Match preferred regions
            if (this.userPreferences.preferredRegions.includes(event.country)) score += 20;
            
            // Events with upcoming deadlines get priority
            if (event.deadline) {
                const daysToDeadline = Math.ceil((new Date(event.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysToDeadline > 0 && daysToDeadline <= 30) score += 15;
            }
            
            // Similar to previously attended events
            const similarAttended = myEvents.filter(me => 
                me.industry === event.industry || me.country === event.country
            ).length;
            score += similarAttended * 5;
            
            // Recently added events
            const daysSinceAdded = event.createdAt ? 
                Math.ceil((new Date() - new Date(event.createdAt)) / (1000 * 60 * 60 * 24)) : 999;
            if (daysSinceAdded <= 7) score += 10;
            
            return { ...event, aiScore: score };
        });
        
        // Sort by score and return top 5
        return scored.sort((a, b) => b.aiScore - a.aiScore).slice(0, 5);
    }

    renderAIRecommendations() {
        const recommendations = this.getAIRecommendations();
        const container = document.getElementById('aiRecommendations');
        
        if (!container) return;

        if (recommendations.length === 0) {
            container.innerHTML = '<p class="text-muted">No recommendations available. Search for events first.</p>';
            return;
        }

        container.innerHTML = recommendations.map(event => `
            <div class="recommendation-card mb-3 p-3 border rounded">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6>${event.name}</h6>
                        <small class="text-muted">
                            <i class="bi bi-geo-alt"></i> ${event.city}, ${event.country} | 
                            <i class="bi bi-calendar"></i> ${this.formatDate(event.date)}
                        </small>
                        <div class="mt-2">
                            ${event.benefits.hotel ? '<span class="badge bg-info me-1">Hotel</span>' : ''}
                            ${event.benefits.airfare ? '<span class="badge bg-success">Airfare</span>' : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="badge bg-primary">
                            ${event.aiScore}% Match
                        </div>
                    </div>
                </div>
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary" onclick="app.showEventDetails('${event.id}')">
                        <i class="bi bi-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-success" onclick="app.markInterested('${event.id}')">
                        <i class="bi bi-star"></i> Save
                    </button>
                </div>
            </div>
        `).join('');
    }

    saveUserPreferences() {
        const passport = document.getElementById('userPassportCountry').value;
        const industries = Array.from(document.querySelectorAll('input[name="userIndustries"]:checked'))
            .map(cb => cb.value);
        const regions = Array.from(document.querySelectorAll('input[name="userRegions"]:checked'))
            .map(cb => cb.value);

        this.userPreferences = {
            passportCountry: passport,
            industries: industries,
            preferredRegions: regions
        };

        this.saveToStorage();
        this.showToast('✅ Preferences saved! AI recommendations updated.', 'success');
        this.renderAIRecommendations();
    }

    loadUserPreferences() {
        const passportSelect = document.getElementById('userPassportCountry');
        if (passportSelect) {
            passportSelect.value = this.userPreferences.passportCountry;
        }

        this.userPreferences.industries.forEach(industry => {
            const checkbox = document.querySelector(`input[name="userIndustries"][value="${industry}"]`);
            if (checkbox) checkbox.checked = true;
        });

        this.userPreferences.preferredRegions.forEach(region => {
            const checkbox = document.querySelector(`input[name="userRegions"][value="${region}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Utility functions
    getEvent(eventId) {
        if (window.app) {
            return window.app.events.find(e => e.id === eventId) || 
                   window.savedManager.savedRecords.find(e => e.id === eventId);
        }
        return null;
    }

    getCountryFlag(country) {
        const flags = {
            'India': '🇮🇳', 'UAE': '🇦🇪', 'USA': '🇺🇸', 'UK': '🇬🇧',
            'Germany': '🇩🇪', 'Singapore': '🇸🇬', 'China': '🇨🇳',
            'Thailand': '🇹🇭', 'Japan': '🇯🇵', 'France': '🇫🇷',
            'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Nepal': '🇳🇵',
            'Sri Lanka': '🇱🇰', 'Bangladesh': '🇧🇩'
        };
        return flags[country] || '🌍';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize
let featuresManager;
document.addEventListener('DOMContentLoaded', () => {
    featuresManager = new FeaturesManager();
    window.featuresManager = featuresManager;
});