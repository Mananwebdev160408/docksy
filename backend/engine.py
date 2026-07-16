import ctypes
from ctypes import wintypes
import json
import os
import subprocess
import sys
import threading
import time
import re
import socket
import socket
import hashlib
import base64
import struct
from datetime import datetime
import winreg

# Database Location
DB_DIR = os.path.expanduser(r"~\.docksy")
DB_JSON_PATH = os.path.join(DB_DIR, "docksy.json")
DB_PATH = os.path.join(DB_DIR, "docksy.db")

# Thread lock for thread-safe JSON file writes
db_lock = threading.Lock()

# Windows APIs Definition
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
psapi = ctypes.windll.psapi

# Types & Callbacks
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
MONITORENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HMONITOR, wintypes.HDC, ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)

# Structures
class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", ctypes.c_ulong),
        ("Data2", ctypes.c_ushort),
        ("Data3", ctypes.c_ushort),
        ("Data4", ctypes.c_ubyte * 8)
    ]
    
    def __str__(self):
        data4_str = "".join(f"{b:02X}" for b in self.Data4)
        return f"{{{self.Data1:08X}-{self.Data2:04X}-{self.Data3:04X}-{data4_str[:4]}-{data4_str[4:]}}}"

    @classmethod
    def from_str(cls, guid_str):
        normalized = guid_str.replace("{", "").replace("}", "").replace("-", "")
        if len(normalized) != 32:
            raise ValueError(f"Invalid GUID string: {guid_str}")
        d1 = int(normalized[0:8], 16)
        d2 = int(normalized[8:12], 16)
        d3 = int(normalized[12:16], 16)
        d4_parts = [int(normalized[i:i+2], 16) for i in range(16, 32, 2)]
        d4 = (ctypes.c_ubyte * 8)(*d4_parts)
        return cls(d1, d2, d3, d4)

def get_virtual_desktop_info():
    desktop_map = {}
    desktop_order = []
    
    try:
        # Read the ordered list of virtual desktop GUIDs
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VirtualDesktops") as key:
            try:
                value, value_type = winreg.QueryValueEx(key, "VirtualDesktopIDs")
                if value_type == winreg.REG_BINARY:
                    for i in range(0, len(value), 16):
                        guid_bytes = value[i:i+16]
                        if len(guid_bytes) == 16:
                            d1 = int.from_bytes(guid_bytes[0:4], byteorder='little')
                            d2 = int.from_bytes(guid_bytes[4:6], byteorder='little')
                            d3 = int.from_bytes(guid_bytes[6:8], byteorder='little')
                            d4 = guid_bytes[8:16]
                            
                            d4_str = "".join(f"{b:02X}" for b in d4)
                            guid_str = f"{{{d1:08X}-{d2:04X}-{d3:04X}-{d4_str[:4]}-{d4_str[4:]}}}"
                            desktop_order.append(guid_str)
            except FileNotFoundError:
                pass
                
        # Read custom desktop names from the subkey
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VirtualDesktops\Desktops") as key:
                index = 0
                while True:
                    try:
                        subkey_name = winreg.EnumKey(key, index)
                        try:
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                name, _ = winreg.QueryValueEx(subkey, "Name")
                                desktop_map[subkey_name.upper()] = name
                        except FileNotFoundError:
                            pass
                        index += 1
                    except OSError:
                        break
        except FileNotFoundError:
            pass
            
        # Fallback names
        for idx, guid in enumerate(desktop_order):
            g_upper = guid.upper()
            if g_upper not in desktop_map:
                desktop_map[g_upper] = f"Desktop {idx + 1}"
                
    except Exception as e:
        print(f"Error reading Virtual Desktop info: {e}")
        
    return desktop_map, desktop_order

class VirtualDesktopManagerScope:
    def __enter__(self):
        ctypes.windll.ole32.CoInitialize(None)
        
        clsid = GUID.from_str("{AA509086-5CA9-4C25-8F95-589D3C07B48A}")
        iid = GUID.from_str("{A5CD92FF-29BE-454C-8D04-D82879FB3F1B}")
        self.pManager = ctypes.c_void_p()
        hr = ctypes.windll.ole32.CoCreateInstance(
            ctypes.byref(clsid),
            None,
            1, # CLSCTX_INPROC_SERVER
            ctypes.byref(iid),
            ctypes.byref(self.pManager)
        )
        if hr == 0 and self.pManager.value:
            self.vtable = ctypes.cast(self.pManager, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
            
            GetWindowDesktopId_proto = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, wintypes.HWND, ctypes.POINTER(GUID))
            self.get_window_desktop_id = GetWindowDesktopId_proto(self.vtable[4])
            
            MoveWindowToDesktop_proto = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, wintypes.HWND, ctypes.POINTER(GUID))
            self.move_window_to_desktop = MoveWindowToDesktop_proto(self.vtable[5])
            
            return self
        else:
            self.pManager = None
            return None

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.pManager and self.pManager.value:
            try:
                Release_proto = ctypes.WINFUNCTYPE(ctypes.c_ulong, ctypes.c_void_p)
                release_func = Release_proto(self.vtable[2])
                release_func(self.pManager)
            except Exception as e:
                print(f"Error releasing IVirtualDesktopManager: {e}")
        ctypes.windll.ole32.CoUninitialize()

def move_hwnd_to_desktop_by_index(hwnd, target_desktop_index, retries=3):
    """
    Reliably move a window (any process) to a virtual desktop by 0-based index.
    Uses a PowerShell script with inline C# that accesses IVirtualDesktopManagerInternal
    via ImmersiveShell IServiceProvider - the only reliable way to move foreign-process
    windows across virtual desktops on Windows 10/11.
    
    The public IVirtualDesktopManager::MoveWindowToDesktop COM API silently fails with
    E_ACCESSDENIED (0x80070005) for windows belonging to other processes. The internal
    interface (IVirtualDesktopManagerInternal) accessed via IApplicationViewCollection
    does NOT have this restriction.
    """
    # C# code with all delegate types declared at class scope (not inside methods)
    ps_code = f"""
$hwnd = [IntPtr]{hwnd}
$targetIdx = {target_desktop_index}

$src = @"
using System;
using System.Runtime.InteropServices;

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("FF72FFDD-BE7E-43FC-9C03-AD81681E88E4")]
public interface IVirtualDesktop2 {{
    [PreserveSig] int GetType2();
    [PreserveSig] int GetMonitor();
    [PreserveSig] int GetID(out Guid id);
}}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("92CA9DCD-5622-4BBA-A805-5E9F541BD8C9")]
public interface IObjectArray2 {{
    [PreserveSig] int GetCount(out uint n);
    [PreserveSig] int GetAt(uint i, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object ppv);
}}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("6D5140C1-7436-11CE-8034-00AA006009FA")]
public interface IServiceProvider2 {{ [PreserveSig] int QueryService(ref Guid svc, ref Guid iid, out IntPtr ppv); }}

public class VDM {{
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);

    static readonly Guid CLSID_Shell     = new Guid("C2F03A33-21F5-47FA-B4BB-156362A2F239");
    static readonly Guid SID_VDMInternal = new Guid("C5E0CDCA-7B6E-41B2-9FC4-D93975CC467B");
    static readonly Guid IID_OA          = new Guid("92CA9DCD-5622-4BBA-A805-5E9F541BD8C9");
    static readonly Guid IID_VD          = new Guid("FF72FFDD-BE7E-43FC-9C03-AD81681E88E4");
    static readonly Guid SID_AVC         = new Guid("1841C6D7-4F9D-42C0-AF41-8747538F10E5");
    static readonly Guid IID_AVC         = new Guid("2C08ADF0-A386-4B35-9250-0FE183476FCC");

    // Try multiple IIDs for IVirtualDesktopManagerInternal across Windows versions
    static readonly Guid[] IID_VDMInternal = new Guid[] {{
        new Guid("A3175F2D-239C-4BD2-8AA0-EEBA8BE0DF4F"), // Win11 24H2
        new Guid("F31574D6-B682-4CDC-BD56-1827860ABEC6"), // Win11 21H2-23H2
        new Guid("EF9F1A6C-D3CC-4358-B712-F84B635BEBE7"), // Win10
    }};

    // All delegate types MUST be declared at class scope, not inside methods
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int GetAllDesktopsDelegate(IntPtr self, out IntPtr ppArr);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int GetViewForHwndDelegate(IntPtr self, IntPtr hwnd, out IntPtr view);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int MoveViewToDesktopDelegate(IntPtr self, IntPtr view, IntPtr desktop);

    public static string Move(IntPtr hwnd, int idx) {{
        if (!IsWindow(hwnd)) return "invalid hwnd";

        Type t = Type.GetTypeFromCLSID(CLSID_Shell);
        object shell = Activator.CreateInstance(t);
        IServiceProvider2 sp = shell as IServiceProvider2;
        if (sp == null) return "no IServiceProvider";

        // Try each IID until QueryService succeeds
        IntPtr pMgr = IntPtr.Zero;
        int hr = -1;
        foreach (var iid in IID_VDMInternal) {{
            Guid svc = SID_VDMInternal;
            Guid i2 = iid;
            hr = sp.QueryService(ref svc, ref i2, out pMgr);
            if (hr == 0 && pMgr != IntPtr.Zero) break;
            pMgr = IntPtr.Zero;
        }}
        if (pMgr == IntPtr.Zero) return "QueryService failed hr=" + hr.ToString("X8");

        IntPtr vtable = Marshal.ReadIntPtr(pMgr);

        // Probe vtable slots for GetAllCurrentDesktops - layout varies by Windows version
        int getAllSlot = -1;
        int desktopCount = 0;
        foreach (int slot in new[] {{ 7, 8, 4, 9 }}) {{
            try {{
                IntPtr fn = Marshal.ReadIntPtr(vtable, slot * IntPtr.Size);
                var call = Marshal.GetDelegateForFunctionPointer<GetAllDesktopsDelegate>(fn);
                IntPtr arr;
                if (call(pMgr, out arr) == 0 && arr != IntPtr.Zero) {{
                    IObjectArray2 oa = (IObjectArray2)Marshal.GetObjectForIUnknown(arr);
                    uint cnt; oa.GetCount(out cnt);
                    Marshal.Release(arr);
                    if (cnt > 0) {{ getAllSlot = slot; desktopCount = (int)cnt; break; }}
                }}
            }} catch {{ }}
        }}
        if (getAllSlot < 0) {{ Marshal.Release(pMgr); return "GetAllCurrentDesktops: no valid slot found"; }}
        if (idx < 0 || idx >= desktopCount) {{ Marshal.Release(pMgr); return "desktop index " + idx + " out of range (" + desktopCount + ")"; }}

        // Get IObjectArray of all desktops
        IntPtr pArr;
        {{
            IntPtr fn = Marshal.ReadIntPtr(vtable, getAllSlot * IntPtr.Size);
            Marshal.GetDelegateForFunctionPointer<GetAllDesktopsDelegate>(fn)(pMgr, out pArr);
        }}
        IObjectArray2 desktops = (IObjectArray2)Marshal.GetObjectForIUnknown(pArr);
        Marshal.Release(pArr);

        Guid vdIid = IID_VD;
        object deskObj;
        desktops.GetAt((uint)idx, ref vdIid, out deskObj);
        IntPtr pTargetDesktop = Marshal.GetIUnknownForObject(deskObj);

        // Get IApplicationViewCollection and use GetViewForHwnd
        IntPtr pAVC = IntPtr.Zero;
        {{
            Guid s_avc = SID_AVC;
            Guid i_avc = IID_AVC;
            sp.QueryService(ref s_avc, ref i_avc, out pAVC);
        }}
        if (pAVC == IntPtr.Zero) {{ Marshal.Release(pTargetDesktop); Marshal.Release(pMgr); return "no IApplicationViewCollection"; }}

        // GetViewForHwnd is at vtable slot 6
        IntPtr pAppView = IntPtr.Zero;
        {{
            IntPtr avcVtable = Marshal.ReadIntPtr(pAVC);
            IntPtr fn = Marshal.ReadIntPtr(avcVtable, 6 * IntPtr.Size);
            Marshal.GetDelegateForFunctionPointer<GetViewForHwndDelegate>(fn)(pAVC, hwnd, out pAppView);
            Marshal.Release(pAVC);
        }}
        if (pAppView == IntPtr.Zero) {{ Marshal.Release(pTargetDesktop); Marshal.Release(pMgr); return "GetViewForHwnd failed"; }}

        // Probe MoveViewToDesktop vtable slot (4 for Win10/11, 5 for 24H2)
        bool moved = false;
        foreach (int mvSlot in new[] {{ 4, 5, 3 }}) {{
            try {{
                IntPtr fn = Marshal.ReadIntPtr(vtable, mvSlot * IntPtr.Size);
                var call = Marshal.GetDelegateForFunctionPointer<MoveViewToDesktopDelegate>(fn);
                if (call(pMgr, pAppView, pTargetDesktop) == 0) {{ moved = true; break; }}
            }} catch {{ }}
        }}

        Marshal.Release(pAppView);
        Marshal.Release(pTargetDesktop);
        Marshal.Release(pMgr);
        return moved ? "ok" : "MoveViewToDesktop failed";
    }}
}}
"@

try {{
    if (-not ([System.Management.Automation.PSTypeName]'VDM').Type) {{
        Add-Type -TypeDefinition $src -ErrorAction Stop
    }}
    $result = [VDM]::Move($hwnd, $targetIdx)
    Write-Output $result
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}}
"""
    for attempt in range(retries):
        try:
            res = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_code],
                capture_output=True, text=True, timeout=12
            )
            output = res.stdout.strip()
            if output == "ok":
                return True
            else:
                err = (res.stderr or "").strip()
                print(f"[VD] Move attempt {attempt+1}/{retries}: '{output}' err='{err}'")
                if attempt < retries - 1:
                    time.sleep(0.4)
        except Exception as e:
            print(f"[VD] Move exception attempt {attempt+1}: {e}")
            if attempt < retries - 1:
                time.sleep(0.4)
    return False

class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long)
    ]

class WINDOWPLACEMENT(ctypes.Structure):
    _fields_ = [
        ("length", ctypes.c_uint),
        ("flags", ctypes.c_uint),
        ("showCmd", ctypes.c_uint),
        ("ptMinPosition", wintypes.POINT),
        ("ptMaxPosition", wintypes.POINT),
        ("rcNormalPosition", RECT)
    ]

class MONITORINFOEXW(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD),
        ("szDevice", wintypes.WCHAR * 32)
    ]

# Setup 64-bit safe declarations for all ctypes functions
user32.EnumWindows.argtypes = [WNDENUMPROC, wintypes.LPARAM]
user32.EnumWindows.restype = wintypes.BOOL

user32.EnumChildWindows.argtypes = [wintypes.HWND, WNDENUMPROC, wintypes.LPARAM]
user32.EnumChildWindows.restype = wintypes.BOOL

user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.IsWindowVisible.restype = wintypes.BOOL

user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
user32.GetWindowTextLengthW.restype = ctypes.c_int

user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowTextW.restype = ctypes.c_int

user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetClassNameW.restype = ctypes.c_int

user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetWindowThreadProcessId.restype = wintypes.DWORD

user32.GetWindowPlacement.argtypes = [wintypes.HWND, ctypes.c_void_p]
user32.GetWindowPlacement.restype = wintypes.BOOL

user32.MonitorFromWindow.argtypes = [wintypes.HWND, wintypes.DWORD]
user32.MonitorFromWindow.restype = wintypes.HMONITOR

user32.GetMonitorInfoW.argtypes = [wintypes.HMONITOR, ctypes.c_void_p]
user32.GetMonitorInfoW.restype = wintypes.BOOL

user32.GetThreadDesktop.argtypes = [wintypes.DWORD]
user32.GetThreadDesktop.restype = wintypes.HDESK

user32.OpenDesktopW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
user32.OpenDesktopW.restype = wintypes.HDESK

user32.SetThreadDesktop.argtypes = [wintypes.HDESK]
user32.SetThreadDesktop.restype = wintypes.BOOL

user32.CloseDesktop.argtypes = [wintypes.HDESK]
user32.CloseDesktop.restype = wintypes.BOOL

user32.EnumDisplayMonitors.argtypes = [wintypes.HDC, ctypes.c_void_p, MONITORENUMPROC, wintypes.LPARAM]
user32.EnumDisplayMonitors.restype = wintypes.BOOL

user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
user32.ShowWindow.restype = wintypes.BOOL

user32.SetWindowPlacement.argtypes = [wintypes.HWND, ctypes.c_void_p]
user32.SetWindowPlacement.restype = wintypes.BOOL

user32.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
user32.GetWindowLongW.restype = ctypes.c_long

user32.GetWindow.argtypes = [wintypes.HWND, wintypes.UINT]
user32.GetWindow.restype = wintypes.HWND

kernel32.GetCurrentThreadId.argtypes = []
kernel32.GetCurrentThreadId.restype = wintypes.DWORD

kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel32.OpenProcess.restype = wintypes.HANDLE

kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL

kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.CloseHandle.restype = wintypes.BOOL

kernel32.GetApplicationUserModelId.argtypes = [wintypes.HANDLE, ctypes.POINTER(ctypes.c_uint32), wintypes.LPWSTR]
kernel32.GetApplicationUserModelId.restype = ctypes.c_long

psapi.GetModuleFileNameExW.argtypes = [wintypes.HANDLE, wintypes.HMODULE, wintypes.LPWSTR, wintypes.DWORD]
psapi.GetModuleFileNameExW.restype = wintypes.DWORD

# Global variables
connected_browsers = {}  # { "chrome": socket, "edge": socket, "brave": socket }
tab_responses = {}       # { request_id: data }
response_events = {}     # { request_id: threading.Event }

# JSON DB Helper Functions
def load_db():
    with db_lock:
        if not os.path.exists(DB_JSON_PATH):
            return {
                "workspaces": [],
                "workspace_windows": [],
                "workspace_tabs": [],
                "snapshots": [],
                "ignored_apps": [],
                "schedules": [],
                "settings": {}
            }
        try:
            with open(DB_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading JSON DB: {e}")
            return {
                "workspaces": [],
                "workspace_windows": [],
                "workspace_tabs": [],
                "snapshots": [],
                "ignored_apps": [],
                "schedules": [],
                "settings": {}
            }

def save_db(data):
    with db_lock:
        if not os.path.exists(DB_DIR):
            os.makedirs(DB_DIR)
        try:
            with open(DB_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving JSON DB: {e}")

def init_db():
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
        
    db = load_db()
    
    # SQLite to JSON Migration
    if not os.path.exists(DB_JSON_PATH) and os.path.exists(DB_PATH):
        print("Migrating SQLite database to JSON...")
        try:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            def fetch_table(table_name):
                try:
                    cursor.execute(f"SELECT * FROM {table_name}")
                    return [dict(row) for row in cursor.fetchall()]
                except:
                    return []
            
            db["workspaces"] = fetch_table("workspaces")
            db["workspace_windows"] = fetch_table("workspace_windows")
            db["workspace_tabs"] = fetch_table("workspace_tabs")
            db["snapshots"] = fetch_table("snapshots")
            for s in db["snapshots"]:
                if isinstance(s.get("data"), str):
                    try:
                        s["data"] = json.loads(s["data"])
                    except:
                        pass
            
            ignored_rows = fetch_table("ignored_apps")
            db["ignored_apps"] = list({row["name"].lower() for row in ignored_rows})
            
            db["schedules"] = fetch_table("schedules")
            
            settings_rows = fetch_table("settings")
            db["settings"] = {row["key"]: row["value"] for row in settings_rows}
            
            conn.close()
            save_db(db)
            
            try:
                os.rename(DB_PATH, DB_PATH + ".bak")
                print("Migration completed. SQLite DB backed up to docksy.db.bak")
            except Exception as re_err:
                print(f"Could not rename docksy.db: {re_err}")
        except Exception as e:
            print(f"Migration error: {e}")
            
    # Seed default settings
    defaults = {
        "launch_at_startup": "0",
        "minimize_to_tray": "1",
        "auto_update": "0",
        "notifications": "1",
        "auto_snapshots_enabled": "1",
        "snapshot_interval": "60",
        "restore_delay": "1000",
        "restore_minimized": "1",
        "skip_already_running": "1"
    }
    updated = False
    for k, v in defaults.items():
        if k not in db["settings"]:
            db["settings"][k] = v
            updated = True
            
    # Default ignore list (Only Docksy self-exclusion by default)
    apps_to_remove = ["discord.exe", "spotify.exe", "steam.exe", "obs64.exe", "obs.exe", "antigravity ide.exe"]
    if not db["ignored_apps"]:
        db["ignored_apps"] = ["electron.exe", "docksy.exe", "python.exe", "pythonw.exe"]
        updated = True
    else:
        # Clear out any of the user's un-ignored apps
        original_len = len(db["ignored_apps"])
        db["ignored_apps"] = [app.lower() for app in db["ignored_apps"] if app.lower() not in apps_to_remove]
        for app in ["electron.exe", "docksy.exe", "python.exe", "pythonw.exe"]:
            if app not in db["ignored_apps"]:
                db["ignored_apps"].append(app)
        if len(db["ignored_apps"]) != original_len:
            updated = True
            
    if updated:
        save_db(db)

# UWP Helper Functions
def get_process_aumid(pid):
    h_process = kernel32.OpenProcess(0x1000, False, pid) # PROCESS_QUERY_LIMITED_INFORMATION
    if not h_process:
        return None
    aumid = None
    try:
        length = ctypes.c_uint32(0)
        rc = kernel32.GetApplicationUserModelId(h_process, ctypes.byref(length), None)
        if rc == 122: # ERROR_INSUFFICIENT_BUFFER
            buf = ctypes.create_unicode_buffer(length.value)
            rc = kernel32.GetApplicationUserModelId(h_process, ctypes.byref(length), buf)
            if rc == 0:
                aumid = buf.value
    except:
        pass
    finally:
        kernel32.CloseHandle(h_process)
    return aumid

def get_uwp_real_pid_and_hwnd(hwnd, parent_pid):
    real_hwnd = [hwnd]
    real_pid = wintypes.DWORD(0)
    
    def child_callback(child_hwnd, lparam):
        child_pid = wintypes.DWORD(0)
        user32.GetWindowThreadProcessId(child_hwnd, ctypes.byref(child_pid))
        if child_pid.value != 0 and child_pid.value != parent_pid:
            real_pid.value = child_pid.value
            real_hwnd[0] = child_hwnd
            return False # Stop enumeration
        return True
        
    cb = WNDENUMPROC(child_callback)
    user32.EnumChildWindows(hwnd, cb, 0)
    return real_hwnd[0], real_pid.value

def get_all_process_command_lines():
    pid_to_cmd = {}
    try:
        ps_cmd = "Get-CimInstance Win32_Process | Select-Object ProcessId, CommandLine | ConvertTo-Json"
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
        if res.returncode == 0 and res.stdout.strip():
            try:
                data = json.loads(res.stdout)
                if isinstance(data, list):
                    for item in data:
                        pid = item.get("ProcessId")
                        cmd = item.get("CommandLine")
                        if pid is not None and cmd is not None:
                            pid_to_cmd[pid] = cmd
                elif isinstance(data, dict):
                    pid = data.get("ProcessId")
                    cmd = data.get("CommandLine")
                    if pid is not None and cmd is not None:
                        pid_to_cmd[pid] = cmd
            except:
                pass
    except Exception as e:
        print(f"Error bulk fetching command lines: {e}")
    return pid_to_cmd

def get_process_path_and_cmd(pid, pid_to_cmd=None):
    h_process = kernel32.OpenProcess(0x1000, False, pid) # PROCESS_QUERY_LIMITED_INFORMATION
    if not h_process:
        h_process = kernel32.OpenProcess(0x0400 | 0x0010, False, pid) # Query + VM_READ
    
    exe_path = "Unknown"
    if h_process:
        buf = ctypes.create_unicode_buffer(1024)
        size = wintypes.DWORD(len(buf))
        if kernel32.QueryFullProcessImageNameW(h_process, 0, buf, ctypes.byref(size)):
            exe_path = buf.value
        else:
            if psapi.GetModuleFileNameExW(h_process, 0, buf, size):
                exe_path = buf.value
        kernel32.CloseHandle(h_process)
        
    cmd_line = ""
    if pid_to_cmd is not None and pid in pid_to_cmd:
        cmd_line = pid_to_cmd[pid]
    else:
        if exe_path != "Unknown" and not exe_path.lower().startswith("c:\\windows\\system32"):
            try:
                ps_cmd = f"Get-CimInstance Win32_Process -Filter 'ProcessId = {pid}' | Select-Object -ExpandProperty CommandLine"
                res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=2)
                if res.returncode == 0:
                    cmd_line = res.stdout.strip()
            except:
                pass
                
    return exe_path, cmd_line

def get_monitors():
    monitors = []
    def callback(h_monitor, hdc, lprc, lparam):
        mi = MONITORINFOEXW()
        mi.cbSize = ctypes.sizeof(MONITORINFOEXW)
        if user32.GetMonitorInfoW(h_monitor, ctypes.byref(mi)):
            monitors.append({
                "device": mi.szDevice,
                "is_primary": bool(mi.dwFlags & 1),
                "rect": {
                    "left": mi.rcMonitor.left,
                    "top": mi.rcMonitor.top,
                    "right": mi.rcMonitor.right,
                    "bottom": mi.rcMonitor.bottom
                },
                "work": {
                    "left": mi.rcWork.left,
                    "top": mi.rcWork.top,
                    "right": mi.rcWork.right,
                    "bottom": mi.rcWork.bottom
                }
            })
        return True
    
    h_orig_desktop = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    has_switched = False
    if h_default:
        if user32.SetThreadDesktop(h_default):
            has_switched = True
    user32.EnumDisplayMonitors(None, None, MONITORENUMPROC(callback), 0)
    if has_switched:
        user32.SetThreadDesktop(h_orig_desktop)
    if h_default:
        user32.CloseDesktop(h_default)
    return monitors

def get_file_explorer_paths():
    ps_cmd = "(New-Object -ComObject Shell.Application).Windows() | ForEach-Object { $_.Document.Folder.Self.Path }"
    try:
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=3)
        return [line.strip() for line in res.stdout.split("\n") if line.strip() and os.path.exists(line.strip())]
    except:
        return []

def get_vscode_workspaces():
    workspaces = []
    storage_roots = [os.path.expandvars(r'%APPDATA%\Code\User\workspaceStorage')]
    
    profiles_root = os.path.expandvars(r'%APPDATA%\Code\User\profiles')
    if os.path.exists(profiles_root):
        for profile in os.listdir(profiles_root):
            profile_path = os.path.join(profiles_root, profile)
            if os.path.isdir(profile_path):
                ws_dir = os.path.join(profile_path, 'workspaceStorage')
                if os.path.exists(ws_dir):
                    storage_roots.append(ws_dir)
                    
    for storage_root in storage_roots:
        if os.path.exists(storage_root):
            for folder in os.listdir(storage_root):
                folder_path = os.path.join(storage_root, folder)
                workspace_json = os.path.join(folder_path, 'workspace.json')
                if os.path.exists(workspace_json):
                    try:
                        with open(workspace_json, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            uri = data.get("folder") or data.get("workspace")
                            if uri:
                                import urllib.parse
                                parsed_uri = urllib.parse.urlparse(uri)
                                path = urllib.parse.unquote(parsed_uri.path)
                                if path.startswith('/') and path[2] == ':':
                                    path = path[1:]
                                path = os.path.normpath(path)
                                name = os.path.basename(path)
                                if name.endswith('.code-workspace'):
                                    name = os.path.splitext(name)[0]
                                try:
                                    mtime = os.path.getmtime(workspace_json)
                                except:
                                    mtime = 0
                                workspaces.append({
                                    "path": path,
                                    "name": name,
                                    "mtime": mtime
                                })
                    except:
                        pass
    return workspaces

def match_vscode_workspace(title, workspaces):
    title_lower = title.lower()
    matches = []
    for ws in workspaces:
        name_lower = ws["name"].lower()
        pattern = r'\b' + re.escape(name_lower) + r'\b'
        if re.search(pattern, title_lower):
            matches.append(ws)
    if not matches:
        return None
    matches.sort(key=lambda x: (len(x["name"]), x["mtime"]), reverse=True)
    return matches[0]["path"]

def get_vscode_paths():
    titles = []
    def callback(hwnd, lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        h_process = kernel32.OpenProcess(0x1000, False, pid.value)
        if h_process:
            buf = ctypes.create_unicode_buffer(256)
            size = wintypes.DWORD(len(buf))
            if kernel32.QueryFullProcessImageNameW(h_process, 0, buf, ctypes.byref(size)):
                p_name = os.path.basename(buf.value).lower()
                if p_name == "code.exe":
                    length = user32.GetWindowTextLengthW(hwnd)
                    t_buf = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, t_buf, length + 1)
                    titles.append(t_buf.value)
            kernel32.CloseHandle(h_process)
        return True
    
    run_enum_windows(callback)
    
    workspaces = get_vscode_workspaces()
    matched_paths = []
    for title in titles:
        path = match_vscode_workspace(title, workspaces)
        if path:
            matched_paths.append(path)
    return list(set(matched_paths))

def capture_windows(ignored_set):
    windows = []
    
    # Bulk fetch command lines to optimize performance
    pid_to_cmd = get_all_process_command_lines()
    
    # Pre-fetch VS Code workspaces
    vscode_workspaces = get_vscode_workspaces()
    
    # Pre-enumerate all CoreWindows on the desktop to map titles to real UWP process PIDs
    core_window_pids = {}
    def pre_enum_callback(hwnd, lparam):
        class_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, class_buf, 256)
        if class_buf.value == "Windows.UI.Core.CoreWindow":
            title_buf = ctypes.create_unicode_buffer(512)
            user32.GetWindowTextW(hwnd, title_buf, 512)
            if title_buf.value:
                pid = wintypes.DWORD(0)
                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                if pid.value != 0:
                    core_window_pids[title_buf.value.lower()] = pid.value
        return True
        
    pre_cb = WNDENUMPROC(pre_enum_callback)
    
    desktop_map, _ = get_virtual_desktop_info()
    
    h_orig_desktop = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    has_switched = False
    if h_default:
        if user32.SetThreadDesktop(h_default):
            has_switched = True
            
    with VirtualDesktopManagerScope() as vda:
        def callback(hwnd, lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
                
            # Get styles
            ex_style = user32.GetWindowLongW(hwnd, -20) # GWL_EXSTYLE
            
            # Filter out tool windows
            if ex_style & 0x00000080: # WS_EX_TOOLWINDOW
                return True
                
            # Filter out owned windows (GW_OWNER = 3) unless they explicitly set WS_EX_APPWINDOW
            owner = user32.GetWindow(hwnd, 3)
            if owner and user32.IsWindowVisible(owner) and not (ex_style & 0x00040000): # WS_EX_APPWINDOW
                return True
                
            length = user32.GetWindowTextLengthW(hwnd)
            if length == 0:
                return True
                
            title_buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, title_buf, length + 1)
            title = title_buf.value
            
            class_buf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, class_buf, 256)
            class_name = class_buf.value
            
            if class_name in ["Shell_TrayWnd", "Progman", "Windows.UI.Core.CoreWindow", "WorkerW", "MiniMapViewClass", "XamlExplorerHostIslandWindow"]:
                return True
                
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            
            uwp_pid = pid.value
            if class_name == "ApplicationFrameWindow":
                # 1. Try matching by title against pre-enumerated CoreWindows
                real_pid = core_window_pids.get(title.lower(), 0)
                if real_pid != 0:
                    uwp_pid = real_pid
                else:
                    # 2. Fallback to child window enumeration
                    _, child_pid = get_uwp_real_pid_and_hwnd(hwnd, pid.value)
                    if child_pid != 0:
                        uwp_pid = child_pid
                    
            exe_path, cmd_line = get_process_path_and_cmd(uwp_pid, pid_to_cmd)
            exe_name = os.path.basename(exe_path).lower()
            
            # Resolve AUMID for UWP/packaged applications
            aumid = get_process_aumid(uwp_pid)
            if aumid:
                cmd_line = f"explorer.exe shell:AppsFolder\\{aumid}"
                
            if exe_name == "code.exe":
                ws_path = match_vscode_workspace(title, vscode_workspaces)
                if ws_path:
                    cmd_line = f'"{exe_path}" "{ws_path}"'
            
            if exe_name in ignored_set or exe_path == "Unknown":
                return True
                
            placement = WINDOWPLACEMENT()
            placement.length = ctypes.sizeof(WINDOWPLACEMENT)
            user32.GetWindowPlacement(hwnd, ctypes.byref(placement))
            
            h_monitor = user32.MonitorFromWindow(hwnd, 2)
            mi = MONITORINFOEXW()
            mi.cbSize = ctypes.sizeof(MONITORINFOEXW)
            monitor_device = "Unknown"
            monitor_rect = ""
            if user32.GetMonitorInfoW(h_monitor, ctypes.byref(mi)):
                monitor_device = mi.szDevice
                monitor_rect = f"{mi.rcMonitor.left},{mi.rcMonitor.top},{mi.rcMonitor.right},{mi.rcMonitor.bottom}"
                
            # Get Virtual Desktop ID
            v_desktop_id = ""
            v_desktop_name = ""
            if vda:
                desktop_guid = GUID()
                hr = vda.get_window_desktop_id(vda.pManager, hwnd, ctypes.byref(desktop_guid))
                if hr == 0:
                    v_desktop_id = str(desktop_guid)
                    v_desktop_name = desktop_map.get(v_desktop_id.upper(), "")
                    
            windows.append({
                "title": title,
                "class_name": class_name,
                "exe_path": exe_path,
                "cmd_line": cmd_line,
                "rect": {
                    "left": placement.rcNormalPosition.left,
                    "top": placement.rcNormalPosition.top,
                    "right": placement.rcNormalPosition.right,
                    "bottom": placement.rcNormalPosition.bottom
                },
                "show_cmd": placement.showCmd,
                "monitor_device": monitor_device,
                "monitor_rect": monitor_rect,
                "virtual_desktop_id": v_desktop_id,
                "virtual_desktop_name": v_desktop_name
            })
            return True

        cb = WNDENUMPROC(callback)
        user32.EnumWindows(pre_cb, 0)
        user32.EnumWindows(cb, 0)
        
    if has_switched:
        user32.SetThreadDesktop(h_orig_desktop)
    if h_default:
        user32.CloseDesktop(h_default)
            
    return windows

def capture_workspace_data():
    db = load_db()
    ignored_set = {app.lower() for app in db["ignored_apps"]}
    
    windows = capture_windows(ignored_set)
    explorer_paths = get_file_explorer_paths()
    vscode_paths = get_vscode_paths()
    
    browser_tabs = []
    for browser, ws_sock in list(connected_browsers.items()):
        req_id = f"{browser}_{int(time.time()*1000)}"
        event = threading.Event()
        response_events[req_id] = event
        
        ws_msg = json.dumps({
            "type": "GET_TABS",
            "request_id": req_id
        })
        
        try:
            ws_sock.send(encode_websocket_frame(ws_msg))
            if event.wait(timeout=1.2):
                tabs = tab_responses.get(req_id, [])
                for t in tabs:
                    browser_tabs.append({
                        "browser": browser,
                        "window_id": t.get("windowId"),
                        "tab_id": t.get("id"),
                        "url": t.get("url"),
                        "title": t.get("title"),
                        "active": int(t.get("active", False))
                    })
                if req_id in tab_responses:
                    del tab_responses[req_id]
        except Exception as e:
            print(f"Error querying browser {browser} tabs: {e}")
        finally:
            if req_id in response_events:
                del response_events[req_id]
                
    return {
        "windows": windows,
        "explorer_paths": explorer_paths,
        "vscode_paths": vscode_paths,
        "browser_tabs": browser_tabs
    }

def get_running_process_names():
    ps_cmd = "Get-Process | Select-Object -ExpandProperty ProcessName"
    try:
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=2)
        return {line.strip().lower() for line in res.stdout.split("\n") if line.strip()}
    except:
        return set()

def run_enum_windows(callback):
    cb = WNDENUMPROC(callback)
    h_orig_desktop = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    has_switched = False
    if h_default:
        if user32.SetThreadDesktop(h_default):
            has_switched = True
    user32.EnumWindows(cb, 0)
    if has_switched:
        user32.SetThreadDesktop(h_orig_desktop)
    if h_default:
        user32.CloseDesktop(h_default)

def get_hwnds_for_process(exe_name):
    hwnds = set()
    def callback(hwnd, lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        h_process = kernel32.OpenProcess(0x1000, False, pid.value)
        if h_process:
            buf = ctypes.create_unicode_buffer(256)
            size = wintypes.DWORD(len(buf))
            if kernel32.QueryFullProcessImageNameW(h_process, 0, buf, ctypes.byref(size)):
                p_name = os.path.basename(buf.value).lower()
                if p_name == exe_name.lower():
                    hwnds.add(hwnd)
            kernel32.CloseHandle(h_process)
        return True
    run_enum_windows(callback)
    return hwnds

def adjust_browser_launch_cmd(exe_name, launch_cmd, exe_path):
    exe_name_lower = exe_name.lower()
    
    # Define flags
    flag = "--new-window"
    if "firefox.exe" in exe_name_lower:
        flag = "-new-window"
        
    # If the launch command is empty, build it
    if not launch_cmd or not launch_cmd.strip():
        return f'"{exe_path}" {flag}'
        
    # Check if the flag is already in the command line
    if flag in launch_cmd:
        return launch_cmd
        
    # Otherwise, append the flag
    return f"{launch_cmd} {flag}"

def find_window_by_process_and_title(exe_name, title, class_name, exclude_hwnds=None):
    if exclude_hwnds is None:
        exclude_hwnds = set()
    found_hwnd = [None]
    
    # Pass 1: Try to match by title (exact or substring) and class name
    def callback_title(hwnd, lparam):
        if hwnd in exclude_hwnds:
            return True
        if not user32.IsWindowVisible(hwnd):
            return True
            
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        
        h_process = kernel32.OpenProcess(0x1000, False, pid.value)
        if h_process:
            buf = ctypes.create_unicode_buffer(256)
            size = wintypes.DWORD(len(buf))
            if kernel32.QueryFullProcessImageNameW(h_process, 0, buf, ctypes.byref(size)):
                p_name = os.path.basename(buf.value).lower()
                if p_name == exe_name.lower():
                    length = user32.GetWindowTextLengthW(hwnd)
                    t_buf = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, t_buf, length + 1)
                    w_title = t_buf.value
                    
                    c_buf = ctypes.create_unicode_buffer(256)
                    user32.GetClassNameW(hwnd, c_buf, 256)
                    w_class = c_buf.value
                    
                    if w_class == class_name and (title.lower() in w_title.lower() or w_title.lower() in title.lower()):
                        found_hwnd[0] = hwnd
                        kernel32.CloseHandle(h_process)
                        return False
            kernel32.CloseHandle(h_process)
        return True

    # Pass 2: Fallback to class name matching (excluding already matched hwnds)
    def callback_class(hwnd, lparam):
        if hwnd in exclude_hwnds:
            return True
        if not user32.IsWindowVisible(hwnd):
            return True
            
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        
        h_process = kernel32.OpenProcess(0x1000, False, pid.value)
        if h_process:
            buf = ctypes.create_unicode_buffer(256)
            size = wintypes.DWORD(len(buf))
            if kernel32.QueryFullProcessImageNameW(h_process, 0, buf, ctypes.byref(size)):
                p_name = os.path.basename(buf.value).lower()
                if p_name == exe_name.lower():
                    c_buf = ctypes.create_unicode_buffer(256)
                    user32.GetClassNameW(hwnd, c_buf, 256)
                    w_class = c_buf.value
                    
                    if w_class == class_name:
                        found_hwnd[0] = hwnd
                        kernel32.CloseHandle(h_process)
                        return False
            kernel32.CloseHandle(h_process)
        return True

    # Run Pass 1
    run_enum_windows(callback_title)
    if found_hwnd[0]:
        return found_hwnd[0]
        
    # Run Pass 2
    run_enum_windows(callback_class)
    return found_hwnd[0]


def restore_window_position(hwnd, win_data, current_monitors, vda=None, name_to_guid=None, current_desktops_map=None):
    saved_device = win_data.get("monitor_device", "Unknown")
    
    monitor_exists = False
    primary_monitor = None
    for m in current_monitors:
        if m["device"] == saved_device:
            monitor_exists = True
            break
        if m["is_primary"]:
            primary_monitor = m
            
    rect = win_data["rect"] if "rect" in win_data else {"left": win_data.get("left", 0), "top": win_data.get("top", 0), "right": win_data.get("right", 0), "bottom": win_data.get("bottom", 0)}
    left, top, right, bottom = rect["left"], rect["top"], rect["right"], rect["bottom"]
    width = right - left
    height = bottom - top
    
    if not monitor_exists and primary_monitor:
        work = primary_monitor["work"]
        left = work["left"] + 50
        top = work["top"] + 50
        right = left + width
        bottom = top + height
        if right > work["right"]:
            right = work["right"]
            left = right - width
        if bottom > work["bottom"]:
            bottom = work["bottom"]
            top = bottom - height

    placement = WINDOWPLACEMENT()
    placement.length = ctypes.sizeof(WINDOWPLACEMENT)
    
    h_orig_desktop = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    
    has_switched = False
    if h_default:
        if user32.SetThreadDesktop(h_default):
            has_switched = True
        
    user32.GetWindowPlacement(hwnd, ctypes.byref(placement))
    
    placement.showCmd = win_data.get("show_cmd", 1)
    placement.rcNormalPosition = RECT(left, top, right, bottom)
    
    user32.SetWindowPlacement(hwnd, ctypes.byref(placement))
    user32.ShowWindow(hwnd, placement.showCmd)
    
    if has_switched:
        user32.SetThreadDesktop(h_orig_desktop)
    if h_default:
        user32.CloseDesktop(h_default)

    # Move window to target virtual desktop
    # We resolve the target desktop by name first, then by saved GUID.
    # We use move_hwnd_to_desktop_by_index() which calls PowerShell with inline C#
    # to access IVirtualDesktopManagerInternal — the only reliable way to move
    # foreign-process windows across virtual desktops on Windows 10/11.
    if current_desktops_map is not None:
        target_name = win_data.get("virtual_desktop_name", "")
        saved_guid = win_data.get("virtual_desktop_id", "")
        
        target_guid_str = None
        
        # 1. Try match by name
        if target_name and name_to_guid:
            target_guid_str = name_to_guid.get(target_name.lower())
            
        # 2. Fallback: match by saved GUID still present in current desktops
        if not target_guid_str and saved_guid and current_desktops_map:
            if saved_guid.upper() in current_desktops_map:
                target_guid_str = saved_guid
                
        if target_guid_str:
            # Find 0-based index of the target desktop in the ordered list
            _, desktop_order = get_virtual_desktop_info()
            target_idx = None
            for i, guid in enumerate(desktop_order):
                if guid.upper() == target_guid_str.upper():
                    target_idx = i
                    break
                    
            if target_idx is not None:
                # Give the window a moment to fully initialize before moving
                time.sleep(0.15)
                ok = move_hwnd_to_desktop_by_index(hwnd, target_idx)
                if not ok:
                    # Fallback: try the COM API (works for windows on the current desktop)
                    if vda:
                        try:
                            target_guid = GUID.from_str(target_guid_str)
                            hr = vda.move_window_to_desktop(vda.pManager, hwnd, ctypes.byref(target_guid))
                            if hr != 0:
                                print(f"[VD] COM MoveWindowToDesktop fallback hr=0x{hr:08X} for hwnd={hwnd}")
                        except Exception as e:
                            print(f"[VD] COM fallback error: {e}")
            else:
                print(f"[VD] Could not find desktop index for GUID {target_guid_str}")

def show_cmd_to_state(show_cmd):
    if show_cmd == 2:
        return "minimized"
    elif show_cmd == 3:
        return "maximized"
    else:
        return "normal"

def restore_workspace_action(workspace_id):
    db = load_db()
    
    # Fetch windows and tabs for this workspace
    windows = [w for w in db["workspace_windows"] if w["workspace_id"] == workspace_id]
    tabs = [t for t in db["workspace_tabs"] if t["workspace_id"] == workspace_id]
    settings = db["settings"]
    
    delay = int(settings.get("restore_delay", "1000")) / 1000.0
    skip_running = settings.get("skip_already_running", "1") == "1"
    
    current_monitors = get_monitors()
    running_processes = get_running_process_names()
    
    # Load current virtual desktop mappings
    current_desktops_map, current_desktops_order = get_virtual_desktop_info()
    name_to_guid = {name.lower(): guid for guid, name in current_desktops_map.items()}
    
    vda_scope = VirtualDesktopManagerScope()
    vda = vda_scope.__enter__()
    
    restore_summary = []
    try:
        exclude_hwnds = set()
        restored_browsers = set()
        pre_restore_browser_hwnds = {}
        
        browser_exes = {
            "chrome": "chrome.exe",
            "edge": "msedge.exe",
            "brave": "brave.exe",
            "opera": "opera.exe",
            "vivaldi": "vivaldi.exe"
        }

        # 1. Restore Browser Tabs (with coordinate positioning) FIRST
        if tabs:
            browser_groups = {}
            for t in tabs:
                b = t["browser"]
                if b not in browser_groups:
                    browser_groups[b] = []
                browser_groups[b].append(t)
                
            for browser, b_tabs in browser_groups.items():
                b_process = "chrome"
                b_exe = "chrome.exe"
                if browser == "edge":
                    b_process = "msedge"
                    b_exe = "msedge.exe"
                elif browser == "brave":
                    b_process = "brave"
                    b_exe = "brave.exe"
                elif browser == "opera":
                    b_process = "opera"
                    b_exe = "launcher.exe"
                elif browser == "vivaldi":
                    b_process = "vivaldi"
                    b_exe = "vivaldi.exe"
                    
                # Gather pre-existing browser HWNDs
                pre_restore_browser_hwnds[browser] = get_hwnds_for_process(b_exe)
                
                # If the browser is not running, launch it to allow the extension to connect
                if b_process not in running_processes:
                    try:
                        b_path = ""
                        if browser == "chrome":
                            b_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
                            if not os.path.exists(b_path):
                                b_path = os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
                        elif browser == "edge":
                            b_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
                        elif browser == "brave":
                            b_path = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
                            if not os.path.exists(b_path):
                                b_path = os.path.expandvars(r"%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe")
                        
                        if b_path and os.path.exists(b_path):
                            subprocess.Popen(f'"{b_path}"', shell=True)
                        else:
                            subprocess.Popen(b_exe, shell=True)
                            
                        # Wait for extension to connect
                        connected = False
                        for _ in range(25):
                            time.sleep(0.2)
                            if browser in connected_browsers:
                                connected = True
                                break
                    except:
                        pass
                
                ws_sock = connected_browsers.get(browser)
                if ws_sock:
                    # Group tabs by window_id
                    tabs_by_window = {}
                    for t in b_tabs:
                        w_id = t["window_id"]
                        if w_id not in tabs_by_window:
                            tabs_by_window[w_id] = []
                        tabs_by_window[w_id].append(t)
                    
                    restore_windows = []
                    for w_id, group_tabs in tabs_by_window.items():
                        # Find active tab
                        active_tab = None
                        for t in group_tabs:
                            if t.get("active"):
                                active_tab = t
                                break
                        if not active_tab and group_tabs:
                            active_tab = group_tabs[0]
                        
                        active_title = active_tab["title"] if active_tab else ""
                        
                        # Search saved Win32 windows for matching coordinates
                        matched_win = None
                        for w in windows:
                            w_exe = os.path.basename(w["exe_path"]).lower()
                            if w_exe == b_exe:
                                if active_title and (active_title.lower() in w["title"].lower() or w["title"].lower() in active_title.lower()):
                                    matched_win = w
                                    break
                                    
                        if not matched_win:
                            # Fallback: grab first unmatched browser window of this type
                            for w in windows:
                                w_exe = os.path.basename(w["exe_path"]).lower()
                                if w_exe == b_exe:
                                    if w not in [rw.get("_matched_w") for rw in restore_windows if "_matched_w" in rw]:
                                        matched_win = w
                                        break
                                        
                        win_info = {
                            "tabs": [{
                                "url": t["url"],
                                "active": bool(t["active"])
                            } for t in group_tabs]
                        }
                        
                        if matched_win:
                            win_info["_matched_w"] = matched_win  # Temp marker
                            win_info["left"] = matched_win["left"]
                            win_info["top"] = matched_win["top"]
                            win_info["width"] = matched_win["right"] - matched_win["left"]
                            win_info["height"] = matched_win["bottom"] - matched_win["top"]
                            win_info["state"] = show_cmd_to_state(matched_win["show_cmd"])
                            
                        restore_windows.append(win_info)
                        
                    # Strip temp markers
                    for rw in restore_windows:
                        if "_matched_w" in rw:
                            del rw["_matched_w"]
                            
                    ws_msg = json.dumps({
                        "type": "RESTORE_TABS",
                        "windows": restore_windows
                    })
                    try:
                        ws_sock.send(encode_websocket_frame(ws_msg))
                        restored_browsers.add(browser)
                        restore_summary.append({"app": f"{browser.capitalize()} Tabs", "status": f"Restored {len(tabs_by_window)} windows"})
                    except Exception as e:
                        restore_summary.append({"app": f"{browser.capitalize()} Tabs", "status": f"Restoration command failed: {str(e)}"})
                else:
                    restore_summary.append({"app": f"{browser.capitalize()} Tabs", "status": "Failed (Browser extension disconnected). Will restore browser window only."})

        # 2. Exclude browsers from other_windows only if their tabs were successfully restored via extension
        exclude_exes = ["explorer.exe", "code.exe"]
        for b in restored_browsers:
            if b in browser_exes:
                exclude_exes.append(browser_exes[b])
                
        explorer_windows = [w for w in windows if os.path.basename(w["exe_path"]).lower() == "explorer.exe"]
        vscode_windows = [w for w in windows if os.path.basename(w["exe_path"]).lower() == "code.exe"]
        other_windows = [w for w in windows if os.path.basename(w["exe_path"]).lower() not in exclude_exes]
        
        # 3. Restore File Explorers
        for ew in explorer_windows:
            folder_path = None
            cmd = ew.get("cmd_line", "")
            m = re.search(r'([a-zA-Z]:\\[^"]+)', cmd)
            if m and os.path.exists(m.group(1)):
                folder_path = m.group(1)
            elif os.path.exists(ew["title"]):
                folder_path = ew["title"]
                
            if folder_path:
                pre_launch_hwnds = get_hwnds_for_process("explorer.exe")
                subprocess.Popen(f'explorer.exe "{folder_path}"', shell=True)
                hwnd = None
                for _ in range(30):
                    hwnd = find_window_by_process_and_title("explorer.exe", ew["title"], ew["class_name"], exclude_hwnds | pre_launch_hwnds)
                    if hwnd:
                        break
                    time.sleep(0.5)
                if hwnd:
                    restore_window_position(hwnd, ew, current_monitors, vda, name_to_guid, current_desktops_map)
                    exclude_hwnds.add(hwnd)
                    desktop_name = ew.get("virtual_desktop_name", "")
                    status_str = f"Restored (Desktop: {desktop_name})" if desktop_name else "Restored"
                    restore_summary.append({"app": "File Explorer", "status": status_str, "path": folder_path})
                else:
                    restore_summary.append({"app": "File Explorer", "status": "Opened but position failed", "path": folder_path})
            else:
                pre_launch_hwnds = get_hwnds_for_process("explorer.exe")
                subprocess.Popen("explorer.exe", shell=True)
                hwnd = None
                for _ in range(30):
                    hwnd = find_window_by_process_and_title("explorer.exe", ew["title"], ew["class_name"], exclude_hwnds | pre_launch_hwnds)
                    if hwnd:
                        break
                    time.sleep(0.5)
                if hwnd:
                    restore_window_position(hwnd, ew, current_monitors, vda, name_to_guid, current_desktops_map)
                    exclude_hwnds.add(hwnd)
                    desktop_name = ew.get("virtual_desktop_name", "")
                    status_str = f"Restored (Desktop: {desktop_name})" if desktop_name else "Restored"
                    restore_summary.append({"app": "File Explorer", "status": status_str})
                else:
                    restore_summary.append({"app": "File Explorer", "status": "Opened (no folder path resolved)"})

        # 4. Restore VS Code
        for vw in vscode_windows:
            folder_path = None
            cmd = vw.get("cmd_line", "")
            matches = re.findall(r'(?:"([a-zA-Z]:\\[^"]+)"|([a-zA-Z]:\\[^\s]+))', cmd)
            for m in matches:
                p = m[0] or m[1]
                if os.path.isdir(p):
                    folder_path = p
                    break
                    
            exe_path = vw.get("exe_path")
            if not exe_path or not os.path.exists(exe_path):
                exe_path = "code.exe"
            vscode_cmd = f'"{exe_path}" "{folder_path}"' if folder_path else f'"{exe_path}"'
            try:
                pre_launch_hwnds = get_hwnds_for_process("code.exe")
                subprocess.Popen(vscode_cmd, shell=True)
                hwnd = None
                for _ in range(30):
                    hwnd = find_window_by_process_and_title("code.exe", vw["title"], vw["class_name"], exclude_hwnds | pre_launch_hwnds)
                    if hwnd:
                        break
                    time.sleep(0.5)
                if hwnd:
                    restore_window_position(hwnd, vw, current_monitors, vda, name_to_guid, current_desktops_map)
                    exclude_hwnds.add(hwnd)
                    desktop_name = vw.get("virtual_desktop_name", "")
                    status_str = f"Restored (Desktop: {desktop_name})" if desktop_name else "Restored"
                    restore_summary.append({"app": "VS Code", "status": status_str, "path": folder_path})
                else:
                    restore_summary.append({"app": "VS Code", "status": "Opened but position failed", "path": folder_path})
            except Exception as e:
                restore_summary.append({"app": "VS Code", "status": f"Launch failed: {str(e)}"})

        # 5. Restore Other Windows
        for ow in other_windows:
            exe_path = ow["exe_path"]
            exe_name = os.path.basename(exe_path).lower()
            exe_pname = os.path.splitext(exe_name)[0]
            
            if not os.path.exists(exe_path):
                restore_summary.append({"app": ow["title"], "status": f"Missing (Path: {exe_path})"})
                continue
                
            is_running = exe_pname in running_processes
            if is_running and skip_running:
                hwnd = find_window_by_process_and_title(exe_name, ow["title"], ow["class_name"], exclude_hwnds)
                if hwnd:
                    restore_window_position(hwnd, ow, current_monitors, vda, name_to_guid, current_desktops_map)
                    exclude_hwnds.add(hwnd)
                    desktop_name = ow.get("virtual_desktop_name", "")
                    status_str = f"Repositioned (Already running - Desktop: {desktop_name})" if desktop_name else "Repositioned (Already running)"
                    restore_summary.append({"app": ow["title"], "status": status_str})
                    continue
                    
            try:
                launch_cmd = ow.get("cmd_line", "")
                
                # Check if this is a browser and adjust launch_cmd to open in new window
                browser_exes_list = ["chrome.exe", "msedge.exe", "brave.exe", "vivaldi.exe", "opera.exe", "launcher.exe", "firefox.exe"]
                if exe_name in browser_exes_list:
                    launch_cmd = adjust_browser_launch_cmd(exe_name, launch_cmd, exe_path)
                elif not launch_cmd or not launch_cmd.strip():
                    launch_cmd = f'"{exe_path}"'
                    
                pre_launch_hwnds = get_hwnds_for_process(exe_name)
                subprocess.Popen(launch_cmd, shell=True)
                hwnd = None
                for _ in range(30):
                    hwnd = find_window_by_process_and_title(exe_name, ow["title"], ow["class_name"], exclude_hwnds | pre_launch_hwnds)
                    if hwnd:
                        break
                    time.sleep(0.5)
                
                if hwnd:
                    restore_window_position(hwnd, ow, current_monitors, vda, name_to_guid, current_desktops_map)
                    exclude_hwnds.add(hwnd)
                    desktop_name = ow.get("virtual_desktop_name", "")
                    status_str = f"Restored (Desktop: {desktop_name})" if desktop_name else "Restored"
                    restore_summary.append({"app": ow["title"], "status": status_str})
                else:
                    restore_summary.append({"app": ow["title"], "status": "Launched but window not found"})
            except Exception as e:
                restore_summary.append({"app": ow["title"], "status": f"Launch failed: {str(e)}"})

        # 6. Reposition Restored Browser Windows
        browser_windows = [w for w in windows if os.path.basename(w["exe_path"]).lower() in browser_exes.values()]
        for bw in browser_windows:
            exe_name = os.path.basename(bw["exe_path"]).lower()
            browser_name = None
            for b, b_exe in browser_exes.items():
                if b_exe == exe_name:
                    browser_name = b
                    break
            
            if browser_name in restored_browsers:
                hwnd = None
                pre_hwnds = pre_restore_browser_hwnds.get(browser_name, set())
                for _ in range(30):
                    hwnd = find_window_by_process_and_title(exe_name, bw["title"], bw["class_name"], exclude_hwnds | pre_hwnds)
                    if hwnd:
                        break
                    time.sleep(0.5)
                    
                if hwnd:
                    restore_window_position(hwnd, bw, current_monitors, vda, name_to_guid, current_desktops_map)
                    exclude_hwnds.add(hwnd)
                    desktop_name = bw.get("virtual_desktop_name", "")
                    status_str = f"Restored (Desktop: {desktop_name})" if desktop_name else "Restored"
                    restore_summary.append({"app": f"{browser_name.capitalize()} Window", "status": status_str})
                else:
                    restore_summary.append({"app": f"{browser_name.capitalize()} Window", "status": "Restored tabs but window position/desktop failed"})
    finally:
        vda_scope.__exit__(None, None, None)
        
    return restore_summary

def handle_websocket_handshake(headers):
    key = headers.get('sec-websocket-key')
    if not key:
        return None
    accept_val = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode('utf-8')).digest()).decode('utf-8')
    return (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: {}\r\n\r\n"
    ).format(accept_val)

def decode_websocket_frame(data):
    if len(data) < 2:
        return None, None
    b1, b2 = data[0], data[1]
    fin = b1 & 0x80
    opcode = b1 & 0x0f
    masked = b2 & 0x80
    payload_len = b2 & 0x7f
    
    idx = 2
    if payload_len == 126:
        if len(data) < 4: return None, None
        payload_len = struct.unpack(">H", data[2:4])[0]
        idx = 4
    elif payload_len == 127:
        if len(data) < 10: return None, None
        payload_len = struct.unpack(">Q", data[2:10])[0]
        idx = 10
        
    if masked:
        if len(data) < idx + 4 + payload_len:
            return None, None
        mask_key = data[idx:idx+4]
        idx += 4
        payload = data[idx:idx+payload_len]
        decoded = bytearray(payload_len)
        for i in range(payload_len):
            decoded[i] = payload[i] ^ mask_key[i % 4]
        return opcode, decoded.decode('utf-8', errors='ignore')
    else:
        if len(data) < idx + payload_len:
            return None, None
        payload = data[idx:idx+payload_len]
        return opcode, payload.decode('utf-8', errors='ignore')

def encode_websocket_frame(payload_str):
    payload = payload_str.encode('utf-8')
    payload_len = len(payload)
    
    header = bytearray([0x81])
    if payload_len < 126:
        header.append(payload_len)
    elif payload_len <= 65535:
        header.append(126)
        header.extend(struct.pack(">H", payload_len))
    else:
        header.append(127)
        header.extend(struct.pack(">Q", payload_len))
        
    return bytes(header) + payload

def handle_websocket_client(client_sock, client_addr):
    print(f"WebSocket client connected from {client_addr}")
    browser_type = "unknown"
    
    try:
        while True:
            raw_data = client_sock.recv(65536)
            if not raw_data:
                break
                
            opcode, message = decode_websocket_frame(raw_data)
            if opcode == 8:
                break
            elif opcode == 1 and message:
                try:
                    data = json.loads(message)
                    m_type = data.get("type")
                    
                    if m_type == "INIT":
                        browser_type = data.get("browser", "unknown").lower()
                        connected_browsers[browser_type] = client_sock
                        print(f"Browser '{browser_type}' WebSocket initialized.")
                        
                    elif m_type == "TABS_RESPONSE":
                        req_id = data.get("request_id")
                        tabs = data.get("tabs", [])
                        tab_responses[req_id] = tabs
                        if req_id in response_events:
                            response_events[req_id].set()
                            
                except Exception as ex:
                    print(f"Error parsing websocket message: {ex}")
    except Exception as e:
        print(f"WebSocket client error: {e}")
    finally:
        client_sock.close()
        if browser_type in connected_browsers and connected_browsers[browser_type] == client_sock:
            del connected_browsers[browser_type]
        print(f"WebSocket client {browser_type} disconnected.")

def send_http_response(client_sock, status, headers, body):
    res_bytes = body.encode('utf-8') if isinstance(body, str) else body
    
    all_headers = {
        "Content-Type": "application/json",
        "Content-Length": len(res_bytes),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type"
    }
    all_headers.update(headers)
    
    header_str = f"HTTP/1.1 {status}\r\n"
    for k, v in all_headers.items():
        header_str += f"{k}: {v}\r\n"
    header_str += "\r\n"
    
    client_sock.sendall(header_str.encode('utf-8') + res_bytes)

def parse_http_request(client_sock):
    request_data = bytearray()
    while True:
        chunk = client_sock.recv(4096)
        if not chunk:
            break
        request_data.extend(chunk)
        if b'\r\n\r\n' in request_data:
            break
            
    if not request_data:
        return None
        
    parts = request_data.split(b'\r\n\r\n', 1)
    header_part = parts[0].decode('utf-8', errors='ignore')
    body_part = parts[1] if len(parts) > 1 else b''
    
    lines = header_part.split('\r\n')
    if not lines or not lines[0]:
        return None
        
    req_line = lines[0].split(' ')
    if len(req_line) < 2:
        return None
        
    method, path = req_line[0], req_line[1]
    
    headers = {}
    for line in lines[1:]:
        if ': ' in line:
            k, v = line.split(': ', 1)
            headers[k.lower()] = v
            
    content_len = int(headers.get('content-length', 0))
    while len(body_part) < content_len:
        chunk = client_sock.recv(4096)
        if not chunk:
            break
        body_part += chunk
        
    body = body_part[:content_len].decode('utf-8', errors='ignore')
    return {
        "method": method,
        "path": path,
        "headers": headers,
        "body": body
    }

def handle_http_request(client_sock, client_addr):
    req = parse_http_request(client_sock)
    if not req:
        client_sock.close()
        return
        
    method = req["method"]
    path = req["path"]
    headers = req["headers"]
    body = req["body"]
    
    if method == "OPTIONS":
        send_http_response(client_sock, "200 OK", {}, "")
        client_sock.close()
        return
        
    if headers.get("upgrade", "").lower() == "websocket":
        shake_response = handle_websocket_handshake(headers)
        if shake_response:
            client_sock.sendall(shake_response.encode('utf-8'))
            handle_websocket_client(client_sock, client_addr)
        else:
            send_http_response(client_sock, "400 Bad Request", {}, "Invalid WebSocket upgrade")
            client_sock.close()
        return

    try:
        response_data = {"error": "Not Found"}
        status_code = "404 Not Found"
        
        path_clean = path
        query_params = {}
        if "?" in path:
            path_clean, query_str = path.split("?", 1)
            for param in query_str.split("&"):
                if "=" in param:
                    pk, pv = param.split("=", 1)
                    query_params[pk] = pv
                    
        if path_clean == "/api/status" and method == "GET":
            response_data = {
                "status": "ok",
                "browsers_connected": list(connected_browsers.keys()),
                "monitors": get_monitors()
            }
            status_code = "200 OK"
            
        elif path_clean == "/api/workspaces" and method == "GET":
            db = load_db()
            workspaces = []
            sorted_workspaces = sorted(db["workspaces"], key=lambda w: (-w.get("favorite", 0), w.get("name", "").lower()))
            for w in sorted_workspaces:
                w_copy = dict(w)
                w_copy["app_count"] = sum(1 for win in db["workspace_windows"] if win["workspace_id"] == w["id"])
                w_copy["tab_count"] = sum(1 for t in db["workspace_tabs"] if t["workspace_id"] == w["id"])
                workspaces.append(w_copy)
            response_data = workspaces
            status_code = "200 OK"
            
        elif path_clean == "/api/workspaces" and method == "POST":
            req_data = json.loads(body)
            w_name = req_data.get("name")
            
            db = load_db()
            
            existing = None
            for w in db["workspaces"]:
                if w["name"] == w_name:
                    existing = w
                    break
                    
            if existing:
                workspace_id = existing["id"]
                db["workspace_windows"] = [win for win in db["workspace_windows"] if win["workspace_id"] != workspace_id]
                db["workspace_tabs"] = [t for t in db["workspace_tabs"] if t["workspace_id"] != workspace_id]
            else:
                max_id = max([w["id"] for w in db["workspaces"]] + [0])
                workspace_id = max_id + 1
                db["workspaces"].append({
                    "id": workspace_id,
                    "name": w_name,
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "favorite": 0
                })
                
            captured = capture_workspace_data()
            
            for w in captured["windows"]:
                max_win_id = max([win["id"] for win in db["workspace_windows"]] + [0])
                db["workspace_windows"].append({
                    "id": max_win_id + 1,
                    "workspace_id": workspace_id,
                    "title": w["title"],
                    "class_name": w["class_name"],
                    "exe_path": w["exe_path"],
                    "cmd_line": w["cmd_line"],
                    "left": w["rect"]["left"],
                    "top": w["rect"]["top"],
                    "right": w["rect"]["right"],
                    "bottom": w["rect"]["bottom"],
                    "show_cmd": w["show_cmd"],
                    "monitor_device": w["monitor_device"],
                    "monitor_rect": w["monitor_rect"],
                    "virtual_desktop_id": w.get("virtual_desktop_id", ""),
                    "virtual_desktop_name": w.get("virtual_desktop_name", "")
                })
                
            for t in captured["browser_tabs"]:
                max_tab_id = max([tab["id"] for tab in db["workspace_tabs"]] + [0])
                db["workspace_tabs"].append({
                    "id": max_tab_id + 1,
                    "workspace_id": workspace_id,
                    "browser": t["browser"],
                    "window_id": t["window_id"],
                    "tab_id": t["tab_id"],
                    "url": t["url"],
                    "title": t["title"],
                    "active": t["active"]
                })
                
            save_db(db)
            response_data = {"status": "success", "workspace_id": workspace_id, "app_count": len(captured["windows"]), "tab_count": len(captured["browser_tabs"])}
            status_code = "200 OK"
            
        elif path_clean.startswith("/api/workspaces/favorite") and method == "POST":
            req_data = json.loads(body)
            w_id = int(req_data.get("id"))
            fav = int(req_data.get("favorite", 0))
            
            db = load_db()
            for w in db["workspaces"]:
                if w["id"] == w_id:
                    w["favorite"] = fav
                    break
            save_db(db)
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        elif path_clean.startswith("/api/workspaces/rename") and method == "POST":
            req_data = json.loads(body)
            w_id = int(req_data.get("id"))
            w_name = req_data.get("name")
            
            db = load_db()
            for w in db["workspaces"]:
                if w["id"] == w_id:
                    w["name"] = w_name
                    break
            save_db(db)
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        elif path_clean == "/api/workspaces" and method == "DELETE":
            w_id = int(query_params.get("id"))
            
            db = load_db()
            db["workspaces"] = [w for w in db["workspaces"] if w["id"] != w_id]
            db["workspace_windows"] = [win for win in db["workspace_windows"] if win["workspace_id"] != w_id]
            db["workspace_tabs"] = [t for t in db["workspace_tabs"] if t["workspace_id"] != w_id]
            db["schedules"] = [s for s in db["schedules"] if s["workspace_id"] != w_id]
            save_db(db)
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        elif path_clean == "/api/workspaces/duplicate" and method == "POST":
            req_data = json.loads(body)
            w_id = int(req_data.get("id"))
            
            db = load_db()
            orig = None
            for w in db["workspaces"]:
                if w["id"] == w_id:
                    orig = w
                    break
            if not orig:
                response_data = {"error": "Workspace not found"}
                status_code = "404 Not Found"
            else:
                orig_name = orig["name"]
                new_name = f"{orig_name}_Copy"
                count = 1
                existing_names = {w["name"] for w in db["workspaces"]}
                while new_name in existing_names:
                    new_name = f"{orig_name}_Copy{count}"
                    count += 1
                    
                new_id = max([w["id"] for w in db["workspaces"]] + [0]) + 1
                db["workspaces"].append({
                    "id": new_id,
                    "name": new_name,
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "favorite": 0
                })
                
                # Duplicate windows
                for win in [w for w in db["workspace_windows"] if w["workspace_id"] == w_id]:
                    max_win_id = max([w["id"] for w in db["workspace_windows"]] + [0]) + 1
                    win_copy = dict(win)
                    win_copy["id"] = max_win_id
                    win_copy["workspace_id"] = new_id
                    db["workspace_windows"].append(win_copy)
                    
                # Duplicate tabs
                for tab in [t for t in db["workspace_tabs"] if t["workspace_id"] == w_id]:
                    max_tab_id = max([t["id"] for t in db["workspace_tabs"]] + [0]) + 1
                    tab_copy = dict(tab)
                    tab_copy["id"] = max_tab_id
                    tab_copy["workspace_id"] = new_id
                    db["workspace_tabs"].append(tab_copy)
                    
                save_db(db)
                response_data = {"status": "success", "new_id": new_id, "new_name": new_name}
                status_code = "200 OK"
            
        elif path_clean == "/api/workspaces/restore" and method == "POST":
            req_data = json.loads(body)
            w_id = int(req_data.get("id"))
            summary = restore_workspace_action(w_id)
            response_data = {"status": "success", "summary": summary}
            status_code = "200 OK"
            
        elif path_clean == "/api/snapshots" and method == "GET":
            db = load_db()
            response_data = sorted(db["snapshots"], key=lambda s: s.get("timestamp", ""), reverse=True)
            status_code = "200 OK"
            
        elif path_clean == "/api/snapshots/capture" and method == "POST":
            req_data = json.loads(body) if body else {}
            name = req_data.get("name", "Manual Snapshot")
            captured = capture_workspace_data()
            
            db = load_db()
            new_snap_id = max([s["id"] for s in db["snapshots"]] + [0]) + 1
            db["snapshots"].append({
                "id": new_snap_id,
                "name": name,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "data": captured
            })
            save_db(db)
            response_data = {"status": "success", "snapshot_id": new_snap_id}
            status_code = "200 OK"
            
        elif path_clean == "/api/snapshots" and method == "DELETE":
            s_id = int(query_params.get("id"))
            
            db = load_db()
            db["snapshots"] = [s for s in db["snapshots"] if s["id"] != s_id]
            save_db(db)
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        elif path_clean == "/api/snapshots/restore" and method == "POST":
            req_data = json.loads(body)
            s_id = int(req_data.get("id"))
            
            db = load_db()
            snap = None
            for s in db["snapshots"]:
                if s["id"] == s_id:
                    snap = s
                    break
                    
            if snap:
                snap_data = snap["data"]
                
                temp_id = -999
                db["workspaces"].append({
                    "id": temp_id,
                    "name": f"__temp_snap_{s_id}",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "favorite": 0
                })
                
                for w in snap_data["windows"]:
                    max_win_id = max([win["id"] for win in db["workspace_windows"]] + [0]) + 1
                    db["workspace_windows"].append({
                        "id": max_win_id,
                        "workspace_id": temp_id,
                        "title": w["title"],
                        "class_name": w["class_name"],
                        "exe_path": w["exe_path"],
                        "cmd_line": w["cmd_line"],
                        "left": w["rect"]["left"],
                        "top": w["rect"]["top"],
                        "right": w["rect"]["right"],
                        "bottom": w["rect"]["bottom"],
                        "show_cmd": w["show_cmd"],
                        "monitor_device": w["monitor_device"],
                        "monitor_rect": w["monitor_rect"],
                        "virtual_desktop_id": w.get("virtual_desktop_id", ""),
                        "virtual_desktop_name": w.get("virtual_desktop_name", "")
                    })
                    
                for t in snap_data["browser_tabs"]:
                    max_tab_id = max([tab["id"] for tab in db["workspace_tabs"]] + [0]) + 1
                    db["workspace_tabs"].append({
                        "id": max_tab_id,
                        "workspace_id": temp_id,
                        "browser": t["browser"],
                        "window_id": t["window_id"],
                        "tab_id": t["tab_id"],
                        "url": t["url"],
                        "title": t["title"],
                        "active": t["active"]
                    })
                    
                save_db(db)
                
                summary = restore_workspace_action(temp_id)
                
                db = load_db()
                db["workspaces"] = [w for w in db["workspaces"] if w["id"] != temp_id]
                db["workspace_windows"] = [win for win in db["workspace_windows"] if win["workspace_id"] != temp_id]
                db["workspace_tabs"] = [tab for tab in db["workspace_tabs"] if tab["workspace_id"] != temp_id]
                save_db(db)
                
                response_data = {"status": "success", "summary": summary}
                status_code = "200 OK"
            else:
                response_data = {"error": "Snapshot not found"}
                status_code = "404 Not Found"
                
        elif path_clean == "/api/settings" and method == "GET":
            db = load_db()
            response_data = db["settings"]
            status_code = "200 OK"
            
        elif path_clean == "/api/settings" and method == "POST":
            req_data = json.loads(body)
            db = load_db()
            for k, v in req_data.items():
                db["settings"][k] = str(v)
            save_db(db)
            
            if "launch_at_startup" in req_data:
                startup_val = int(req_data["launch_at_startup"])
                app_path = sys.argv[0] if sys.argv[0].endswith(".exe") else "python.exe"
                reg_cmd = f'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "Docksy" -Value "{app_path}"' if startup_val else 'Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "Docksy" -ErrorAction SilentlyContinue'
                try:
                    subprocess.run(["powershell", "-NoProfile", "-Command", reg_cmd], timeout=2)
                except:
                    pass
                    
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        elif path_clean == "/api/ignored" and method == "GET":
            db = load_db()
            ignored_list = [{"id": i, "name": name} for i, name in enumerate(sorted(db["ignored_apps"]))]
            response_data = ignored_list
            status_code = "200 OK"
            
        elif path_clean == "/api/ignored" and method == "POST":
            req_data = json.loads(body)
            name = req_data.get("name", "").strip().lower()
            if name:
                db = load_db()
                if name not in db["ignored_apps"]:
                    db["ignored_apps"].append(name)
                    save_db(db)
                response_data = {"status": "success"}
                status_code = "200 OK"
            else:
                response_data = {"error": "Invalid name"}
                status_code = "400 Bad Request"
                
        elif path_clean == "/api/ignored" and method == "DELETE":
            g_id = query_params.get("id")
            if g_id is not None:
                db = load_db()
                sorted_ignored = sorted(db["ignored_apps"])
                try:
                    idx = int(g_id)
                    if 0 <= idx < len(sorted_ignored):
                        name_to_remove = sorted_ignored[idx]
                        db["ignored_apps"].remove(name_to_remove)
                        save_db(db)
                        response_data = {"status": "success"}
                        status_code = "200 OK"
                    else:
                        response_data = {"error": "Index out of range"}
                        status_code = "400 Bad Request"
                except ValueError:
                    response_data = {"error": "Invalid ID format"}
                    status_code = "400 Bad Request"
            else:
                response_data = {"error": "Missing ID"}
                status_code = "400 Bad Request"
            
        elif path_clean == "/api/schedules" and method == "GET":
            db = load_db()
            schedules = []
            workspace_names = {w["id"]: w["name"] for w in db["workspaces"]}
            for s in db["schedules"]:
                s_copy = dict(s)
                s_copy["workspace_name"] = workspace_names.get(s["workspace_id"], "Unknown")
                schedules.append(s_copy)
            response_data = schedules
            status_code = "200 OK"
            
        elif path_clean == "/api/schedules" and method == "POST":
            req_data = json.loads(body)
            s_id = req_data.get("id")
            w_id = int(req_data.get("workspace_id"))
            trigger_type = req_data.get("trigger_type")
            t_val = req_data.get("time", "")
            days_val = req_data.get("days", "")
            enabled = int(req_data.get("enabled", 1))
            
            db = load_db()
            if s_id:
                s_id = int(s_id)
                for s in db["schedules"]:
                    if s["id"] == s_id:
                        s["workspace_id"] = w_id
                        s["trigger_type"] = trigger_type
                        s["time"] = t_val
                        s["days"] = days_val
                        s["enabled"] = enabled
                        break
            else:
                new_sched_id = max([s["id"] for s in db["schedules"]] + [0]) + 1
                db["schedules"].append({
                    "id": new_sched_id,
                    "workspace_id": w_id,
                    "trigger_type": trigger_type,
                    "time": t_val,
                    "days": days_val,
                    "enabled": enabled
                })
            save_db(db)
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        elif path_clean == "/api/schedules" and method == "DELETE":
            s_id = int(query_params.get("id"))
            db = load_db()
            db["schedules"] = [s for s in db["schedules"] if s["id"] != s_id]
            save_db(db)
            response_data = {"status": "success"}
            status_code = "200 OK"
            
        send_http_response(client_sock, status_code, {}, json.dumps(response_data))
    except Exception as e:
        print(f"API route error {path}: {e}")
        send_http_response(client_sock, "500 Internal Server Error", {}, json.dumps({"error": str(e)}))
    finally:
        client_sock.close()

def start_api_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(('127.0.0.1', 19082))
        server.listen(5)
        print("Docksy Python Engine listening on http://127.0.0.1:19082")
    except Exception as e:
        print(f"Failed to bind port 19082: {e}")
        sys.exit(1)
        
    while True:
        try:
            client_sock, client_addr = server.accept()
            t = threading.Thread(target=handle_http_request, args=(client_sock, client_addr))
            t.daemon = True
            t.start()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Accept connection error: {e}")
            time.sleep(0.1)

def scheduler_daemon():
    print("Scheduler daemon started.")
    last_trigger = ""
    
    while True:
        time.sleep(10)
        
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_day = now.strftime("%a")
        
        if current_time == last_trigger:
            continue
            
        db = load_db()
        schedules = [s for s in db["schedules"] if s.get("enabled") == 1 and s.get("trigger_type") == 'time']
        
        for s in schedules:
            if s["time"] == current_time:
                days = [d.strip() for d in s["days"].split(",")]
                is_match = False
                if "Weekdays" in days and current_day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
                    is_match = True
                elif "Everyday" in days:
                    is_match = True
                elif current_day in days:
                    is_match = True
                    
                if is_match:
                    print(f"Triggering scheduled restoration for workspace ID {s['workspace_id']}")
                    last_trigger = current_time
                    t = threading.Thread(target=restore_workspace_action, args=(s["workspace_id"],))
                    t.daemon = True
                    t.start()
                    break

def auto_snapshot_daemon():
    print("Auto-snapshot daemon started.")
    
    while True:
        db = load_db()
        enabled = db["settings"].get("auto_snapshots_enabled") == "1"
        interval = int(db["settings"].get("snapshot_interval", "60"))
        
        if enabled:
            try:
                captured = capture_workspace_data()
                
                db = load_db()
                existing = None
                for s in db["snapshots"]:
                    if s["name"] == "Auto Snapshot":
                        existing = s
                        break
                        
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if existing:
                    existing["timestamp"] = timestamp
                    existing["data"] = captured
                else:
                    new_snap_id = max([s["id"] for s in db["snapshots"]] + [0]) + 1
                    db["snapshots"].append({
                        "id": new_snap_id,
                        "name": "Auto Snapshot",
                        "timestamp": timestamp,
                        "data": captured
                    })
                save_db(db)
                print(f"Auto Snapshot updated successfully at {timestamp}")
            except Exception as e:
                print(f"Auto-snapshot error: {e}")
                
        for _ in range(interval * 2):
            time.sleep(30)

def test_capture():
    print("Testing capture...")
    ignored_set = {"electron.exe", "docksy.exe", "python.exe"}
    res = capture_windows(ignored_set)
    print(json.dumps(res[:5], indent=2))
    sys.exit(0)

if __name__ == "__main__":
    init_db()
    
    if "--test-capture" in sys.argv:
        test_capture()
        
    # Check and trigger startup schedules
    def check_startup_schedules():
        time.sleep(3)
        try:
            db = load_db()
            startup_schedules = [s for s in db["schedules"] if s.get("enabled") == 1 and s.get("trigger_type") == 'startup']
            if startup_schedules:
                print(f"Boot: Triggering startup restoration for workspace ID {startup_schedules[0]['workspace_id']}")
                restore_workspace_action(startup_schedules[0]['workspace_id'])
        except Exception as e:
            print(f"Startup schedule error: {e}")
            
    t_startup = threading.Thread(target=check_startup_schedules)
    t_startup.daemon = True
    t_startup.start()
        
    t_sched = threading.Thread(target=scheduler_daemon)
    t_sched.daemon = True
    t_sched.start()
    
    t_snap = threading.Thread(target=auto_snapshot_daemon)
    t_snap.daemon = True
    t_snap.start()
    
    start_api_server()
