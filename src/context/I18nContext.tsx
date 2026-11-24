import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'gu' | 'hi';

export interface Translations {
  // Navigation & Header
  appTitle: string;
  appSubtitle: string;
  navDashboard: string;
  navSettings: string;
  navCustomers: string;
  searchPlaceholder: string;
  liveStatus: string;
  engineLive: string;
  engineMock: string;

  // Language Switcher
  language: string;
  english: string;
  gujarati: string;
  hindi: string;

  // Profile & Bottom-Left Shell
  profileTitle: string;
  pucCenterName: string;
  ownerName: string;
  emailAddress: string;
  mobileNumber: string;
  optional: string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  saveProfile: string;
  profileSaved: string;
  logout: string;
  loggingOut: string;

  // Dashboard Metrics
  totalCustomers: string;
  expiringToday: string;
  dueSoon: string;
  callsPlaced: string;
  messagesSent: string;
  successRate: string;
  activeRetries: string;
  registerCustomer: string;
  refresh: string;

  // Filters & Tabs
  filterAll: string;
  filterExpiringToday: string;
  filterExpiringSoon: string;
  filterExpired: string;
  filterRenewed: string;

  // Customer Table
  colCustomer: string;
  colVehicle: string;
  colPucExpiry: string;
  colInsurance: string;
  colCallStatus: string;
  colActions: string;
  noCustomersFound: string;
  callNow: string;
  sendWhatsApp: string;
  viewHistory: string;

  // Customer Modal
  addCustomerTitle: string;
  addCustomerDesc: string;
  vehiclePlate: string;
  vehiclePlatePlaceholder: string;
  customerFullName: string;
  customerMobile: string;
  customerMobilePlaceholder: string;
  pucExpiryDate: string;
  insuranceExpiryDate: string;
  preferredLanguage: string;
  autoCallNotice: string;
  savingCustomer: string;
  cancel: string;
  saveCustomer: string;

  // Settings
  settingsTitle: string;
  settingsDesc: string;
  saveAllSettings: string;
  saving: string;
  savedSuccess: string;
  saveFailed: string;

  // Settings: Master Channels
  masterTogglesTitle: string;
  masterTogglesDesc: string;
  voiceCallsChannel: string;
  voiceCallsChannelDesc: string;
  autoCallRegistration: string;
  autoCallRegistrationDesc: string;
  whatsappChannel: string;
  whatsappChannelDesc: string;

  // Settings: Limits & Schedule
  limitsScheduleTitle: string;
  limitsScheduleDesc: string;
  maxCallsPerCustomer: string;
  maxMessagesPerCustomer: string;
  retryInterval: string;
  minutes: string;
  traiWindow: string;
  traiWindowDesc: string;
  windowStart: string;
  windowEnd: string;

  // Settings: Cadence
  cadenceTitle: string;
  cadenceDesc: string;
  daysBeforeExpiry: string;
  daysAfterExpiry: string;
  days: string;

  // Settings: Templates
  templatesTitle: string;
  templatesDesc: string;
  pucWhatsappTemplate: string;
  insuranceWhatsappTemplate: string;
  voiceCallScript: string;
  availablePlaceholders: string;
  livePreview: string;

  // Settings: Telephony
  telephonyTitle: string;
  telephonyDesc: string;
  provider: string;
  environmentMode: string;
  accountSid: string;
  subdomain: string;
  callerId: string;
  apiKey: string;
  apiToken: string;
  appUrl: string;
  testConnection: string;
  testingConnection: string;
  connectionSuccess: string;
  connectionFailed: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'PUC Flow',
    appSubtitle: 'Automated PUC & Insurance Reminder System',
    navDashboard: 'Dashboard',
    navSettings: 'Settings & Automation',
    navCustomers: 'Customers',
    searchPlaceholder: 'Search vehicle (GJ01AB1234), name, phone...',
    liveStatus: 'Automated Calling Active',
    engineLive: 'Live Exotel',
    engineMock: 'Demo Mode',

    language: 'Language',
    english: 'English',
    gujarati: 'ગુજરાતી (Gujarati)',
    hindi: 'हिंदी (Hindi)',

    profileTitle: 'Owner Profile & PUC Center',
    pucCenterName: 'PUC Center Name',
    ownerName: 'Owner Name',
    emailAddress: 'Email Address',
    mobileNumber: 'Mobile Number',
    optional: 'Optional',
    theme: 'Appearance Theme',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    themeSystem: 'System Default',
    saveProfile: 'Save Profile Changes',
    profileSaved: 'Profile details saved successfully!',
    logout: 'Log Out',
    loggingOut: 'Logging out...',

    totalCustomers: 'Total Customers',
    expiringToday: 'Expiring Today',
    dueSoon: 'Expiring in 7 Days',
    callsPlaced: 'Auto Calls Placed',
    messagesSent: 'WhatsApp Reminders',
    successRate: 'Call Reach Rate',
    activeRetries: 'Active Retries',
    registerCustomer: 'Register Customer',
    refresh: 'Refresh Data',

    filterAll: 'All Records',
    filterExpiringToday: 'Expiring Today',
    filterExpiringSoon: 'Due Soon (<=7d)',
    filterExpired: 'Expired / Overdue',
    filterRenewed: 'Renewed',

    colCustomer: 'Customer Name & Contact',
    colVehicle: 'Vehicle Number',
    colPucExpiry: 'PUC Expiry Date',
    colInsurance: 'Insurance Expiry',
    colCallStatus: 'Call Status',
    colActions: 'Actions',
    noCustomersFound: 'No customer vehicle records found matching this filter.',
    callNow: 'Call Now',
    sendWhatsApp: 'Send WhatsApp',
    viewHistory: 'Audit Trail',

    addCustomerTitle: 'Register New Vehicle & Customer',
    addCustomerDesc: 'Enter vehicle and customer details. Automated reminder calls will trigger automatically based on settings.',
    vehiclePlate: 'Vehicle Registration Number',
    vehiclePlatePlaceholder: 'e.g. GJ01AB1234',
    customerFullName: 'Customer Full Name',
    customerMobile: 'Customer 10-Digit Mobile',
    customerMobilePlaceholder: 'e.g. 9876543210',
    pucExpiryDate: 'PUC Certificate Expiry Date',
    insuranceExpiryDate: 'Insurance Expiry Date',
    preferredLanguage: 'Voice Call Language',
    autoCallNotice: 'Based on your settings, an automated welcome reminder call will be placed automatically upon saving.',
    savingCustomer: 'Saving Vehicle...',
    cancel: 'Cancel',
    saveCustomer: 'Register & Activate',

    settingsTitle: 'Settings & Automation Rules',
    settingsDesc: 'Configure automated voice calling, WhatsApp messaging, TRAI operating hours, and Exotel credentials.',
    saveAllSettings: 'Save All Settings',
    saving: 'Saving...',
    savedSuccess: 'Settings saved and applied successfully!',
    saveFailed: 'Failed to update settings. Please check parameters.',

    masterTogglesTitle: 'Master Communication Channels',
    masterTogglesDesc: 'Control telephony voice calling, auto-calling on registration, and WhatsApp reminders.',
    voiceCallsChannel: 'Automated Voice Calls',
    voiceCallsChannelDesc: 'Place interactive Gujarati/Hindi voice reminder calls to customers.',
    autoCallRegistration: 'Auto Call on Customer Registration',
    autoCallRegistrationDesc: 'Automatically initiate an immediate confirmation and reminder call when a customer is registered.',
    whatsappChannel: 'WhatsApp Reminders',
    whatsappChannelDesc: 'Deliver rich WhatsApp messages with PUC renewal warning details and directions.',

    limitsScheduleTitle: 'Limits & TRAI Compliant Hours',
    limitsScheduleDesc: 'Regulate calling attempts and adhere strictly to TRAI telecom operational hours.',
    maxCallsPerCustomer: 'Max Voice Calls per Customer',
    maxMessagesPerCustomer: 'Max WhatsApp Reminders per Customer',
    retryInterval: 'Retry Interval for Unanswered Calls',
    minutes: 'Minutes',
    traiWindow: 'TRAI Calling Window (Legal Compliance)',
    traiWindowDesc: 'Outbound calls are restricted to 09:00 AM - 08:00 PM per Telecom Regulatory Authority of India.',
    windowStart: 'Daily Start Time',
    windowEnd: 'Daily End Time',

    cadenceTitle: 'Reminder Cadence (Days Timeline)',
    cadenceDesc: 'Configure how many days before and after PUC expiry automatic notifications should trigger.',
    daysBeforeExpiry: 'Days Before Expiry (Pre-Expiry Alerts)',
    daysAfterExpiry: 'Days After Expiry (Overdue Alerts)',
    days: 'Days',

    templatesTitle: 'Message & Voice Script Templates',
    templatesDesc: 'Customize WhatsApp reminder text and text-to-speech scripts delivered to vehicle owners.',
    pucWhatsappTemplate: 'PUC Expiry WhatsApp Template',
    insuranceWhatsappTemplate: 'Insurance Expiry WhatsApp Template',
    voiceCallScript: 'Gujarati Voice Script (Text-to-Speech)',
    availablePlaceholders: 'Available Placeholders (click to copy):',
    livePreview: 'Live WhatsApp Bubble Preview',

    telephonyTitle: 'Exotel Telephony Configuration',
    telephonyDesc: 'Connect your Exotel virtual number, API key, and application endpoint for live outbound IVR.',
    provider: 'Telephony Provider',
    environmentMode: 'Operational Mode',
    accountSid: 'Exotel Account SID',
    subdomain: 'Exotel Subdomain / Cluster',
    callerId: 'Caller ID / Virtual Number (ExoPhone)',
    apiKey: 'Exotel API Key',
    apiToken: 'Exotel API Token',
    appUrl: 'Exotel Flow App URL / App ID',
    testConnection: 'Test Telephony Connection',
    testingConnection: 'Validating Exotel Credentials...',
    connectionSuccess: 'Exotel credentials verified and active!',
    connectionFailed: 'Failed to authenticate with Exotel. Please check credentials.',
  },

  gu: {
    appTitle: 'પીયુસી ફ્લો (PUC Flow)',
    appSubtitle: 'સ્વચાલિત પીયુસી અને વીમા રીમાઇન્ડર સિસ્ટમ',
    navDashboard: 'ડેશબોર્ડ',
    navSettings: 'સેટિંગ્સ અને ઓટોમેશન',
    navCustomers: 'ગ્રાહકોની યાદી',
    searchPlaceholder: 'વાહન નંબર (GJ01AB1234), નામ, મોબાઈલ શોધો...',
    liveStatus: 'ઓટોમેટેડ કોલિંગ સક્રિય છે',
    engineLive: 'લાઈવ એક્ઝોટેલ (Live)',
    engineMock: 'ડેમો મોડ (Mock)',

    language: 'ભાષા પસંદ કરો',
    english: 'English (અંગ્રેજી)',
    gujarati: 'ગુજરાતી',
    hindi: 'हिंदी (હિન્દી)',

    profileTitle: 'માલિક પ્રોફાઇલ અને પીયુસી સેન્ટર',
    pucCenterName: 'પીયુસી સેન્ટરનું નામ',
    ownerName: 'માલિકનું નામ',
    emailAddress: 'ઇમેઇલ એડ્રેસ',
    mobileNumber: 'મોબાઇલ નંબર',
    optional: 'વૈકલ્પિક',
    theme: 'થીમ પસંદગી',
    themeDark: 'ડાર્ક મોડ (Dark)',
    themeLight: 'લાઇટ મોડ (Light)',
    themeSystem: 'સિસ્ટમ ડિફોલ્ટ',
    saveProfile: 'પ્રોફાઇલ સાચવો',
    profileSaved: 'પ્રોફાઇલ વિગતો સફળતાપૂર્વક સાચવવામાં આવી!',
    logout: 'લૉગ આઉટ કરો',
    loggingOut: 'લૉગ આઉટ થઈ રહ્યું છે...',

    totalCustomers: 'કુલ ગ્રાહકો',
    expiringToday: 'આજે સમાપ્ત થતા',
    dueSoon: '૭ દિવસમાં સમાપ્ત',
    callsPlaced: 'કરેલા સ્વચાલિત કોલ',
    messagesSent: 'મોકલેલા વોટ્સએપ',
    successRate: 'કોલ સફળતા દર',
    activeRetries: 'બાકી રહેલા રીટ્રાય',
    registerCustomer: 'નવા ગ્રાહક ઉમેરો',
    refresh: 'રિફ્રેશ કરો',

    filterAll: 'બધા રેકોર્ડ્સ',
    filterExpiringToday: 'આજે સમાપ્ત થતા',
    filterExpiringSoon: 'ટૂંક સમયમાં (<=૭ દિવસ)',
    filterExpired: 'મુદત વીતી ગઈ (ઓવરડ્યુ)',
    filterRenewed: 'રિન્યૂ થયેલ',

    colCustomer: 'ગ્રાહકનું નામ અને સંપર્ક',
    colVehicle: 'વાહન નંબર',
    colPucExpiry: 'પીયુસી સમાપ્તિ તારીખ',
    colInsurance: 'વીમા સમાપ્તિ તારીખ',
    colCallStatus: 'કોલ સ્થિતિ',
    colActions: 'ક્રિયાઓ',
    noCustomersFound: 'પસંદ કરેલ ફિલ્ટરમાં કોઈ વાહન રેકોર્ડ મળ્યો નથી.',
    callNow: 'હમણાં કોલ કરો',
    sendWhatsApp: 'વોટ્સએપ મોકલો',
    viewHistory: 'કોલ ઇતિહાસ',

    addCustomerTitle: 'નવું વાહન અને ગ્રાહક ઉમેરો',
    addCustomerDesc: 'વાહન અને ગ્રાહકની વિગતો દાખલ કરો. સેટિંગ્સ મુજબ ગ્રાહકને સ્વચાલિત રીમાઇન્ડર કોલ કરવામાં આવશે.',
    vehiclePlate: 'વાહન રજીસ્ટ્રેશન નંબર',
    vehiclePlatePlaceholder: 'દા.ત. GJ01AB1234',
    customerFullName: 'ગ્રાહકનું પૂરું નામ',
    customerMobile: '૧૦ અંકનો મોબાઈલ નંબર',
    customerMobilePlaceholder: 'દા.ત. 9876543210',
    pucExpiryDate: 'પીયુસી સમાપ્તિ તારીખ',
    insuranceExpiryDate: 'વીમા સમાપ્તિ તારીખ',
    preferredLanguage: 'કોલની ભાષા',
    autoCallNotice: 'તમારા સેટિંગ્સ મુજબ, ગ્રાહક નોંધણી થતાં જ તરત જ સ્વચાલિત સ્વાગત અને રીમાઇન્ડર કોલ કરવામાં આવશે.',
    savingCustomer: 'સાચવી રહ્યું છે...',
    cancel: 'રદ કરો',
    saveCustomer: 'નોંધણી કરો અને સક્રિય કરો',

    settingsTitle: 'સેટિંગ્સ અને ઓટોમેશન નિયમો',
    settingsDesc: 'સ્વચાલિત વોઇસ કોલિંગ, વોટ્સએપ મેસેજિંગ, TRAI સમય મર્યાદા અને એક્ઝોટેલ વિગતો સેટ કરો.',
    saveAllSettings: 'બધા સેટિંગ્સ સાચવો',
    saving: 'સાચવી રહ્યું છે...',
    savedSuccess: 'સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા!',
    saveFailed: 'સેટિંગ્સ સાચવવામાં ભૂલ થઈ. કૃપા કરીને તપાસો.',

    masterTogglesTitle: 'મુખ્ય કોમ્યુનિકેશન ચેનલો',
    masterTogglesDesc: 'ટેલિફોની વોઇસ કોલિંગ, નોંધણી પર ઓટો કોલ અને વોટ્સએપ રીમાઇન્ડર્સનું નિયંત્રણ કરો.',
    voiceCallsChannel: 'સ્વચાલિત વોઇસ કોલ',
    voiceCallsChannelDesc: 'ગ્રાહકોને ગુજરાતી અથવા હિન્દીમાં સ્વચાલિત ઇન્ટરેક્ટિવ રીમાઇન્ડર કોલ કરો.',
    autoCallRegistration: 'ગ્રાહક નોંધણી પર તુરંત ઓટો કોલ',
    autoCallRegistrationDesc: 'જ્યારે પણ નવો ગ્રાહક ઉમેરાય ત્યારે આપોઆપ તરત જ તેને કન્ફર્મેશન કોલ લાગશે.',
    whatsappChannel: 'વોટ્સએપ રીમાઇન્ડર્સ',
    whatsappChannelDesc: 'પીયુસી રિન્યુઅલ તારીખ અને સરનામા સાથે વિગતવાર વોટ્સએપ સંદેશ મોકલો.',

    limitsScheduleTitle: 'મર્યાદાઓ અને TRAI માન્ય સમય',
    limitsScheduleDesc: 'કોલિંગ પ્રયાસો અને ટેલિકોમ રેગ્યુલેટરી ઓથોરિટી ઓફ ઇન્ડિયા (TRAI) ના કાયદા મુજબ સમય સેટ કરો.',
    maxCallsPerCustomer: 'ગ્રાહક દીઠ મહત્તમ કોલ',
    maxMessagesPerCustomer: 'ગ્રાહક દીઠ મહત્તમ વોટ્સએપ',
    retryInterval: 'જવાબ ન મળતા ફરીથી કોલ કરવાનો સમય',
    minutes: 'મિનિટ',
    traiWindow: 'TRAI કોલિંગ સમય વિન્ડો (કાયદેસર માન્ય)',
    traiWindowDesc: 'ટેલિકોમ નિયમ મુજબ આઉટબાઉન્ડ કોલ માત્ર સવારે ૦૯:૦૦ થી સાંજે ૦૮:૦૦ સુધી જ માન્ય છે.',
    windowStart: 'દૈનિક શરૂ સમય',
    windowEnd: 'દૈનિક સમાપ્ત સમય',

    cadenceTitle: 'રીમાઇન્ડર સમયરેખા (દિવસો)',
    cadenceDesc: 'પીયુસી સમાપ્ત થવાના કેટલા દિવસ પહેલા અને પછી ઓટોમેટેડ સૂચના મોકલવી તે નક્કી કરો.',
    daysBeforeExpiry: 'સમાપ્તિ પહેલાના દિવસો (અગાઉની ચેતવણી)',
    daysAfterExpiry: 'સમાપ્તિ પછીના દિવસો (વીતી ગયેલી મુદત)',
    days: 'દિવસ',

    templatesTitle: 'મેસેજ અને વોઇસ સ્ક્રિપ્ટ ટેમ્પ્લેટ્સ',
    templatesDesc: 'વાહન માલિકોને મોકલવામાં આવતા વોટ્સએપ લખાણ અને ઓટો-કોલ સ્પીચ સ્ક્રિપ્ટ બદલો.',
    pucWhatsappTemplate: 'પીયુસી વોટ્સએપ ટેમ્પલેટ',
    insuranceWhatsappTemplate: 'વીમા વોટ્સએપ ટેમ્પલેટ',
    voiceCallScript: 'ગુજરાતી વોઇસ સ્ક્રિપ્ટ (કોલ લખાણ)',
    availablePlaceholders: 'ઉપલબ્ધ શોર્ટકટ્સ (ક્લિક કરીને કોપી કરો):',
    livePreview: 'લાઇવ વોટ્સએપ મેસેજ પ્રિવ્યુ',

    telephonyTitle: 'એક્ઝોટેલ (Exotel) ટેલિફોની ગોઠવણી',
    telephonyDesc: 'લાઇવ આઉટબાઉન્ડ કોલિંગ માટે તમારો એક્ઝોટેલ વર્ચ્યુઅલ નંબર, API કી અને એપ્લિકેશન URL જોડો.',
    provider: 'ટેલિફોની પ્રોવાઇડર',
    environmentMode: 'ઓપરેશનલ મોડ',
    accountSid: 'Exotel એકાઉન્ટ SID',
    subdomain: 'Exotel સબડોમેન / ક્લસ્ટર',
    callerId: 'કોલર આઈડી / વર્ચ્યુઅલ નંબર',
    apiKey: 'Exotel API Key',
    apiToken: 'Exotel API Token',
    appUrl: 'Exotel ફ્લો App URL / App ID',
    testConnection: 'ટેલિફોની કનેક્શન તપાસો',
    testingConnection: 'એક્ઝોટેલ તપાસી રહ્યું છે...',
    connectionSuccess: 'એક્ઝોટેલ કનેક્શન સફળ અને સક્રિય છે!',
    connectionFailed: 'એક્ઝોટેલ પ્રમાણીકરણ નિષ્ફળ ગયું. વિગતો તપાસો.',
  },

  hi: {
    appTitle: 'पीयूसी फ्लो (PUC Flow)',
    appSubtitle: 'स्वचालित पीयूसी और बीमा नवीनीकरण रिमाइंडर सिस्टम',
    navDashboard: 'डैशबोर्ड',
    navSettings: 'सेटिंग्स और स्वचालन',
    navCustomers: 'ग्राहक सूची',
    searchPlaceholder: 'वाहन संख्या (GJ01AB1234), नाम, मोबाइल खोजें...',
    liveStatus: 'स्वचालित कॉलिंग सक्रिय है',
    engineLive: 'लाइव एक्सोटेल (Live)',
    engineMock: 'डेमो मोड (Mock)',

    language: 'भाषा चुनें',
    english: 'English (अंग्रेज़ी)',
    gujarati: 'ગુજરાતી (गुजराती)',
    hindi: 'हिंदी',

    profileTitle: 'मालिक प्रोफाइल और पीयूसी केंद्र',
    pucCenterName: 'पीयूसी केंद्र का नाम',
    ownerName: 'मालिक का नाम',
    emailAddress: 'ईमेल पता',
    mobileNumber: 'मोबाइल नंबर',
    optional: 'वैकल्पिक',
    theme: 'थीम प्राथमिकता',
    themeDark: 'डार्क मोड (Dark)',
    themeLight: 'लाइट मोड (Light)',
    themeSystem: 'सिस्टम डिफ़ॉल्ट',
    saveProfile: 'प्रोफाइल सहेजें',
    profileSaved: 'प्रोफाइल विवरण सफलतापूर्वक सहेजा गया!',
    logout: 'लॉग आउट करें',
    loggingOut: 'लॉग आउट हो रहा है...',

    totalCustomers: 'कुल ग्राहक',
    expiringToday: 'आज समाप्त हो रहे',
    dueSoon: '७ दिनों में समाप्त',
    callsPlaced: 'किए गए ऑटो कॉल',
    messagesSent: 'भेजे गए व्हाट्सएप',
    successRate: 'कॉल सफलता दर',
    activeRetries: 'सक्रिय पुनः प्रयास',
    registerCustomer: 'नया ग्राहक जोड़ें',
    refresh: 'रिफ्रेश करें',

    filterAll: 'सभी रिकॉर्ड',
    filterExpiringToday: 'आज समाप्त हो रहे',
    filterExpiringSoon: 'शीघ्र देय (<=७ दिन)',
    filterExpired: 'अवधि समाप्त (ओवरड्यू)',
    filterRenewed: 'नवीनीकृत',

    colCustomer: 'ग्राहक नाम व संपर्क',
    colVehicle: 'वाहन संख्या',
    colPucExpiry: 'पीयूसी समाप्ति तिथि',
    colInsurance: 'बीमा समाप्ति तिथि',
    colCallStatus: 'कॉल स्थिति',
    colActions: 'कार्रवाई',
    noCustomersFound: 'इस फ़िल्टर से मेल खाता कोई वाहन रिकॉर्ड नहीं मिला।',
    callNow: 'अभी कॉल करें',
    sendWhatsApp: 'व्हाट्सएप भेजें',
    viewHistory: 'कॉल इतिहास',

    addCustomerTitle: 'नया वाहन और ग्राहक पंजीकृत करें',
    addCustomerDesc: 'वाहन और ग्राहक का विवरण दर्ज करें। सेटिंग्स के अनुसार स्वचालित रिमाइंडर कॉल शुरू हो जाएगी।',
    vehiclePlate: 'वाहन पंजीकरण संख्या',
    vehiclePlatePlaceholder: 'उदा. GJ01AB1234',
    customerFullName: 'ग्राहक का पूरा नाम',
    customerMobile: '१० अंकों का मोबाइल नंबर',
    customerMobilePlaceholder: 'उदा. 9876543210',
    pucExpiryDate: 'पीयूसी समाप्ति तिथि',
    insuranceExpiryDate: 'बीमा समाप्ति तिथि',
    preferredLanguage: 'कॉल की भाषा',
    autoCallNotice: 'आपकी सेटिंग्स के अनुसार, ग्राहक पंजीकरण होते ही तुरंत एक स्वचालित स्वागत और रिमाइंडर कॉल की जाएगी।',
    savingCustomer: 'सहेजा जा रहा है...',
    cancel: 'रद्द करें',
    saveCustomer: 'पंजीकृत करें और सक्रिय करें',

    settingsTitle: 'सेटिंग्स और स्वचालन नियम',
    settingsDesc: 'स्वचालित वॉइस कॉलिंग, व्हाट्सएप संदेश, TRAI समय सीमा और एक्सोटेल क्रेडेंशियल कॉन्फ़िगर करें।',
    saveAllSettings: 'सभी सेटिंग्स सहेजें',
    saving: 'सहेजा जा रहा है...',
    savedSuccess: 'सेटिंग्स सफलतापूर्वक सहेजी गईं!',
    saveFailed: 'सेटिंग्स अपडेट करने में विफल। कृपया जांचें।',

    masterTogglesTitle: 'मुख्य संचार चैनल',
    masterTogglesDesc: 'टेलीफोनी वॉइस कॉलिंग, पंजीकरण पर ऑटो कॉल और व्हाट्सएप संदेशों को नियंत्रित करें।',
    voiceCallsChannel: 'स्वचालित वॉइस कॉल',
    voiceCallsChannelDesc: 'ग्राहकों को गुजराती या हिंदी में स्वचालित इंटरेक्टिव रिमाइंडर कॉल करें।',
    autoCallRegistration: 'ग्राहक पंजीकरण पर तत्काल ऑटो कॉल',
    autoCallRegistrationDesc: 'जब भी कोई नया ग्राहक पंजीकृत होगा, तुरंत स्वचालित रूप से उसे रिमाइंडर कॉल जाएगी।',
    whatsappChannel: 'व्हाट्सएप रिमाइंडर',
    whatsappChannelDesc: 'पीयूसी समाप्ति विवरण और केंद्र के पते के साथ व्हाट्सएप संदेश भेजें।',

    limitsScheduleTitle: 'सीमाएं और TRAI अनुपालन समय',
    limitsScheduleDesc: 'कॉलिंग प्रयासों को नियंत्रित करें और भारतीय दूरसंचार नियामक प्राधिकरण (TRAI) के नियमों का पालन करें।',
    maxCallsPerCustomer: 'प्रति ग्राहक अधिकतम कॉल',
    maxMessagesPerCustomer: 'प्रति ग्राहक अधिकतम व्हाट्सएप',
    retryInterval: 'कॉल न उठने पर पुनः प्रयास अंतराल',
    minutes: 'मिनट',
    traiWindow: 'TRAI कॉलिंग समय सीमा (कानूनी अनुपालन)',
    traiWindowDesc: 'दूरसंचार नियमों के अनुसार आउटबाउंड कॉल केवल सुबह ०९:०० से शाम ०८:०० बजे तक ही अनुमत हैं।',
    windowStart: 'दैनिक प्रारंभ समय',
    windowEnd: 'दैनिक समाप्ति समय',

    cadenceTitle: 'रिमाइंडर समयरेखा (दिन)',
    cadenceDesc: 'पीयूसी समाप्ति से कितने दिन पहले और बाद में स्वचालित सूचनाएं भेजी जाएं यह निर्धारित करें।',
    daysBeforeExpiry: 'समाप्ति से पहले के दिन (पूर्व चेतावनी)',
    daysAfterExpiry: 'समाप्ति के बाद के दिन (अवधि समाप्त)',
    days: 'दिन',

    templatesTitle: 'संदेश और वॉइस स्क्रिप्ट टेम्पलेट',
    templatesDesc: 'वाहन स्वामियों को भेजे जाने वाले व्हाट्सएप संदेश और ऑटो-कॉल स्पीच टेक्स्ट को अनुकूलित करें।',
    pucWhatsappTemplate: 'पीयूसी व्हाट्सएप टेम्पलेट',
    insuranceWhatsappTemplate: 'बीमा व्हाट्सएप टेम्पलेट',
    voiceCallScript: 'गुजराती/हिंदी वॉइस स्क्रिप्ट (कॉल पाठ)',
    availablePlaceholders: 'उपलब्ध प्लेसहोल्डर्स (कॉपी करने के लिए क्लिक करें):',
    livePreview: 'लाइव व्हाट्सएप पूर्वावलोकन',

    telephonyTitle: 'एक्सोटेल (Exotel) टेलीफोनी कॉन्फ़िगरेशन',
    telephonyDesc: 'लाइव आउटबाउंड कॉलिंग के लिए अपना एक्सोटेल वर्चुअल नंबर, API कुंजी और एप्लिकेशन URL जोड़ें।',
    provider: 'टेलीफोनी प्रदाता',
    environmentMode: 'ऑपरेशनल मोड',
    accountSid: 'Exotel खाता SID',
    subdomain: 'Exotel सबडोमेन / क्लस्टर',
    callerId: 'कॉलर आईडी / वर्चुअल नंबर',
    apiKey: 'Exotel API Key',
    apiToken: 'Exotel API Token',
    appUrl: 'Exotel फ्लो App URL / App ID',
    testConnection: 'टेलीफोनी कनेक्शन का परीक्षण करें',
    testingConnection: 'एक्सोटेल क्रेडेंशियल सत्यापित कर रहे हैं...',
    connectionSuccess: 'एक्सोटेल क्रेडेंशियल सफलतापूर्वक सत्यापित और सक्रिय हैं!',
    connectionFailed: 'एक्सोटेल प्रमाणीकरण विफल रहा। कृपया क्रेडेंशियल जांचें।',
  },
};

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('pucflow_lang');
    if (saved === 'gu' || saved === 'hi' || saved === 'en') return saved;
    return 'en';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('pucflow_lang', newLang);
  }, []);

  const t = useCallback(
    (key: keyof Translations): string => {
      const activeDict = translations[lang] || translations.en;
      return activeDict[key] || translations.en[key] || String(key);
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
