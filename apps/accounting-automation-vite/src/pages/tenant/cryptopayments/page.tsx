"use client";
import { useState } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSendTransaction,
} from "wagmi";
import { parseEther } from "viem";
import { api } from "../../../lib/api"; // 👈 backend call for audit logging

export default function CryptoPayments() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, status } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { sendTransaction } = useSendTransaction();

  // Form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [chain, setChain] = useState("ETH");

  // Stage control
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleFormSubmit = async () => {
    if (!recipient || !amount) {
      alert("Recipient & amount required");
      return;
    }

    try {
      // 👇 Save audit log before wallet connect
     await api("/audit/tx", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    reason,
    sender: address,
    recipient,
    chain,
    amount,
    txHash: "PENDING", // 👈 fake value so backend doesn’t reject
  }),
});
      setFormSubmitted(true);
      alert("✅ Payment info saved. Now connect your wallet to proceed.");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save audit entry");
    }
  };

  const handleSend = async () => {
    try {
      const hash = await sendTransaction({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
      });

      // 👇 Update txHash in audit after sending
    await api("/audit/tx", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    recipient,
    amount,
    reason,
    chain,
    txHash: hash, // 👈 actual hash here
  }),
});


      alert("✅ Transaction sent & audit updated!");
    } catch (err) {
      console.error(err);
      alert("❌ Transaction failed");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Crypto Payments
      </h1>

      {/* ⚠️ Step 1: Form first */}
      {!formSubmitted && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-lg mb-6">
          ⚠️ Please fill out payment details before connecting wallet.
        </div>
      )}

      {!formSubmitted ? (
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
          {/* Recipient */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-cyan-300">
              Recipient Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-cyan-300">
              Amount
            </label>
            <input
              type="text"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-cyan-300">
              Reason (optional)
            </label>
            <input
              type="text"
              placeholder="Payment reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Chain */}
                                      <div className="mb-6">
  <label className="block text-sm font-medium mb-2 text-cyan-300">
    Chain
  </label>
  <input
    type="text"
    placeholder="ETH, POLYGON, BSC..."
    value={chain}
    onChange={(e) => setChain(e.target.value)}
    className="w-full border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
  />
</div>
          <button
            onClick={handleFormSubmit}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-600 hover:to-orange-500 transition text-white font-semibold shadow-lg"
          >
            Save Payment Info
          </button>
        </div>
      ) : (
        <>
          {/* ✅ Step 2: Connect wallet */}
          {!isConnected ? (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="mb-4 text-lg font-semibold text-cyan-300">
                Connect your wallet
              </h2>
              <div className="flex gap-4 flex-wrap">
                {connectors.map((connector) => (
                     <button
  key={connector.id}
  onClick={() => connect({ connector })}
  disabled={status === "pending"}
  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-medium shadow-md disabled:opacity-50"
>
  {connector.name}
  {status === "pending" && " (connecting...)"}
</button>
                ))}
              </div>
              {error && (
                <p className="mt-3 text-red-400 text-sm">{error.message}</p>
              )}
            </div>
          ) : (
            <>
              {/* ✅ Step 3: Connected info */}
              <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
                <p className="mb-2">
                  <span className="font-semibold text-cyan-300">
                    Connected:
                  </span>{" "}
                  {address}
                </p>
                
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition text-white font-medium shadow-md"
                >
                  Disconnect
                </button>
              </div>

              {/* ✅ Step 4: Send transaction */}
              <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
                <button
                  onClick={handleSend}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition text-white font-semibold shadow-lg"
                >
                  Send & Log Transaction
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
