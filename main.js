/* Jupiterchain Dashboard - main.js
   Hybrid approach: use JSON-RPC fetch for basic data, and ethers for optional features.
   IMPORTANT: Replace RPC_URL and DEFAULT_WALLET with your values before deploying.
*/
// === CONFIG (replace with your QuickNode RPC and preferred wallet) ===
const RPC_URL = "https://greatest-solitary-seed.quiknode.pro/624c1fa77a92f1db1549ba3246d4d06c4afd7e79/"; // e.g. https://your-endpoint.quiknode.pro/abcdef/
const DEFAULT_WALLET = "0x2a63E334e71Cb80B857D4b5821e673C73Ce18a68"; // e.g. 0xabc...

// === DOM ===
const el = id => document.getElementById(id);
const status = el('status');
const blockEl = el('blockNumber');
const gasEl = el('gasPrice');
const balEl = el('balance');
const walletEl = el('walletAddress');
const connectBtn = el('connectBtn');
const refreshBtn = el('refreshBtn');

// === helper ===
function hexToNumber(hex){ try { return parseInt(hex,16); } catch(e){ return null; } }
function weiToEth(hex){ try { return Number(BigInt(hex) / 10000000000000000n) / 100.0; } catch(e){ return 0; } } // rough 4-dec
function formatGwei(hex){ try { return (Number(BigInt(hex)) / 1e9).toFixed(3); } catch(e){ return '0.000'; } }

// === JSON-RPC fetch helper ===
async function rpcCall(method, params=[]){
  if(!RPC_URL || RPC_URL.includes('REPLACE_WITH')) throw new Error('RPC_URL not configured in main.js');
  const res = await fetch(RPC_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ jsonrpc:'2.0', id:1, method, params })
  });
  if(!res.ok) throw new Error('RPC fetch failed: ' + res.status);
  const data = await res.json();
  if(data.error) throw new Error('RPC error: ' + JSON.stringify(data.error));
  return data.result;
}

let balance = `N/A`;
// === core update ===
async function updateOnchain(){
  try{
    status.textContent = 'Status: Fetching...';
    // parallel calls
    const [bn, gp, bal] = await Promise.all([
      rpcCall('eth_blockNumber'),
      rpcCall('eth_gasPrice'),
      (DEFAULT_WALLET && !DEFAULT_WALLET.includes('REPLACE_WITH')) ? rpcCall('eth_getBalance', [DEFAULT_WALLET, 'latest']) : Promise.resolve(null)
    ]);

    const block = hexToNumber(bn);
    const gas = formatGwei(gp);
    if (SIGNED_ADDRESS) {
    const balResult = await rpcCall('eth_getBalance', [SIGNED_ADDRESS, 'latest']);
    balance = (Number(BigInt(balResult)) / 1e18).toFixed(4);
}

    blockEl.textContent = block !== null ? block.toLocaleString() : 'N/A';
    gasEl.textContent = gp ? gas + ' Gwei' : 'N/A';
    balEl.textContent = bal ? balance + ' ETH' : 'N/A';
    status.textContent = 'Status: OK';
  }catch(err){
    console.error('Update error', err);
    status.textContent = 'Status: Error - ' + (err.message || err);
    blockEl.textContent = 'Error';
    gasEl.textContent = 'Error';
    balEl.textContent = 'Error';
  }
}

// === ethers provider optional (for connect wallet) ===
let SIGNED_ADDRESS = null;
let ethersProvider = null;
if(window && window.ethereum){
  ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
}

async function connectWallet(){
  try{
    if(!ethersProvider) return alert('No MetaMask detected');
    await ethersProvider.send('eth_requestAccounts', []);
    const signer = ethersProvider.getSigner();
    const address = await signer.getAddress();
    SIGNED_ADDRESS = address;
    walletEl.textContent = address;
    // use contract reading with signer if needed (not in this minimal template)
    updateOnchain(); // refresh after connect
  }catch(e){
    console.error('Connect wallet failed', e);
    alert('Connect failed: ' + (e.message || e));
  }
}

// wire buttons
connectBtn && connectBtn.addEventListener('click', connectWallet);
refreshBtn && refreshBtn.addEventListener('click', updateOnchain);

// auto-update loop
window.addEventListener('load', () => {
  // initial: if RPC is configured, run update. If not, show instruction.
  if(RPC_URL.includes('REPLACE_WITH')){
    status.textContent = 'Status: RPC not configured — open main.js and set RPC_URL';
    blockEl.textContent = '—';
    gasEl.textContent = '—';
    balEl.textContent = '—';
  } else {
    updateOnchain();
    setInterval(updateOnchain, 15000);
  }
});
