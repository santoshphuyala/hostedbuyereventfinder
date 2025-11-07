/**
 * Saved Records Manager
 * Manages saved events with CRUD, Import/Export, and Reminders
 * Designed by Santosh Phuyal
 */

class SavedRecordsManager {
    constructor() {
        this.savedRecords = [];
        this.customEvents = []; // User-submitted events for improving search
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('savedRecords');
        const customStored = localStorage.getItem('customEvents');
        
        if (stored) {
            this.savedRecords = JSON.parse(stored);
        }
        
        if (customStored) {
            this.customEvents = JSON.parse(customStored);
        }
    }

    saveToStorage() {
        localStorage.setItem('savedRecords', JSON.stringify(this.savedRecords));
        localStorage.setItem('customEvents', JSON.stringify(this.customEvents));
        localStorage.setItem('savedRecordsLastUpdate', new Date().toISOString());
    }

    setupEventListeners() {
        // Save All button
        const saveAllBtn = document.getElementById('saveAllBtn');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveAllCurrentEvents());
        }

        // Export Saved Records
        const exportSavedJSON = document.getElementById('exportSavedJSON');
        if (exportSavedJSON) {
            exportSavedJSON.addEventListener('click', () => this.exportJSON());
        }

        const exportSavedExcel = document.getElementById('exportSavedExcel');
        if (exportSavedExcel) {
            exportSavedExcel.addEventListener('click', () => this.exportExcel());
        }

        // Import Saved Records
        const importSavedJSON = document.getElementById('importSavedJSON');
        if (importSavedJSON) {
            importSavedJSON.addEventListener('change', (e) => this.importJSON(e));
        }

        const importSavedExcel = document.getElementById('importSavedExcel');
        if (importSavedExcel) {
            importSavedExcel.addEventListener('change', (e) => this.importExcel(e));
        }

        // Custom Event Submit
        const submitCustomEventBtn = document.getElementById('submitCustomEventBtn');
        if (submitCustomEventBtn) {
            submitCustomEventBtn.addEventListener('click', () => this.submitCustomEvent());
        }

        // Sort functionality
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', () => {
                const sortBy = header.dataset.sort;
                this.sortRecords(sortBy);
            });
        });

        // Search within saved records
        const searchSaved = document.getElementById('searchSavedRecords');
        if (searchSaved) {
            searchSaved.addEventListener('keyup', () => this.filterSavedRecords());
        }
    }

    /**
     * Save all currently displayed events
     */
    saveAllCurrentEvents() {
        if (!window.app) {
            this.showToast('App not initialized', 'danger');
            return;
        }

        const currentEvents = window.app.getFilteredEvents();
        
        if (currentEvents.length === 0) {
            this.showToast('No events to save. Please search for events first.', 'warning');
            return;
        }

        let newCount = 0;
        currentEvents.forEach(event => {
            if (this.addRecord(event)) {
                newCount++;
            }
        });

        this.saveToStorage();
        this.renderSavedRecords();
        
        if (newCount > 0) {
            this.showToast(`Saved ${newCount} new events! (${currentEvents.length - newCount} duplicates skipped)`, 'success');
        } else {
            this.showToast('All events were already saved.', 'info');
        }
    }

    /**
     * Add a single record (checks for duplicates)
     */
    addRecord(event) {
        // Check for duplicates
        const exists = this.savedRecords.some(record => 
            record.name === event.name && record.date === event.date
        );

        if (exists) {
            return false; // Duplicate, not added
        }

        const record = {
            id: event.id || this.generateId(),
            name: event.name,
            country: event.country,
            city: event.city,
            date: event.date,
            deadline: event.deadline,
            industry: event.industry,
            organizer: event.organizer || 'N/A',
            organizerUrl: event.organizerUrl || '',
            website: event.website || '',
            registrationUrl: event.registrationUrl || '',
            email: event.email || '',
            phone: event.phone || '',
            benefits: event.benefits,
            documents: event.documents || '',
            description: event.description || '',
            savedAt: new Date().toISOString(),
            notes: ''
        };

        this.savedRecords.push(record);
        return true; // Added successfully
    }

    /**
     * Update a record
     */
    updateRecord(id, updatedData) {
        const index = this.savedRecords.findIndex(r => r.id === id);
        if (index > -1) {
            this.savedRecords[index] = { ...this.savedRecords[index], ...updatedData };
            this.saveToStorage();
            this.renderSavedRecords();
            this.showToast('Record updated successfully', 'success');
        }
    }

    /**
     * Delete a record
     */
    deleteRecord(id) {
        if (confirm('Are you sure you want to delete this saved record?')) {
            this.savedRecords = this.savedRecords.filter(r => r.id !== id);
            this.saveToStorage();
            this.renderSavedRecords();
            this.showToast('Record deleted', 'info');
        }
    }

    /**
     * Render saved records in table format
     */
    renderSavedRecords() {
        const container = document.getElementById('savedRecordsTable');
        if (!container) return;

        const tbody = container.querySelector('tbody');
        if (!tbody) return;

        if (this.savedRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                        <p class="mt-3 text-muted">No saved records yet. Search for events and click "Save All".</p>
                    </td>
                </tr>
            `;
            document.getElementById('savedRecordsCount').textContent = '0';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tbody.innerHTML = this.savedRecords.map((record, index) => {
            const eventDate = new Date(record.date);
            const deadlineDate = record.deadline ? new Date(record.deadline) : null;
            const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
            const daysUntilDeadline = deadlineDate ? Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24)) : null;

            // Determine deadline urgency
            let deadlineClass = '';
            let deadlineIcon = '';
            let deadlineText = '';
            
            if (deadlineDate) {
                if (daysUntilDeadline < 0) {
                    deadlineClass = 'text-muted';
                    deadlineIcon = '<i class="bi bi-x-circle"></i>';
                    deadlineText = 'Expired';
                } else if (daysUntilDeadline <= 3) {
                    deadlineClass = 'text-danger fw-bold';
                    deadlineIcon = '<i class="bi bi-exclamation-triangle-fill"></i>';
                    deadlineText = `${daysUntilDeadline} days left!`;
                } else if (daysUntilDeadline <= 7) {
                    deadlineClass = 'text-warning fw-bold';
                    deadlineIcon = '<i class="bi bi-clock-fill"></i>';
                    deadlineText = `${daysUntilDeadline} days left`;
                } else if (daysUntilDeadline <= 30) {
                    deadlineClass = 'text-info';
                    deadlineIcon = '<i class="bi bi-clock"></i>';
                    deadlineText = `${daysUntilDeadline} days left`;
                } else {
                    deadlineClass = 'text-secondary';
                    deadlineIcon = '<i class="bi bi-calendar"></i>';
                    deadlineText = this.formatDate(record.deadline);
                }
            }

            return `
                <tr class="saved-record-row ${daysUntilEvent < 0 ? 'past-event' : ''}">
                    <td>${index + 1}</td>
                    <td>
                        <strong>${record.name}</strong>
                        <br>
                        <small class="text-muted">
                            <i class="bi bi-geo-alt"></i> ${record.city}, ${record.country}
                        </small>
                        ${record.industry ? `<br><span class="badge bg-secondary">${record.industry}</span>` : ''}
                    </td>
                    <td>
                        ${record.organizer}
                        ${record.organizerUrl ? `<br><a href="${record.organizerUrl}" target="_blank" class="small"><i class="bi bi-link-45deg"></i> Website</a>` : ''}
                    </td>
                    <td>
                        ${record.website ? `<a href="${record.website}" target="_blank" class="btn btn-sm btn-outline-info mb-1"><i class="bi bi-globe"></i> Website</a><br>` : ''}
                        ${record.registrationUrl ? `<a href="${record.registrationUrl}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil-square"></i> Register</a>` : '<span class="text-muted">N/A</span>'}
                    </td>
                    <td>
                        <strong>${this.formatDate(record.date)}</strong>
                        <br>
                        <small class="${daysUntilEvent < 0 ? 'text-muted' : 'text-primary'}">
                            ${daysUntilEvent < 0 ? 'Past event' : `${daysUntilEvent} days away`}
                        </small>
                    </td>
                    <td class="${deadlineClass}">
                        ${record.deadline ? `
                            ${deadlineIcon} 
                            <strong>${deadlineText}</strong>
                            <br>
                            <small>${this.formatDate(record.deadline)}</small>
                        ` : '<span class="text-muted">N/A</span>'}
                    </td>
                    <td>
                        ${record.benefits.hotel ? '<span class="badge bg-info me-1">Hotel</span>' : ''}
                        ${record.benefits.airfare ? '<span class="badge bg-success">Airfare</span>' : ''}
                    </td>
                    <td>
                        <small class="text-muted">${this.formatDateTime(record.savedAt)}</small>
                    </td>
                    <td>
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="savedManager.viewDetails('${record.id}')">
                                <i class="bi bi-eye"></i> View
                            </button>
                            <button class="btn btn-outline-warning" onclick="savedManager.editNotes('${record.id}')">
                                <i class="bi bi-pencil"></i> Notes
                            </button>
                            <button class="btn btn-outline-danger" onclick="savedManager.deleteRecord('${record.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('savedRecordsCount').textContent = this.savedRecords.length;
        this.updateDeadlineStats();
    }

    /**
     * Update deadline statistics
     */
    updateDeadlineStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const urgent = this.savedRecords.filter(r => {
            if (!r.deadline) return false;
            const days = Math.ceil((new Date(r.deadline) - today) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 7;
        }).length;

        const upcoming = this.savedRecords.filter(r => {
            const days = Math.ceil((new Date(r.date) - today) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
        }).length;

        document.getElementById('urgentDeadlines').textContent = urgent;
        document.getElementById('upcomingEventsCount').textContent = upcoming;
    }

    /**
     * View details
     */
    viewDetails(id) {
        const record = this.savedRecords.find(r => r.id === id);
        if (!record) return;

        const modal = new bootstrap.Modal(document.getElementById('savedRecordDetailsModal'));
        document.getElementById('savedRecordDetailsContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="bi bi-calendar-event"></i> Event Information</h6>
                    <p><strong>Name:</strong> ${record.name}</p>
                    <p><strong>Location:</strong> ${record.city}, ${record.country}</p>
                    <p><strong>Date:</strong> ${this.formatDate(record.date)}</p>
                    ${record.deadline ? `<p><strong>Deadline:</strong> ${this.formatDate(record.deadline)}</p>` : ''}
                    ${record.industry ? `<p><strong>Industry:</strong> ${record.industry}</p>` : ''}
                </div>
                <div class="col-md-6">
                    <h6><i class="bi bi-building"></i> Organizer</h6>
                    <p><strong>${record.organizer}</strong></p>
                    ${record.organizerUrl ? `<p><a href="${record.organizerUrl}" target="_blank">Organizer Website</a></p>` : ''}
                    ${record.website ? `<p><a href="${record.website}" target="_blank">Event Website</a></p>` : ''}
                    ${record.registrationUrl ? `<p><a href="${record.registrationUrl}" target="_blank" class="btn btn-primary btn-sm">Register Now</a></p>` : ''}
                </div>
                <div class="col-12 mt-3">
                    <h6><i class="bi bi-gift"></i> Benefits</h6>
                    <p>
                        ${record.benefits.hotel ? '<span class="badge bg-info me-1">Complimentary Hotel</span>' : ''}
                        ${record.benefits.airfare ? '<span class="badge bg-success">Complimentary Airfare</span>' : ''}
                    </p>
                </div>
                ${record.description ? `
                    <div class="col-12 mt-3">
                        <h6><i class="bi bi-info-circle"></i> Description</h6>
                        <p>${record.description}</p>
                    </div>
                ` : ''}
                ${record.documents ? `
                    <div class="col-12 mt-3">
                        <h6><i class="bi bi-file-text"></i> Required Documents</h6>
                        <ul>
                            ${record.documents.split(',').map(doc => `<li>${doc.trim()}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${record.notes ? `
                    <div class="col-12 mt-3">
                        <h6><i class="bi bi-sticky"></i> Your Notes</h6>
                        <p class="bg-light p-3 rounded">${record.notes}</p>
                    </div>
                ` : ''}
                <div class="col-12 mt-3">
                    <small class="text-muted">Saved on: ${this.formatDateTime(record.savedAt)}</small>
                </div>
            </div>
        `;
        modal.show();
    }

    /**
     * Edit notes
     */
    editNotes(id) {
        const record = this.savedRecords.find(r => r.id === id);
        if (!record) return;

        const notes = prompt('Add notes for this event:', record.notes || '');
        if (notes !== null) {
            this.updateRecord(id, { notes: notes });
        }
    }

    /**
     * Sort records
     */
    sortRecords(sortBy) {
        this.savedRecords.sort((a, b) => {
            switch(sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'date':
                    return new Date(a.date) - new Date(b.date);
                case 'deadline':
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                case 'organizer':
                    return a.organizer.localeCompare(b.organizer);
                default:
                    return 0;
            }
        });
        this.renderSavedRecords();
    }

    /**
     * Filter saved records
     */
    filterSavedRecords() {
        const search = document.getElementById('searchSavedRecords').value.toLowerCase();
        const rows = document.querySelectorAll('.saved-record-row');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    }

    /**
     * Export to JSON
     */
    exportJSON() {
        const data = {
            savedRecords: this.savedRecords,
            exportedAt: new Date().toISOString(),
            totalRecords: this.savedRecords.length,
            exportedBy: 'Hosted Buyer Event Finder - Saved Records',
            version: '2.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saved-records-${this.getTimestamp()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Saved records exported as JSON', 'success');
    }

    /**
     * Export to Excel
     */
    exportExcel() {
        const ws_data = [
            ['SN', 'Event Name', 'Country', 'City', 'Organizer', 'Industry', 'Event Date', 
             'Registration Deadline', 'Days Until Event', 'Days Until Deadline', 
             'Hotel', 'Airfare', 'Website', 'Registration URL', 'Email', 'Documents', 'Notes', 'Saved On']
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.savedRecords.forEach((record, index) => {
            const eventDate = new Date(record.date);
            const deadlineDate = record.deadline ? new Date(record.deadline) : null;
            const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
            const daysUntilDeadline = deadlineDate ? Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24)) : 'N/A';

            ws_data.push([
                index + 1,
                record.name,
                record.country,
                record.city,
                record.organizer,
                record.industry || 'N/A',
                record.date,
                record.deadline || 'N/A',
                daysUntilEvent,
                daysUntilDeadline,
                record.benefits.hotel ? 'Yes' : 'No',
                record.benefits.airfare ? 'Yes' : 'No',
                record.website || 'N/A',
                record.registrationUrl || 'N/A',
                record.email || 'N/A',
                record.documents || 'N/A',
                record.notes || '',
                record.savedAt
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Auto-size columns
        ws['!cols'] = [
            { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, 
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, 
            { wch: 40 }, { wch: 30 }, { wch: 20 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Saved Records');

        XLSX.writeFile(wb, `saved-records-${this.getTimestamp()}.xlsx`);
        this.showToast('Saved records exported as Excel', 'success');
    }

    /**
     * Import from JSON (Smart - no duplicates)
     */
    importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!data.savedRecords || !Array.isArray(data.savedRecords)) {
                    throw new Error('Invalid format');
                }

                let newCount = 0;
                let duplicateCount = 0;

                data.savedRecords.forEach(record => {
                    // Check for duplicates
                    const exists = this.savedRecords.some(r => 
                        r.name === record.name && r.date === record.date
                    );

                    if (!exists) {
                        this.savedRecords.push({
                            ...record,
                            id: record.id || this.generateId(),
                            savedAt: record.savedAt || new Date().toISOString()
                        });
                        newCount++;
                    } else {
                        duplicateCount++;
                    }
                });

                this.saveToStorage();
                this.renderSavedRecords();
                
                this.showToast(
                    `Imported ${newCount} new records. ${duplicateCount} duplicates skipped.`, 
                    'success'
                );
            } catch (error) {
                this.showToast('Error importing JSON file: ' + error.message, 'danger');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Import from Excel (Smart - no duplicates)
     */
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

                let newCount = 0;
                let duplicateCount = 0;

                jsonData.forEach(row => {
                    const record = {
                        id: this.generateId(),
                        name: row['Event Name'],
                        country: row['Country'],
                        city: row['City'],
                        organizer: row['Organizer'],
                        industry: row['Industry'] !== 'N/A' ? row['Industry'] : '',
                        date: row['Event Date'],
                        deadline: row['Registration Deadline'] !== 'N/A' ? row['Registration Deadline'] : '',
                        benefits: {
                            hotel: row['Hotel'] === 'Yes',
                            airfare: row['Airfare'] === 'Yes'
                        },
                        website: row['Website'] !== 'N/A' ? row['Website'] : '',
                        registrationUrl: row['Registration URL'] !== 'N/A' ? row['Registration URL'] : '',
                        email: row['Email'] !== 'N/A' ? row['Email'] : '',
                        documents: row['Documents'] !== 'N/A' ? row['Documents'] : '',
                        notes: row['Notes'] || '',
                        savedAt: row['Saved On'] || new Date().toISOString()
                    };

                    // Check for duplicates
                    const exists = this.savedRecords.some(r => 
                        r.name === record.name && r.date === record.date
                    );

                    if (!exists) {
                        this.savedRecords.push(record);
                        newCount++;
                    } else {
                        duplicateCount++;
                    }
                });

                this.saveToStorage();
                this.renderSavedRecords();
                
                this.showToast(
                    `Imported ${newCount} new records. ${duplicateCount} duplicates skipped.`, 
                    'success'
                );
            } catch (error) {
                this.showToast('Error importing Excel file: ' + error.message, 'danger');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Submit custom event
     */
    submitCustomEvent() {
        const customEvent = {
            id: this.generateId(),
            name: document.getElementById('customEventName').value,
            organizer: document.getElementById('customEventOrganizer').value,
            country: document.getElementById('customEventCountry').value,
            city: document.getElementById('customEventCity').value,
            date: document.getElementById('customEventDate').value,
            deadline: document.getElementById('customEventDeadline').value,
            website: document.getElementById('customEventWebsite').value,
            registrationUrl: document.getElementById('customEventRegUrl').value,
            email: document.getElementById('customEventEmail').value,
            industry: document.getElementById('customEventIndustry').value,
            benefits: {
                hotel: document.getElementById('customBenefitHotel').checked,
                airfare: document.getElementById('customBenefitAirfare').checked
            },
            description: document.getElementById('customEventDescription').value,
            documents: document.getElementById('customEventDocuments').value,
            submittedBy: 'User',
            submittedAt: new Date().toISOString()
        };

        // Validate required fields
        if (!customEvent.name || !customEvent.country || !customEvent.city || !customEvent.date) {
            this.showToast('Please fill all required fields', 'warning');
            return;
        }

        // Add to custom events for future search improvement
        this.customEvents.push(customEvent);

        // Also add to saved records
        this.addRecord(customEvent);

        this.saveToStorage();
        this.renderSavedRecords();

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('customEventModal'));
        modal.hide();
        document.getElementById('customEventForm').reset();

        this.showToast('Custom event added successfully! It will be considered in future searches.', 'success');
    }

    /**
     * Get custom events for search engine
     */
    getCustomEventsForSearch() {
        return this.customEvents;
    }

    // Utility functions
    generateId() {
        return 'saved_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize on page load
let savedManager;
document.addEventListener('DOMContentLoaded', () => {
    savedManager = new SavedRecordsManager();
});

window.SavedRecordsManager = SavedRecordsManager;