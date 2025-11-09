// Import necessary libraries
const bip32 = require('bip32');
const { payments } = require('bitcoinjs-lib');
const bip39 = require('bip39');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bech32 = require('bech32');

// Helper function to generate Taproot address
function generateTaprootAddress(xOnlyPubkey) {
  try {
    if (payments.p2tr) {
      const taprootPayment = payments.p2tr({ internalPubkey: xOnlyPubkey });
      if (taprootPayment.address) return taprootPayment.address;
    }
    
    // Fallback: Manual Taproot address generation
    const words = bech32.toWords(xOnlyPubkey);
    return bech32.encode('bc', [1, ...words]);
  } catch (e) {
    console.error('Taproot address generation error:', e);
    const hashHex = crypto.createHash('sha256').update(xOnlyPubkey).digest('hex');
    return `bc1p${hashHex.substring(0, 58)}`;
  }
}

// Language support
const translations = {
  en: {
    title: '🧠 Brain Wallet',
    inputPlaceholder: 'Enter long, unique, and complex text (minimum 20 characters recommended)\n\nBrain wallets cannot provide sufficient randomness and are for testing purposes only. Use with caution.',
    generateBtn: 'Generate Wallet',
    inputTextTitle: 'Input Text',
    inputTextLabel: 'SHA256 hash → Entropy → Mnemonic',
    mnemonicTitle: 'Mnemonic Phrase',
    copyBtn: 'Copy Mnemonic',
    copiedBtn: 'Copied!',
    downloadHint: 'Long-press the image to save',
    qrTitle: 'QR Code for Wallet Import',
    qrInstructions: 'Scan this QR code with your Bitcoin wallet app to import the mnemonic phrase',
    checkUsageBtn: 'Check Wallet Usage',
    checkingProgress: 'Checking... ({current}/{total})',
    walletUsedSimple: 'Wallet Has Been Used',
    walletUnusedSimple: 'Wallet Appears Unused',
    errorOccurred: 'An error occurred during checking',
    newWalletBtn: 'New Wallet',
    shaHint: 'SHA256 of text below'
  },
  zh: {
    title: '🧠 脑钱包',
    inputPlaceholder: '输入长且独特的复杂文本（建议至少20个字符）\n\n脑钱包难以提供足够的随机性，仅供测试目的，谨慎使用。',
    generateBtn: '生成钱包',
    inputTextTitle: '输入文本',
    inputTextLabel: 'SHA256哈希 → 熵值 → 助记词',
    mnemonicTitle: '助记词',
    copyBtn: '复制助记词',
    copiedBtn: '已复制！',
    downloadHint: '长按图片保存',
    qrTitle: '钱包导入二维码',
    qrInstructions: '用您的比特币钱包应用扫描此二维码以导入助记词',
    checkUsageBtn: '检查钱包使用情况',
    checkingProgress: '正在检查... ({current}/{total})',
    walletUsedSimple: '钱包已被使用',
    walletUnusedSimple: '钱包未被使用',
    errorOccurred: '检查过程中出现错误',
    newWalletBtn: '新钱包',
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
  if (langToggle) langToggle.textContent = currentLanguage === 'en' ? '中' : 'EN';

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentLanguage][key]) {
      element.textContent = translations[currentLanguage][key];
    }
  });

  const input = document.getElementById('entropyInput');
  if (input) input.placeholder = translations[currentLanguage].inputPlaceholder;
  
  // Update image download tooltip
  const img = document.getElementById('generatedImage');
  if (img) {
    img.title = currentLanguage === 'zh' ? '点击下载图片' : 'Click to download image';
  }
  
  document.title = translations[currentLanguage].title;
  document.documentElement.lang = currentLanguage;
}

window.toggleLanguage = toggleLanguage;

// Utility functions

function showInputSection() {
  document.getElementById('inputSection').style.display = 'block';
  document.getElementById('mainSection').style.display = 'none';
  document.getElementById('entropyInput').value = '';
  
  // 重置检查按钮状态
  const fetchBtn = document.getElementById('fetchUsage');
  if (fetchBtn) {
    fetchBtn.textContent = translations[currentLanguage].checkUsageBtn;
    fetchBtn.style.background = '';
    fetchBtn.style.borderColor = '';
    fetchBtn.style.color = '';
    fetchBtn.style.boxShadow = '';
    fetchBtn.disabled = false;
  }
}

function showResultsSection() {
  document.getElementById('inputSection').style.display = 'none';
  document.getElementById('mainSection').style.display = 'block';
}

window.showInputSection = showInputSection;
window.showResultsSection = showResultsSection;

// Generate wallet image with QR code
async function generateWalletImage(mnemonic, inputText, includeBorder = false) {
  try {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    // iPhone-like dimensions (approximately 71.5mm x 146.7mm at 300 DPI)
    // 71.5mm ≈ 284px, 146.7mm ≈ 583px at 300 DPI
    const baseW = 284, baseH = 583;
    const scale = window.devicePixelRatio || 1;
    canvas.width = baseW * scale;
    canvas.height = baseH * scale;
    canvas.style.width = `${baseW}px`;
    canvas.style.height = `${baseH}px`;
    ctx.scale(scale, scale);

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, baseW, baseH);
    
    // Add white dashed border only when includeBorder is true (for download)
    if (includeBorder) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]); // 8px dash, 4px gap
      ctx.strokeRect(5, 5, baseW - 10, baseH - 10);
      ctx.setLineDash([]); // Reset line dash
    }

    // QR Code section - adjust size for iPhone dimensions
    const qrSize = 200; // Smaller QR code for iPhone size
    const qrMargin = (baseW - qrSize) / 2;
    const qrY = 20; // Position from top
    
    // Add white background for QR code
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrMargin - 10, qrY - 10, qrSize + 20, qrSize + 20);
    
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, mnemonic, { errorCorrectionLevel: 'H', width: qrSize, margin: 1 });
    ctx.drawImage(qrCanvas, qrMargin, qrY, qrSize, qrSize);

    // Input text section - adjust for iPhone dimensions
    const txtStartY = qrY + qrSize + 30; // Start below QR code
    const txtAreaHeight = 120; // Smaller text area
    const txtCenterY = txtStartY + txtAreaHeight / 2;
    const txtCenterX = baseW / 2;

    // Upper text font (使用苹果系统字体) - smaller font for iPhone size
    ctx.font = 'bold 14px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    const txtMaxWidth = 250; // Narrower for iPhone width
    // Remove text length limit, let auto-wrapping handle long text
    const txtLines = wrapText(ctx, inputText, txtMaxWidth);
    const txtLineHeight = 20; // Smaller line height
    const maxDisplayLines = 6; // Limit display lines to fit in area
    const displayLines = txtLines.slice(0, maxDisplayLines);
    const txtBlockHeight = displayLines.length * txtLineHeight;
    let startTxtY = txtCenterY - txtBlockHeight / 2 + txtLineHeight / 2;

    // SHA hint text with more spacing
    const shaHint = translations[currentLanguage].shaHint || 'SHA256 of text below';
    ctx.font = '11px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(shaHint, txtCenterX, txtCenterY - txtBlockHeight / 2 - 18);

    // Reset font to bold for input text
    ctx.font = 'bold 14px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
    ctx.fillStyle = '#ffffff';

    // Display the wrapped lines (limited to maxDisplayLines)
    displayLines.forEach((line, index) => {
      ctx.fillText(line, txtCenterX, startTxtY);
      startTxtY += txtLineHeight;
      
      // Add ellipsis if there are more lines than we can display
      if (index === maxDisplayLines - 1 && txtLines.length > maxDisplayLines) {
        ctx.fillText('...', txtCenterX, startTxtY);
      }
    });

    // Mnemonic words section (使用苹果系统字体) - adjust for iPhone dimensions
    ctx.font = '12px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    const words = mnemonic.split(' ');
    const cols = 3;
    const rows = 4;
    const colW = 85; // Smaller column width for iPhone
    const rowH = 28; // Smaller row height

    // compute total block size
    const mBlockW = colW * cols;
    const mBlockH = rowH * rows;
    const mStartX = (baseW - mBlockW) / 2;
    const mStartY = txtStartY + txtAreaHeight + 20; // Position below text area

    for (let i = 0; i < words.length; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // 每个格子的中心点
      const x = mStartX + col * colW + colW / 2;
      const y = mStartY + row * rowH;
      ctx.fillText(`${i + 1}.${words[i]}`, x, y);
    }

    // Display image (without border for preview)
    const img = document.getElementById('generatedImage');
    if (img) {
      img.src = canvas.toDataURL('image/png', 1.0);
      img.style.display = 'block';
      img.draggable = true;
      
      // Add click handler for download with border
      img.onclick = async () => {
        try {
          // Generate image with border for download
          await generateWalletImage(mnemonic, inputText, true);
          const downloadCanvas = document.getElementById('imageCanvas');
          const link = document.createElement('a');
          link.download = `brain-wallet-${Date.now()}.png`;
          link.href = downloadCanvas.toDataURL('image/png', 1.0);
          link.click();
          
          // Regenerate image without border for display
          await generateWalletImage(mnemonic, inputText, false);
          img.src = downloadCanvas.toDataURL('image/png', 1.0);
        } catch (error) {
          console.error('Download error:', error);
        }
      };
      
      // Add visual feedback for clickable image
      img.style.cursor = 'pointer';
      img.title = currentLanguage === 'zh' ? '点击下载图片' : 'Click to download image';
    }
  } catch (e) {
    console.error('generateWalletImage error', e);
  }
}

// Enhanced helper function to wrap text with better support for long text and CJK characters
function wrapText(ctx, text, maxWidth) {
  if (!text) return [''];
  
  const lines = [];
  let currentLine = '';
  
  // Handle both word-based and character-based wrapping
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      // Try to break at word boundary for English text
      if (char === ' ' || currentLine.endsWith(' ')) {
        lines.push(currentLine.trim());
        currentLine = char === ' ' ? '' : char;
      } else {
        // For long words or CJK characters, break at character level
        const lastSpaceIndex = currentLine.lastIndexOf(' ');
        if (lastSpaceIndex > 0 && currentLine.length - lastSpaceIndex < 15) {
          // Break at last space if it's recent
          const beforeSpace = currentLine.substring(0, lastSpaceIndex);
          const afterSpace = currentLine.substring(lastSpaceIndex + 1);
          lines.push(beforeSpace);
          currentLine = afterSpace + char;
        } else {
          // Break at character level
          lines.push(currentLine);
          currentLine = char;
        }
      }
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }
  
  return lines.length > 0 ? lines : [''];
}

// Generate extended public keys
function generateExtendedPublicKeys(seedBuffer) {
  const root = bip32.fromSeed(seedBuffer);
  const configs = [
    { id: '44', name: 'Legacy (P2PKH)', path: "m/44'/0'/0'" },
    { id: '49', name: 'Nested SegWit (P2SH-P2WPKH)', path: "m/49'/0'/0'" },
    { id: '84', name: 'Native SegWit (P2WPKH)', path: "m/84'/0'/0'" },
    { id: '86', name: 'Taproot (P2TR)', path: "m/86'/0'/0'" }
  ];
  
  const xpubs = {};
  configs.forEach(({ id, name, path }) => {
    try {
      const account = root.derivePath(path);
      xpubs[id] = { name, path, xpub: account.neutered().toBase58() };
    } catch (e) {
      console.error(`Error generating xpub for ${name}:`, e);
      xpubs[id] = { name, path, xpub: null, error: e.message };
    }
  });
  
  return xpubs;
}

// Check xpubs with blockchain.info API
async function checkXpubsWithRateLimit(xpubs, onProgress = null) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  let allResults = [];
  let processedCount = 0;
  const xpubEntries = Object.entries(xpubs).filter(([_, xpubInfo]) => xpubInfo.xpub);
  const totalCount = xpubEntries.length;
  
  for (let i = 0; i < xpubEntries.length; i++) {
    const [typeId, xpubInfo] = xpubEntries[i];
    const { name, path, xpub } = xpubInfo;
    
    const result = {
      name, path, xpub, typeId,
      hasTransactions: false,
      earliestDate: null,
      source: null,
      error: null,
      balance: 0
    };
    
    try {
      const res = await fetch(`https://blockchain.info/xpub/${xpub}?format=json&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.final_balance !== 'undefined') {
          result.balance = data.final_balance;
        }
        
        if (data && ((data.txs && data.txs.length > 0) || (data.n_tx && data.n_tx > 0))) {
          result.hasTransactions = true;
          result.source = 'blockchain.info';
          
          if (data.txs && data.txs.length > 0) {
            const earliestTx = data.txs.reduce((earliest, tx) => {
              const txTime = tx.time || 0;
              const earliestTime = earliest.time || 0;
              return txTime < earliestTime ? tx : earliest;
            });
            
            if (earliestTx.time) {
              result.earliestDate = new Date(earliestTx.time * 1000);
            }
          }
        }
      } else {
        result.error = `API error: ${res.status}`;
      }
    } catch (e) {
      result.error = e.message;
    }
    
    allResults.push(result);
    processedCount++;
    
    if (onProgress) onProgress(processedCount, totalCount);
    if (i < xpubEntries.length - 1) await delay(1000); // 1 second delay - blockchain.info允许更快的请求
  }
  
  return allResults;
}

// Format balance display
function formatBalance(satoshis) {
  const btc = satoshis / 100000000;
  if (btc >= 1) {
    return `${btc.toFixed(8)} BTC`.replace(/\.?0+$/, '');
  } else if (btc >= 0.001) {
    return `${(btc * 1000).toFixed(5)} mBTC`.replace(/\.?0+$/, '');
  } else if (btc > 0) {
    return `${satoshis.toLocaleString()} sats`;
  }
  return '0 BTC';
}

// Initialize app
function initializeApp() {
  updateLanguage();
  
  const newWalletBtn = document.getElementById('newWalletBtn');
  if (newWalletBtn) newWalletBtn.addEventListener('click', showInputSection);
  
  document.getElementById('genMnemonic').addEventListener('click', () => {
    const text = document.getElementById('entropyInput').value.trim();
    if (!text) return;
    
    // Display input text
    const inputTextDisplay = document.getElementById('inputTextDisplay');
    const inputTextLength = document.getElementById('inputTextLength');
    if (inputTextDisplay && inputTextLength) {
      inputTextDisplay.textContent = text;
      const lengthText = currentLanguage === 'zh' ? `${text.length} 个字符` : `${text.length} characters`;
      inputTextLength.textContent = lengthText;
    }

    // Generate mnemonic
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
    
    // Generate QR code and image
    const seedBuf = bip39.mnemonicToSeedSync(newMnemonic);
    QRCode.toCanvas(document.getElementById('qrcode'), newMnemonic, { errorCorrectionLevel: 'H' });
    generateWalletImage(newMnemonic, text);
    showResultsSection();

    // Setup usage check button
    const fetchBtn = document.getElementById('fetchUsage');
    if (fetchBtn) {
      fetchBtn.onclick = async () => {
        const xpubs = generateExtendedPublicKeys(seedBuf);
        const originalText = fetchBtn.textContent;
        const originalDisabled = fetchBtn.disabled;
        
        fetchBtn.disabled = true;
        
        try {
          const results = await checkXpubsWithRateLimit(
            xpubs,
            (current, total) => {
              fetchBtn.textContent = translations[currentLanguage].checkingProgress.replace('{current}', current).replace('{total}', total);
            }
          );
          
          let hasUsage = false;
          let totalBalance = 0;
          
          results.forEach((result) => {
            if (result.hasTransactions) hasUsage = true;
            if (result.balance) totalBalance += result.balance;
          });
          
          if (hasUsage) {
            if (totalBalance > 0) {
              const balanceText = formatBalance(totalBalance);
              fetchBtn.textContent = `${translations[currentLanguage].walletUsedSimple}，余额: ${balanceText}`;
            } else {
              fetchBtn.textContent = `${translations[currentLanguage].walletUsedSimple}，无余额`;
            }
            // 使用红色玻璃效果
            fetchBtn.style.background = `
              radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.15) 0%, transparent 50%),
              linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%),
              rgba(255, 255, 255, 0.05)
            `;
            fetchBtn.style.borderColor = 'rgba(220, 38, 38, 0.3)';
            fetchBtn.style.color = '#fecaca';
            fetchBtn.style.boxShadow = `
              0 12px 40px rgba(220, 38, 38, 0.15),
              0 4px 12px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.25),
              inset 0 -1px 0 rgba(220, 38, 38, 0.08),
              0 0 0 1px rgba(220, 38, 38, 0.08)
            `;
          } else {
            fetchBtn.textContent = `${translations[currentLanguage].walletUnusedSimple}`;
            // 使用绿色玻璃效果
            fetchBtn.style.background = `
              radial-gradient(circle at 50% 0%, rgba(22, 163, 74, 0.15) 0%, transparent 50%),
              linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%),
              rgba(255, 255, 255, 0.05)
            `;
            fetchBtn.style.borderColor = 'rgba(22, 163, 74, 0.3)';
            fetchBtn.style.color = '#bbf7d0';
            fetchBtn.style.boxShadow = `
              0 12px 40px rgba(22, 163, 74, 0.15),
              0 4px 12px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.25),
              inset 0 -1px 0 rgba(22, 163, 74, 0.08),
              0 0 0 1px rgba(22, 163, 74, 0.08)
            `;
          }
          
          // 保持结果显示，不自动重置
          fetchBtn.disabled = false;
          
        } catch (error) {
          console.error('Error during xpub checking:', error);
          fetchBtn.textContent = `${translations[currentLanguage].errorOccurred}`;
          // 使用红色玻璃效果
          fetchBtn.style.background = `
            radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.15) 0%, transparent 50%),
            linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%),
            rgba(255, 255, 255, 0.05)
          `;
          fetchBtn.style.borderColor = 'rgba(220, 38, 38, 0.3)';
          fetchBtn.style.color = '#fecaca';
          fetchBtn.style.boxShadow = `
            0 12px 40px rgba(220, 38, 38, 0.15),
            0 4px 12px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 0 rgba(220, 38, 38, 0.08),
            0 0 0 1px rgba(220, 38, 38, 0.08)
          `;
          
          // 保持错误显示，不自动重置
          fetchBtn.disabled = false;
        }
      };
    }
  });
}

window.initializeBundleApp = initializeApp;

// Initialize when ready
if (window.pageReady) {
  initializeApp();
} else {
  const checkPageReady = () => {
    if (window.pageReady) {
      initializeApp();
    } else {
      setTimeout(checkPageReady, 10);
    }
  };
  
  setTimeout(() => {
    if (!window.pageReady) {
      console.log('Fallback: initializing bundle app after timeout');
      initializeApp();
    }
  }, 200);
  
  checkPageReady();
}


