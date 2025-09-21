"use client";
import { useState } from "react";
import { useAccount, useBalance, useConnect, useDisconnect, useSendTransaction } from "wagmi";
import { parseEther } from "viem";

export default function SendTx() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { sendTransaction } = useSendTransaction();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSend = async () => {
    if (!recipient || !amount) return alert("Recipient & amount required");
    try {
      const hash = await sendTransaction({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
      });
      console.log("tx hash", hash);

      // Send to backend audit
      await fetch("/v1/audit/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          sender: address,
          recipient,
          chain: "ETH", // TODO: detect chain
          amount,
          txHash: hash,
        }),
      });
      alert("Tx sent & logged!");
    } catch (err) {
      console.error(err);
      alert("Tx failed");
    }
  };

  return (
    <div>
      {!isConnected ? (
        connectors.map((connector) => (
          <button key={connector.id} onClick={() => connect({ connector })}>
            Connect {connector.name}
          </button>
        ))
      ) : (
        <div>
          <p>Connected: {address}</p>
          <p>Balance: {balance?.formatted} {balance?.symbol}</p>
          <button onClick={() => disconnect()}>Disconnect</button>

          <div>
            <input
              placeholder="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              placeholder="Amount in ETH"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button onClick={handleSend}>Send & Log</button>
          </div>
        </div>
      )}
    </div>
  );
}
