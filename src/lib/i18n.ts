import { Language } from '../types';

export interface Translations {
  appName: string;
  navVault: string;
  menuVault: string;
  navAdd: string;
  navEmail: string;
  menuAddEmail: string;
  navVerify: string;
  navSecurity: string;
  lockVault: string;
  unlockVault: string;
  vaultLockedTitle: string;
  vaultLockedDesc: string;
  enterPassphrase: string;
  unlockBtn: string;
  wrongPassphrase: string;
  forgotResetBtn: string;
  forgotResetConfirm: string;
  confirmResetYes: string;
  cancel: string;
  themeLight: string;
  themeDark: string;
  languageLabel: string;
  vaultEncryptedStatus: string;
  vaultUnencryptedStatus: string;
  siteLockTitle: string;
  siteLockDesc: string;
  siteEnterPassPlaceholder: string;
  siteWrongPass: string;
  siteUnlockBtn: string;

  // Vault View
  vaultTitle: string;
  vaultSubtitle: string;
  searchPlaceholder: string;
  filterAll: string;
  filterTotp: string;
  filterHotp: string;
  addAccountCta: string;
  tryDemoCta: string;
  emptyVaultTitle: string;
  emptyVaultDesc: string;
  noSearchMatch: string;
  copied: string;
  copyCode: string;
  nextCodeHotp: string;
  counterLabel: string;
  secondsShort: string;
  digitsUnit: string;
  showQr: string;
  deleteAccount: string;
  deleteConfirmMsg: string;
  confirmDelete: string;
  editAccount: string;
  qrModalTitle: string;
  copyUri: string;
  close: string;

  // Add Account View
  addTitle: string;
  addSubtitle: string;
  pasteUriToggle: string;
  pasteUriPlaceholder: string;
  parseUriBtn: string;
  uriParsedSuccess: string;
  uriParseError: string;
  serviceNameLabel: string;
  serviceNamePlaceholder: string;
  accountIdLabel: string;
  accountIdPlaceholder: string;
  galleryIconLabel: string;
  uploadIconBtn: string;
  removeIconBtn: string;
  secretKeyLabel: string;
  secretKeyPlaceholder: string;
  generateRandomKey: string;
  otpTypeLabel: string;
  categoryLabel: string;
  captionLabel: string;
  captionPlaceholder: string;
  totpOption: string;
  hotpOption: string;
  algorithmLabel: string;
  digitsLabel: string;
  periodLabel: string;
  initialCounterLabel: string;
  livePreviewLabel: string;
  saveAccountBtn: string;
  updateAccountBtn: string;
  validationIssuerRequired: string;
  validationAccountRequired: string;
  validationSecretInvalid: string;
  accountSavedToast: string;

  // 2FA Verify & Live Simulator
  verifyTitle: string;
  verifySubtitle: string;
  modeVaultAccount: string;
  modeDemoService: string;
  selectAccountLabel: string;
  noAccountsForVerify: string;
  demoServiceName: string;
  demoServiceAccount: string;
  regenerateDemoBtn: string;
  addDemoToVaultBtn: string;
  demoAddedToast: string;
  scanQrInstruction: string;
  demoSecretLabel: string;
  verifyMethodOtp: string;
  verifyMethodRecovery: string;
  enterOtpLabel: string;
  enterRecoveryLabel: string;
  verifyCodeBtn: string;
  verifySuccessExact: string;
  verifySuccessPrevStep: string;
  verifySuccessNextStep: string;
  verifySuccessHotp: string;
  verifySuccessRecovery: string;
  verifyFailOtp: string;
  verifyFailRecovery: string;
  toleranceNote: string;
  currentExpectedDebug: string;
  revealLiveHint: string;
  hideLiveHint: string;

  // Keep Notes Diary
  notesSearchPlaceholder: string;
  takeNotePlaceholder: string;
  noteTitlePlaceholder: string;
  noteBodyPlaceholder: string;
  noteSaveBtn: string;
  notePinnedHeading: string;
  noteOthersHeading: string;
  notePinAction: string;
  noteUnpinAction: string;
  noteColorLabel: string;
  noteEmptyTitle: string;
  noteEmptyDesc: string;
  noteNoMatch: string;
  noteSavedToast: string;
  noteDeleteConfirm: string;
  notesTabLabel: string;
  sheetsTabLabel: string;
  sheetNewBtn: string;
  sheetDefaultTitle: string;
  sheetTitlePlaceholder: string;
  sheetAddRow: string;
  sheetAddCol: string;
  sheetTotalLabel: string;
  sheetCopyTsv: string;
  sheetDownloadCsv: string;
  sheetEmptyTitle: string;
  sheetEmptyDesc: string;
  sheetDeleteConfirm: string;
  sheetSavedToast: string;
  sheetCellSizeLabel: string;
  sheetSizeShrink: string;
  sheetSizeGrow: string;
  sheetWidthLabel: string;
  sheetHeightLabel: string;
  sheetSizeNames: [string, string, string, string, string];

  // Email Vault
  emailSearchPlaceholder: string;
  emailAddTitle: string;
  emailEditTitle: string;
  emailAddressLabel: string;
  emailAddressPlaceholder: string;
  emailLabelField: string;
  emailLabelPlaceholder: string;
  emailPasswordField: string;
  emailPasswordPlaceholder: string;
  emailNoteField: string;
  emailNotePlaceholder: string;
  emailSaveBtn: string;
  emailSavedToast: string;
  emailEmptyTitle: string;
  emailEmptyDesc: string;
  emailNoMatch: string;
  emailRequiredError: string;
  emailDeleteConfirm: string;

  // Backup & Lock View
  securityTitle: string;
  securitySubtitle: string;
  masterPassSectionTitle: string;
  masterPassSectionDesc: string;
  passphraseStatusActive: string;
  passphraseStatusInactive: string;
  newPassphraseLabel: string;
  confirmPassphraseLabel: string;
  currentPassphraseLabel: string;
  setPassphraseBtn: string;
  changePassphraseBtn: string;
  removePassphraseBtn: string;
  passphraseMismatch: string;
  passphraseTooShort: string;
  passphraseUpdatedToast: string;
  passphraseRemovedToast: string;
  passphraseWrongCurrent: string;

  // Password Account Profile System
  profileSectionTitle: string;
  profileSectionDesc: string;
  activeProfileLabel: string;
  defaultWorkspaceName: string;
  exitProfileBtn: string;
  openProfileTab: string;
  createProfileTab: string;
  profileNameLabel: string;
  profileNamePlaceholder: string;
  profilePasswordLabel: string;
  profilePasswordPlaceholder: string;
  openProfileBtn: string;
  newProfileNameLabel: string;
  newProfilePasswordLabel: string;
  createProfileBtn: string;
  savedProfilesLabel: string;
  profileOpenSuccessToast: string;
  profileCreateSuccessToast: string;
  profileExitToast: string;
  profileInvalidCredsError: string;
  profileExistsError: string;
  profileNameRequiredError: string;
  profilePasswordShortError: string;
  autoLoginTitle: string;
  autoLoginDesc: string;
  autoLoginPlaceholder: string;
  changePassSectionTitle: string;
  changeLoginPassTab: string;
  changeSitePassTab: string;
  currentPassLabel: string;
  newPassLabel: string;
  confirmNewPassLabel: string;
  changePassBtn: string;
  passChangedToast: string;
  passMismatchError: string;
  wrongCurrentPassError: string;

  recoverySectionTitle: string;
  recoverySectionDesc: string;
  recoveryRemaining: string;
  copyAllCodes: string;
  downloadCodes: string;
  regenerateCodesBtn: string;
  regenerateCodesConfirm: string;
  usedLabel: string;
  availableLabel: string;

  backupSectionTitle: string;
  backupSectionDesc: string;
  exportEncryptedTitle: string;
  backupPasswordLabel: string;
  exportJsonBtn: string;
  importEncryptedTitle: string;
  importJsonBtn: string;
  importModeMerge: string;
  importModeReplace: string;
  exportUriTitle: string;
  exportUriBtn: string;
  downloadUriTxtBtn: string;
  importUriTitle: string;
  importUriPlaceholder: string;
  importUriBtn: string;
  backupPasswordRequired: string;
  exportSuccessToast: string;
  importSuccessToast: string;
  importErrorToast: string;
}

const bn: Translations = {
  appName: 'প্রহরী ২এফএ',
  navVault: 'KIRON - XP',
  menuVault: 'KIRON - XP',
  navAdd: 'XP - 1',
  navEmail: 'EMAIL',
  menuAddEmail: 'XP - 2',
  navVerify: 'KIRON',
  navSecurity: 'PROFILE',
  lockVault: 'ভল্ট লক করুন',
  unlockVault: 'ভল্ট আনলক করুন',
  vaultLockedTitle: 'প্রহরী ভল্ট লক করা আছে',
  vaultLockedDesc: 'AES-256-GCM দিয়ে আপনার সকল সিক্রেট কী সুরক্ষিত রয়েছে। অ্যাক্সেস করতে মাস্টার পাসফ্রেজ দিন।',
  enterPassphrase: 'মাস্টার পাসফ্রেজ লিখুন',
  unlockBtn: 'আনলক করুন',
  wrongPassphrase: 'পাসফ্রেজ সঠিক নয় বা ডেটা ডিক্রিপ্ট করা যায়নি।',
  forgotResetBtn: 'পাসফ্রেজ ভুলে গেছেন? ভল্ট রিসেট করুন',
  forgotResetConfirm: 'সতর্কতা: রিসেট করলে লোকাল স্টোরেজের সকল সংরক্ষিত অ্যাকাউন্ট ও রিকভারি কোড চিরতরে মুছে যাবে। নিশ্চিত?',
  confirmResetYes: 'হ্যাঁ, সম্পূর্ণ মুছে ফেলুন',
  cancel: 'বাতিল',
  themeLight: 'লাইট মোড',
  themeDark: 'ডার্ক মোড',
  languageLabel: 'ভাষা',
  vaultEncryptedStatus: 'AES-256-GCM এনক্রিপ্টেড',
  vaultUnencryptedStatus: 'লোকাল স্টোরেজ (লকবিহীন)',
  siteLockTitle: 'KIRON - XP প্রবেশ',
  siteLockDesc: 'ওয়েবসাইটে প্রবেশ করতে পাসওয়ার্ড দিন।',
  siteEnterPassPlaceholder: 'পাসওয়ার্ড লিখুন',
  siteWrongPass: 'পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।',
  siteUnlockBtn: 'প্রবেশ করুন',

  vaultTitle: 'অথেন্টিকেটর ভল্ট',
  vaultSubtitle: 'Web Crypto API দিয়ে RFC 6238 (TOTP) ও RFC 4226 (HOTP) লাইভ কোড জেনারেটর',
  searchPlaceholder: 'সার্ভিস বা ইমেইল দিয়ে খুঁজুন...',
  filterAll: 'সকল',
  filterTotp: 'TOTP',
  filterHotp: 'HOTP',
  addAccountCta: 'অ্যাকাউন্ট যোগ করুন',
  tryDemoCta: 'ডেমো সিমুলেশন দেখুন',
  emptyVaultTitle: 'আপনার ভল্ট এখনো খালি',
  emptyVaultDesc: 'নতুন সার্ভিসের সিক্রেট কী যোগ করুন অথবা তাৎক্ষণিক ২এফএ যাচাই সিমুলেটরে একটি ডেমো QR কোড দিয়ে পরীক্ষা করুন।',
  noSearchMatch: 'আপনার অনুসন্ধানের সাথে মিলে এমন কোনো অ্যাকাউন্ট পাওয়া যায়নি।',
  copied: 'কপি হয়েছে',
  copyCode: 'কোড কপি করুন',
  nextCodeHotp: 'পরবর্তী কোড',
  counterLabel: 'কাউন্টার',
  secondsShort: 'সে.',
  digitsUnit: 'ডিজিট',
  showQr: 'QR ও URI দেখুন',
  deleteAccount: 'মুছে ফেলুন',
  deleteConfirmMsg: 'আপনি কি নিশ্চিতভাবে এই অ্যাকাউন্টটি ভল্ট থেকে মুছে ফেলতে চান?',
  confirmDelete: 'মুছুন',
  editAccount: 'সম্পাদনা',
  qrModalTitle: 'অ্যাকাউন্ট QR কোড ও otpauth:// URI',
  copyUri: 'URI কপি করুন',
  close: 'বন্ধ করুন',

  addTitle: 'নতুন অ্যাকাউন্ট যোগ করুন',
  addSubtitle: 'ম্যানুয়াল এন্ট্রির মাধ্যমে সার্ভিসের নাম, গ্যালারির ছবি, ইমেইল/নম্বর এবং Base32 সিক্রেট কী যুক্ত করুন।',
  pasteUriToggle: 'otpauth:// URI পেস্ট করে অটো-ফিল করুন',
  pasteUriPlaceholder: 'otpauth://totp/Issuer:user@example.com?secret=JBSWY3DPEHPK3PXP...',
  parseUriBtn: 'URI লোড করুন',
  uriParsedSuccess: 'URI থেকে তথ্য সফলভাবে লোড হয়েছে।',
  uriParseError: 'সঠিক otpauth:// URI পাওয়া যায়নি।',
  serviceNameLabel: 'সার্ভিসের নাম',
  serviceNamePlaceholder: 'যেমন: Google, GitHub, bKash, Binance',
  accountIdLabel: 'ইমেইল / ফোন নম্বর / ইউজারনেম',
  accountIdPlaceholder: 'যেমন: user@example.com অথবা +88017...',
  galleryIconLabel: 'গ্যালারি থেকে ছবি / লোগো অ্যাড করুন (ঐচ্ছিক)',
  uploadIconBtn: 'গ্যালারি থেকে ছবি বাছাই',
  removeIconBtn: 'ছবি সরান',
  secretKeyLabel: 'Base32 সিক্রেট কী',
  secretKeyPlaceholder: 'যেমন: JBSWY3DPEHPK3PXP',
  generateRandomKey: 'র্যান্ডম কী তৈরি করুন',
  otpTypeLabel: 'OTP ধরন',
  categoryLabel: 'ক্যাটাগরি',
  captionLabel: 'ক্যাপশন (ঐচ্ছিক)',
  captionPlaceholder: 'যেমন: মূল অ্যাকাউন্ট বা ব্যক্তিগত নোট',
  totpOption: 'সময়-ভিত্তিক (TOTP · RFC 6238)',
  hotpOption: 'কাউন্টার-ভিত্তিক (HOTP · RFC 4226)',
  algorithmLabel: 'হ্যাশ অ্যালগরিদম',
  digitsLabel: 'কোড দৈর্ঘ্য',
  periodLabel: 'সময়কাল (Period)',
  initialCounterLabel: 'প্রাথমিক কাউন্টার',
  livePreviewLabel: 'লাইভ কোড প্রিভিউ',
  saveAccountBtn: 'ভল্টে সংরক্ষণ করুন',
  updateAccountBtn: 'আপডেট সংরক্ষণ করুন',
  validationIssuerRequired: 'সার্ভিসের নাম লিখুন।',
  validationAccountRequired: 'ইমেইল, ফোন নম্বর বা ইউজারনেম লিখুন।',
  validationSecretInvalid: 'কমপক্ষে ৮ অক্ষরের বৈধ Base32 সিক্রেট কী (A-Z, 2-7) দিন।',
  accountSavedToast: 'অ্যাকাউন্ট ভল্টে সংরক্ষিত হয়েছে।',

  verifyTitle: '২এফএ যাচাই ও লাইভ সিমুলেশন',
  verifySubtitle: 'ভল্টের যেকোনো অ্যাকাউন্ট অথবা তাৎক্ষণিক ডেমো সার্ভিস QR কোড দিয়ে ±১ টাইম-স্টেপ টলারেন্স ও রিকভারি কোড পরীক্ষা করুন।',
  modeVaultAccount: 'ভল্টের অ্যাকাউন্ট যাচাই',
  modeDemoService: 'তাৎক্ষণিক ডেমো QR সিমুলেশন',
  selectAccountLabel: 'যাচাইয়ের জন্য অ্যাকাউন্ট নির্বাচন করুন',
  noAccountsForVerify: 'ভল্টে কোনো অ্যাকাউন্ট নেই। ডেমো সিমুলেশন ব্যবহার করুন অথবা অ্যাকাউন্ট যোগ করুন।',
  demoServiceName: 'Prohori Cloud Demo',
  demoServiceAccount: 'demo.security@prohori.local',
  regenerateDemoBtn: 'নতুন ডেমো QR তৈরি করুন',
  addDemoToVaultBtn: 'এই ডেমো ভল্টে যোগ করুন',
  demoAddedToast: 'ডেমো অ্যাকাউন্ট ভল্টে যুক্ত হয়েছে।',
  scanQrInstruction: 'অথেন্টিকেটর অ্যাপ দিয়ে স্ক্যান করুন অথবা নিচের বাটনে ক্লিক করে সরাসরি ভল্টে যোগ করুন',
  demoSecretLabel: 'ডেমো Base32 সিক্রেট',
  verifyMethodOtp: '৬/৮ ডিজিটের OTP কোড',
  verifyMethodRecovery: 'এককালীন রিকভারি কোড',
  enterOtpLabel: 'যাচাইয়ের জন্য কোড লিখুন',
  enterRecoveryLabel: 'এককালীন রিকভারি কোড লিখুন (যেমন: XXXX-XXXX-XXXX)',
  verifyCodeBtn: 'কোড যাচাই করুন',
  verifySuccessExact: 'যাচাই সফল! কোডটি বর্তমান টাইম-স্টেপের (Δ = 0) সাথে নিখুঁতভাবে মিলেছে।',
  verifySuccessPrevStep: 'যাচাই সফল! পূর্ববর্তী টাইম-স্টেপ টলারেন্সে (Δ = -1) কোড গৃহীত হয়েছে।',
  verifySuccessNextStep: 'যাচাই সফল! পরবর্তী টাইম-স্টেপ টলারেন্সে (Δ = +1) কোড গৃহীত হয়েছে।',
  verifySuccessHotp: 'যাচাই সফল! HOTP কাউন্টার সিঙ্ক হয়ে পরবর্তী ধাপে উন্নীত হয়েছে।',
  verifySuccessRecovery: 'রিকভারি কোড যাচাই সফল! এই এককালীন কোডটি এখন ব্যবহৃত হিসেবে চিহ্নিত হয়েছে।',
  verifyFailOtp: 'কোড মেলেনি! ±১ টাইম-স্টেপের মধ্যে সঠিক কোডটি দিয়ে আবার চেষ্টা করুন।',
  verifyFailRecovery: 'রিকভারি কোডটি অবৈধ অথবা ইতোমধ্যেই ব্যবহৃত হয়ে গেছে।',
  toleranceNote: 'TOTP যাচাইয়ে ±১ টাইম-স্টেপ টলারেন্স সক্রিয় থাকে (ঘড়ির সামান্য ব্যবধানের জন্য)।',
  currentExpectedDebug: 'সার্ভারের বর্তমান প্রত্যাশিত কোড',
  revealLiveHint: 'সিমুলেটর কোড দেখুন',
  hideLiveHint: 'কোড লুকান',

  notesSearchPlaceholder: 'ডায়রি বা নোট খুঁজুন...',
  takeNotePlaceholder: 'নোট বা ডায়রি লিখুন...',
  noteTitlePlaceholder: 'শিরোনাম (ঐচ্ছিক)',
  noteBodyPlaceholder: 'এখানে আপনার ডায়রি বা জরুরি নোট লিখুন...',
  noteSaveBtn: 'সংরক্ষণ করুন',
  notePinnedHeading: 'পিন করা',
  noteOthersHeading: 'অন্যান্য নোট',
  notePinAction: 'পিন করুন',
  noteUnpinAction: 'আনপিন করুন',
  noteColorLabel: 'রঙ',
  noteEmptyTitle: 'আপনার ডায়রি ও নোট খালি',
  noteEmptyDesc: 'উপরের "নোট বা ডায়রি লিখুন..." বক্সে ক্লিক করে Keep Notes-এর মতো রঙিন ও পিন করা নোট সংরক্ষণ করুন।',
  noteNoMatch: 'খোঁজার সাথে মিলে এমন কোনো নোট পাওয়া যায়নি।',
  noteSavedToast: 'নোট সংরক্ষিত হয়েছে।',
  noteDeleteConfirm: 'নোটটি মুছে ফেলবেন?',
  notesTabLabel: 'নোট',
  sheetsTabLabel: 'Sheets',
  sheetNewBtn: 'নতুন Sheet',
  sheetDefaultTitle: 'নতুন শিট',
  sheetTitlePlaceholder: 'শিটের নাম লিখুন...',
  sheetAddRow: 'সারি (+)',
  sheetAddCol: 'কলাম (+)',
  sheetTotalLabel: 'মোট',
  sheetCopyTsv: 'টেবিল কপি',
  sheetDownloadCsv: '.csv',
  sheetEmptyTitle: 'কোনো Sheet তৈরি করা হয়নি',
  sheetEmptyDesc: 'নতুন Sheet তৈরি করে হিসাব-নিকাশ, তালিকা বা টেবিল ডেটা Google Sheets-এর মতো সংরক্ষণ করুন।',
  sheetDeleteConfirm: 'এই Sheet টি মুছে ফেলবেন?',
  sheetSavedToast: 'Sheet তৈরি হয়েছে।',
  sheetCellSizeLabel: 'ঘরের সাইজ',
  sheetSizeShrink: 'ঘর ছোট করুন',
  sheetSizeGrow: 'ঘর বড় করুন',
  sheetWidthLabel: 'প্রস্থ',
  sheetHeightLabel: 'উচ্চতা',
  sheetSizeNames: ['খুব ছোট', 'ছোট', 'মাঝারি', 'বড়', 'অনেক বড়'],

  emailSearchPlaceholder: 'ইমেইল বা নাম দিয়ে খুঁজুন...',
  emailAddTitle: 'নতুন EMAIL সংরক্ষণ করুন',
  emailEditTitle: 'EMAIL সম্পাদনা করুন',
  emailAddressLabel: 'ইমেইল ঠিকানা',
  emailAddressPlaceholder: 'example@gmail.com',
  emailLabelField: 'নাম / ক্যাটাগরি (ঐচ্ছিক)',
  emailLabelPlaceholder: 'যেমন: ব্যক্তিগত, অফিস, ব্যাংক',
  emailPasswordField: 'পাসওয়ার্ড (ঐচ্ছিক)',
  emailPasswordPlaceholder: 'ইমেইল পাসওয়ার্ড',
  emailNoteField: 'ক্যাপশন (ঐচ্ছিক)',
  emailNotePlaceholder: 'যেমন: মূল ইমেইল বা ব্যক্তিগত নোট...',
  emailSaveBtn: 'সংরক্ষণ করুন',
  emailSavedToast: 'EMAIL সংরক্ষিত হয়েছে।',
  emailEmptyTitle: 'কোনো EMAIL সংরক্ষিত নেই',
  emailEmptyDesc: 'উপরের ফর্মে আপনার ইমেইল, পাসওয়ার্ড ও রিকভারি নোট নিরাপদে সংরক্ষণ করুন।',
  emailNoMatch: 'খোঁজার সাথে মিলে এমন কোনো EMAIL পাওয়া যায়নি।',
  emailRequiredError: 'অনুগ্রহ করে ইমেইল ঠিকানা লিখুন।',
  emailDeleteConfirm: 'এই ইমেইলটি মুছে ফেলবেন?',

  securityTitle: 'AES-256-GCM ভল্ট, লক ও ব্যাকআপ',
  securitySubtitle: 'PBKDF2-SHA256 + AES-256-GCM এনক্রিপশন, ৮টি জরুরি রিকভারি কোড এবং পাসওয়ার্ড-সুরক্ষিত .json / otpauth:// ব্যাকআপ।',
  masterPassSectionTitle: 'মাস্টার পাসফ্রেজ ও ভল্ট এনক্রিপশন',
  masterPassSectionDesc: 'মাস্টার পাসফ্রেজ সেট করলে লোকাল স্টোরেজের সকল সিক্রেট কী PBKDF2 (২,৫০,০০০ ইটারেশন) ও AES-256-GCM দিয়ে এনক্রিপ্টেড থাকে।',
  passphraseStatusActive: 'ভল্ট এনক্রিপশন সক্রিয়',
  passphraseStatusInactive: 'মাস্টার পাসফ্রেজ এখনো সেট করা হয়নি',
  newPassphraseLabel: 'নতুন মাস্টার পাসফ্রেজ (কমপক্ষে ৬ অক্ষর)',
  confirmPassphraseLabel: 'পাসফ্রেজ নিশ্চিত করুন',
  currentPassphraseLabel: 'বর্তমান পাসফ্রেজ',
  setPassphraseBtn: 'পাসফ্রেজ সেট ও এনক্রিপ্ট করুন',
  changePassphraseBtn: 'পাসফ্রেজ পরিবর্তন করুন',
  removePassphraseBtn: 'পাসফ্রেজ সরান',
  passphraseMismatch: 'দুটি পাসফ্রেজ মিলছে না।',
  passphraseTooShort: 'পাসফ্রেজ কমপক্ষে ৬ অক্ষরের হতে হবে।',
  passphraseUpdatedToast: 'মাস্টার পাসফ্রেজ সেট হয়েছে এবং ভল্ট AES-256-GCM দিয়ে এনক্রিপ্টেড হয়েছে।',
  passphraseRemovedToast: 'মাস্টার পাসফ্রেজ সরানো হয়েছে।',
  passphraseWrongCurrent: 'বর্তমান পাসফ্রেজ সঠিক নয়।',

  profileSectionTitle: 'লগইন ও ক্রিয়েট অ্যাকাউন্ট',
  profileSectionDesc: 'নাম ও পাসওয়ার্ড দিয়ে লগইন করলে আপনার যুক্ত করা সব ২এফএ অ্যাকাউন্ট আসবে। অথবা নতুন নাম ও পাসওয়ার্ড দিয়ে ক্রিয়েট করে নতুন অ্যাকাউন্ট যোগ ও কোড নিতে পারবেন।',
  activeProfileLabel: 'বর্তমান অ্যাকাউন্ট',
  defaultWorkspaceName: 'ডিফল্ট (লগইন করা নেই)',
  exitProfileBtn: 'লগআউট',
  openProfileTab: 'লগইন (Login)',
  createProfileTab: 'ক্রিয়েট অ্যাকাউন্ট (Create)',
  profileNameLabel: 'নাম',
  profileNamePlaceholder: 'আপনার নাম লিখুন (যেমন: kiron)',
  profilePasswordLabel: 'পাসওয়ার্ড',
  profilePasswordPlaceholder: 'পাসওয়ার্ড লিখুন',
  openProfileBtn: 'লগইন করুন',
  newProfileNameLabel: 'নতুন নাম',
  newProfilePasswordLabel: 'নতুন পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)',
  createProfileBtn: 'ক্রিয়েট করুন',
  savedProfilesLabel: 'সংরক্ষিত অ্যাকাউন্টের নাম',
  profileOpenSuccessToast: 'লগইন সফল — যুক্ত করা সব অ্যাকাউন্ট লোড হয়েছে।',
  profileCreateSuccessToast: 'নতুন অ্যাকাউন্ট ক্রিয়েট হয়েছে! এখন ২এফএ অ্যাকাউন্ট যোগ করুন।',
  profileExitToast: 'লগআউট সম্পন্ন হয়েছে।',
  profileInvalidCredsError: 'নাম বা পাসওয়ার্ড সঠিক নয়।',
  profileExistsError: 'এই নামে ইতিমধ্যেই একটি অ্যাকাউন্ট আছে। লগইন অপশন ব্যবহার করুন।',
  profileNameRequiredError: 'অনুগ্রহ করে নাম লিখুন।',
  profilePasswordShortError: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।',
  autoLoginTitle: 'পাসওয়ার্ড অটো লগইন',
  autoLoginDesc: 'সঠিক পাসওয়ার্ড লিখলেই স্বয়ংক্রিয়ভাবে লগইন হয়ে সব অ্যাকাউন্ট চলে আসবে।',
  autoLoginPlaceholder: 'পাসওয়ার্ড লিখুন',
  changePassSectionTitle: 'পাসওয়ার্ড পরিবর্তন',
  changeLoginPassTab: 'লগইন পাসওয়ার্ড',
  changeSitePassTab: 'প্রবেশ পাসওয়ার্ড',
  currentPassLabel: 'বর্তমান পাসওয়ার্ড',
  newPassLabel: 'নতুন পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)',
  confirmNewPassLabel: 'নতুন পাসওয়ার্ড নিশ্চিত করুন',
  changePassBtn: 'পাসওয়ার্ড পরিবর্তন করুন',
  passChangedToast: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।',
  passMismatchError: 'নতুন পাসওয়ার্ড দুটি মিলছে না।',
  wrongCurrentPassError: 'বর্তমান পাসওয়ার্ড সঠিক নয়।',

  recoverySectionTitle: 'জরুরি এককালীন রিকভারি কোড (৮টি)',
  recoverySectionDesc: 'যেকোনো অ্যাকাউন্টের ২এফএ হারিয়ে গেলে জরুরি অবস্থায় ২এফএ যাচাই প্যানেলে এই কোডগুলো একবার করে ব্যবহার করা যায়।',
  recoveryRemaining: 'বাকি আছে',
  copyAllCodes: 'সব কোড কপি করুন',
  downloadCodes: '.txt ডাউনলোড',
  regenerateCodesBtn: '৮টি নতুন কোড রিসেট করুন',
  regenerateCodesConfirm: 'নতুন রিকভারি কোড তৈরি করলে আগের সব অব্যবহৃত কোড অকার্যকর হয়ে যাবে। নিশ্চিত?',
  usedLabel: 'ব্যবহৃত',
  availableLabel: 'সক্রিয়',

  backupSectionTitle: 'এনক্রিপ্টেড ব্যাকআপ ও otpauth:// পোর্টেবিলিটি',
  backupSectionDesc: 'পাসওয়ার্ড-সুরক্ষিত .json ফাইলে সম্পূর্ণ ভল্ট এক্সপোর্ট/ইম্পোর্ট করুন অথবা মানসম্মত otpauth:// URI তালিকা ব্যবহার করুন।',
  exportEncryptedTitle: 'পাসওয়ার্ড-সুরক্ষিত .json ব্যাকআপ এক্সপোর্ট',
  backupPasswordLabel: 'ব্যাকআপ ফাইল পাসওয়ার্ড',
  exportJsonBtn: 'এনক্রিপ্টেড .json ডাউনলোড',
  importEncryptedTitle: 'এনক্রিপ্টেড .json ব্যাকআপ ইম্পোর্ট',
  importJsonBtn: 'ফাইল নির্বাচন ও ডিক্রিপ্ট করুন',
  importModeMerge: 'বিদ্যমান অ্যাকাউন্টের সাথে যোগ করুন',
  importModeReplace: 'সম্পূর্ণ ভল্ট প্রতিস্থাপন করুন',
  exportUriTitle: 'otpauth:// URI তালিকা এক্সপোর্ট',
  exportUriBtn: 'URI তালিকা কপি করুন',
  downloadUriTxtBtn: '.txt ডাউনলোড',
  importUriTitle: 'otpauth:// URI তালিকা ইম্পোর্ট',
  importUriPlaceholder: 'প্রতি লাইনে একটি করে otpauth://totp/... বা otpauth://hotp/... URI পেস্ট করুন',
  importUriBtn: 'URI ইম্পোর্ট করুন',
  backupPasswordRequired: 'ব্যাকআপের জন্য কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।',
  exportSuccessToast: 'ব্যাকআপ সফলভাবে তৈরি হয়েছে।',
  importSuccessToast: 'অ্যাকাউন্ট সফলভাবে ইম্পোর্ট হয়েছে।',
  importErrorToast: 'ফাইল বা পাসওয়ার্ড সঠিক নয় অথবা ফরম্যাট ত্রুটিপূর্ণ।',
};

const en: Translations = {
  appName: 'Prohori 2FA',
  navVault: 'KIRON - XP',
  menuVault: 'KIRON - XP',
  navAdd: 'XP - 1',
  navEmail: 'EMAIL',
  menuAddEmail: 'XP - 2',
  navVerify: 'KIRON',
  navSecurity: 'PROFILE',
  lockVault: 'Lock Vault',
  unlockVault: 'Unlock Vault',
  vaultLockedTitle: 'Prohori Vault is Locked',
  vaultLockedDesc: 'All secrets in local storage are encrypted with AES-256-GCM. Enter your master passphrase to unlock.',
  enterPassphrase: 'Enter master passphrase',
  unlockBtn: 'Unlock Vault',
  wrongPassphrase: 'Incorrect passphrase or unable to decrypt vault.',
  forgotResetBtn: 'Forgot passphrase? Reset vault',
  forgotResetConfirm: 'Warning: Resetting deletes all locally stored accounts and recovery codes permanently. Continue?',
  confirmResetYes: 'Yes, Erase Vault',
  cancel: 'Cancel',
  themeLight: 'Light Mode',
  themeDark: 'Dark Mode',
  languageLabel: 'Language',
  vaultEncryptedStatus: 'AES-256-GCM Encrypted',
  vaultUnencryptedStatus: 'Local Storage (Unlocked)',
  siteLockTitle: 'Enter KIRON - XP',
  siteLockDesc: 'Please enter the access password to continue.',
  siteEnterPassPlaceholder: 'Enter password',
  siteWrongPass: 'Incorrect password. Please try again.',
  siteUnlockBtn: 'Enter',

  vaultTitle: 'Authenticator Vault',
  vaultSubtitle: 'RFC 6238 (TOTP) & RFC 4226 (HOTP) live code engine powered by Web Crypto API',
  searchPlaceholder: 'Search service or account...',
  filterAll: 'All',
  filterTotp: 'TOTP',
  filterHotp: 'HOTP',
  addAccountCta: 'Add Account',
  tryDemoCta: 'Try Live Demo',
  emptyVaultTitle: 'Your vault is empty',
  emptyVaultDesc: 'Add a service manually with a Base32 secret key, or test the instant demo QR code in the 2FA verification simulator.',
  noSearchMatch: 'No accounts match your search filter.',
  copied: 'Copied',
  copyCode: 'Copy code',
  nextCodeHotp: 'Next code',
  counterLabel: 'Counter',
  secondsShort: 's',
  digitsUnit: 'digits',
  showQr: 'Show QR & URI',
  deleteAccount: 'Delete',
  deleteConfirmMsg: 'Are you sure you want to remove this account from your vault?',
  confirmDelete: 'Delete',
  editAccount: 'Edit',
  qrModalTitle: 'Account QR Code & otpauth:// URI',
  copyUri: 'Copy URI',
  close: 'Close',

  addTitle: 'Add Authenticator Account',
  addSubtitle: 'Add via manual entry with service name, gallery image, email/phone, and Base32 secret key.',
  pasteUriToggle: 'Auto-fill from otpauth:// URI',
  pasteUriPlaceholder: 'otpauth://totp/Issuer:user@example.com?secret=JBSWY3DPEHPK3PXP...',
  parseUriBtn: 'Load URI',
  uriParsedSuccess: 'Account fields loaded from URI.',
  uriParseError: 'Invalid otpauth:// URI format.',
  serviceNameLabel: 'Service Name',
  serviceNamePlaceholder: 'e.g. Google, GitHub, Cloudflare, Binance',
  accountIdLabel: 'Email / Phone / Username',
  accountIdPlaceholder: 'e.g. user@example.com or +88017...',
  galleryIconLabel: 'Add Image from Gallery (Optional)',
  uploadIconBtn: 'Choose Image',
  removeIconBtn: 'Remove',
  secretKeyLabel: 'Base32 Secret Key',
  secretKeyPlaceholder: 'e.g. JBSWY3DPEHPK3PXP',
  generateRandomKey: 'Generate Random Key',
  otpTypeLabel: 'OTP Type',
  categoryLabel: 'Category',
  captionLabel: 'Caption (Optional)',
  captionPlaceholder: 'e.g. Primary account or personal note',
  totpOption: 'Time-based (TOTP · RFC 6238)',
  hotpOption: 'Counter-based (HOTP · RFC 4226)',
  algorithmLabel: 'Hash Algorithm',
  digitsLabel: 'Code Digits',
  periodLabel: 'Interval (Period)',
  initialCounterLabel: 'Initial Counter',
  livePreviewLabel: 'Live Code Preview',
  saveAccountBtn: 'Save to Vault',
  updateAccountBtn: 'Save Changes',
  validationIssuerRequired: 'Please enter a service name.',
  validationAccountRequired: 'Please enter an email, phone, or username.',
  validationSecretInvalid: 'Enter a valid Base32 secret key (at least 8 chars, A-Z & 2-7).',
  accountSavedToast: 'Account saved to vault.',

  verifyTitle: '2FA Verification & Live Simulation',
  verifySubtitle: 'Verify 6/8-digit codes with ±1 time-step tolerance or one-time recovery codes against vault accounts or an instant demo QR.',
  modeVaultAccount: 'Verify Vault Account',
  modeDemoService: 'Instant Demo QR Simulation',
  selectAccountLabel: 'Select account to verify',
  noAccountsForVerify: 'No accounts in vault yet. Switch to Demo QR Simulation or add an account.',
  demoServiceName: 'Prohori Cloud Demo',
  demoServiceAccount: 'demo.security@prohori.local',
  regenerateDemoBtn: 'New Demo QR',
  addDemoToVaultBtn: 'Add Demo to Vault',
  demoAddedToast: 'Demo service added to your vault.',
  scanQrInstruction: 'Scan with any authenticator app or click below to add directly to your vault',
  demoSecretLabel: 'Demo Base32 Secret',
  verifyMethodOtp: '6/8-Digit OTP Code',
  verifyMethodRecovery: 'One-Time Recovery Code',
  enterOtpLabel: 'Enter verification code',
  enterRecoveryLabel: 'Enter recovery code (e.g. XXXX-XXXX-XXXX)',
  verifyCodeBtn: 'Verify Code',
  verifySuccessExact: 'Verified! Code matched the exact current time step (Δ = 0).',
  verifySuccessPrevStep: 'Verified! Code accepted within previous time-step tolerance (Δ = -1).',
  verifySuccessNextStep: 'Verified! Code accepted within next time-step tolerance (Δ = +1).',
  verifySuccessHotp: 'Verified! HOTP counter synchronized and incremented.',
  verifySuccessRecovery: 'Recovery code accepted! This single-use code is now marked as used.',
  verifyFailOtp: 'Invalid code. Not matched within ±1 time-step window.',
  verifyFailRecovery: 'Invalid or already used recovery code.',
  toleranceNote: 'TOTP verification enforces ±1 time-step tolerance to allow minor clock drift.',
  currentExpectedDebug: 'Expected server code',
  revealLiveHint: 'Show expected code',
  hideLiveHint: 'Hide code',

  notesSearchPlaceholder: 'Search diary & notes...',
  takeNotePlaceholder: 'Take a note...',
  noteTitlePlaceholder: 'Title (optional)',
  noteBodyPlaceholder: 'Write your diary entry or quick note...',
  noteSaveBtn: 'Save Note',
  notePinnedHeading: 'Pinned',
  noteOthersHeading: 'Others',
  notePinAction: 'Pin note',
  noteUnpinAction: 'Unpin note',
  noteColorLabel: 'Color',
  noteEmptyTitle: 'Your diary & notes are empty',
  noteEmptyDesc: 'Click "Take a note..." above to create Keep-style color-coded and pinned diary notes.',
  noteNoMatch: 'No notes match your search.',
  noteSavedToast: 'Note saved.',
  noteDeleteConfirm: 'Delete this note?',
  notesTabLabel: 'Notes',
  sheetsTabLabel: 'Sheets',
  sheetNewBtn: 'New Sheet',
  sheetDefaultTitle: 'Untitled Sheet',
  sheetTitlePlaceholder: 'Sheet title...',
  sheetAddRow: 'Row (+)',
  sheetAddCol: 'Col (+)',
  sheetTotalLabel: 'Total',
  sheetCopyTsv: 'Copy Table',
  sheetDownloadCsv: '.csv',
  sheetEmptyTitle: 'No Sheets yet',
  sheetEmptyDesc: 'Create a spreadsheet table to organize accounts, budgets, or structured data just like Google Sheets.',
  sheetDeleteConfirm: 'Delete this sheet?',
  sheetSavedToast: 'Sheet created.',
  sheetCellSizeLabel: 'Cell Size',
  sheetSizeShrink: 'Smaller cells',
  sheetSizeGrow: 'Larger cells',
  sheetWidthLabel: 'Width',
  sheetHeightLabel: 'Height',
  sheetSizeNames: ['XS', 'S', 'M', 'L', 'XL'],

  emailSearchPlaceholder: 'Search emails or labels...',
  emailAddTitle: 'Add EMAIL',
  emailEditTitle: 'Edit EMAIL',
  emailAddressLabel: 'Email Address',
  emailAddressPlaceholder: 'example@gmail.com',
  emailLabelField: 'Label (optional)',
  emailLabelPlaceholder: 'e.g. Personal, Work, Recovery',
  emailPasswordField: 'Password (optional)',
  emailPasswordPlaceholder: 'Email password',
  emailNoteField: 'Caption (optional)',
  emailNotePlaceholder: 'e.g. Primary email or personal note...',
  emailSaveBtn: 'Save EMAIL',
  emailSavedToast: 'EMAIL saved.',
  emailEmptyTitle: 'No saved EMAILs yet',
  emailEmptyDesc: 'Store your email addresses, optional passwords, and recovery notes securely here.',
  emailNoMatch: 'No emails match your search.',
  emailRequiredError: 'Please enter an email address.',
  emailDeleteConfirm: 'Delete this email entry?',

  securityTitle: 'AES-256-GCM Vault, Lock & Backup',
  securitySubtitle: 'PBKDF2-SHA256 + AES-256-GCM vault encryption, 8 one-time recovery codes, and encrypted .json / otpauth:// backups.',
  masterPassSectionTitle: 'Master Passphrase & Vault Encryption',
  masterPassSectionDesc: 'Setting a master passphrase encrypts all stored secrets in localStorage using PBKDF2 (250,000 iterations) and AES-256-GCM.',
  passphraseStatusActive: 'Vault encryption active',
  passphraseStatusInactive: 'No master passphrase set',
  newPassphraseLabel: 'New Master Passphrase (min 6 chars)',
  confirmPassphraseLabel: 'Confirm Passphrase',
  currentPassphraseLabel: 'Current Passphrase',
  setPassphraseBtn: 'Set Passphrase & Encrypt',
  changePassphraseBtn: 'Change Passphrase',
  removePassphraseBtn: 'Remove Passphrase',
  passphraseMismatch: 'Passphrases do not match.',
  passphraseTooShort: 'Passphrase must be at least 6 characters.',
  passphraseUpdatedToast: 'Master passphrase active. Vault encrypted with AES-256-GCM.',
  passphraseRemovedToast: 'Master passphrase removed.',
  passphraseWrongCurrent: 'Current passphrase is incorrect.',

  profileSectionTitle: 'Login & Create Account',
  profileSectionDesc: 'Login with your name and password to load all your saved 2FA accounts, or create a new account with a new name and password.',
  activeProfileLabel: 'Current Account',
  defaultWorkspaceName: 'Default (Not logged in)',
  exitProfileBtn: 'Logout',
  openProfileTab: 'Login',
  createProfileTab: 'Create Account',
  profileNameLabel: 'Name',
  profileNamePlaceholder: 'Enter your name (e.g. kiron)',
  profilePasswordLabel: 'Password',
  profilePasswordPlaceholder: 'Enter password',
  openProfileBtn: 'Login',
  newProfileNameLabel: 'New Name',
  newProfilePasswordLabel: 'New Password (min 4 chars)',
  createProfileBtn: 'Create Account',
  savedProfilesLabel: 'Saved Account Names',
  profileOpenSuccessToast: 'Logged in — all saved accounts loaded.',
  profileCreateSuccessToast: 'Account created! Add 2FA accounts to generate codes.',
  profileExitToast: 'Logged out.',
  profileInvalidCredsError: 'Invalid name or password.',
  profileExistsError: 'An account with this name already exists. Please login.',
  profileNameRequiredError: 'Please enter a name.',
  profilePasswordShortError: 'Password must be at least 4 characters.',
  autoLoginTitle: 'Password Auto Login',
  autoLoginDesc: 'Type your password to log in automatically and load all saved accounts.',
  autoLoginPlaceholder: 'Enter password',
  changePassSectionTitle: 'Change Password',
  changeLoginPassTab: 'Login Password',
  changeSitePassTab: 'Entry Password',
  currentPassLabel: 'Current Password',
  newPassLabel: 'New Password (min 4 chars)',
  confirmNewPassLabel: 'Confirm New Password',
  changePassBtn: 'Change Password',
  passChangedToast: 'Password changed successfully.',
  passMismatchError: 'New passwords do not match.',
  wrongCurrentPassError: 'Current password is incorrect.',

  recoverySectionTitle: 'Emergency One-Time Recovery Codes (8)',
  recoverySectionDesc: 'Use any unused recovery code once in the 2FA verification panel as an emergency fallback.',
  recoveryRemaining: 'remaining',
  copyAllCodes: 'Copy All',
  downloadCodes: 'Download .txt',
  regenerateCodesBtn: 'Reset 8 Codes',
  regenerateCodesConfirm: 'Generating new recovery codes invalidates all previous unused codes. Proceed?',
  usedLabel: 'Used',
  availableLabel: 'Active',

  backupSectionTitle: 'Encrypted Backup & otpauth:// Portability',
  backupSectionDesc: 'Export or import your entire vault as a password-protected .json file, or manage standard otpauth:// URI lists.',
  exportEncryptedTitle: 'Export Password-Protected .json Backup',
  backupPasswordLabel: 'Backup Encryption Password',
  exportJsonBtn: 'Download Encrypted .json',
  importEncryptedTitle: 'Import Encrypted .json Backup',
  importJsonBtn: 'Choose File & Decrypt',
  importModeMerge: 'Merge with existing accounts',
  importModeReplace: 'Replace entire vault',
  exportUriTitle: 'Export otpauth:// URI List',
  exportUriBtn: 'Copy URI List',
  downloadUriTxtBtn: 'Download .txt',
  importUriTitle: 'Import otpauth:// URI List',
  importUriPlaceholder: 'Paste one otpauth://totp/... or otpauth://hotp/... URI per line',
  importUriBtn: 'Import URIs',
  backupPasswordRequired: 'Enter a backup password (min 4 characters).',
  exportSuccessToast: 'Backup exported successfully.',
  importSuccessToast: 'Accounts imported successfully.',
  importErrorToast: 'Decryption failed: wrong password or invalid backup file.',
};

export function getTranslations(lang: Language): Translations {
  return lang === 'en' ? en : bn;
}
