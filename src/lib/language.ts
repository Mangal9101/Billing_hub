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


/* Additional UI phrases collected from the live Billing Hub screens. */
Object.assign(translations, {
  'Notifications':'सूचनाएँ','Open menu':'मेन्यू खोलें','Business logo':'व्यवसाय का लोगो','Current business':'वर्तमान व्यवसाय',
  'Switch business':'व्यवसाय बदलें','Recent update':'हाल का संशोधन','Collapse sidebar':'साइडबार बंद करें','Close menu':'मेन्यू बंद करें',
  'Dashboard view':'डैशबोर्ड देखें','Billing view':'बिलिंग देखें','Create billing':'बिलिंग बनाएँ','Edit invoices':'चालान संपादित करें',
  'View products':'उत्पाद देखें','Add customers':'ग्राहक जोड़ें','Edit customers':'ग्राहक संपादित करें','Delete customers':'ग्राहक हटाएँ',
  'View purchases':'खरीदारी देखें','Add purchases':'खरीदारी जोड़ें','Edit purchases':'खरीदारी संपादित करें','Delete purchases':'खरीदारी हटाएँ',
  'View stock':'भंडार देखें','Stock adjustment':'भंडार समायोजन','View Khatabook':'खाताबही देखें','Khatabook changes':'खाताबही में बदलाव',
  'Contact':'संपर्क','Role':'भूमिका','Login ID':'लॉगिन आईडी','Salary':'वेतन','Joined':'शामिल हुए','Status':'स्थिति',
  'Cleared':'निपट गया','Adjustments':'समायोजन','OUT':'निकासी','IN':'आवक','ALL':'सभी','ADJUSTMENT':'समायोजन',
  'New Purchase':'नई खरीद','Supplier name':'आपूर्तिकर्ता का नाम','Phone number':'फ़ोन नंबर','Item name':'वस्तु का नाम',
  'Optional notes':'वैकल्पिक टिप्पणियाँ','Export purchase list as PDF':'खरीदारी सूची को PDF के रूप में निर्यात करें',
  'Search purchases...':'खरीदारी खोजें...','Search product...':'उत्पाद खोजें...','Search by name or phone...':'नाम या फ़ोन से खोजें...',
  'Back to list':'सूची पर वापस जाएँ','Back to Khatabook':'खाताबही पर वापस जाएँ','Share invoice on WhatsApp':'चालान व्हाट्सऐप पर साझा करें',
  'Enter a valid payment amount':'भुगतान की सही राशि दर्ज करें','This invoice is not linked to a customer account':'यह चालान किसी ग्राहक खाते से जुड़ा नहीं है',
  'Account Balance':'खाता शेष','Account Cleared':'खाता निपट गया','Payment lena hai aaj':'आज भुगतान लेना है',
  'Payment dene ka bola hai':'आज भुगतान देना है','Delete reminder':'रिमाइंडर हटाएँ','Full name':'पूरा नाम',
  '10-digit phone':'10 अंकों का फ़ोन','10-digit mobile number':'10 अंकों का मोबाइल नंबर','Customer name required':'ग्राहक का नाम आवश्यक है',
  'Phone required':'फ़ोन आवश्यक है','Amount must be greater than 0':'राशि 0 से अधिक होनी चाहिए','Description required':'विवरण आवश्यक है',
  'Business ID required':'व्यवसाय आईडी आवश्यक है','Name required':'नाम आवश्यक है','Enter valid 10-digit phone':'10 अंकों का सही फ़ोन दर्ज करें',
  'Login ID required':'लॉगिन आईडी आवश्यक है','Password must be at least 6 characters':'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए',
  'Salary cannot be negative':'वेतन ऋणात्मक नहीं हो सकता','Staff account created':'कर्मचारी खाता बना दिया गया','Staff removed':'कर्मचारी हटा दिया गया',
  'New device detected. Verify your email with the 8-digit OTP.':'नया उपकरण मिला। अपने ईमेल से 8 अंकों के ओटीपी द्वारा सत्यापित करें।',
  'Signed in successfully!':'सफलतापूर्वक लॉगिन हो गया!','Staff login successful':'कर्मचारी लॉगिन सफल रहा',
  'Enter your email address':'अपना ईमेल पता दर्ज करें','Passwords do not match':'पासवर्ड मेल नहीं खाते',
  '8-digit verification OTP sent to your email':'8 अंकों का सत्यापन ओटीपी आपके ईमेल पर भेजा गया',
  '8-digit OTP sent to your email address':'8 अंकों का ओटीपी आपके ईमेल पते पर भेजा गया','Enter a valid 8-digit OTP':'8 अंकों का सही ओटीपी दर्ज करें',
  'OTP verification did not return a secure session':'ओटीपी सत्यापन से सुरक्षित सत्र नहीं मिला','Supabase Google login is not configured':'Supabase Google लॉगिन कॉन्फ़िगर नहीं है',
  'Create & print invoices in seconds':'कुछ ही सेकंड में चालान बनाएँ और प्रिंट करें','Real-time stock level monitoring':'भंडार स्तर की रियल-टाइम निगरानी',
  'Khatabook — credit ledger tracking':'खाताबही — उधार खाते का रिकॉर्ड','Daily sales analytics & reports':'दैनिक बिक्री विश्लेषण और रिपोर्ट',
  'Staff Login':'कर्मचारी लॉगिन','Login ID is required':'लॉगिन आईडी आवश्यक है','Password is required':'पासवर्ड आवश्यक है',
  'Minimum 6 characters':'कम से कम 6 अक्षर','Enter your password':'अपना पासवर्ड दर्ज करें','Show password':'पासवर्ड दिखाएँ',
  'Name is required':'नाम आवश्यक है','Phone required':'फ़ोन आवश्यक है','Invalid Indian mobile number':'अमान्य भारतीय मोबाइल नंबर',
  'Email is required':'ईमेल आवश्यक है','Enter a valid email':'सही ईमेल दर्ज करें','Password required':'पासवर्ड आवश्यक है',
  'Minimum 8 characters':'कम से कम 8 अक्षर','Min. 8 characters':'कम से कम 8 अक्षर','Please confirm password':'कृपया पासवर्ड की पुष्टि करें',
  'Repeat password':'पासवर्ड दोबारा दर्ज करें','Email required':'ईमेल आवश्यक है','Valid email required':'सही ईमेल आवश्यक है','Send OTP':'ओटीपी भेजें',
  'OTP is required':'ओटीपी आवश्यक है','Could not enable browser notifications.':'ब्राउज़र सूचनाएँ सक्षम नहीं की जा सकीं।',
  'Notifications enabled.':'सूचनाएँ सक्षम हैं।','Notification permission was not allowed.':'सूचना की अनुमति नहीं दी गई।',
  'Browser notifications are not supported in this browser.':'इस ब्राउज़र में ब्राउज़र सूचनाएँ समर्थित नहीं हैं।',
  'Please allow pop-ups for this site to export the PDF.':'PDF निर्यात करने के लिए इस साइट के पॉप-अप की अनुमति दें।',
  'ArrowLeftIcon':'पीछे','HomeIcon':'होम','Page not found':'पृष्ठ नहीं मिला','Go back':'वापस जाएँ','Go home':'होम पर जाएँ'
});

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


/* Extended offline UI vocabulary. Keep this list focused on interface/system
 * words so customer, product, supplier and business-entered data are not
 * intentionally translated. */
const extendedWordTranslations: Record<string, string> = {
  home:'होम', menu:'मेन्यू', navigation:'नेविगेशन', page:'पृष्ठ', pages:'पृष्ठ',
  section:'अनुभाग', sections:'अनुभाग', card:'कार्ड', table:'तालिका', row:'पंक्ति',
  column:'कॉलम', columns:'कॉलम', field:'फ़ील्ड', fields:'फ़ील्ड', form:'फ़ॉर्म',
  modal:'विंडो', dialog:'संवाद', details:'विवरण', information:'जानकारी',
  overview:'सारांश', summary:'सारांश', dashboard:'डैशबोर्ड', widget:'विजेट',
  chart:'चार्ट', charts:'चार्ट', graph:'ग्राफ़', trend:'रुझान', trends:'रुझान',
  monthly:'मासिक', daily:'दैनिक', weekly:'साप्ताहिक', yearly:'वार्षिक',
  month:'महीना', months:'महीने', week:'सप्ताह', weeks:'सप्ताह', year:'वर्ष',
  day:'दिन', days:'दिन', hour:'घंटा', hours:'घंटे', minute:'मिनट', minutes:'मिनट',
  second:'सेकंड', seconds:'सेकंड',
  amount:'राशि', amounts:'राशियाँ', value:'मान', values:'मान', total:'कुल',
  average:'औसत', count:'गिनती', number:'संख्या', numbers:'संख्याएँ',
  record:'रिकॉर्ड', records:'रिकॉर्ड', entry:'प्रविष्टि', entries:'प्रविष्टियाँ',
  list:'सूची', lists:'सूचियाँ', result:'परिणाम', results:'परिणाम',
  status:'स्थिति', pending:'लंबित', completed:'पूर्ण', complete:'पूर्ण',
  processing:'प्रक्रिया में', processed:'प्रक्रिया पूर्ण', success:'सफलता',
  failed:'विफल', failure:'विफलता', warning:'चेतावनी', info:'जानकारी',
  error:'त्रुटि', errors:'त्रुटियाँ', message:'संदेश', messages:'संदेश',
  notification:'सूचना', notifications:'सूचनाएँ', alert:'चेतावनी',
  required:'आवश्यक', optional:'वैकल्पिक', available:'उपलब्ध', unavailable:'अनुपलब्ध',
  enabled:'सक्षम', disabled:'अक्षम', enable:'सक्षम करें', disable:'अक्षम करें',
  active:'सक्रिय', inactive:'निष्क्रिय', default:'डिफ़ॉल्ट', selected:'चयनित',
  select:'चुनें', choose:'चुनें', selected:'चयनित', enter:'दर्ज करें', type:'प्रकार',
  input:'इनपुट', output:'आउटपुट', submit:'जमा करें', apply:'लागू करें',
  applied:'लागू', reset:'रीसेट करें', retry:'फिर से प्रयास करें', reload:'पुनः लोड करें',
  loading:'लोड हो रहा है', loaded:'लोड हो गया', wait:'प्रतीक्षा करें', please:'कृपया',
  continue:'जारी रखें', confirm:'पुष्टि करें', confirmation:'पुष्टि',
  yes:'हाँ', no:'नहीं', ok:'ठीक है', okay:'ठीक है', done:'पूर्ण', finish:'समाप्त करें',
  start:'शुरू करें', stop:'रोकें', open:'खोलें', close:'बंद करें', back:'वापस',
  next:'आगे', previous:'पिछला', first:'पहला', last:'अंतिम', more:'और', less:'कम',
  show:'दिखाएँ', hide:'छिपाएँ', expand:'खोलें', collapse:'समेटें',
  add:'जोड़ें', create:'बनाएँ', new:'नया', save:'सहेजें', saving:'सहेजा जा रहा है',
  update:'संशोधित करें', updated:'संशोधित', edit:'संपादित करें', delete:'हटाएँ',
  remove:'हटाएँ', cancel:'रद्द करें', clear:'साफ़ करें', reset:'रीसेट करें',
  search:'खोजें', refresh:'ताज़ा करें', filter:'फ़िल्टर', filters:'फ़िल्टर',
  export:'निर्यात करें', import:'आयात करें', print:'प्रिंट करें', download:'डाउनलोड करें',
  upload:'अपलोड करें', share:'साझा करें', copy:'कॉपी करें', paste:'पेस्ट करें',
  view:'देखें', preview:'पूर्वावलोकन', open:'खोलें', select:'चुनें',
  dashboard:'डैशबोर्ड', invoice:'चालान', invoices:'चालान', billing:'बिलिंग',
  bill:'बिल', bills:'बिल', product:'उत्पाद', products:'उत्पाद',
  customer:'ग्राहक', customers:'ग्राहक', purchase:'खरीद', purchases:'खरीदारी',
  supplier:'आपूर्तिकर्ता', stock:'भंडार', movement:'गतिविधि', movements:'गतिविधियाँ',
  khatabook:'खाताबही', staff:'कर्मचारी', settings:'सेटिंग्स', setting:'सेटिंग',
  finance:'वित्त', administration:'प्रशासन', inventory:'भंडार', business:'व्यवसाय',
  account:'खाता', app:'ऐप', language:'भाषा', english:'अंग्रेज़ी', hindi:'हिन्दी',
  owner:'मालिक', manager:'प्रबंधक', cashier:'कैशियर', helper:'सहायक',
  employee:'कर्मचारी', employees:'कर्मचारी', member:'सदस्य', members:'सदस्य',
  role:'भूमिका', roles:'भूमिकाएँ', permission:'अनुमति', permissions:'अनुमतियाँ',
  password:'पासवर्ड', username:'उपयोगकर्ता नाम', user:'उपयोगकर्ता', users:'उपयोगकर्ता',
  login:'लॉगिन', logout:'लॉग आउट', sign:'साइन', out:'आउट', welcome:'स्वागत',
  forgot:'भूल गए', remember:'याद रखें', phone:'फ़ोन', mobile:'मोबाइल',
  email:'ईमेल', address:'पता', name:'नाम', title:'शीर्षक', description:'विवरण',
  note:'टिप्पणी', notes:'टिप्पणियाँ', date:'तारीख', time:'समय', today:'आज',
  yesterday:'कल', tomorrow:'कल', now:'अभी', recent:'हाल का', latest:'नवीनतम',
  current:'वर्तमान', previous:'पिछला', upcoming:'आगामी', history:'इतिहास',
  transaction:'लेन-देन', transactions:'लेन-देन', activity:'गतिविधि', activities:'गतिविधियाँ',
  report:'रिपोर्ट', reports:'रिपोर्ट', sales:'बिक्री', sale:'बिक्री', revenue:'आय',
  income:'आय', expense:'खर्च', expenses:'खर्च', profit:'लाभ', loss:'हानि',
  tax:'कर', discount:'छूट', price:'कीमत', quantity:'मात्रा', qty:'मात्रा',
  unit:'इकाई', category:'श्रेणी', sku:'एसकेयू', amount:'राशि', subtotal:'उप-योग',
  total:'कुल', payment:'भुगतान', payments:'भुगतान', paid:'जमा', unpaid:'अजमा',
  due:'बकाया', dues:'बकाया', outstanding:'बकाया', balance:'शेष राशि',
  cash:'नकद', credit:'उधार', online:'ऑनलाइन', upi:'यूपीआई', mode:'माध्यम',
  collect:'लें', gave:'दिए', got:'मिले', give:'दें', get:'लें', cleared:'निपट गया',
  details:'विवरण', purchase:'खरीद', wholesale:'थोक', retailer:'खुदरा', retail:'खुदरा',
  currentstock:'वर्तमान भंडार', low:'कम', lowstock:'कम भंडार', alert:'चेतावनी',
  opening:'प्रारंभिक', closing:'अंतिम', available:'उपलब्ध', unavailable:'अनुपलब्ध',
  supplier:'आपूर्तिकर्ता', contact:'संपर्क', salary:'वेतन', monthly:'मासिक', joined:'शामिल हुए',
  logo:'लोगो', image:'चित्र', file:'फ़ाइल', files:'फ़ाइलें', size:'आकार',
  category:'श्रेणी', description:'विवरण', reason:'कारण', reference:'संदर्भ',
  type:'प्रकार', internal:'आंतरिक', regular:'नियमित', festival:'त्योहार', order:'ऑर्डर',
  item:'वस्तु', items:'वस्तुएँ', flat:'निश्चित', percentage:'प्रतिशत',
  all:'सभी', partial:'आंशिक', draft:'प्रारूप', live:'लाइव', data:'जानकारी',
  found:'मिला', searchresults:'खोज परिणाम', help:'सहायता', support:'सहायता',
  businessname:'व्यवसाय का नाम', ownername:'मालिक का नाम', customername:'ग्राहक का नाम',
  customerphone:'ग्राहक का फ़ोन', customeraddress:'ग्राहक का पता',
  productname:'उत्पाद का नाम', productdetails:'उत्पाद विवरण', billingdetails:'बिलिंग विवरण',
  paymentmode:'भुगतान का माध्यम', paymentdetails:'भुगतान विवरण', invoicenumber:'चालान संख्या',
  invoicedate:'चालान की तारीख', invoiceid:'चालान आईडी', currentstock:'वर्तमान भंडार',
  lowstockalert:'कम भंडार चेतावनी', purchaseprice:'खरीद मूल्य', wholesaleprice:'थोक मूल्य',
  retailerprice:'खुदरा मूल्य', purchasedate:'खरीद की तारीख', purchasedetails:'खरीद विवरण',
  totalcustomers:'कुल ग्राहक', totalstaff:'कुल कर्मचारी', totalpurchases:'कुल खरीदारी',
  paymenthistory:'भुगतान इतिहास', transactionhistory:'लेन-देन इतिहास',
  collectpayment:'भुगतान लें', confirmpayment:'भुगतान की पुष्टि करें',
  creditentry:'उधार प्रविष्टि', paymententry:'भुगतान प्रविष्टि',
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
    return extendedWordTranslations[word.toLowerCase()] ?? wordTranslations[word.toLowerCase()] ?? word;
  });
}

const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function translateNode(node: Node, language: AppLanguage) {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    const original = originalTextNodes.has(textNode)
      ? originalTextNodes.get(textNode)!
      : (originalTextNodes.set(textNode, textNode.nodeValue ?? ''), textNode.nodeValue ?? '');
    const core = original.trim();
    if (!core) return;
    const leading = original.slice(0, original.indexOf(core));
    const trailing = original.slice(original.indexOf(core) + core.length);
    const translated = language === 'en' ? core : translateText(core, language);
    textNode.nodeValue = leading + translated + trailing;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.closest('[data-no-local-translate="true"]')) return;

  // Keep the original DOM attributes forever so repeated React renders and
  // language switches always translate from English, never from Hindi.
  let attrs = originalAttributes.get(el);
  if (!attrs) {
    attrs = new Map();
    originalAttributes.set(el, attrs);
  }
  for (const attr of ['placeholder', 'title', 'aria-label']) {
    const current = el.getAttribute(attr);
    if (current !== null && !attrs.has(attr)) attrs.set(attr, current);
    const original = attrs.get(attr);
    if (original !== undefined) {
      el.setAttribute(attr, language === 'en' ? original : translateText(original, language));
    }
  }

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
  for (const child of Array.from(el.childNodes)) translateNode(child, language);
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
