import { io } from 'socket.io-client';
import { connectDB } from '../config/db.js';

/**
 * Test script for Clients Module Socket.IO Events
 * Run this after starting the server to test all client endpoints
 */

const COMPANY_ID = "68443081dcdfe43152aebf80";
const TEST_SERVER_URL = "http://localhost:3000";

// Mock user metadata for testing
const adminUser = {
  sub: "test-admin-123",
  userMetadata: {
    role: "admin",
    companyId: COMPANY_ID
  },
  companyId: COMPANY_ID
};

const hrUser = {
  sub: "test-hr-456", 
  userMetadata: {
    role: "hr",
    companyId: COMPANY_ID
  },
  companyId: COMPANY_ID
};

const employeeUser = {
  sub: "test-employee-789",
  userMetadata: {
    role: "employee", 
    companyId: COMPANY_ID
  },
  companyId: COMPANY_ID
};

// Sample client data for testing
const sampleClient = {
  name: "John Doe",
  company: "Tech Solutions Inc",
  email: "john.doe@techsolutions.com",
  phone: "+1-555-0123",
  address: "123 Business Ave, Tech City, TC 12345",
  logo: "assets/img/company/tech-solutions.svg",
  status: "Active",
  contractValue: 150000,
  projects: 3
};

let testClientId = null;

async function testClientModule() {
  console.log("🧪 Starting Clients Module Tests...\n");

  // Connect as admin user
  const adminSocket = io(TEST_SERVER_URL, {
    auth: {
      token: "mock-admin-token"
    }
  });

  // Simulate admin authentication
  adminSocket.user = adminUser.sub;
  adminSocket.userMetadata = adminUser.userMetadata;
  adminSocket.companyId = adminUser.companyId;

  return new Promise((resolve) => {
    adminSocket.on('connect', async () => {
      console.log("✅ Connected as admin user");
      
      // Test 1: Create Client
      await testCreateClient(adminSocket);
      
      // Test 2: Get All Clients
      await testGetAllClients(adminSocket);
      
      // Test 3: Get Client by ID
      if (testClientId) {
        await testGetClientById(adminSocket);
      }
      
      // Test 4: Update Client
      if (testClientId) {
        await testUpdateClient(adminSocket);
      }
      
      // Test 5: Get Client Stats
      await testGetClientStats(adminSocket);
      
      // Test 6: Filter Clients
      await testFilterClients(adminSocket);
      
      // Test 7: Get All Data (Dashboard)
      await testGetAllData(adminSocket);
      
      // Test 8: Export PDF
      await testExportPDF(adminSocket);
      
      // Test 9: Export Excel
      await testExportExcel(adminSocket);
      
      // Test 10: Role-based Access Control
      await testRoleBasedAccess();
      
      // Test 11: Delete Client (should be last)
      if (testClientId) {
        await testDeleteClient(adminSocket);
      }
      
      adminSocket.disconnect();
      console.log("\n🎉 All tests completed!");
      resolve();
    });
  });
}

function testCreateClient(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:create...");
    
    socket.emit("client:create", sampleClient);
    
    socket.once("client:create-response", (response) => {
      if (response.done) {
        testClientId = response.data._id;
        console.log("✅ Client created successfully:", response.data.name);
        console.log("   Client ID:", testClientId);
      } else {
        console.log("❌ Failed to create client:", response.error);
      }
      resolve();
    });
  });
}

function testGetAllClients(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:getAll...");
    
    socket.emit("client:getAll", {});
    
    socket.once("client:getAll-response", (response) => {
      if (response.done) {
        console.log("✅ Retrieved clients successfully:", response.data.length, "clients found");
      } else {
        console.log("❌ Failed to get clients:", response.error);
      }
      resolve();
    });
  });
}

function testGetClientById(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:getById...");
    
    socket.emit("client:getById", testClientId);
    
    socket.once("client:getById-response", (response) => {
      if (response.done) {
        console.log("✅ Retrieved client by ID:", response.data.name);
      } else {
        console.log("❌ Failed to get client by ID:", response.error);
      }
      resolve();
    });
  });
}

function testUpdateClient(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:update...");
    
    const updateData = {
      phone: "+1-555-9999",
      contractValue: 200000,
      projects: 5
    };
    
    socket.emit("client:update", { clientId: testClientId, update: updateData });
    
    socket.once("client:update-response", (response) => {
      if (response.done) {
        console.log("✅ Client updated successfully");
        console.log("   New phone:", response.data.phone);
        console.log("   New contract value:", response.data.contractValue);
      } else {
        console.log("❌ Failed to update client:", response.error);
      }
      resolve();
    });
  });
}

function testGetClientStats(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:getStats...");
    
    socket.emit("client:getStats");
    
    socket.once("client:getStats-response", (response) => {
      if (response.done) {
        console.log("✅ Client stats retrieved:");
        console.log("   Total clients:", response.data.totalClients);
        console.log("   Active clients:", response.data.activeClients);
        console.log("   Inactive clients:", response.data.inactiveClients);
        console.log("   New clients (30 days):", response.data.newClients);
        console.log("   Total contract value:", response.data.totalContractValue);
      } else {
        console.log("❌ Failed to get client stats:", response.error);
      }
      resolve();
    });
  });
}

function testFilterClients(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:filter...");
    
    const filterOptions = {
      status: "Active",
      sortBy: "createdAt",
      sortOrder: "desc"
    };
    
    socket.emit("client:filter", filterOptions);
    
    socket.once("client:filter-response", (response) => {
      if (response.done) {
        console.log("✅ Clients filtered successfully:", response.data.length, "active clients found");
      } else {
        console.log("❌ Failed to filter clients:", response.error);
      }
      resolve();
    });
  });
}

function testGetAllData(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:getAllData...");
    
    socket.emit("client:getAllData", {});
    
    socket.once("client:getAllData-response", (response) => {
      if (response.done) {
        console.log("✅ All client data retrieved:");
        console.log("   Clients count:", response.data.clients.length);
        console.log("   Stats available:", !!response.data.stats);
      } else {
        console.log("❌ Failed to get all client data:", response.error);
      }
      resolve();
    });
  });
}

function testExportPDF(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client/export-pdf...");
    
    socket.emit("client/export-pdf");
    
    socket.once("client/export-pdf-response", (response) => {
      if (response.done) {
        console.log("✅ PDF export successful:", response.data.pdfUrl);
      } else {
        console.log("❌ Failed to export PDF:", response.error);
      }
      resolve();
    });
  });
}

function testExportExcel(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client/export-excel...");
    
    socket.emit("client/export-excel");
    
    socket.once("client/export-excel-response", (response) => {
      if (response.done) {
        console.log("✅ Excel export successful:", response.data.excelUrl);
      } else {
        console.log("❌ Failed to export Excel:", response.error);
      }
      resolve();
    });
  });
}

function testRoleBasedAccess() {
  return new Promise((resolve) => {
    console.log("🔄 Testing role-based access control...");
    
    // Test HR access
    const hrSocket = io(TEST_SERVER_URL, {
      auth: { token: "mock-hr-token" }
    });
    
    hrSocket.user = hrUser.sub;
    hrSocket.userMetadata = hrUser.userMetadata;
    hrSocket.companyId = hrUser.companyId;
    
    hrSocket.on('connect', () => {
      hrSocket.emit("client:getAll", {});
      
      hrSocket.once("client:getAll-response", (response) => {
        if (response.done) {
          console.log("✅ HR role can access clients");
        } else {
          console.log("❌ HR role access denied:", response.error);
        }
        
        hrSocket.disconnect();
        
        // Test Employee access (should be denied)
        testEmployeeAccess().then(resolve);
      });
    });
  });
}

function testEmployeeAccess() {
  return new Promise((resolve) => {
    const employeeSocket = io(TEST_SERVER_URL, {
      auth: { token: "mock-employee-token" }
    });
    
    employeeSocket.user = employeeUser.sub;
    employeeSocket.userMetadata = employeeUser.userMetadata;
    employeeSocket.companyId = employeeUser.companyId;
    
    employeeSocket.on('connect', () => {
      employeeSocket.emit("client:create", sampleClient);
      
      employeeSocket.once("client:create-response", (response) => {
        if (!response.done && response.error.includes("Unauthorized")) {
          console.log("✅ Employee role correctly denied access");
        } else {
          console.log("❌ Employee role should not have access");
        }
        
        employeeSocket.disconnect();
        resolve();
      });
    });
  });
}

function testDeleteClient(socket) {
  return new Promise((resolve) => {
    console.log("🔄 Testing client:delete...");
    
    socket.emit("client:delete", { clientId: testClientId });
    
    socket.once("client:delete-response", (response) => {
      if (response.done) {
        console.log("✅ Client deleted successfully");
      } else {
        console.log("❌ Failed to delete client:", response.error);
      }
      resolve();
    });
  });
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  connectDB().then(() => {
    testClientModule().catch(console.error);
  });
}

export { testClientModule };
