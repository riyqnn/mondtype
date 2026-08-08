export const TYPERACE_PVP_ADDRESS = '0x634F07d9Ae6968D71bf0c50B2792a91Ac4af8984' as const

export const TYPERACE_PVP_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "stakeAmount", "type": "uint256" },
      { "internalType": "uint8", "name": "maxPlayers", "type": "uint8" }
    ],
    "name": "createRoom",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "roomId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "host", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "stakeAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "maxPlayers", "type": "uint8" }
    ],
    "name": "RoomCreated",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "roomId", "type": "uint256" }],
    "name": "joinRoom",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "roomId", "type": "uint256" }],
    "name": "startRace",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "roomId", "type": "uint256" },
      { "internalType": "address[]", "name": "rankedWinners", "type": "address[]" }
    ],
    "name": "submitResult",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "roomId", "type": "uint256" }],
    "name": "cancelRoom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "roomId", "type": "uint256" }],
    "name": "getRoomInfo",
    "outputs": [
      { "internalType": "address", "name": "host", "type": "address" },
      { "internalType": "uint256", "name": "stakeAmount", "type": "uint256" },
      { "internalType": "uint8", "name": "maxPlayers", "type": "uint8" },
      { "internalType": "uint256", "name": "currentPlayers", "type": "uint256" },
      { "internalType": "enum TypeRacePvP.RoomStatus", "name": "status", "type": "uint8" },
      { "internalType": "uint256", "name": "totalPot", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOpenRooms",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "roomId", "type": "uint256" }],
    "name": "getPlayers",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRoomCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const
