import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ClerkDash = () => {
  const { isSignedIn, user } = useUser();
  const routes = all_routes;
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn || !user) {
      navigate(routes.login);
      return;
    }

    // Load companyId & role from Clerk metadata
    setCompanyId(user?.publicMetadata?.companyId || "");
    setRole(user?.publicMetadata?.role || "");
    setUserId(user?.id || "");
  }, [isSignedIn, user, navigate, routes.login]);

  const handleSubmit = async () => {
    setLoading(true);

    // Timeout fallback (10s)
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error("Request timed out, please try again.");
    }, 10000);

    try {
      const response = await fetch("http://localhost:5000/api/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, companyId, role }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      const data = await response.json();

      // Update state from response
      setRole(data.user.publicMetadata.role);
      setCompanyId(data.user.publicMetadata.companyId);

      toast.success("Updated Successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error updating role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="w-full flex justify-center">
        <div className="p-6 bg-white rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 text-center">User MetaData</h2>

          <div className="mb-4">
            <label className="block font-medium mb-2">Company ID</label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="border px-3 py-2 rounded w-full "
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border px-3 py-2 rounded w-full"
              disabled={loading}
            >
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
              <option value="hr">HR</option>
              <option value="employee">Employee</option>
              <option value="leads">Leads</option>
              <option value="client">Client</option>
            </select>
          </div>

          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={handleSubmit}
              className={`btn btn-success me-2 text-white ${
                loading
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={loading}
            >
              {loading ? "Loading..." : "Change"}
            </button>
            <button
              onClick={() => setCompanyId("68443081dcdfe43152aebf80")}
              className={`flex-1 px-4 py-2 rounded text-white ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              disabled={loading}
            >
              Default
            </button>
            <p>
              * - Default will change company id to 68443081dcdfe43152aebf80.
              Once after pressing default press change button.
            </p>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default ClerkDash;
