const BACKEND_WS_URL = "ws://127.0.0.1:19082";
let ws = null;
let reconnectTimer = null;

// Improved browser detection supporting Brave, Opera, Vivaldi, Edge, and Chrome
const isEdge = navigator.userAgent.indexOf("Edg") > -1;
const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function') || navigator.userAgent.indexOf("Brave") > -1;
const isOpera = navigator.userAgent.indexOf("OPR") > -1 || navigator.userAgent.indexOf("Opera") > -1;
const isVivaldi = navigator.userAgent.indexOf("Vivaldi") > -1;

let browserName = "chrome";
if (isEdge) browserName = "edge";
else if (isBrave) browserName = "brave";
else if (isOpera) browserName = "opera";
else if (isVivaldi) browserName = "vivaldi";

function connect() {
  if (ws) {
    try { ws.close(); } catch(e) {}
  }
  
  console.log(`Connecting to Docksy engine at ${BACKEND_WS_URL} as '${browserName}'...`);
  ws = new WebSocket(BACKEND_WS_URL);
  
  ws.onopen = () => {
    console.log("Connected to Docksy engine!");
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
    
    // Register browser identity
    send({
      type: "INIT",
      browser: browserName
    });
  };
  
  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Received message from Docksy:", data);
      
      if (data.type === "GET_TABS") {
        const tabs = await getAllTabs();
        send({
          type: "TABS_RESPONSE",
          request_id: data.request_id,
          tabs: tabs
        });
      } else if (data.type === "RESTORE_TABS") {
        await restoreTabs(data.windows || data.tabs);
      }
    } catch (e) {
      console.error("Error handling message:", e);
    }
  };
  
  ws.onclose = () => {
    console.log("Docksy connection closed. Retrying in 3 seconds...");
    ws = null;
    startReconnectTimer();
  };
  
  ws.onerror = (err) => {
    console.error("Docksy socket error:", err);
  };
}

function startReconnectTimer() {
  if (!reconnectTimer) {
    reconnectTimer = setInterval(connect, 3000);
  }
}

function send(msgObj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msgObj));
  }
}

async function getAllTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      // Return a stripped down version of tabs to save memory and protect privacy
      const strippedTabs = (tabs || []).map(t => ({
        id: t.id,
        windowId: t.windowId,
        url: t.url,
        title: t.title,
        active: t.active
      })).filter(t => t.url && t.url.startsWith("http")); // Ignore chrome:// settings, extensions, or blank tabs
      resolve(strippedTabs);
    });
  });
}

async function restoreTabs(windowsToRestore) {
  if (!windowsToRestore || windowsToRestore.length === 0) return;
  
  // Check if it's the new format (array of window objects containing tabs)
  if (Array.isArray(windowsToRestore[0]?.tabs)) {
    for (const winInfo of windowsToRestore) {
      const group = winInfo.tabs;
      if (!group || group.length === 0) continue;
      
      const firstTab = group[0];
      const otherTabs = group.slice(1);
      
      const createData = { url: firstTab.url };
      if (winInfo.left !== undefined) createData.left = Math.round(winInfo.left);
      if (winInfo.top !== undefined) createData.top = Math.round(winInfo.top);
      if (winInfo.width !== undefined) createData.width = Math.round(winInfo.width);
      if (winInfo.height !== undefined) createData.height = Math.round(winInfo.height);
      
      const targetState = winInfo.state;
      // If we are specifying coordinates, we should not specify a non-normal state in createData
      // to prevent Chrome extension runtime errors. We will apply the state via chrome.windows.update.
      if (targetState && targetState !== "normal") {
        createData.state = "normal";
      } else if (targetState) {
        createData.state = targetState;
      }
      
      chrome.windows.create(createData, (window) => {
        if (!window) return;
        
        // Update state if it was maximized/minimized/fullscreen
        if (targetState && targetState !== "normal") {
          if (["minimized", "maximized", "fullscreen"].includes(targetState)) {
            chrome.windows.update(window.id, { state: targetState });
          }
        }
        
        otherTabs.forEach((tab) => {
          chrome.tabs.create({
            windowId: window.id,
            url: tab.url,
            active: !!tab.active
          });
        });
      });
    }
  } else {
    // Old format fallback: flat list of tabs
    const windowGroups = {};
    windowsToRestore.forEach((tab) => {
      const winKey = tab.window_id || 0;
      if (!windowGroups[winKey]) {
        windowGroups[winKey] = [];
      }
      windowGroups[winKey].push(tab);
    });
    
    for (const winKey in windowGroups) {
      const group = windowGroups[winKey];
      if (group.length === 0) continue;
      
      const firstTab = group[0];
      const otherTabs = group.slice(1);
      
      chrome.windows.create({ url: firstTab.url }, (window) => {
        if (!window) return;
        
        otherTabs.forEach((tab) => {
          chrome.tabs.create({
            windowId: window.id,
            url: tab.url,
            active: !!tab.active
          });
        });
      });
    }
  }
}

// Start connection on load
connect();
