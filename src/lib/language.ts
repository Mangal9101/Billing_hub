export type AppLanguage = 'en' | 'hi';

export const LANGUAGE_KEY = 'billing_hub_language';

/**
 * Billing Hub local/offline language runtime.
 *
 * Hindi is completely local: there is no Google Translate, network request,
 * translation API, or external dependency. English is the source UI language.
 * The saved language survives reloads and navigation.
 */

const translations: Record<string, string> = {
  'Dashboard': 'डैशबोर्ड',
  'Invoice & Billing': 'चालान और बिलिंग',
  'Products': 'उत्पाद',
  'Customers': 'ग्राहक',
  'Purchases': 'खरीदारी',
  'Stock Movements': 'भंडार गतिविधियाँ',
  'Khatabook': 'खाताबही',
  'Staff': 'कर्मचारी',
  'Settings': 'सेटिंग्स',
  'Overview': 'सारांश',
  'Inventory': 'भंडार',
  'Finance': 'वित्त',
  'Administration': 'प्रशासन',
  'My Business': 'मेरा व्यवसाय',
  'Account & App': 'खाता और ऐप',

  'Language': 'भाषा',
  'Choose language': 'भाषा चुनें',
  'Choose English or Hindi. Hindi translation works locally without internet.': 'अंग्रेज़ी या हिन्दी चुनें। हिन्दी अनुवाद बिना इंटरनेट के स्थानीय रूप से काम करता है।',
  'English': 'अंग्रेज़ी',
  'Hindi': 'हिन्दी',

  'Add': 'जोड़ें',
  'Add Customer': 'ग्राहक जोड़ें',
  'Add Product': 'उत्पाद जोड़ें',
  'Add Purchase': 'खरीद जोड़ें',
  'Add Staff': 'कर्मचारी जोड़ें',
  'Add Staff Member': 'कर्मचारी सदस्य जोड़ें',
  'Add Credit': 'उधार जोड़ें',
  'Add / Change Business Logo': 'व्यवसाय का लोगो जोड़ें / बदलें',
  'Save': 'सहेजें',
  'Save Business Details': 'व्यवसाय का विवरण सहेजें',
  'Save Invoice': 'चालान सहेजें',
  'Saving...': 'सहेजा जा रहा है...',
  'Update': 'संशोधित करें',
  'Update Product': 'उत्पाद संशोधित करें',
  'Update Staff': 'कर्मचारी संशोधित करें',
  'Cancel': 'रद्द करें',
  'Delete': 'हटाएँ',
  'Remove': 'हटाएँ',
  'Remove Staff Member?': 'कर्मचारी सदस्य हटाएँ?',
  'Close': 'बंद करें',
  'Done': 'पूर्ण',
  'Search': 'खोजें',
  'Refresh': 'ताज़ा करें',
  'Export': 'निर्यात करें',
  'Import': 'आयात करें',
  'Print': 'प्रिंट करें',
  'Print Invoice': 'चालान प्रिंट करें',
  'Download': 'डाउनलोड करें',
  'Download Report': 'रिपोर्ट डाउनलोड करें',
  'Sign Out': 'लॉग आउट',
  'Collapse': 'साइडबार बंद करें',
  'Expand sidebar': 'साइडबार खोलें',
  'Close menu': 'मेन्यू बंद करें',
  'Switch business': 'व्यवसाय बदलें',
  'Current business': 'वर्तमान व्यवसाय',
  'Back': 'वापस',
  'Next': 'आगे',
  'Previous': 'पिछला',
  'Submit': 'जमा करें',
  'Continue': 'जारी रखें',
  'Confirm': 'पुष्टि करें',
  'Yes': 'हाँ',
  'No': 'नहीं',
  'OK': 'ठीक है',
  'Clear': 'साफ़ करें',
  'Clear filter': 'फ़िल्टर हटाएँ',
  'Clear date filter': 'तारीख फ़िल्टर हटाएँ',
  'Filters': 'फ़िल्टर',
  'Filter': 'फ़िल्टर',
  'View': 'देखें',
  'Edit': 'संपादित करें',
  'Create': 'बनाएँ',
  'Create Invoice': 'चालान बनाएँ',
  'New': 'नया',
  'New Bill': 'नया बिल',
  'New Invoice': 'नया चालान',

  'Business': 'व्यवसाय',
  'Business Name': 'व्यवसाय का नाम',
  'Business Name *': 'व्यवसाय का नाम *',
  'Business address': 'व्यवसाय का पता',
  'Address': 'पता',
  'Mobile Number': 'मोबाइल नंबर',
  'GST Number': 'जीएसटी नंबर',
  'GSTIN': 'जीएसटीआईएन',
  'Phone': 'फ़ोन',
  'Email': 'ईमेल',
  'App Name': 'ऐप का नाम',
  'Owner': 'मालिक',
  'Owner Name': 'मालिक का नाम',
  'Owner Email': 'मालिक का ईमेल',
  'Account': 'खाता',
  'Account & App': 'खाता और ऐप',
  'These values are controlled by your authenticated account.': 'ये विवरण आपके प्रमाणित खाते द्वारा नियंत्रित होते हैं।',
  'App Name, Owner Name and Owner Email are not editable from business settings.': 'ऐप का नाम, मालिक का नाम और मालिक का ईमेल व्यवसाय की सेटिंग्स से नहीं बदले जा सकते।',
  'Logo should be under 1 MB': 'लोगो 1 एमबी से कम होना चाहिए',
  'Business details saved': 'व्यवसाय का विवरण सहेज दिया गया',
  'Business logo updated': 'व्यवसाय का लोगो संशोधित हो गया',

  'Today': 'आज',
  'Yesterday': 'कल',
  'Tomorrow': 'कल',
  'Today’s Sales': 'आज की बिक्री',
  "Today's Sales": 'आज की बिक्री',
  'Today’s Bills': 'आज के बिल',
  "Today's Bills": 'आज के बिल',
  'Daily Sales Report': 'दैनिक बिक्री रिपोर्ट',
  'Reports': 'रिपोर्ट',
  'Live': 'लाइव',
  'Updated now': 'अभी संशोधित हुआ',
  'Recent Invoices': 'हाल के चालान',
  'Low Stock': 'कम भंडार',
  'Low Stock Products': 'कम भंडार वाले उत्पाद',
  'No data found': 'कोई जानकारी नहीं मिली',
  'No invoices found': 'कोई चालान नहीं मिला',
  'No products found': 'कोई उत्पाद नहीं मिला',
  'No customers found': 'कोई ग्राहक नहीं मिला',
  'No staff found': 'कोई कर्मचारी नहीं मिला',
  'No purchases found': 'कोई खरीदारी नहीं मिली',
  'No transactions found': 'कोई लेन-देन नहीं मिला',
  'No records found': 'कोई रिकॉर्ड नहीं मिला',
  'No results': 'कोई परिणाम नहीं मिला',
  'Showing low-stock products · Clear filter': 'कम भंडार वाले उत्पाद दिख रहे हैं · फ़िल्टर हटाएँ',

  'Invoice': 'चालान',
  'Invoices': 'चालान',
  'Invoice Number': 'चालान संख्या',
  'Invoice Date': 'चालान की तारीख',
  'Invoice ID': 'चालान आईडी',
  'Invoice Total': 'चालान की कुल राशि',
  'Product': 'उत्पाद',
  'Products': 'उत्पाद',
  'Qty': 'मात्रा',
  'Quantity': 'मात्रा',
  'Price': 'कीमत',
  'Amount': 'राशि',
  'Subtotal': 'उप-योग',
  'Discount': 'छूट',
  'Total': 'कुल',
  'Payment': 'भुगतान',
  'Payment Mode': 'भुगतान का माध्यम',
  'Payment Details': 'भुगतान विवरण',
  'Cash': 'नकद',
  'Credit': 'उधार',
  'UPI': 'यूपीआई',
  'Online': 'ऑनलाइन',
  'Paid': 'जमा',
  'Amount Paid': 'जमा राशि',
  'Due': 'बकाया',
  'Balance': 'शेष राशि',
  'Balance Due': 'बकाया राशि',
  'Customer': 'ग्राहक',
  'Customer Name': 'ग्राहक का नाम',
  'Customer Phone': 'ग्राहक का फ़ोन',
  'Customer Address': 'ग्राहक का पता',
  'Select Customer': 'ग्राहक चुनें',
  'Save Invoice': 'चालान सहेजें',
  'Invoice saved': 'चालान सहेज दिया गया',
  'Invoice created': 'चालान बना दिया गया',
  'WhatsApp': 'व्हाट्सऐप',
  'Bill Total': 'बिल की कुल राशि',
  'Notes': 'टिप्पणियाँ',
  'Notes (optional)': 'टिप्पणियाँ (वैकल्पिक)',
  'Internal notes about this invoice — not printed on bill': 'इस चालान के लिए आंतरिक टिप्पणियाँ — बिल पर प्रिंट नहीं होंगी',

  'SKU': 'एसकेयू',
  'SKU *': 'एसकेयू *',
  'Category': 'श्रेणी',
  'Price (₹) *': 'कीमत (₹) *',
  'Unit': 'इकाई',
  'Current Stock': 'वर्तमान भंडार',
  'Low Stock Alert': 'कम भंडार चेतावनी',
  'Low stock alert': 'कम भंडार चेतावनी',
  'Stock': 'भंडार',
  'Stock In': 'भंडार में आवक',
  'Stock Out': 'भंडार से निकासी',
  'Purchase Price': 'खरीद मूल्य',
  'Wholesale Price': 'थोक मूल्य',
  'Retailer Price': 'खुदरा मूल्य',
  'Search products...': 'उत्पाद खोजें...',
  'Search low-stock products...': 'कम भंडार वाले उत्पाद खोजें...',

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
  'Outstanding': 'बकाया',
  'Cleared': 'निपट गया',
  'Last visit': 'अंतिम मुलाकात',
  'Total Purchases': 'कुल खरीदारी',

  'Purchase': 'खरीद',
  'Purchases': 'खरीदारी',
  'Supplier': 'आपूर्तिकर्ता',
  'Purchase Date': 'खरीद की तारीख',
  'Purchase Details': 'खरीद विवरण',

  'Staff Management': 'कर्मचारी प्रबंधन',
  'Total Staff': 'कुल कर्मचारी',
  'Manager': 'प्रबंधक',
  'Cashier': 'कैशियर',
  'Helper': 'सहायक',
  'Staff Member': 'कर्मचारी सदस्य',
  'Contact': 'संपर्क',
  'Role': 'भूमिका',
  'Login ID': 'लॉगिन आईडी',
  'Staff Login ID': 'कर्मचारी लॉगिन आईडी',
  'Password': 'पासवर्ड',
  'Salary': 'वेतन',
  'Monthly Salary (₹)': 'मासिक वेतन (₹)',
  'Joined': 'शामिल हुए',
  'Status': 'स्थिति',
  'Active': 'सक्रिय',
  'Inactive': 'निष्क्रिय',
  'Permissions': 'अनुमतियाँ',
  'Create Staff Account': 'कर्मचारी खाता बनाएँ',
  'Staff account created': 'कर्मचारी खाता बना दिया गया',
  'Give these credentials to the staff member.': 'ये लॉगिन विवरण कर्मचारी को दें।',
  'Their login will be disabled by deleting the account.': 'खाता हटाने पर उनका लॉगिन बंद हो जाएगा।',
  'Owner permission required': 'मालिक की अनुमति आवश्यक है',
  'Only the business owner can manage staff accounts and permissions.': 'केवल व्यवसाय का मालिक ही कर्मचारी खातों और अनुमतियों का प्रबंधन कर सकता है।',
  'Search staff...': 'कर्मचारी खोजें...',

  'Description': 'विवरण',
  'Note': 'टिप्पणी',
  'Date': 'तारीख',
  'Time': 'समय',
  'Name': 'नाम',
  'Loading...': 'लोड हो रहा है...',
  'Please wait...': 'कृपया प्रतीक्षा करें...',
  'Required': 'आवश्यक',
  'Optional': 'वैकल्पिक',
  'Error': 'त्रुटि',
  'Success': 'सफलता',
  'Failed': 'विफल',
  'Something went wrong': 'कुछ गलत हो गया',
  'Try again': 'फिर से प्रयास करें',
  'Are you sure?': 'क्या आप निश्चित हैं?',
  'This action cannot be undone.': 'यह कार्य वापस नहीं किया जा सकता।',
  'Recent update': 'हाल का संशोधन',
  'Search by customer, phone, invoice ID...': 'ग्राहक, फ़ोन या चालान आईडी से खोजें...',
  'Try adjusting your search or filters': 'अपनी खोज या फ़िल्टर बदलकर देखें',
  'items': 'वस्तुएँ',
  'item': 'वस्तु',
  'All': 'सभी',
  'Partial': 'आंशिक',
  'Draft': 'प्रारूप',
  'Total pending dues': 'कुल लंबित बकाया',
  'From Date': 'आरंभ तारीख',
  'To Date': 'अंतिम तारीख',
  'Internal': 'आंतरिक',
  'Regular customer, festival order, balance pending...': 'नियमित ग्राहक, त्योहार का ऑर्डर, बकाया राशि...',
  'Flat Amount (₹)': 'निश्चित राशि (₹)',
  'Percentage (%)': 'प्रतिशत (%)',
  'Select Product': 'उत्पाद चुनें',
  'Add Item': 'वस्तु जोड़ें',
  'Remove Item': 'वस्तु हटाएँ',
  'Customer Details': 'ग्राहक विवरण',
  'Billing Details': 'बिलिंग विवरण',
  'Search customer...': 'ग्राहक खोजें...',
  'Search customers...': 'ग्राहक खोजें...',
  'Search by name or phone...': 'नाम या फ़ोन से खोजें...',
  'Enter valid 10-digit phone number': '10 अंकों का सही फ़ोन नंबर दर्ज करें',
  'Phone number required': 'फ़ोन नंबर आवश्यक है',
  'Customer name required': 'ग्राहक का नाम आवश्यक है',
  'Product name required': 'उत्पाद का नाम आवश्यक है',
  'SKU required': 'एसकेयू आवश्यक है',
  'Price must be greater than 0': 'कीमत 0 से अधिक होनी चाहिए',
  'Stock cannot be negative': 'भंडार ऋणात्मक नहीं हो सकता',
};

/*
 * Word-level fallback covers UI phrases that are composed dynamically in JSX.
 * It is deliberately local and deterministic. Brand names, IDs, numbers and
 * unknown user-entered text are left untouched.
 */
const wordTranslations: Record<string, string> = {
  dashboard: 'डैशबोर्ड',
  invoice: 'चालान', invoices: 'चालान',
  billing: 'बिलिंग', bill: 'बिल', bills: 'बिल',
  product: 'उत्पाद', products: 'उत्पाद',
  customer: 'ग्राहक', customers: 'ग्राहक',
  purchase: 'खरीद', purchases: 'खरीदारी',
  stock: 'भंडार', stocks: 'भंडार', movement: 'गतिविधि', movements: 'गतिविधियाँ',
  khatabook: 'खाताबही', staff: 'कर्मचारी',
  settings: 'सेटिंग्स', setting: 'सेटिंग',
  overview: 'सारांश', inventory: 'भंडार', finance: 'वित्त', administration: 'प्रशासन',
  business: 'व्यवसाय', account: 'खाता', app: 'ऐप',
  language: 'भाषा', english: 'अंग्रेज़ी', hindi: 'हिन्दी',
  add: 'जोड़ें', save: 'सहेजें', saving: 'सहेजा जा रहा है',
  update: 'संशोधित करें', updated: 'संशोधित', edit: 'संपादित करें',
  delete: 'हटाएँ', remove: 'हटाएँ', cancel: 'रद्द करें', close: 'बंद करें',
  done: 'पूर्ण', search: 'खोजें', refresh: 'ताज़ा करें', export: 'निर्यात करें',
  import: 'आयात करें', print: 'प्रिंट करें', download: 'डाउनलोड करें',
  view: 'देखें', create: 'बनाएँ', new: 'नया', back: 'वापस', next: 'आगे',
  previous: 'पिछला', submit: 'जमा करें', continue: 'जारी रखें', confirm: 'पुष्टि करें',
  clear: 'साफ़ करें', filters: 'फ़िल्टर', filter: 'फ़िल्टर',
  today: 'आज', yesterday: 'कल', tomorrow: 'कल', live: 'लाइव', now: 'अभी',
  recent: 'हाल का', total: 'कुल', pending: 'लंबित', due: 'बकाया', outstanding: 'बकाया',
  balance: 'शेष राशि', paid: 'जमा', payment: 'भुगतान', payments: 'भुगतान',
  mode: 'माध्यम', cash: 'नकद', credit: 'उधार', online: 'ऑनलाइन', upi: 'यूपीआई',
  amount: 'राशि', price: 'कीमत', quantity: 'मात्रा', qty: 'मात्रा',
  subtotal: 'उप-योग', discount: 'छूट', tax: 'कर', total: 'कुल',
  name: 'नाम', phone: 'फ़ोन', email: 'ईमेल', address: 'पता', mobile: 'मोबाइल',
  category: 'श्रेणी', unit: 'इकाई', supplier: 'आपूर्तिकर्ता', description: 'विवरण',
  note: 'टिप्पणी', notes: 'टिप्पणियाँ', date: 'तारीख', time: 'समय',
  status: 'स्थिति', active: 'सक्रिय', inactive: 'निष्क्रिय', role: 'भूमिका',
  salary: 'वेतन', joined: 'शामिल हुए', contact: 'संपर्क', permissions: 'अनुमतियाँ',
  owner: 'मालिक', manager: 'प्रबंधक', cashier: 'कैशियर', helper: 'सहायक',
  current: 'वर्तमान', low: 'कम', alert: 'चेतावनी', search: 'खोजें',
  required: 'आवश्यक', optional: 'वैकल्पिक', error: 'त्रुटि', success: 'सफलता',
  failed: 'विफल', loading: 'लोड हो रहा है', please: 'कृपया', wait: 'प्रतीक्षा करें',
  yes: 'हाँ', no: 'नहीं', all: 'सभी', partial: 'आंशिक', draft: 'प्रारूप',
  first: 'पहला', last: 'अंतिम', details: 'विवरण', history: 'इतिहास',
  transaction: 'लेन-देन', transactions: 'लेन-देन', report: 'रिपोर्ट', reports: 'रिपोर्ट',
  item: 'वस्तु', items: 'वस्तुएँ', amount: 'राशि', number: 'संख्या',
  id: 'आईडी', logo: 'लोगो', phone: 'फ़ोन', gst: 'जीएसटी', gstin: 'जीएसटीआईएन',
  wholesale: 'थोक', retailer: 'खुदरा', retail: 'खुदरा', purchase: 'खरीद',
  monthly: 'मासिक', daily: 'दैनिक', weekly: 'साप्ताहिक', yearly: 'वार्षिक',
  sales: 'बिक्री', sale: 'बिक्री', revenue: 'आय', activity: 'गतिविधि',
  activities: 'गतिविधियाँ', quick: 'त्वरित', action: 'कार्य', actions: 'कार्य',
  select: 'चुनें', selected: 'चयनित', choose: 'चुनें', enter: 'दर्ज करें',
  valid: 'सही', invalid: 'अमान्य', number: 'संख्या', details: 'विवरण',
  history: 'इतिहास', collect: 'लें', gave: 'दिए', got: 'मिले', will: 'होगा',
  give: 'दें', get: 'लें', cleared: 'निपट गया', visit: 'मुलाकात',
  account: 'खाता', password: 'पासवर्ड', login: 'लॉगिन', logout: 'लॉग आउट',
  sign: 'साइन', out: 'आउट', remember: 'याद रखें', forgot: 'भूल गए',
  welcome: 'स्वागत', hello: 'नमस्ते', help: 'सहायता', support: 'सहायता',
  supplier: 'आपूर्तिकर्ता', opening: 'प्रारंभिक', closing: 'अंतिम',
  reason: 'कारण', reference: 'संदर्भ', type: 'प्रकार', unit: 'इकाई',
  flat: 'निश्चित', percentage: 'प्रतिशत', amount: 'राशि',
  internal: 'आंतरिक', regular: 'नियमित', festival: 'त्योहार', order: 'ऑर्डर',
  pending: 'लंबित', cleared: 'निपट गया', available: 'उपलब्ध', unavailable: 'अनुपलब्ध',
  no: 'नहीं', data: 'जानकारी', found: 'मिला', results: 'परिणाम',
};

function translateText(value: string, language: AppLanguage): string {
  if (language === 'en') return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const exact = translations[trimmed];
  if (exact) return exact;

  // Common dynamic labels.
  const dynamicRules: Array<[RegExp, string | ((...args: string[]) => string)]> = [
    [/^(\\d+)\\s+customers?\\s*[·•-]\\s*₹(.+)\\s+outstanding$/i, '$1 ग्राहक · ₹$2 बकाया'],
    [/^(\\d+)\\s+customers?$/i, '$1 ग्राहक'],
    [/^(\\d+)\\s+products?$/i, '$1 उत्पाद'],
    [/^(\\d+)\\s+staff$/i, '$1 कर्मचारी'],
    [/^(\\d+)\\s+invoices?$/i, '$1 चालान'],
    [/^(\\d+)\\s+bills?$/i, '$1 बिल'],
    [/^(\\d+)\\s+items?$/i, '$1 वस्तुएँ'],
    [/^(\\d+)\\s+item$/i, '$1 वस्तु'],
    [/^Showing\\s+(\\d+)\\s+products?$/i, '$1 उत्पाद दिखाए जा रहे हैं'],
    [/^Showing\\s+(\\d+)\\s+customers?$/i, '$1 ग्राहक दिखाए जा रहे हैं'],
    [/^Search\\s+(.+)\\.\\.\\.$/i, 'खोजें $1...'],
    [/^Last visit:\\s*(.+)$/i, 'अंतिम मुलाकात: $1'],
    [/^Due\\s+₹(.+)$/i, 'बकाया ₹$1'],
    [/^Today\\s*[—-]\\s*(.+?)\\s*·\\s*IST$/i, 'आज — $1 · IST'],
    [/^Live\\s*·\\s*Updated now$/i, 'लाइव · अभी संशोधित हुआ'],
    [/^(.+)\\s+customers?\\s*$/i, '$1 ग्राहक'],
  ];

  for (const [pattern, replacement] of dynamicRules) {
    const match = trimmed.match(pattern);
    if (match) {
      return typeof replacement === 'function' ? replacement(...match.slice(1)) : trimmed.replace(pattern, replacement);
    }
  }

  // Translate UI words inside longer strings. Unknown words are preserved.
  return trimmed.replace(/\\b[A-Za-z][A-Za-z0-9'’&/-]*\\b/g, (word) => {
    return wordTranslations[word.toLowerCase()] ?? word;
  });
}

function translateNode(node: Node, language: AppLanguage) {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue ?? '';
    const core = value.trim();
    if (!core) return;
    const leading = value.slice(0, value.indexOf(core));
    const trailing = value.slice(value.indexOf(core) + core.length);
    const translated = translateText(core, language);
    if (translated !== core) node.nodeValue = leading + translated + trailing;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  if (el.closest('[data-no-local-translate="true"]')) return;

  // Never rewrite values typed/stored inside form controls.
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      const current = el.getAttribute(attr);
      if (current) {
        const translated = translateText(current, language);
        if (translated !== current) el.setAttribute(attr, translated);
      }
    }
    return;
  }

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

  // Select options are visible UI and must be translated offline too.
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

  // Reload from the original English source, then apply the saved Hindi UI
  // locally. This also makes the selection persistent across navigation.
  window.location.reload();
}
