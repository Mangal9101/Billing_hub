export type AppLanguage = 'en' | 'hi';

export const LANGUAGE_KEY = 'billing_hub_language';

/*
 * Billing Hub local/offline Hindi dictionary.
 * No network/Google Translate is used here. English remains the source language,
 * and the saved choice is applied locally on every page.
 */
const translations: Record<string, string> = {
  // Navigation / groups
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
  'My Business': 'मेरा बिज़नेस',
  'Account & App': 'अकाउंट और ऐप',

  // Language
  'Language': 'भाषा',
  'Choose language': 'भाषा चुनें',
  'Choose English or Hindi. Hindi translation works locally without internet.': 'अंग्रेज़ी या हिन्दी चुनें। हिन्दी अनुवाद बिना इंटरनेट के स्थानीय रूप से काम करता है।',
  'English': 'अंग्रेज़ी',
  'Hindi': 'हिन्दी',
  'हिन्दी': 'हिन्दी',
  'अंग्रेज़ी': 'अंग्रेज़ी',

  // Common actions
  'Add': 'जोड़ें',
  'Add Customer': 'ग्राहक जोड़ें',
  'Add Product': 'प्रोडक्ट जोड़ें',
  'Add Purchase': 'खरीद जोड़ें',
  'Add Staff': 'स्टाफ जोड़ें',
  'Add Staff Member': 'स्टाफ सदस्य जोड़ें',
  'Add Credit': 'उधार जोड़ें',
  'Add / Change Business Logo': 'बिज़नेस लोगो जोड़ें / बदलें',
  'Save': 'सहेजें',
  'Save Business Details': 'बिज़नेस विवरण सहेजें',
  'Save Invoice': 'इनवॉइस सहेजें',
  'Saving...': 'सहेज रहा है...',
  'Update': 'अपडेट करें',
  'Update Product': 'प्रोडक्ट अपडेट करें',
  'Update Staff': 'स्टाफ अपडेट करें',
  'Cancel': 'रद्द करें',
  'Delete': 'हटाएँ',
  'Remove': 'हटाएँ',
  'Remove Staff Member?': 'स्टाफ सदस्य हटाएँ?',
  'Close': 'बंद करें',
  'Done': 'हो गया',
  'Search': 'खोजें',
  'Refresh': 'रिफ्रेश',
  'Export': 'एक्सपोर्ट',
  'Import': 'इम्पोर्ट',
  'Print': 'प्रिंट करें',
  'Print Invoice': 'इनवॉइस प्रिंट करें',
  'Download Report': 'रिपोर्ट डाउनलोड करें',
  'Sign Out': 'साइन आउट',
  'Collapse': 'साइडबार बंद करें',
  'Expand sidebar': 'साइडबार खोलें',
  'Close menu': 'मेन्यू बंद करें',
  'Switch business': 'बिज़नेस बदलें',
  'Current business': 'वर्तमान बिज़नेस',

  // Business / account
  'Business': 'बिज़नेस',
  'Business Name': 'बिज़नेस का नाम',
  'Business Name *': 'बिज़नेस का नाम *',
  'Business address': 'बिज़नेस का पता',
  'Business name, logo, address, phone and GST are editable and saved separately for each business.': 'बिज़नेस का नाम, लोगो, पता, फ़ोन और GST अलग-अलग बदले और सहेजे जा सकते हैं।',
  'Address': 'पता',
  'Mobile Number': 'मोबाइल नंबर',
  'GST Number': 'GST नंबर',
  'GSTIN': 'GSTIN',
  'Phone': 'फ़ोन',
  'Email': 'ईमेल',
  'App Name': 'ऐप का नाम',
  'Owner': 'मालिक',
  'Owner Name': 'मालिक का नाम',
  'Owner Email': 'मालिक का ईमेल',
  'These values are controlled by your authenticated account.': 'ये विवरण आपके लॉगिन किए गए अकाउंट द्वारा नियंत्रित होते हैं।',
  'App Name, Owner Name and Owner Email are not editable from business settings.': 'ऐप का नाम, मालिक का नाम और मालिक का ईमेल बिज़नेस सेटिंग्स से बदले नहीं जा सकते।',
  'Logo should be under 1 MB': 'लोगो 1 MB से कम होना चाहिए',
  'Business details saved': 'बिज़नेस विवरण सहेजे गए',
  'Business logo updated': 'बिज़नेस लोगो अपडेट हो गया',

  // Dashboard / reports
  'Today': 'आज',
  'Today’s Sales': 'आज की बिक्री',
  "Today's Sales": 'आज की बिक्री',
  'Today’s Bills': 'आज के बिल',
  "Today's Bills": 'आज के बिल',
  'Daily Sales Report': 'दैनिक बिक्री रिपोर्ट',
  'Reports': 'रिपोर्ट्स',
  'Live': 'लाइव',
  'Updated now': 'अभी अपडेट हुआ',
  'Recent Invoices': 'हाल के इनवॉइस',
  'Low Stock': 'कम स्टॉक',
  'Low Stock Products': 'कम स्टॉक वाले प्रोडक्ट',
  'No data found': 'कोई डेटा नहीं मिला',
  'No invoices found': 'कोई इनवॉइस नहीं मिला',
  'No products found': 'कोई प्रोडक्ट नहीं मिला',
  'No customers found': 'कोई ग्राहक नहीं मिला',
  'No staff found': 'कोई स्टाफ नहीं मिला',
  'Showing low-stock products · Clear filter': 'कम स्टॉक वाले प्रोडक्ट दिख रहे हैं · फ़िल्टर हटाएँ',
  'Clear filter': 'फ़िल्टर हटाएँ',

  // Billing / invoice
  'Invoice': 'इनवॉइस',
  'Invoices': 'इनवॉइस',
  'New Invoice': 'नया इनवॉइस',
  'Invoice Number': 'इनवॉइस नंबर',
  'Invoice Date': 'इनवॉइस तारीख',
  'Product': 'प्रोडक्ट',
  'Products': 'प्रोडक्ट्स',
  'Qty': 'मात्रा',
  'Quantity': 'मात्रा',
  'Price': 'कीमत',
  'Amount': 'राशि',
  'Subtotal': 'उप-योग',
  'Discount': 'छूट',
  'Total': 'कुल',
  'Payment': 'भुगतान',
  'Payment Mode': 'भुगतान का तरीका',
  'Cash': 'नकद',
  'Credit': 'उधार',
  'Online': 'ऑनलाइन',
  'Paid': 'जमा राशि',
  'Due': 'बाकी',
  'Balance': 'बकाया',
  'Balance Due': 'बकाया राशि',
  'Customer': 'ग्राहक',
  'Customer Name': 'ग्राहक का नाम',
  'Customer Phone': 'ग्राहक का फ़ोन',
  'Customer Address': 'ग्राहक का पता',
  'Select Customer': 'ग्राहक चुनें',
  'Save Invoice': 'इनवॉइस सहेजें',
  'Invoice saved': 'इनवॉइस सहेजा गया',
  'Invoice created': 'इनवॉइस बनाया गया',
  'WhatsApp': 'व्हाट्सऐप',

  // Products / stock
  'SKU': 'SKU',
  'SKU *': 'SKU *',
  'Category': 'श्रेणी',
  'Price (₹) *': 'कीमत (₹) *',
  'Unit': 'इकाई',
  'Current Stock': 'वर्तमान स्टॉक',
  'Low Stock Alert': 'कम स्टॉक चेतावनी',
  'Low stock alert': 'कम स्टॉक चेतावनी',
  'Stock': 'स्टॉक',
  'Stock In': 'स्टॉक अंदर',
  'Stock Out': 'स्टॉक बाहर',
  'Purchase Price': 'खरीद मूल्य',
  'Wholesale Price': 'थोक मूल्य',
  'Retailer Price': 'खुदरा मूल्य',
  'No products found': 'कोई प्रोडक्ट नहीं मिला',
  'Product name required': 'प्रोडक्ट का नाम आवश्यक है',
  'SKU required': 'SKU आवश्यक है',
  'Price must be greater than 0': 'कीमत 0 से अधिक होनी चाहिए',
  'Stock cannot be negative': 'स्टॉक ऋणात्मक नहीं हो सकता',
  'Search products...': 'प्रोडक्ट खोजें...',
  'Search low-stock products...': 'कम स्टॉक वाले प्रोडक्ट खोजें...',
  'Showing low-stock products · Clear filter': 'कम स्टॉक वाले प्रोडक्ट दिख रहे हैं · फ़िल्टर हटाएँ',

  // Customers / khatabook
  'Total Customers': 'कुल ग्राहक',
  'You Will Get': 'आपको लेना है',
  'You Will Give': 'आपको देना है',
  'You Gave': 'आपने दिए',
  'You Got': 'आपको मिले',
  'Collect Payment': 'भुगतान लें',
  'Confirm Payment': 'भुगतान की पुष्टि करें',
  'Credit Entry': 'उधार प्रविष्टि',
  'Payment Entry': 'भुगतान प्रविष्टि',
  'Payment History': 'भुगतान इतिहास',
  'Transaction History': 'लेन-देन इतिहास',
  'No transactions found': 'कोई लेन-देन नहीं मिला',

  // Purchases
  'Purchases': 'खरीदारी',
  'Purchase': 'खरीद',
  'Add Purchase': 'खरीद जोड़ें',
  'Supplier': 'सप्लायर',
  'Purchase Date': 'खरीद तारीख',
  'Purchase Details': 'खरीद विवरण',

  // Staff
  'Staff Management': 'स्टाफ प्रबंधन',
  'Total Staff': 'कुल स्टाफ',
  'Manager': 'मैनेजर',
  'Cashier': 'कैशियर',
  'Helper': 'सहायक',
  'Staff Member': 'स्टाफ सदस्य',
  'Contact': 'संपर्क',
  'Role': 'भूमिका',
  'Login ID': 'लॉगिन आईडी',
  'Staff Login ID': 'स्टाफ लॉगिन आईडी',
  'Salary': 'वेतन',
  'Monthly Salary (₹)': 'मासिक वेतन (₹)',
  'Joined': 'शामिल हुए',
  'Status': 'स्थिति',
  'Active': 'सक्रिय',
  'Inactive': 'निष्क्रिय',
  'Permissions': 'अनुमतियाँ',
  'Create Staff Account': 'स्टाफ अकाउंट बनाएँ',
  'Staff account created': 'स्टाफ अकाउंट बन गया',
  'Give these credentials to the staff member.': 'ये लॉगिन विवरण स्टाफ सदस्य को दें।',
  'Their login will be disabled by deleting the account.': 'अकाउंट हटाने पर उनका लॉगिन बंद हो जाएगा।',
  'Owner permission required': 'मालिक की अनुमति आवश्यक है',
  'Only the business owner can manage staff accounts and permissions.': 'केवल बिज़नेस मालिक ही स्टाफ अकाउंट और अनुमतियाँ प्रबंधित कर सकता है।',
  'Search staff...': 'स्टाफ खोजें...',

  // Generic UI
  'Description': 'विवरण',
  'Note': 'नोट',
  'Notes': 'नोट्स',
  'Date': 'तारीख',
  'Time': 'समय',
  'Name': 'नाम',
  'Amount': 'राशि',
  'Loading...': 'लोड हो रहा है...',
  'Please wait...': 'कृपया प्रतीक्षा करें...',
  'Required': 'आवश्यक',
  'Optional': 'वैकल्पिक',
  'Yes': 'हाँ',
  'No': 'नहीं',
  'Confirm': 'पुष्टि करें',
  'Error': 'त्रुटि',
  'Success': 'सफल',
  'Failed': 'विफल',
  'Recent update': 'हाल का अपडेट',
  'No results': 'कोई परिणाम नहीं',
  'No records found': 'कोई रिकॉर्ड नहीं मिला',
};

/* Common English words used in UI labels that appear inside longer strings. */
const wordTranslations: Record<string, string> = {
  dashboard: 'डैशबोर्ड', invoice: 'इनवॉइस', invoices: 'इनवॉइस',
  billing: 'बिलिंग', product: 'प्रोडक्ट', products: 'प्रोडक्ट्स',
  customer: 'ग्राहक', customers: 'ग्राहक', purchase: 'खरीद', purchases: 'खरीदारी',
  stock: 'स्टॉक', movements: 'गतिविधियाँ', settings: 'सेटिंग्स', staff: 'स्टाफ',
  management: 'प्रबंधन', report: 'रिपोर्ट', reports: 'रिपोर्ट्स',
  search: 'खोजें', save: 'सहेजें', update: 'अपडेट', delete: 'हटाएँ',
  cancel: 'रद्द करें', add: 'जोड़ें', remove: 'हटाएँ', edit: 'संपादित करें',
  name: 'नाम', phone: 'फ़ोन', email: 'ईमेल', address: 'पता', category: 'श्रेणी',
  price: 'कीमत', quantity: 'मात्रा', qty: 'मात्रा', amount: 'राशि',
  total: 'कुल', subtotal: 'उप-योग', discount: 'छूट', paid: 'जमा राशि',
  due: 'बाकी', balance: 'बकाया', payment: 'भुगतान', cash: 'नकद',
  credit: 'उधार', online: 'ऑनलाइन', date: 'तारीख', time: 'समय',
  status: 'स्थिति', active: 'सक्रिय', inactive: 'निष्क्रिय', role: 'भूमिका',
  salary: 'वेतन', joined: 'शामिल हुए', contact: 'संपर्क', permissions: 'अनुमतियाँ',
  owner: 'मालिक', business: 'बिज़नेस', current: 'वर्तमान', switch: 'बदलें',
  language: 'भाषा', english: 'अंग्रेज़ी', hindi: 'हिन्दी',
  today: 'आज', live: 'लाइव', updated: 'अपडेट हुआ', now: 'अभी',
  low: 'कम', alert: 'चेतावनी', unit: 'इकाई', supplier: 'सप्लायर',
  description: 'विवरण', note: 'नोट', notes: 'नोट्स', loading: 'लोड हो रहा है',
  required: 'आवश्यक', optional: 'वैकल्पिक', confirm: 'पुष्टि करें',
};

function translateText(value: string, language: AppLanguage) {
  if (language === 'en') return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const exact = translations[trimmed];
  if (exact) return exact;

  // Handle common dynamic UI strings without translating user-entered values.
  let dynamic = trimmed;
  dynamic = dynamic.replace(/^(\d+)\s+products?\s+in\s+inventory$/i, '$1 प्रोडक्ट्स इन्वेंटरी में');
  dynamic = dynamic.replace(/^Showing\s+(\d+)\s+products?$/i, '$1 प्रोडक्ट्स दिखाए जा रहे हैं');
  dynamic = dynamic.replace(/^\s*Today\s*[—-]\s*(.+?)\s*·\s*IST\s*$/i, 'आज — $1 · IST');
  dynamic = dynamic.replace(/^Low stock alert:\s*(.+)$/i, 'कम स्टॉक चेतावनी: $1');
  dynamic = dynamic.replace(/^Search\s+(.+)\.\.\.$/i, (_, x) => 'खोजें ' + x + '...');
  if (dynamic !== trimmed) return dynamic;

  // Translate longer labels made from standard UI words, while leaving unknown
  // business/customer/product values untouched.
  const replaced = trimmed.replace(/\b[A-Za-z][A-Za-z'&/-]*\b/g, (word) => {
    return wordTranslations[word.toLowerCase()] ?? word;
  });

  return replaced;
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

  if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
    for (const child of Array.from(el.childNodes)) translateNode(child, language);
  }
}

export function applyLocalLanguage(language: AppLanguage) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  translateNode(document.body, language);

  // Native select options are part of the visible UI too.
  document.querySelectorAll('option').forEach((option) => {
    const original = option.textContent ?? '';
    const translated = translateText(original, language);
    if (translated !== original) option.textContent = translated;
  });
}

export function getLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'hi' ? 'hi' : 'en';
}

export function setLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;

  // Reload from the original English React source, then the runtime applies Hindi.
  // The saved choice survives navigation and works offline.
  window.location.reload();
}
