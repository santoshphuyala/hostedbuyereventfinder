/**
 * Push Notifications Manager
 * Feature 3: Browser Push Notifications
 */

class NotificationsManager {
    constructor() {
        this.permission = 'default';
        this.init();
    }

    init() {
        this.checkPermission();
        this.setupEventListeners();
        this.scheduleNotifications();
    }

    checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return false;
        }

        const permission = await Notification.requestPermission();
        this.permission = permission;
        
        if (permission === 'granted') {
            this.showToast('✅ Notifications enabled! You\'ll receive deadline alerts.', 'success');
            this.sendTestNotification();
            return true;
        } else {
            this.showToast('❌ Notifications disabled. Enable them in browser settings.', 'warning');
            return false;
        }
    }

    sendTestNotification() {
        if (this.permission === 'granted') {
            new Notification('🎉 Notifications Enabled!', {
                body: 'You will now receive alerts for event deadlines',
                icon: 'icon-192.png',
                badge: 'icon-192.png',
                tag: 'test-notification'
            });
        }
    }

    sendDeadlineNotification(event, daysLeft) {
        if (this.permission !== 'granted') return;

        const urgency = daysLeft <= 3 ? '⚠️ URGENT:' : '📅';
        
        new Notification(`${urgency} Event Deadline Alert`, {
            body: `${event.name} registration closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`,
            icon: 'icon-192.png',
            badge: 'icon-192.png',
            tag: `deadline-${event.id}`,
            requireInteraction: daysLeft <= 3,
            actions: [
                { action: 'view', title: 'View Event' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        });
    }

    sendEventReminderNotification(event, daysLeft) {
        if (this.permission !== 'granted') return;

        new Notification(`📅 Upcoming Event`, {
            body: `${event.name} starts in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}! ${event.city}, ${event.country}`,
            icon: 'icon-192.png',
            badge: 'icon-192.png',
            tag: `event-${event.id}`
        });
    }

    scheduleNotifications() {
        // Check every hour for deadline alerts
        setInterval(() => {
            this.checkDeadlines();
        }, 3600000); // 1 hour

        // Initial check
        setTimeout(() => this.checkDeadlines(), 5000);
    }

    checkDeadlines() {
        if (this.permission !== 'granted') return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check saved records
        if (window.savedManager) {
            window.savedManager.savedRecords.forEach(event => {
                if (event.deadline) {
                    const deadlineDate = new Date(event.deadline);
                    const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

                    // Send notifications at 7, 3, and 1 day before deadline
                    if ([7, 3, 1].includes(daysUntilDeadline)) {
                        const notifiedKey = `notified-${event.id}-${daysUntilDeadline}`;
                        if (!localStorage.getItem(notifiedKey)) {
                            this.sendDeadlineNotification(event, daysUntilDeadline);
                            localStorage.setItem(notifiedKey, 'true');
                        }
                    }
                }

                // Event reminder 3 days before event
                const eventDate = new Date(event.date);
                const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysUntilEvent === 3) {
                    const notifiedKey = `event-notified-${event.id}`;
                    if (!localStorage.getItem(notifiedKey)) {
                        this.sendEventReminderNotification(event, daysUntilEvent);
                        localStorage.setItem(notifiedKey, 'true');
                    }
                }
            });
        }
    }

    setupEventListeners() {
        const enableBtn = document.getElementById('enableNotificationsBtn');
        if (enableBtn) {
            enableBtn.addEventListener('click', () => this.requestPermission());
        }
    }

    showToast(message, type) {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        }
    }
}

// Initialize
let notificationsManager;
document.addEventListener('DOMContentLoaded', () => {
    notificationsManager = new NotificationsManager();
    window.notificationsManager = notificationsManager;
});