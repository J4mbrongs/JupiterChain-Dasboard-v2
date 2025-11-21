/* Jupiterchain Dashboard - main.js */

// === CONFIG ===
const RPC_URL = "https://greatest-solitary-seed.quiknode.pro/624c1fa77a92f1db1549ba3246d4d06c4afd7e79/";
let SIGNED_ADDRESS = null;

// === DOM ===
const el = id => document.getElementById(id);
const status = el('status');
const blockEl = el('blockNumber');
const gasEl = el('gasPrice');
const balEl = el('balance');
const walletEl = el('walletAddress');

// === helpers ===
function hexToNumber(hex){ return parseInt(hex, 16); }
function formatGwei(hex){ return (Number(BigInt(hex)) / 1e9).toFixed(3); }

// === JSON-RPC ===
async function rpcCall(method, params=[]){
  const res = await fetch(RPC_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ jsonrpc:'2.0', id:1, method, params })
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  return data.result;
}

// === UPDATE DASHBOARD ===
async function updateOnchain(){
  try{
    status.textContent = "Status: Fetching...";

    const [bn, gp] = await Promise.all([
      rpcCall('eth_blockNumber'),
      rpcCall('eth_gasPrice')
    ]);

    blockEl.textContent = hexToNumber(bn).toLocaleString();
    gasEl.textContent = formatGwei(gp) + " Gwei";

    if (SIGNED_ADDRESS) {
      const bal = await rpcCall('eth_getBalance', [SIGNED_ADDRESS, 'latest']);
      balEl.textContent = (Number(BigInt(bal)) / 1e18).toFixed(4) + " ETH";
    } else {
      balEl.textContent = "Connect wallet";
    }

    status.textContent = "Status: OK";

  }catch(e){
    status.textContent = "Status: Error - " + e.message;
    console.log(e);
  }
}

// === RECEIVE SECTION ===
function updateReceiveAddress() {
  const el = document.getElementById("receiveAddress");
  el.textContent = SIGNED_ADDRESS ? SIGNED_ADDRESS : "Not connected";
}

function generateQR(address){
  const box = document.getElementById("qrcode");
  if (!box) return;
  box.innerHTML = "";

  new QRCode(box, {
    text: address,
    width: 160,
    height: 160
  });
}

// === CONNECT WALLET ===
let ethersProvider = null;
if (window.ethereum) {
  ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
}

async function connectWallet(){
  try{
    if(!ethersProvider) return alert("No MetaMask detected");

    await ethersProvider.send("eth_requestAccounts", []);
    const signer = ethersProvider.getSigner();
    SIGNED_ADDRESS = await signer.getAddress();

    walletEl.textContent = SIGNED_ADDRESS;

    updateReceiveAddress();
    generateQR(SIGNED_ADDRESS);

    updateOnchain();

  }catch(e){
    alert("Connect failed: " + e.message);
  }
}

async function loadBalance() {
  if (window.ethereum) {
    const provider = window.ethereum;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const balanceHex = await provider.request({
      method: "eth_getBalance",
      params: [accounts[0], "latest"]
    });

    loadBalance();
    
    const balance = parseInt(balanceHex, 16) / 1e18;
    document.getElementById("balance").innerText = balance.toFixed(4);
  }
}

// === EVENTS ===
window.addEventListener("load", () => {

  // update loop
  updateOnchain();
  setInterval(updateOnchain, 15000);

  // copy button
  const copyBtn = document.getElementById("copyBtn");
  copyBtn.addEventListener("click", () => {
    if (!SIGNED_ADDRESS) return alert("Wallet not connected");
    navigator.clipboard.writeText(SIGNED_ADDRESS);
    alert("Address copied!");
  });

  // connect button
  document.getElementById("connectBtn")
    .addEventListener("click", connectWallet);

  // refresh button
  document.getElementById("refreshBtn")
    .addEventListener("click", updateOnchain);
});

