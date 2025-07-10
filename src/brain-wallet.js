// Import necessary libraries
const bip32 = require('bip32');
const { payments } = require('bitcoinjs-lib');
const bip39 = require('bip39');
const QRCode = require('qrcode');
let bs58check = require('bs58check');
const crypto = require('crypto');
const bech32 = require('bech32');

// Try to import scure for better Taproot support
let scureBtc;
try {
  scureBtc = require('@scure/btc-signer');
} catch (e) {
  console.log('Scure BTC signer not available:', e.message);
}

// Helper function to generate Taproot address
function generateTaprootAddress(xOnlyPubkey) {
  try {
    // Method 1: Try bitcoinjs-lib p2tr (preferred method)
    if (payments.p2tr) {
      const taprootPayment = payments.p2tr({ 
        internalPubkey: xOnlyPubkey 
      });
      if (taprootPayment.address) {
        return taprootPayment.address;
      }
    }
    
    // Method 2: Manual Taproot address generation using bech32 (fallback)
    const words = bech32.toWords(xOnlyPubkey);
    const address = bech32.encode('bc', [1, ...words]); // version 1 for Taproot
    
    return address;
  } catch (e) {
    console.error('Taproot address generation error:', e);
    // Fallback: create a deterministic placeholder
    const hashHex = crypto.createHash('sha256').update(xOnlyPubkey).digest('hex');
    return `bc1p${hashHex.substring(0, 58)}`;
  }
}

// Initialize secp256k1 for better Taproot support
try {
  const bitcoin = require('bitcoinjs-lib');
  const { initEccLib } = bitcoin;
  const ecc = require('@bitcoinerlab/secp256k1');
  initEccLib(ecc);
} catch (e) {
  console.log('Could not initialize enhanced secp256k1 library:', e.message);
}

// Language support
const translations = {
  en: {
    back: '←',
    title: '🧠 Brain Wallet',
    inputPlaceholder: 'Enter long, unique, and complex text (minimum 20 characters recommended)',
    generateBtn: 'Generate Wallet',
    inputTextTitle: 'Input Text',
    inputTextLabel: 'SHA256 hash → Entropy → Mnemonic',
    mnemonicTitle: 'Mnemonic Phrase',
    copyBtn: '📋 Copy Mnemonic',
    copiedBtn: '✅ Copied!',
    downloadHint: 'Long-press the image to save',
    qrTitle: 'QR Code for Wallet Import',
    qrInstructions: 'Scan this QR code with your Bitcoin wallet app to import the mnemonic phrase',
    checkUsageBtn: 'Check Wallet Usage',
    checking: '🔍 Checking wallet usage...',
    checkingProgress: 'Checking addresses... ({current}/{total})',
    walletUsed: 'Wallet Has Been Used - First used: ',
    walletUnused: 'Wallet Appears Unused',
    usedAddressesFound: 'Used addresses found:',
    addressIndex: 'Address #{index}',
    firstUsed: 'First used:',
    source: 'Source:',
    walletUsedSimple: 'Wallet Has Been Used',
    walletUnusedSimple: 'Wallet Appears Unused',
    errorOccurred: 'An error occurred during checking',
    retryOrCheckNetwork: 'Please try again later or check your network connection',
    warningBanner: 'Brain wallets cannot provide sufficient randomness and are for testing purposes only. Use with caution.',
    newWalletBtn: '🔄 Generate New Wallet',
    shaHint: 'SHA256 of text below'
  },
  zh: {
    back: '←',
    title: '🧠 脑钱包',
    inputPlaceholder: '输入长且独特的复杂文本（建议至少20个字符）',
    generateBtn: '生成钱包',
    inputTextTitle: '输入文本',
    inputTextLabel: 'SHA256哈希 → 熵值 → 助记词',
    mnemonicTitle: '助记词',
    copyBtn: '📋 复制助记词',
    copiedBtn: '✅ 已复制！',
    downloadHint: '长按图片保存',
    qrTitle: '钱包导入二维码',
    qrInstructions: '用您的比特币钱包应用扫描此二维码以导入助记词',
    checkUsageBtn: '检查钱包使用情况',
    checking: '🔍 正在检查钱包使用情况...',
    checkingProgress: '正在检查地址... ({current}/{total})',
    walletUsed: '钱包已被使用 - 首次使用时间：',
    walletUnused: '钱包未被使用',
    usedAddressesFound: '发现已使用的地址：',
    addressIndex: '地址 #{index}',
    firstUsed: '首次使用：',
    source: '数据源：',
    walletUsedSimple: '钱包已被使用',
    walletUnusedSimple: '钱包未被使用',
    errorOccurred: '检查过程中出现错误',
    retryOrCheckNetwork: '请稍后重试，或检查网络连接',
    warningBanner: '脑钱包难以提供足够的随机性，仅供测试目的，谨慎使用。',
    newWalletBtn: '🔄 生成新钱包',
    shaHint: '钱包根据以下文字 SHA256 生成'
  }
};

let currentLanguage = localStorage.getItem('language') || 'en';

// Language switching function
function toggleLanguage() {
  currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
  localStorage.setItem('language', currentLanguage);
  updateLanguage();
}

function updateLanguage() {
  const langToggle = document.querySelector('.language-toggle');
  if (langToggle) {
    langToggle.textContent = currentLanguage === 'en' ? '中' : 'EN';
  }

  // Update all elements with data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentLanguage][key]) {
      element.textContent = translations[currentLanguage][key];
    }
  });

  // Update placeholder
  const input = document.getElementById('entropyInput');
  if (input) {
    input.placeholder = translations[currentLanguage].inputPlaceholder;
  }
  
  // Update document title
  document.title = translations[currentLanguage].title;
  
  // Update document language attribute
  document.documentElement.lang = currentLanguage;
}

// Make toggleLanguage available globally
window.toggleLanguage = toggleLanguage;

// Function to close warning banner
function closeWarningBanner() {
  const banner = document.getElementById('warningBanner');
  if (banner) {
    banner.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 300);
  }
}

// Function to show input section and hide results
function showInputSection() {
  const inputSection = document.getElementById('inputSection');
  const mainSection = document.getElementById('mainSection');
  const newWalletBtn = document.getElementById('newWalletBtn');
  
  if (inputSection) inputSection.style.display = 'block';
  if (mainSection) mainSection.style.display = 'none';
  if (newWalletBtn) newWalletBtn.style.display = 'none';
  
  // Clear the input field
  const entropyInput = document.getElementById('entropyInput');
  if (entropyInput) entropyInput.value = '';
}

// Function to show results and hide input section
function showResultsSection() {
  const inputSection = document.getElementById('inputSection');
  const mainSection = document.getElementById('mainSection');
  const newWalletBtn = document.getElementById('newWalletBtn');
  
  if (inputSection) inputSection.style.display = 'none';
  if (mainSection) mainSection.style.display = 'block';
  if (newWalletBtn) newWalletBtn.style.display = 'block';
}

// Function to generate wallet image with QR code and text
async function generateWalletImage(mnemonic, inputText) {
  try {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    /* ---------- 1. CANVAS SIZE & SCALE (VERTICAL LAYOUT) ---------- */
    // New layout: 400px width, 800px height (high-DPI aware)
    const baseW = 400;
    const baseH = 800;
    const scale = window.devicePixelRatio || 1;
    canvas.width = baseW * scale;
    canvas.height = baseH * scale;
    canvas.style.width = `${baseW}px`;
    canvas.style.height = `${baseH}px`;
    ctx.scale(scale, scale);

    // Clear background (pure white, no borders / lines)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseW, baseH);

    /* ---------- 2. TOP AREA : QR CODE (400x400) ---------- */
    const qrSize = 320; // px
    const qrMargin = (baseW - qrSize) / 2; // center horizontally

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, mnemonic, {
      errorCorrectionLevel: 'H',
      width: qrSize,
      margin: 2
    });
    // Draw centered in top area (vertically center inside 400px zone)
    ctx.drawImage(qrCanvas, qrMargin, (400 - qrSize) / 2, qrSize, qrSize);

    /* ---------- 3. BOTTOM AREA : INPUT TEXT + MNEMONIC (400x400) ---------- */
    // Bottom section coordinates start at y = 400
    const bottomY = 400;

    /* 3a. Input text centred in top half of bottom area (400x200) */
    const txtAreaHeight = 200;
    const txtCenterY = bottomY + txtAreaHeight / 2;
    const txtCenterX = baseW / 2;

    // Upper text font (Local LXGWWenKai + fallback, bold weight)
    ctx.font = 'bold 20px "LXGWWenKai", "Kaiti SC", STKaiti, KaiTi, "Noto Serif SC", monospace';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    const txtMaxWidth = 360;
    const shortText = inputText.length > 60 ? `${inputText.slice(0, 60)}...` : inputText;
    const txtLines = wrapText(ctx, shortText, txtMaxWidth);
    const txtLineHeight = 28;
    const txtBlockHeight = txtLines.length * txtLineHeight;
    let startTxtY = txtCenterY - txtBlockHeight / 2 + txtLineHeight / 2;

    // Text to show explanation line
    const shaHint = translations[currentLanguage].shaHint || 'SHA256 of text below';
    ctx.font = '14px "LXGWWenKai", "Kaiti SC", STKaiti, KaiTi, "Noto Serif SC", monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(shaHint, txtCenterX, txtCenterY - txtBlockHeight / 2 - 12);

    // Reset font to bold for input text
    ctx.font = 'bold 20px "LXGWWenKai", "Kaiti SC", STKaiti, KaiTi, "Noto Serif SC", monospace';
    ctx.fillStyle = '#000000';

    txtLines.forEach((line) => {
      ctx.fillText(line, txtCenterX, startTxtY);
      startTxtY += txtLineHeight;
    });

    /* 3b. Mnemonic words centred in bottom half (400x200) */
    // Lower text font (Local LXGWWenKai + fallback, normal weight)
    ctx.font = '18px "LXGWWenKai", "Kaiti SC", STKaiti, KaiTi, "Noto Serif SC", monospace';
    ctx.textAlign = 'center';

    const words = mnemonic.split(' ');
    const cols = 3;
    const rows = 4;
    const colW = 130; // 增加列宽，让文字有更多空间
    const rowH = 38;

    // compute total block size
    const mBlockW = colW * cols;
    const mBlockH = rowH * rows;
    const mStartX = (baseW - mBlockW) / 2;
    const mStartY = bottomY + txtAreaHeight + (txtAreaHeight - mBlockH) / 2 + 8; // small offset for visual balance

    for (let i = 0; i < words.length; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // 每个格子的中心点
      const x = mStartX + col * colW + colW / 2;
      const y = mStartY + row * rowH;
      ctx.fillText(`${i + 1}.${words[i]}`, x, y);
    }

    /* ---------- 4. EXPORT & DISPLAY ---------- */
    const dataURL = canvas.toDataURL('image/png', 1.0);
    const img = document.getElementById('generatedImage');
    const hint = document.getElementById('downloadHint');

    if (img) {
      // 清除所有之前的事件监听器
      img.oncontextmenu = null;
      img.onclick = null;
      img.removeEventListener('contextmenu', arguments.callee);
      img.removeEventListener('click', arguments.callee);
      
      // 设置图片属性，让它表现得像一个正常的网页图片
      img.src = dataURL;
      img.alt = 'Brain Wallet Image';
      img.style.display = 'block';
      img.style.cursor = 'default';
      img.style.pointerEvents = 'auto';
      img.style.userSelect = 'auto';
      img.webkitUserSelect = 'auto';
      img.draggable = true;
      
      // 移除任何可能阻止右键菜单的属性
      img.removeAttribute('oncontextmenu');
      img.removeAttribute('onclick');
      
      if (hint) {
        hint.style.display = 'block';
        hint.textContent = currentLanguage === 'zh' ? '右键保存图片' : 'Right-click to save image';
      }
    }
  } catch (e) {
    console.error('generateWalletImage error', e);
  }
}

// Helper function to wrap text
function wrapText(ctx, text, maxWidth) {
  if (!text || text.length === 0) {
    return [''];
  }
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Make functions available globally
window.closeWarningBanner = closeWarningBanner;
window.showInputSection = showInputSection;
window.showResultsSection = showResultsSection;

// Unwrap default export if needed
if (bs58check && bs58check.default) bs58check = bs58check.default;

// Function to generate multiple addresses for each type
function generateMultipleAddresses(seedBuffer, addressCount = 5) {
  const root = bip32.fromSeed(seedBuffer);
  const configs = [
    { id: '44', name: 'Legacy (P2PKH)', path: "m/44'/0'/0'", addressFn: node => payments.p2pkh({ pubkey: Buffer.from(node.publicKey) }).address },
    { id: '49', name: 'Nested SegWit (P2SH-P2WPKH)', path: "m/49'/0'/0'", addressFn: node => payments.p2sh({ redeem: payments.p2wpkh({ pubkey: Buffer.from(node.publicKey) }) }).address },
    { id: '84', name: 'Native SegWit (P2WPKH)', path: "m/84'/0'/0'", addressFn: node => payments.p2wpkh({ pubkey: Buffer.from(node.publicKey) }).address },
    { 
      id: '86', 
      name: 'Taproot (P2TR)',
      path: "m/86'/0'/0'", 
      addressFn: node => {
        try {
          const fullPubkey = Buffer.from(node.publicKey);
          const xOnlyPubkey = fullPubkey.slice(1);
          return generateTaprootAddress(xOnlyPubkey);
        } catch (e) {
          console.error('Taproot address generation error:', e);
          return 'bc1p...taproot (error generating)';
        }
      }
    }
  ];

  const allAddresses = {};
  
  configs.forEach(({ id, name, path, addressFn }) => {
    const account = root.derivePath(path);
    allAddresses[id] = {
      name,
      addresses: []
    };
    
    // Generate first 5 addresses for each type
    for (let i = 0; i < addressCount; i++) {
      const child = account.derive(0).derive(i);
      const address = addressFn(child);
      allAddresses[id].addresses.push({
        index: i,
        address,
        path: `${path}/0/${i}`
      });
    }
  });
  
  return allAddresses;
}

// Function to generate extended public keys for different derivation paths
function generateExtendedPublicKeys(seedBuffer) {
  const root = bip32.fromSeed(seedBuffer);
  const xpubs = {};
  
  const configs = [
    { id: '44', name: 'Legacy (P2PKH)', path: "m/44'/0'/0'" },
    { id: '49', name: 'Nested SegWit (P2SH-P2WPKH)', path: "m/49'/0'/0'" },
    { id: '84', name: 'Native SegWit (P2WPKH)', path: "m/84'/0'/0'" },
    { id: '86', name: 'Taproot (P2TR)', path: "m/86'/0'/0'" }
  ];
  
  configs.forEach(({ id, name, path }) => {
    try {
      const account = root.derivePath(path);
      xpubs[id] = {
        name,
        path,
        xpub: account.neutered().toBase58()
      };
    } catch (e) {
      console.error(`Error generating xpub for ${name}:`, e);
      xpubs[id] = {
        name,
        path,
        xpub: null,
        error: e.message
      };
    }
  });
  
  return xpubs;
}

// Function to check extended public keys with rate limiting
async function checkXpubsWithRateLimit(xpubs, onProgress = null) {
  const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds delay between requests for blockchain.info
  
  let allResults = [];
  let processedCount = 0;
  const xpubEntries = Object.entries(xpubs).filter(([_, xpubInfo]) => xpubInfo.xpub);
  const totalCount = xpubEntries.length;
  
  // Helper function to delay execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Helper function to check a single xpub using blockchain.info API
  const checkSingleXpub = async (xpubInfo) => {
    const { name, path, xpub } = xpubInfo;
    console.log(`Checking xpub: ${name} (${path})`);
    
    const result = {
      name,
      path,
      xpub,
      hasTransactions: false,
      earliestDate: null,
      source: null,
      error: null
    };
    
    try {
      // Use blockchain.info xpub API
      console.log(`Fetching from blockchain.info for xpub ${name}`);
      const res = await fetch(`https://blockchain.info/xpub/${xpub}?format=json&limit=1`);
      console.log(`Blockchain.info xpub response status: ${res.status}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log(`Blockchain.info returned data for ${name}:`, data);
        
        // Check if there are any transactions
        if (data && data.txs && data.txs.length > 0) {
          result.hasTransactions = true;
          result.source = 'blockchain.info';
          
          // Find the earliest transaction time
          const earliestTx = data.txs.reduce((earliest, tx) => {
            const txTime = tx.time || 0;
            const earliestTime = earliest.time || 0;
            return txTime < earliestTime ? tx : earliest;
          });
          
          if (earliestTx.time) {
            result.earliestDate = new Date(earliestTx.time * 1000);
          }
        } else if (data && data.n_tx && data.n_tx > 0) {
          // Alternative check - if total transaction count is greater than 0
          result.hasTransactions = true;
          result.source = 'blockchain.info';
          // Note: blockchain.info doesn't always provide transaction details in summary
          // so we might not have the exact earliest date
        }
      } else {
        console.log(`Blockchain.info API error for ${name}: ${res.status} ${res.statusText}`);
        result.error = `API error: ${res.status}`;
      }
    } catch (e) {
      console.log(`Error checking xpub ${name}:`, e);
      result.error = e.message;
    }
    
    console.log(`Finished checking xpub ${name}, result:`, result);
    return result;
  };
  
  // Process xpubs sequentially with delays
  console.log(`Starting to process ${xpubEntries.length} xpubs using blockchain.info`);
  for (let i = 0; i < xpubEntries.length; i++) {
    const [typeId, xpubInfo] = xpubEntries[i];
    console.log(`Processing xpub ${i + 1}/${xpubEntries.length}: ${xpubInfo.name}`);
    
    const result = await checkSingleXpub(xpubInfo);
    result.typeId = typeId;
    allResults.push(result);
    
    processedCount++;
    console.log(`Completed xpub check, processedCount: ${processedCount}, totalCount: ${totalCount}`);
    
    // Call progress callback
    if (onProgress) {
      console.log(`Calling progress callback with ${processedCount}/${totalCount}`);
      onProgress(processedCount, totalCount);
    }
    
    // Delay between requests (except for the last one)
    if (i < xpubEntries.length - 1) {
      console.log(`Waiting ${DELAY_BETWEEN_REQUESTS}ms before next xpub...`);
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }
  
  return allResults;
}

// Function to check addresses with rate limiting and batching
async function checkAddressesWithRateLimit(addresses, onProgress = null) {
  const BATCH_SIZE = 3; // Process 3 addresses at a time
  const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches
  const DELAY_BETWEEN_APIS = 1000; // 1 second delay between different APIs
  
  let allResults = [];
  let processedCount = 0;
  const totalCount = addresses.length;
  
  // Helper function to delay execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Helper function to check a single address
  const checkSingleAddress = async (addr) => {
    console.log(`Checking address: ${addr}`);
    const result = {
      address: addr,
      hasTransactions: false,
      earliestDate: null,
      source: null
    };
    
    try {
      // Try mempool.space first
      console.log(`Fetching from mempool.space for ${addr}`);
      const res1 = await fetch(`https://mempool.space/api/address/${addr}/txs`);
      console.log(`Mempool response status: ${res1.status}`);
      if (res1.ok) {
        const txs1 = await res1.json();
        console.log(`Mempool returned ${txs1.length} transactions`);
        if (txs1 && txs1.length > 0) {
          result.hasTransactions = true;
          result.source = 'mempool.space';
          const earliest = txs1.reduce((a, b) => a.status.block_time < b.status.block_time ? a : b).status.block_time;
          result.earliestDate = new Date(earliest * 1000);
          return result;
        }
      }
      
      // Delay between API calls
      await delay(DELAY_BETWEEN_APIS);
      
      // Try blockstream.info if no transactions found
      console.log(`Fetching from blockstream.info for ${addr}`);
      const res2 = await fetch(`https://blockstream.info/api/address/${addr}/txs`);
      console.log(`Blockstream response status: ${res2.status}`);
      if (res2.ok) {
        const txs2 = await res2.json();
        console.log(`Blockstream returned ${txs2.length} transactions`);
        if (txs2 && txs2.length > 0) {
          result.hasTransactions = true;
          result.source = 'blockstream.info';
          const earliest = txs2.reduce((a, b) => a.status.block_time < b.status.block_time ? a : b).status.block_time;
          result.earliestDate = new Date(earliest * 1000);
        }
      }
    } catch (e) {
      console.log(`Error checking ${addr}:`, e);
    }
    
    console.log(`Finished checking ${addr}, result:`, result);
    return result;
  };
  
  // Process addresses in batches
  console.log(`Starting to process ${addresses.length} addresses in batches of ${BATCH_SIZE}`);
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}, addresses:`, batch);
    
    // Process current batch in parallel
    const batchPromises = batch.map(addr => checkSingleAddress(addr));
    const batchResults = await Promise.all(batchPromises);
    
    allResults.push(...batchResults);
    processedCount += batch.length;
    console.log(`Completed batch, processedCount: ${processedCount}, totalCount: ${totalCount}`);
    
    // Call progress callback
    if (onProgress) {
      console.log(`Calling progress callback with ${processedCount}/${totalCount}`);
      onProgress(processedCount, totalCount);
    }
    
    // Delay between batches (except for the last batch)
    if (i + BATCH_SIZE < addresses.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return allResults;
}



// UI Logic - Initialize as early as possible
function initializeApp() {
  // Initialize language immediately
  updateLanguage();
  
  // Add new wallet button event listener
  const newWalletBtn = document.getElementById('newWalletBtn');
  if (newWalletBtn) {
    newWalletBtn.addEventListener('click', showInputSection);
  }
  
  document.getElementById('genMnemonic').addEventListener('click', () => {
    const text = document.getElementById('entropyInput').value.trim();
    if (!text) return;
    document.getElementById('mainSection').style.display = 'block';
    const usageDiv = document.getElementById('usageResults');
    if (usageDiv) { usageDiv.innerHTML = ''; usageDiv.style.display = 'none'; }

    // Display input text in the new card
    const inputTextDisplay = document.getElementById('inputTextDisplay');
    const inputTextLength = document.getElementById('inputTextLength');
    if (inputTextDisplay && inputTextLength) {
      inputTextDisplay.textContent = text;
      const lengthText = currentLanguage === 'zh' ? `${text.length} 个字符` : `${text.length} characters`;
      inputTextLength.textContent = lengthText;
    }

    const hash = crypto.createHash('sha256').update(text).digest();
    const entropyHex = hash.slice(0, 16).toString('hex');
    const newMnemonic = bip39.entropyToMnemonic(entropyHex);

    document.getElementById('mnemonic').value = newMnemonic;
    
    // Generate mnemonic grid
    const mnemonicGrid = document.getElementById('mnemonicGrid');
    if (mnemonicGrid) {
      const words = newMnemonic.split(' ');
      mnemonicGrid.innerHTML = '';
      words.forEach((word, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'mnemonic-word';
        wordDiv.innerHTML = `
          <span class="word-number">${index + 1}</span>
          <span class="word-text">${word}</span>
        `;
        mnemonicGrid.appendChild(wordDiv);
      });
    }
    
    // Setup copy button
    const copyBtn = document.getElementById('copyMnemonic');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(newMnemonic).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = translations[currentLanguage].copiedBtn;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = translations[currentLanguage].copyBtn;
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = newMnemonic;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          const originalText = copyBtn.textContent;
          copyBtn.textContent = translations[currentLanguage].copiedBtn;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = translations[currentLanguage].copyBtn;
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      };
    }
    
    // Generate wallet image automatically
    const seedBuf = bip39.mnemonicToSeedSync(newMnemonic);
    QRCode.toCanvas(document.getElementById('qrcode'), newMnemonic, { errorCorrectionLevel: 'H' });
    
    // Auto-generate and display image
    generateWalletImage(newMnemonic, text);
    
    // Switch to results view
    showResultsSection();

    const fetchBtn = document.getElementById('fetchUsage');
    if (fetchBtn && usageDiv) {
      fetchBtn.onclick = async () => {
        // Check usage via extended public keys (xpubs)
        const xpubs = generateExtendedPublicKeys(seedBuf);
        
        // Hide the usage results div completely
        usageDiv.style.display = 'none';
        usageDiv.innerHTML = '';
        
        // Store original button state
        const originalText = fetchBtn.textContent;
        const originalDisabled = fetchBtn.disabled;
        
        // Update button to show checking status
        fetchBtn.disabled = true;
        const validXpubs = Object.values(xpubs).filter(xpub => xpub.xpub);
        fetchBtn.textContent = `🔍 ${translations[currentLanguage].checking}`;
        
        try {
          // Check xpubs with rate limiting
          const results = await checkXpubsWithRateLimit(
            xpubs,
            (current, total) => {
              // Update progress in button
              fetchBtn.textContent = `🔍 ${translations[currentLanguage].checkingProgress.replace('{current}', current).replace('{total}', total)}`;
            }
          );
          
          // Process results
          let hasUsage = false;
          let earliestUsageDate = null;
          const usedXpubs = [];
          
          results.forEach((result) => {
            if (result.hasTransactions) {
              hasUsage = true;
              usedXpubs.push(result);
              
              if (!earliestUsageDate || result.earliestDate < earliestUsageDate) {
                earliestUsageDate = result.earliestDate;
              }
            }
          });
          
          // Update button to show final result
          if (hasUsage) {
            fetchBtn.textContent = `⚠️ ${translations[currentLanguage].walletUsedSimple}`;
            fetchBtn.style.backgroundColor = '#fef2f2';
            fetchBtn.style.borderColor = '#fca5a5';
            fetchBtn.style.color = '#dc2626';
          } else {
            fetchBtn.textContent = `✅ ${translations[currentLanguage].walletUnusedSimple}`;
            fetchBtn.style.backgroundColor = '#f0fdf4';
            fetchBtn.style.borderColor = '#86efac';
            fetchBtn.style.color = '#16a34a';
          }
          
          // Auto-reset button after 5 seconds
          setTimeout(() => {
            fetchBtn.textContent = originalText;
            fetchBtn.style.backgroundColor = '';
            fetchBtn.style.borderColor = '';
            fetchBtn.style.color = '';
            fetchBtn.disabled = originalDisabled;
          }, 5000);
          
        } catch (error) {
          console.error('Error during xpub checking:', error);
          
          // Show error in button
          fetchBtn.textContent = `❌ ${translations[currentLanguage].errorOccurred}`;
          fetchBtn.style.backgroundColor = '#fef2f2';
          fetchBtn.style.borderColor = '#fca5a5';
          fetchBtn.style.color = '#dc2626';
          
          // Auto-reset button after 5 seconds
          setTimeout(() => {
            fetchBtn.textContent = originalText;
            fetchBtn.style.backgroundColor = '';
            fetchBtn.style.borderColor = '';
            fetchBtn.style.color = '';
            fetchBtn.disabled = originalDisabled;
          }, 5000);
        }
      };
    }
  });
}

// Make the initialization function available globally for coordination
window.initializeBundleApp = initializeApp;

// Check if page is ready, otherwise wait
if (window.pageReady) {
  // Page is already ready, initialize immediately
  initializeApp();
} else {
  // Wait for page ready signal or use fallback timing
  const checkPageReady = () => {
    if (window.pageReady) {
      initializeApp();
    } else {
      setTimeout(checkPageReady, 10); // Check every 10ms
    }
  };
  
  // Start checking, but also have a fallback timeout
  setTimeout(() => {
    if (!window.pageReady) {
      console.log('Fallback: initializing bundle app after timeout');
      initializeApp();
    }
  }, 200); // Fallback after 200ms
  
  checkPageReady();
}


