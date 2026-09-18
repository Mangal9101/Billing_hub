export type AppLanguage = 'en' | 'hi';

export const LANGUAGE_KEY = 'billing_hub_language';

const translations: Record<string, string> = {
  'Dashboard': 'डैशबोर्ड',
  'Invoice & Billing': 'इनवॉइस और बिलिंग',
  'Products': 'प्रोडक्ट्स',
  'Customers': 'ग्राहक',
  'Purchases': 'खरीदारी',
  'Stock Movements': 'स्टॉक गतिविधियाँ',
  'Khatabook': 'खाताबुक',
  'Staff': 'स्टाफ',
  'Settings': 'सेटिंग्स',
  'Overview': 'सारांश',
  'Inventory': 'इन्वेंटरी',
  'Finance': 'वित्त',
  'Administration': 'प्रशासन',
  'Language': 'भाषा',
  'Choose language': 'भाषा चुनें',
  'English': 'अंग्रेज़ी',
  'Hindi': 'हिन्दी',
  'My Business': 'मेरा बिज़नेस',
  'Business name, logo, address, phone and GST are editable and saved separately for each business.': 'बिज़नेस का नाम, लोगो, पता, फ़ोन और GST अलग-अलग सेव किए जाते हैं और बदले जा सकते हैं।',
  'Add / Change Business Logo': 'बिज़नेस लोगो जोड़ें / बदलें',
  'Business Name *': 'बिज़नेस का नाम *',
  'Address': 'पता',
  'Mobile Number': 'मोबाइल नंबर',
  'GST Number': 'GST नंबर',
  'Business address': 'बिज़नेस का पता',
  'Save Business Details': 'बिज़नेस विवरण सहेजें',
  'Saving...': 'सहेज रहा है...',
  'Account & App': 'अकाउंट और ऐप',
  'App Name': 'ऐप का नाम',
  'Owner Name': 'मालिक का नाम',
  'Owner Email': 'मालिक का ईमेल',
  'Sign Out': 'साइन आउट',
  'Collapse': 'संकुचित करें',
  'Expand sidebar': 'साइडबार खोलें',
  'Switch business': 'बिज़नेस बदलें',
  'Current business': 'वर्तमान बिज़नेस',
  'Add Customer': 'ग्राहक जोड़ें',
  'Add Product': 'प्रोडक्ट जोड़ें',
  'Save': 'सहेजें',
  'Cancel': 'रद्द करें',
  'Delete': 'हटाएँ',
  'Search': 'खोजें',
  'Today': 'आज',
  'Date': 'तारीख',
  'Time': 'समय',
  'Name': 'नाम',
  'Phone': 'फ़ोन',
  'Amount': 'राशि',
  'Total': 'कुल',
  'Discount': 'छूट',
  'Paid': 'भुगतान किया',
  'Due': 'बाकी',
  'Balance': 'बकाया',
  'Quantity': 'मात्रा',
  'Price': 'कीमत',
  'Wholesale Price': 'थोक मूल्य',
  'Invoice': 'इनवॉइस',
  'Payment': 'भुगतान',
  'Cash': 'नकद',
  'Credit': 'उधार',
  'Online': 'ऑनलाइन',
  'Description': 'विवरण',
  'Note': 'नोट',
  'Stock': 'स्टॉक',
  'Low Stock': 'कम स्टॉक',
  'Today’s Sales': 'आज की बिक्री',
  'Today’s Bills': 'आज के बिल',
  'Daily Sales Report': 'दैनिक बिक्री रिपोर्ट',
  'Reports': 'रिपोर्ट्स',
  'Print Invoice': 'इनवॉइस प्रिंट करें',
  'WhatsApp': 'व्हाट्सऐप',
  'Download Report': 'रिपोर्ट डाउनलोड करें',
  'New Invoice': 'नया इनवॉइस',
  'Save Invoice': 'इनवॉइस सहेजें',
  'Invoice Number': 'इनवॉइस नंबर',
  'Invoice Date': 'इनवॉइस तारीख',
  'Total Customers': 'कुल ग्राहक',
  'You Will Get': 'आपको लेना है',
  'You Will Give': 'आपको देना है',
  'You Gave': 'आपने दिए',
  'You Got': 'आपको मिले',
  'Collect Payment': 'भुगतान लें',
  'Add Credit': 'उधार जोड़ें',
  'Confirm Payment': 'भुगतान की पुष्टि करें',
  'Balance Due': 'बकाया राशि',
  'Cleared': 'चुकता',
  'Loading...': 'लोड हो रहा है...',
  'No data found': 'कोई डेटा नहीं मिला',
  'No customers found': 'कोई ग्राहक नहीं मिला',
  'No products found': 'कोई प्रोडक्ट नहीं मिला',
  'No invoices found': 'कोई इनवॉइस नहीं मिला',
  'Refresh': 'रिफ्रेश',
  'Export': 'एक्सपोर्ट',
  'Import': 'इम्पोर्ट',
  'Add Purchase': 'खरीद जोड़ें',
  'Stock In': 'स्टॉक अंदर',
  'Stock Out': 'स्टॉक बाहर',
};

function translateText(value: string, language: AppLanguage) {
  if (language === 'en') return value;
  return translations[value.trim()] ?? value;
}

function translateNode(node: Node, language: AppLanguage) {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue ?? '';
    const leading = value.match(/^\s*/)?.[0] ?? '';
    const trailing = value.match(/\s*$/)?.[0] ?? '';
    const core = value.trim();
    if (!core) return;
    const translated = translateText(core, language);
    if (translated !== core) node.nodeValue = leading + translated + trailing;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.closest('[data-no-local-translate="true"]')) return;

  for (const attr of ['placeholder', 'title', 'aria-label']) {
    const current = el.getAttribute(attr);
    if (current) {
      const translated = translateText(current, language);
      if (translated !== current) el.setAttribute(attr, translated);
    }
  }

  if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el.tagName !== 'SELECT' && el.tagName !== 'OPTION') {
    for (const child of Array.from(el.childNodes)) translateNode(child, language);
  }
}

export function applyLocalLanguage(language: AppLanguage) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  translateNode(document.body, language);
}

export function getLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'hi' ? 'hi' : 'en';
}

export function setLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
  // Reload so the DOM starts from the original English strings before applying Hindi.
  // The selected language remains persisted in localStorage and works offline.
  window.location.reload();
}

