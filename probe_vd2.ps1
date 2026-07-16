
$src = @"
using System;
using System.Runtime.InteropServices;

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("92CA9DCD-5622-4BBA-A805-5E9F541BD8C9")]
public interface IObjectArray2 {
    [PreserveSig] int GetCount(out uint n);
    [PreserveSig] int GetAt(uint i, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object ppv);
}
[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("6D5140C1-7436-11CE-8034-00AA006009FA")]
public interface IServiceProvider2 { [PreserveSig] int QueryService(ref Guid svc, ref Guid iid, out IntPtr ppv); }

public class VDProbe2 {
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
    static readonly Guid CLSID_Shell = new Guid("C2F03A33-21F5-47FA-B4BB-156362A2F239");
    static readonly Guid SID_VDMInternal = new Guid("C5E0CDCA-7B6E-41B2-9FC4-D93975CC467B");
    static readonly Guid IID_MATCH = new Guid("53F5CA0B-158F-4124-900C-057158060B27");
    static readonly Guid IID_OA = new Guid("92CA9DCD-5622-4BBA-A805-5E9F541BD8C9");
    static readonly Guid SID_AVC = new Guid("1841C6D7-4F9D-42C0-AF41-8747538F10E5");
    static readonly Guid IID_AVC = new Guid("2C08ADF0-A386-4B35-9250-0FE183476FCC");

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int GetAllDesktopsDelegate(IntPtr self, out IntPtr ppArr);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int GetViewForHwndDelegate(IntPtr self, IntPtr hwnd, out IntPtr view);

    public static string Run() {
        Type t = Type.GetTypeFromCLSID(CLSID_Shell);
        object shell = Activator.CreateInstance(t);
        IServiceProvider2 sp = shell as IServiceProvider2;
        if (sp == null) return "no IServiceProvider";
        
        IntPtr pMgr = IntPtr.Zero;
        { Guid svc = SID_VDMInternal; Guid iid = IID_MATCH; sp.QueryService(ref svc, ref iid, out pMgr); }
        if (pMgr == IntPtr.Zero) return "QueryService failed";
        
        IntPtr vtable = Marshal.ReadIntPtr(pMgr);
        string result = "pMgr=OK vtable=OK\n";
        
        // Probe slots 3-12 for GetAllCurrentDesktops (returns IObjectArray with valid count)
        for (int slot = 3; slot <= 15; slot++) {
            try {
                IntPtr fn = Marshal.ReadIntPtr(vtable, slot * IntPtr.Size);
                var call = Marshal.GetDelegateForFunctionPointer<GetAllDesktopsDelegate>(fn);
                IntPtr arr = IntPtr.Zero;
                int r = call(pMgr, out arr);
                if (r == 0 && arr != IntPtr.Zero) {
                    try {
                        IObjectArray2 oa = (IObjectArray2)Marshal.GetObjectForIUnknown(arr);
                        uint cnt; oa.GetCount(out cnt);
                        Marshal.Release(arr);
                        result += "Slot " + slot + ": GetAllDesktops OK count=" + cnt + "\n";
                    } catch { Marshal.Release(arr); result += "Slot " + slot + ": arr but cast failed\n"; }
                } else {
                    result += "Slot " + slot + ": hr=0x" + r.ToString("X8") + " arr=" + arr + "\n";
                }
            } catch (Exception ex) {
                result += "Slot " + slot + ": EX=" + ex.GetType().Name + "\n";
            }
        }
        
        // Also probe AVC
        IntPtr pAVC = IntPtr.Zero;
        { Guid s = SID_AVC; Guid i = IID_AVC; sp.QueryService(ref s, ref i, out pAVC); }
        result += "AVC: " + (pAVC != IntPtr.Zero ? "OK" : "FAIL") + "\n";
        if (pAVC != IntPtr.Zero) {
            IntPtr avcVtable = Marshal.ReadIntPtr(pAVC);
            // Probe GetViewForHwnd slots 3-10
            // Use a fake hwnd that won't crash things: IntPtr.Zero
            for (int slot = 3; slot <= 10; slot++) {
                try {
                    IntPtr fn = Marshal.ReadIntPtr(avcVtable, slot * IntPtr.Size);
                    var call = Marshal.GetDelegateForFunctionPointer<GetViewForHwndDelegate>(fn);
                    IntPtr view = IntPtr.Zero;
                    // Use a valid HWND - the PowerShell console window
                    IntPtr testHwnd = System.Diagnostics.Process.GetCurrentProcess().MainWindowHandle;
                    if (testHwnd == IntPtr.Zero) { result += "AVC Slot " + slot + ": no test hwnd\n"; continue; }
                    int r = call(pAVC, testHwnd, out view);
                    result += "AVC Slot " + slot + ": hr=0x" + r.ToString("X8") + " view=" + view + "\n";
                    if (view != IntPtr.Zero) Marshal.Release(view);
                } catch (Exception ex) {
                    result += "AVC Slot " + slot + ": EX=" + ex.GetType().Name + "\n";
                }
            }
            Marshal.Release(pAVC);
        }
        
        Marshal.Release(pMgr);
        return result;
    }
}
"@

try {
    Add-Type -TypeDefinition $src -ErrorAction Stop
    Write-Output ([VDProbe2]::Run())
} catch {
    Write-Error $_.Exception.Message
}
