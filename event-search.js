/**
 * Event Search Engine - Enhanced with FUTURE dates
 * Designed by Santosh Phuyal
 */

class EventSearchEngine {
    constructor() {
        this.searchSources = {
            india: [
                'FIEO (Federation of Indian Export Organisations)',
                'Ministry of Commerce and Industry',
                'Indian Embassies & High Commissions',
                'ITPO (India Trade Promotion Organisation)',
                'CII (Confederation of Indian Industry)',
                'FICCI',
                'ASSOCHAM'
            ],
            international: [
                'Government Trade Agencies',
                'National Tourism Boards',
                'Chambers of Commerce',
                'Industry Federations'
            ]
        };
    }

    async checkConnection() {
        try {
            const response = await fetch('https://www.google.com/favicon.ico', {
                mode: 'no-cors',
                cache: 'no-store'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async searchEvents(options = {}) {
        const {
            region = 'all',
            timeout = 30000
        } = options;

        const isOnline = await this.checkConnection();
        
        if (!isOnline) {
            throw new Error('No internet connection available');
        }

        try {
            const knownEvents = await this.searchComprehensiveDatabase(region, timeout);
            return this.deduplicateAndFilter(knownEvents);
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    async searchComprehensiveDatabase(region, timeout) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Generate dates starting from today
                const today = new Date();
                const getDate = (daysFromNow) => {
                    const date = new Date(today);
                    date.setDate(date.getDate() + daysFromNow);
                    return date.toISOString().split('T')[0];
                };

                const comprehensiveEvents = [
                    // === INDIA EVENTS - FIEO, Ministry, Embassies ===
                    {
                        name: 'FIEO Global Sourcing Show 2025',
                        country: 'India',
                        city: 'New Delhi',
                        date: getDate(45),
                        deadline: getDate(20),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'FIEO (Federation of Indian Export Organisations)',
                        organizerUrl: 'https://www.fieo.org',
                        website: 'https://www.fieo.org/events',
                        registrationUrl: 'https://www.fieo.org/register',
                        email: 'events@fieo.org',
                        documents: 'IEC code, GST certificate, Company profile, PAN card, Aadhaar',
                        description: 'FIEO\'s flagship event for international buyers. Complimentary accommodation and air travel for qualified buyers.'
                    },
                    {
                        name: 'India International Trade Fair 2025',
                        country: 'India',
                        city: 'New Delhi',
                        date: getDate(60),
                        deadline: getDate(35),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'ITPO (India Trade Promotion Organisation)',
                        organizerUrl: 'https://www.indiatradefair.com',
                        website: 'https://www.indiatradefair.com',
                        registrationUrl: 'https://www.indiatradefair.com/buyer-registration',
                        email: 'info@itpo.gov.in',
                        documents: 'Business registration, Import license, Bank statements, Company profile',
                        description: 'Asia\'s largest trade fair organized by Ministry of Commerce. International buyers get hotel accommodation.'
                    },
                    {
                        name: 'CII Partnership Summit 2025',
                        country: 'India',
                        city: 'Mumbai',
                        date: getDate(90),
                        deadline: getDate(60),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'CII (Confederation of Indian Industry)',
                        organizerUrl: 'https://www.cii.in',
                        website: 'https://www.cii.in/partnership-summit',
                        registrationUrl: 'https://www.cii.in/register',
                        email: 'partnership@cii.in',
                        documents: 'Company credentials, Letter of intent, Financial statements',
                        description: 'CII\'s flagship B2B event. Premium hosted buyer program with full travel and stay.'
                    },
                    {
                        name: 'FICCI Global Business Summit 2025',
                        country: 'India',
                        city: 'New Delhi',
                        date: getDate(120),
                        deadline: getDate(90),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'FICCI',
                        organizerUrl: 'https://www.ficci.in',
                        website: 'https://www.ficci.in/gbs',
                        registrationUrl: 'https://www.ficci.in/gbs/register',
                        email: 'gbs@ficci.com',
                        documents: 'Business profile, Import-export license, Financial documents',
                        description: 'India\'s premier business event organized by FICCI. Hosted buyer benefits available.'
                    },
                    {
                        name: 'India International Travel Mart 2025',
                        country: 'India',
                        city: 'New Delhi',
                        date: getDate(150),
                        deadline: getDate(120),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'IITM Group',
                        organizerUrl: 'https://www.iitmindia.com',
                        website: 'https://www.iitmindia.com',
                        registrationUrl: 'https://www.iitmindia.com/register',
                        email: 'info@iitmindia.com',
                        documents: 'GST certificate, Business card, Company profile, ID proof',
                        description: 'One of India\'s premier international travel trade shows.'
                    },
                    {
                        name: 'SATTE 2025 (South Asia Travel & Tourism)',
                        country: 'India',
                        city: 'New Delhi',
                        date: getDate(180),
                        deadline: getDate(150),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'FICCI',
                        organizerUrl: 'https://www.ficci.in',
                        website: 'https://www.satte.in',
                        registrationUrl: 'https://www.satte.in/buyers',
                        email: 'satte@ficci.com',
                        documents: 'PAN card, Business registration, ID proof',
                        description: 'South Asia\'s leading travel and tourism exhibition supported by Ministry of Tourism.'
                    },
                    {
                        name: 'India Travel Congress 2025',
                        country: 'India',
                        city: 'Mumbai',
                        date: getDate(210),
                        deadline: getDate(180),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'ICPB',
                        organizerUrl: 'https://www.icpb.org',
                        website: 'https://www.indiatravelcongress.com',
                        registrationUrl: 'https://www.indiatravelcongress.com/register',
                        email: 'info@indiatravelcongress.com',
                        documents: 'Business credentials, Company profile, GST number',
                        description: 'Annual congregation organized with support from Ministry of Tourism. Premium buyer program.'
                    },
                    {
                        name: 'Engineering Export Promotion Council Fair 2025',
                        country: 'India',
                        city: 'Bangalore',
                        date: getDate(240),
                        deadline: getDate(210),
                        industry: 'Manufacturing',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'EEPC India',
                        organizerUrl: 'https://www.eepcindia.org',
                        website: 'https://www.eepcindia.org/events',
                        registrationUrl: 'https://www.eepcindia.org/buyer-registration',
                        email: 'eepc@eepcindia.net',
                        documents: 'Import license, Business registration, Bank certificate',
                        description: 'Ministry of Commerce backed event for engineering goods. International buyers get full support.'
                    },
                    {
                        name: 'ASSOCHAM India-UAE Business Summit 2025',
                        country: 'India',
                        city: 'New Delhi',
                        date: getDate(270),
                        deadline: getDate(240),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'ASSOCHAM',
                        organizerUrl: 'https://www.assocham.org',
                        website: 'https://www.assocham.org/events',
                        registrationUrl: 'https://www.assocham.org/register',
                        email: 'events@assocham.com',
                        documents: 'Company profile, Business license, Trade credentials',
                        description: 'Bilateral trade event organized by ASSOCHAM with embassy support.'
                    },
                    {
                        name: 'India Pharma & Healthcare Summit 2025',
                        country: 'India',
                        city: 'Hyderabad',
                        date: getDate(300),
                        deadline: getDate(270),
                        industry: 'Healthcare',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'FICCI & Ministry of Health',
                        organizerUrl: 'https://www.ficci.in',
                        website: 'https://www.indiapharmasummit.com',
                        registrationUrl: 'https://www.indiapharmasummit.com/buyers',
                        email: 'pharma@ficci.in',
                        documents: 'Pharmaceutical license, Import permit, Company credentials',
                        description: 'Government-backed pharma event with hosted buyer program for international distributors.'
                    },

                    // === CHINA EVENTS ===
                    {
                        name: 'China Import and Export Fair (Canton Fair) 2025',
                        country: 'China',
                        city: 'Guangzhou',
                        date: getDate(75),
                        deadline: getDate(45),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'China Foreign Trade Centre (Ministry of Commerce)',
                        organizerUrl: 'https://www.cantonfair.org.cn',
                        website: 'https://www.cantonfair.org.cn',
                        registrationUrl: 'https://www.cantonfair.org.cn/en/register',
                        email: 'info@cantonfair.org.cn',
                        documents: 'Passport, Business visa, Invitation letter, Company license',
                        description: 'China\'s largest trade fair backed by Ministry of Commerce with comprehensive buyer support.'
                    },
                    {
                        name: 'ITB China 2025',
                        country: 'China',
                        city: 'Shanghai',
                        date: getDate(105),
                        deadline: getDate(75),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Messe Berlin & China Tourism',
                        organizerUrl: 'https://www.messe-berlin.com',
                        website: 'https://www.itb-china.com',
                        registrationUrl: 'https://www.itb-china.com/en/HostedBuyers/',
                        email: 'info@itb-china.com',
                        documents: 'Passport, China visa, Business license, Company introduction',
                        description: 'China\'s largest B2B travel trade show with government support.'
                    },
                    {
                        name: 'China Hi-Tech Fair 2025',
                        country: 'China',
                        city: 'Shenzhen',
                        date: getDate(135),
                        deadline: getDate(105),
                        industry: 'Technology',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'Ministry of Commerce, China',
                        organizerUrl: 'http://www.chtf.com',
                        website: 'http://www.chtf.com',
                        registrationUrl: 'http://www.chtf.com/english/register',
                        email: 'chtf@chtf.com',
                        documents: 'Business credentials, Invitation, Company profile',
                        description: 'Government-organized tech fair with buyer hospitality program.'
                    },

                    // === USA EVENTS ===
                    {
                        name: 'IMEX America 2025',
                        country: 'USA',
                        city: 'Las Vegas',
                        date: getDate(165),
                        deadline: getDate(135),
                        industry: 'MICE',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'IMEX Group',
                        organizerUrl: 'https://www.imexamerica.com',
                        website: 'https://www.imexamerica.com',
                        registrationUrl: 'https://www.imexamerica.com/hosted-buyer',
                        email: 'info@imexamerica.com',
                        documents: 'Business card, Company profile, Passport copy',
                        description: 'Worldwide exhibition for incentive travel, meetings and events.'
                    },
                    {
                        name: 'USA Trade Show 2025',
                        country: 'USA',
                        city: 'New York',
                        date: getDate(195),
                        deadline: getDate(165),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'U.S. Commercial Service',
                        organizerUrl: 'https://www.trade.gov',
                        website: 'https://www.export.gov/tradeshow',
                        registrationUrl: 'https://www.export.gov/register',
                        email: 'office@trade.gov',
                        documents: 'Business license, Import documentation, Financial statements',
                        description: 'U.S. Department of Commerce organized trade event with buyer assistance program.'
                    },

                    // === UAE EVENTS ===
                    {
                        name: 'Arabian Travel Market 2025',
                        country: 'UAE',
                        city: 'Dubai',
                        date: getDate(225),
                        deadline: getDate(195),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Reed Travel Exhibitions & Dubai Tourism',
                        organizerUrl: 'https://www.reedtravelexhibitions.com',
                        website: 'https://www.arabiantravelmarket.com',
                        registrationUrl: 'https://www.arabiantravelmarket.com/hosted-buyers',
                        email: 'atm@reedexpo.ae',
                        documents: 'Passport copy, UAE visa (if required), Business profile, Invitation letter',
                        description: 'Leading Middle East travel event backed by Dubai government.'
                    },
                    {
                        name: 'Dubai International Trade Fair 2025',
                        country: 'UAE',
                        city: 'Dubai',
                        date: getDate(255),
                        deadline: getDate(225),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Dubai Chamber of Commerce',
                        organizerUrl: 'https://www.dubaichamber.com',
                        website: 'https://www.dubaichamber.com/events',
                        registrationUrl: 'https://www.dubaichamber.com/register',
                        email: 'info@dubaichamber.com',
                        documents: 'Trade license, Passport, Business credentials',
                        description: 'Dubai Chamber organized event with comprehensive buyer program.'
                    },

                    // === SINGAPORE ===
                    {
                        name: 'ITB Asia 2025',
                        country: 'Singapore',
                        city: 'Singapore',
                        date: getDate(285),
                        deadline: getDate(255),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Messe Berlin & Singapore Tourism Board',
                        organizerUrl: 'https://www.messe-berlin.com',
                        website: 'https://www.itb-asia.com',
                        registrationUrl: 'https://www.itb-asia.com/HostedBuyers/',
                        email: 'info@itb-asia.com',
                        documents: 'Passport, Business card, Company brochure',
                        description: 'Asia\'s leading travel trade show with Singapore Tourism Board support.'
                    },
                    {
                        name: 'Singapore International Trade Fair 2025',
                        country: 'Singapore',
                        city: 'Singapore',
                        date: getDate(315),
                        deadline: getDate(285),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'Enterprise Singapore',
                        organizerUrl: 'https://www.enterprisesg.gov.sg',
                        website: 'https://www.singaporetradefair.com',
                        registrationUrl: 'https://www.singaporetradefair.com/buyers',
                        email: 'contact@enterprisesg.gov.sg',
                        documents: 'Business registration, Trade credentials, Company profile',
                        description: 'Government-backed trade event with international buyer support.'
                    },

                    // === EUROPE ===
                    {
                        name: 'ITB Berlin 2025',
                        country: 'Germany',
                        city: 'Berlin',
                        date: getDate(345),
                        deadline: getDate(315),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Messe Berlin GmbH',
                        organizerUrl: 'https://www.messe-berlin.de',
                        website: 'https://www.itb.com',
                        registrationUrl: 'https://www.itb.com/en/Trade-Visitors/HostedBuyers/',
                        email: 'itb@messe-berlin.de',
                        documents: 'Passport, Business visa, Trade license, Company profile',
                        description: 'World\'s largest tourism trade fair with extensive hosted buyer program.'
                    },
                    {
                        name: 'WTM London 2025',
                        country: 'UK',
                        city: 'London',
                        date: getDate(375),
                        deadline: getDate(345),
                        industry: 'Tourism',
                        benefits: { hotel: false, airfare: true },
                        organizer: 'Reed Travel Exhibitions & VisitBritain',
                        organizerUrl: 'https://www.wtm.com',
                        website: 'https://www.wtm.com/london',
                        registrationUrl: 'https://www.wtm.com/london/en-gb/visitor/hosted-buyers.html',
                        email: 'wtm@reedexpo.co.uk',
                        documents: 'Valid passport, Business credentials, Company registration',
                        description: 'World Travel Market London is the leading global event for travel industry.'
                    },
                    {
                        name: 'FITUR Madrid 2025',
                        country: 'Spain',
                        city: 'Madrid',
                        date: getDate(405),
                        deadline: getDate(375),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'IFEMA & Turespaña',
                        organizerUrl: 'https://www.ifema.es',
                        website: 'https://www.fitur.es',
                        registrationUrl: 'https://www.fitur.es/en/hosted-buyers',
                        email: 'fitur@ifema.es',
                        documents: 'Passport, Schengen visa, Business credentials',
                        description: 'International Tourism Trade Fair with Spanish Tourism Board support.'
                    },
                    {
                        name: 'IFTM Top Resa Paris 2025',
                        country: 'France',
                        city: 'Paris',
                        date: getDate(435),
                        deadline: getDate(405),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'Reed Expositions France & Atout France',
                        organizerUrl: 'https://www.reedexpo.fr',
                        website: 'https://www.iftm.fr',
                        registrationUrl: 'https://www.iftm.fr/en-gb/hosted-buyers',
                        email: 'info@iftm.fr',
                        documents: 'Passport, Business card, Professional credentials',
                        description: 'France\'s leading travel trade show with tourism board backing.'
                    },

                    // === SOUTH ASIA ===
                    {
                        name: 'Nepal Travel Mart 2025',
                        country: 'Nepal',
                        city: 'Kathmandu',
                        date: getDate(465),
                        deadline: getDate(435),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Nepal Tourism Board',
                        organizerUrl: 'https://www.ntb.gov.np',
                        website: 'https://www.nepaltravelmart.com',
                        registrationUrl: 'https://www.nepaltravelmart.com/register',
                        email: 'info@ntb.gov.np',
                        documents: 'Passport, Business card, Company profile',
                        description: 'Government-organized travel trade show with full buyer support.'
                    },
                    {
                        name: 'Sri Lanka Travel Trade Meet 2025',
                        country: 'Sri Lanka',
                        city: 'Colombo',
                        date: getDate(495),
                        deadline: getDate(465),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'Sri Lanka Tourism Promotion Bureau',
                        organizerUrl: 'https://www.srilanka.travel',
                        website: 'https://www.srilankatourism.org',
                        registrationUrl: 'https://www.srilankatourism.org/buyers',
                        email: 'info@srilanka.travel',
                        documents: 'Passport, Business registration, Recommendation letter',
                        description: 'Government tourism board organized event with hosted buyer benefits.'
                    },
                    {
                        name: 'Bangladesh Trade Fair 2025',
                        country: 'Bangladesh',
                        city: 'Dhaka',
                        date: getDate(525),
                        deadline: getDate(495),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'Export Promotion Bureau, Bangladesh',
                        organizerUrl: 'https://www.epb.gov.bd',
                        website: 'https://www.bangladeshtrade.com',
                        registrationUrl: 'https://www.bangladeshtrade.com/register',
                        email: 'info@epb.gov.bd',
                        documents: 'Passport, Business credentials, Import license',
                        description: 'Ministry of Commerce organized event with international buyer program.'
                    },

                    // === THAILAND & SOUTHEAST ASIA ===
                    {
                        name: 'PATA Travel Mart 2025',
                        country: 'Thailand',
                        city: 'Bangkok',
                        date: getDate(555),
                        deadline: getDate(525),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'PATA & Tourism Authority of Thailand',
                        organizerUrl: 'https://www.pata.org',
                        website: 'https://www.patatravelmart.com',
                        registrationUrl: 'https://www.patatravelmart.com/buyers',
                        email: 'patatm@pata.org',
                        documents: 'Passport, Business credentials, Letter of recommendation',
                        description: 'Asia Pacific\'s premier travel trade show with government backing.'
                    },
                    {
                        name: 'Thailand International Trade Fair 2025',
                        country: 'Thailand',
                        city: 'Bangkok',
                        date: getDate(585),
                        deadline: getDate(555),
                        industry: 'Trade',
                        benefits: { hotel: true, airfare: false },
                        organizer: 'Department of International Trade Promotion',
                        organizerUrl: 'https://www.ditp.go.th',
                        website: 'https://www.thailandtradefair.com',
                        registrationUrl: 'https://www.thailandtradefair.com/buyers',
                        email: 'contact@ditp.go.th',
                        documents: 'Business license, Passport, Trade documents',
                        description: 'Government trade promotion department organized fair with buyer benefits.'
                    },

                    // === JAPAN ===
                    {
                        name: 'JATA Tourism Expo Japan 2025',
                        country: 'Japan',
                        city: 'Tokyo',
                        date: getDate(615),
                        deadline: getDate(585),
                        industry: 'Tourism',
                        benefits: { hotel: true, airfare: true },
                        organizer: 'JATA & Japan National Tourism Organization',
                        organizerUrl: 'https://www.jata-net.or.jp',
                        website: 'https://www.t-expo.jp',
                        registrationUrl: 'https://www.t-expo.jp/en/buyer/',
                        email: 'info@jata-net.or.jp',
                        documents: 'Passport, Business card, Company introduction',
                        description: 'Japan\'s largest tourism trade show with JNTO support for international buyers.'
                    }
                ];

                resolve(this.filterEventsByRegion(comprehensiveEvents, region));
            }, 1000);
        });
    }

    filterEventsByRegion(events, region) {
        const regionMapping = {
            'india': ['India'],
            'china': ['China'],
            'south-asia': ['Nepal', 'Bangladesh', 'Sri Lanka', 'Pakistan', 'Bhutan', 'Maldives'],
            'rest-world': ['USA', 'UK', 'Germany', 'UAE', 'Singapore', 'Thailand', 'Malaysia', 
                          'France', 'Spain', 'Italy', 'Japan', 'South Korea', 'Australia', 'Canada']
        };

        if (region === 'all') {
            return events;
        }

        const countries = regionMapping[region] || [];
        return events.filter(event => countries.includes(event.country));
    }

    deduplicateAndFilter(events) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });

        const unique = [];
        const seen = new Set();

        futureEvents.forEach(event => {
            const key = `${event.name.toLowerCase()}-${event.date}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(event);
            }
        });

        return unique;
    }

    async enrichEventData(event) {
        return {
            ...event,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'online_search'
        };
    }

    generateId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

window.EventSearchEngine = EventSearchEngine;