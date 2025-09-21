// src/components/SubscribePopup.tsx
import { useNavigate } from "react-router-dom";

export default function SubscribePopup() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md text-center">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Your free trial has ended
        </h2>
        <p className="mb-6 text-gray-700">
          Please subscribe to continue using the platform.
        </p>
        <button
          onClick={() => navigate("/tenant/billing")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          View Plans & Subscribe
        </button>
      </div>
    </div>
  );
}
