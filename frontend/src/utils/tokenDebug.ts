/**
 * Utility to debug JWT token contents
 * Call this function in browser console to see what's in your token
 */
export const debugToken = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ No token found in localStorage");
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    console.error("❌ Invalid token format");
    return null;
  }

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    
    console.log("🔍 Current Token Contents:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:", decoded.email || "Not found");
    console.log("Role:", decoded.role || "Not found");
    console.log("First Name:", decoded.firstName || "❌ Empty");
    console.log("Last Name:", decoded.lastName || "❌ Empty");
    console.log("Full Name:", decoded.fullName || "❌ Empty");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (!decoded.fullName && (!decoded.firstName || !decoded.lastName)) {
      console.warn("⚠️ PROBLEM DETECTED:");
      console.warn("Your user account doesn't have firstName/lastName set.");
      console.warn("This is why 'Created By' shows as 'User'.");
      console.warn("");
      console.warn("SOLUTION:");
      console.warn("1. Go to User Management");
      console.warn("2. Edit your user account");
      console.warn("3. Add firstName and lastName");
      console.warn("4. Log out and log back in");
      console.warn("5. Create a new job - it will now show your name!");
    } else if (!decoded.fullName && decoded.firstName && decoded.lastName) {
      console.warn("⚠️ Token doesn't have fullName but has firstName/lastName");
      console.warn("This means you need to log out and log back in to get an updated token.");
    } else {
      console.log("✅ Token looks good! fullName:", decoded.fullName);
    }
    
    return decoded;
  } catch (error) {
    console.error("❌ Error decoding token:", error);
    return null;
  }
};

// Make it available globally for easy console access
if (typeof window !== "undefined") {
  (window as any).debugToken = debugToken;
}
