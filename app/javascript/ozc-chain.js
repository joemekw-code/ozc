import { ethers } from "ethers";

export const BASE_CHAIN_ID = "0x2105";
export const BASE_CHAIN = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

export const OZC_TOKEN = "0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144";
export const OZC_REGISTRY = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
export const OZC_VALUATION = "0x675d23f2e14ee862846e375ba385eae567d5d985";

export const categoryMap = {
  prediction: "社会・政治",
  historical_fact: "お金・資産",
  onchain_fact: "テクノロジー",
  statistical: "生活",
  philosophical: "男女・性別",
  foundational: "その他",
};

const REGISTRY_ABI = [
  "function nextId() view returns (uint256)",
  "function entries(uint256) view returns (bytes32 hash, address creator, string metadata, uint256 shareSupply, uint256 ozcReserve, uint256 capacityBytes, bool exists)",
  "function currentPrice(uint256) view returns (uint256)",
  "function marketCap(uint256) view returns (uint256)",
  "function stake(uint256 id, uint256 amount)",
  "function deploy(bytes32 hash, string metadata, uint256 initialShares) returns (uint256)",
  "function shares(uint256 id, address who) view returns (uint256)"
];

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const VALUATION_ABI = [
  "function valuationETH(uint256 id) view returns (uint256)"
];

const publicProvider = new ethers.JsonRpcProvider("https://mainnet.base.org", undefined, {
  batchMaxCount: 1,
});

function safeMeta(metadata) {
  try {
    return JSON.parse(metadata || "{}");
  } catch {
    return {};
  }
}

export function formatOzc(value) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "0.000";
  if (num >= 1000) return num.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
  if (num >= 1) return num.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return num.toLocaleString("ja-JP", { minimumFractionDigits: 3, maximumFractionDigits: 6 });
}

export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function listEntries() {
  const registry = new ethers.Contract(OZC_REGISTRY, REGISTRY_ABI, publicProvider);
  const valuation = new ethers.Contract(OZC_VALUATION, VALUATION_ABI, publicProvider);
  const nextId = Number(await registry.nextId());
  const ids = Array.from({ length: nextId }, (_, i) => i);
  const raw = [];
  for (const id of ids) {
    const entry = await registry.entries(id);
    const nextPrice = await registry.currentPrice(id);
    const valuationEth = await valuation.valuationETH(id).catch(() => 0n);
    const meta = safeMeta(entry.metadata);
    const marketCap = Number(ethers.formatUnits(entry.ozcReserve, 18));
    raw.push({
      id,
      creator: entry.creator,
      title: meta.title || `Claim #${id}`,
      description: meta.description || "",
      rawData: meta.raw_data || meta.raw || meta.title || `claim-${id}`,
      claimType: meta.claim_type || "foundational",
      categoryLabel: categoryMap[meta.claim_type] || "その他",
      shareSupply: Number(entry.shareSupply),
      marketCapOZC: marketCap,
      nextPriceOZC: Number(ethers.formatUnits(nextPrice, 18)),
      valuationETH: Number(ethers.formatEther(valuationEth)),
      createdOrder: id,
      commentCount: 1,
      voteCount: Number(entry.shareSupply),
    });
  }
  return raw.filter((row) => row.marketCapOZC >= 0);
}

export async function getEntry(id) {
  const rows = await listEntries();
  return rows.find((row) => row.id === Number(id)) || null;
}

export async function ensureBaseWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask などの EVM ウォレットが必要です");
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BASE_CHAIN],
      });
    } else {
      throw error;
    }
  }
  const browserProvider = new ethers.BrowserProvider(window.ethereum);
  await browserProvider.send("eth_requestAccounts", []);
  const signer = await browserProvider.getSigner();
  const account = await signer.getAddress();
  return { browserProvider, signer, account };
}

async function ensureApproval(signer, minAmount) {
  const token = new ethers.Contract(OZC_TOKEN, TOKEN_ABI, signer);
  const owner = await signer.getAddress();
  const allowance = await token.allowance(owner, OZC_REGISTRY);
  if (allowance >= minAmount) return null;
  const tx = await token.approve(OZC_REGISTRY, ethers.MaxUint256);
  return tx.wait();
}

export async function stakeEntry(id, shares) {
  const { signer } = await ensureBaseWallet();
  const registry = new ethers.Contract(OZC_REGISTRY, REGISTRY_ABI, signer);
  const entry = await registry.entries(id);
  const currentSupply = entry.shareSupply;
  const price = await registry.currentPrice(id);
  await ensureApproval(signer, price * BigInt(shares));
  const tx = await registry.stake(id, BigInt(shares));
  await tx.wait();
  return tx.hash;
}

export async function deployClaim({ rawData, title, description, claimType }) {
  const { signer } = await ensureBaseWallet();
  const registry = new ethers.Contract(OZC_REGISTRY, REGISTRY_ABI, signer);
  await ensureApproval(signer, ethers.parseUnits("1", 18));
  const hash = ethers.keccak256(ethers.toUtf8Bytes(rawData));
  const metadata = JSON.stringify({
    title,
    description,
    claim_type: claimType,
    raw_data: rawData,
  });
  const tx = await registry.deploy(hash, metadata, 1n);
  await tx.wait();
  return tx.hash;
}
